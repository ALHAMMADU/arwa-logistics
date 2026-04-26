import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `You are ARWA AI Assistant, an expert logistics and shipping assistant for ARWA LOGISTICS. You help users with:

- Shipping inquiries: tracking, rates, delivery estimates, customs clearance
- Logistics guidance: packaging requirements, documentation, import/export regulations
- Shipment management: understanding statuses, warehouse processes, shipping methods (AIR, SEA, LAND)
- General logistics: supply chain optimization, freight calculations, route planning

Key information about ARWA LOGISTICS:
- We handle international shipping via AIR, SEA, and LAND
- Shipment statuses: Created → Waiting Warehouse Arrival → Received at Warehouse → Processing → Ready for Dispatch → Dispatched → In Transit → Arrived at Destination → Customs Clearance → Out for Delivery → Delivered
- We operate warehouses in multiple cities
- Shipment types: PARCEL, LCL (Less than Container Load), FCL (Full Container Load)

Guidelines:
- Be concise, professional, and helpful
- Use logistics terminology accurately
- If you don't know something specific about ARWA operations, suggest the user contact support
- Format responses clearly with bullet points or numbered lists when appropriate
- Always prioritize accuracy over speculation`;

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, { windowMs: 60 * 1000, maxRequests: 30 });
    if (rateLimitResult) return rateLimitResult;

    // Authentication check
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { success: false, error: 'Each message must have a valid role (user/assistant) and content' },
          { status: 400 }
        );
      }
    }

    // Save the user's message to the database
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role === 'user') {
      await db.chatMessage.create({
        data: {
          userId: session.id,
          role: 'user',
          content: lastUserMessage.content,
        },
      });
    }

    // Call the AI SDK
    let aiResponse: string;
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((msg: { role: string; content: string }) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
        ],
      });
      aiResponse = completion.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
    } catch (aiError: any) {
      console.error('AI SDK error:', aiError);
      aiResponse = 'I\'m currently experiencing technical difficulties. Please try again in a moment or contact ARWA support for immediate assistance.';
    }

    // Save the assistant's response to the database
    await db.chatMessage.create({
      data: {
        userId: session.id,
        role: 'assistant',
        content: aiResponse,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.id,
      action: 'AI_CHAT',
      entity: 'ChatMessage',
      details: JSON.stringify({ messageCount: messages.length, responseLength: aiResponse.length }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      data: {
        role: 'assistant',
        content: aiResponse,
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

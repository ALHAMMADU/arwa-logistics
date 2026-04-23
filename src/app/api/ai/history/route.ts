import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

// GET /api/ai/history - Get chat history for the authenticated user
export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Authentication check
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100) : 50;
    const offsetParam = searchParams.get('offset');
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

    const [messages, total] = await Promise.all([
      db.chatMessage.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.chatMessage.count({
        where: { userId: session.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + messages.length < total,
      },
    });
  } catch (error: any) {
    console.error('Chat history API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/history - Clear chat history for the authenticated user
export async function DELETE(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Authentication check
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    await db.chatMessage.deleteMany({
      where: { userId: session.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Chat history cleared',
    });
  } catch (error: any) {
    console.error('Chat history delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

interface Note {
  text: string;
  author: string;
  timestamp: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const shipment = await db.shipment.findUnique({
      where: { id },
      select: { id: true, customerId: true, notes: true },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    if (session.role === 'CUSTOMER' && shipment.customerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    let notes: Note[] = [];
    if (shipment.notes) {
      try {
        notes = JSON.parse(shipment.notes);
      } catch {
        notes = [];
      }
    }

    return NextResponse.json({ success: true, data: notes });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();
    const { text, authorName } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Note text is required' }, { status: 400 });
    }

    const shipment = await db.shipment.findUnique({
      where: { id },
      select: { id: true, customerId: true, notes: true },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    if (session.role === 'CUSTOMER' && shipment.customerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    let notes: Note[] = [];
    if (shipment.notes) {
      try {
        notes = JSON.parse(shipment.notes);
      } catch {
        notes = [];
      }
    }

    const newNote: Note = {
      text: text.trim(),
      author: authorName || session.email || 'Unknown',
      timestamp: new Date().toISOString(),
    };
    notes.push(newNote);

    await db.shipment.update({
      where: { id },
      data: { notes: JSON.stringify(notes) },
    });

    await createAuditLog({
      userId: session.id,
      action: 'UPDATE',
      entity: 'Shipment',
      entityId: id,
      details: JSON.stringify({ action: 'add_note', noteText: text.trim().substring(0, 100) }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: notes }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

// PATCH /api/notifications/[id]/read - Mark a notification as read
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;

    // Verify the notification exists and belongs to the user
    const notification = await db.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.userId !== session.id) {
      return NextResponse.json(
        { success: false, error: 'You can only mark your own notifications as read' },
        { status: 403 }
      );
    }

    const updated = await db.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

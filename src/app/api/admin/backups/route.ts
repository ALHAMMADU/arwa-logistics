import { NextResponse } from 'next/server';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { createBackup, listBackups, cleanupOldBackups } from '@/lib/backup';

export async function GET(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  try {
    const backups = await listBackups();
    return NextResponse.json({ success: true, data: backups });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list backups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  try {
    const backup = await createBackup('manual');
    
    await createAuditLog({
      userId: access.session.id,
      action: 'MANUAL_BACKUP',
      entity: 'System',
      details: JSON.stringify({ filename: backup.filename, size: backup.size }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: backup }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create backup' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  try {
    const deleted = await cleanupOldBackups();
    
    await createAuditLog({
      userId: access.session.id,
      action: 'CLEANUP_BACKUPS',
      entity: 'System',
      details: JSON.stringify({ deletedCount: deleted }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: { deletedCount: deleted } });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cleanup backups' }, { status: 500 });
  }
}

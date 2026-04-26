import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { apiLogger } from './logger';
import { db } from './db';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || '/home/z/my-project/backups';

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'auto' | 'manual';
}

/**
 * Create a database backup
 * For SQLite: copy the database file
 * For PostgreSQL: use pg_dump
 */
export async function createBackup(type: 'auto' | 'manual' = 'manual'): Promise<BackupInfo> {
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbUrl = process.env.DATABASE_URL || '';
  
  let filename: string;
  let backupPath: string;

  if (dbUrl.startsWith('file:')) {
    // SQLite backup - copy the file
    const dbPath = dbUrl.replace('file:', '');
    filename = `arwa-${type}-sqlite-${timestamp}.db`;
    backupPath = path.join(BACKUP_DIR, filename);
    
    // Use SQLite backup command for consistency
    try {
      await execAsync(`sqlite3 "${dbPath}" ".backup '${backupPath}'"`);
    } catch {
      // Fallback to file copy
      fs.copyFileSync(dbPath, backupPath);
    }
  } else {
    // PostgreSQL backup
    filename = `arwa-${type}-pg-${timestamp}.sql.gz`;
    backupPath = path.join(BACKUP_DIR, filename);
    
    // Parse PostgreSQL URL
    const pgUrl = new URL(dbUrl);
    const env = {
      ...process.env,
      PGHOST: pgUrl.hostname,
      PGPORT: pgUrl.port || '5432',
      PGUSER: pgUrl.username,
      PGPASSWORD: pgUrl.password,
      PGDATABASE: pgUrl.pathname.slice(1),
    };
    
    await execAsync(`pg_dump --format=plain --no-owner --no-privileges | gzip > "${backupPath}"`, { env });
  }

  const stats = fs.statSync(backupPath);
  
  // Log the backup
  await db.auditLog.create({
    data: {
      action: 'BACKUP_CREATED',
      entity: 'System',
      details: JSON.stringify({ filename, type, size: stats.size }),
    },
  }).catch(() => {}); // Don't fail if audit log fails

  apiLogger.info('Database backup created', { filename, type, size: stats.size });

  return {
    filename,
    path: backupPath,
    size: stats.size,
    createdAt: new Date(),
    type,
  };
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<BackupInfo[]> {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR);
  
  return files
    .filter(f => f.endsWith('.db') || f.endsWith('.sql.gz'))
    .map(filename => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        path: filePath,
        size: stats.size,
        createdAt: stats.mtime,
        type: filename.includes('-auto-') ? 'auto' as const : 'manual' as const,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Delete old backups beyond retention limit
 */
export async function cleanupOldBackups(retentionDays = 30): Promise<number> {
  if (!fs.existsSync(BACKUP_DIR)) return 0;

  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const filename of files) {
    const filePath = path.join(BACKUP_DIR, filename);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtimeMs > retentionMs) {
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    apiLogger.info('Cleaned up old backups', { deletedCount, retentionDays });
  }

  return deletedCount;
}

/**
 * Schedule automatic backups
 * Runs every 24 hours
 */
let backupInterval: NodeJS.Timeout | null = null;

export function startAutoBackup(): void {
  if (backupInterval) return; // Already started
  
  const intervalMs = parseInt(process.env.BACKUP_INTERVAL_MS || '86400000'); // 24 hours default
  
  // Run initial backup after 1 minute
  setTimeout(() => {
    createBackup('auto').catch(err => {
      apiLogger.error('Auto backup failed', { error: err instanceof Error ? err.message : String(err) });
    });
  }, 60000);
  
  // Schedule recurring backups
  backupInterval = setInterval(() => {
    createBackup('auto').catch(err => {
      apiLogger.error('Auto backup failed', { error: err instanceof Error ? err.message : String(err) });
    });
    
    // Also cleanup old backups
    cleanupOldBackups().catch(() => {});
  }, intervalMs);
  
  apiLogger.info('Auto backup scheduled', { intervalMs });
}

export function stopAutoBackup(): void {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
}

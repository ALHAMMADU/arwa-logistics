import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { hashPassword, verifyPassword, generateToken, verifyToken, needsRehash } from '../auth';

describe('Auth Module', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should verify legacy SHA-256 hashed passwords', async () => {
      // The legacy format: plain SHA-256 hex digest of (password + "arwa-salt-2026")
      const password = 'legacyPassword';
      const legacyHash = crypto.createHash('sha256').update(password + 'arwa-salt-2026').digest('hex');
      const isValid = await verifyPassword(password, legacyHash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password against legacy SHA-256 hash', async () => {
      const password = 'legacyPassword';
      const legacyHash = crypto.createHash('sha256').update(password + 'arwa-salt-2026').digest('hex');
      const isValid = await verifyPassword('wrongLegacyPassword', legacyHash);
      expect(isValid).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should return true for legacy SHA-256 hashes', () => {
      // Legacy hashes are plain hex strings that don't start with $2
      const legacyHash = 'a'.repeat(64); // Simulated SHA-256 hex digest
      expect(needsRehash(legacyHash)).toBe(true);
    });

    it('should return false for bcrypt hashes', async () => {
      const hash = await hashPassword('test');
      expect(needsRehash(hash)).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    it('should generate and verify a token', () => {
      const payload = { id: 'user-123', email: 'test@example.com', role: 'ADMIN' };
      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const verified = verifyToken(token);
      expect(verified).toBeDefined();
      expect(verified!.id).toBe(payload.id);
      expect(verified!.email).toBe(payload.email);
      expect(verified!.role).toBe(payload.role);
    });

    it('should reject an invalid token', () => {
      const verified = verifyToken('invalid.token.here');
      expect(verified).toBeNull();
    });

    it('should reject a tampered token', () => {
      const payload = { id: 'user-123', email: 'test@example.com', role: 'ADMIN' };
      const token = generateToken(payload);
      const tampered = token + 'tampered';
      const verified = verifyToken(tampered);
      expect(verified).toBeNull();
    });
  });
});

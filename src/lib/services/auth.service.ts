import { userRepository, passwordResetRepository } from '../repositories';
import { hashPassword, verifyPassword, generateToken, generateResetToken } from '../auth';
import { authLogger } from '../logger';
import { db } from '../db';

export class AuthService {
  async register(data: { email: string; password: string; name: string; phone?: string; company?: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new Error('Email already registered');

    const hashedPassword = await hashPassword(data.password);
    const user = await userRepository.create({
      ...data,
      password: hashedPassword,
      role: 'CUSTOMER',
    } as any);

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    authLogger.info('User registered', { userId: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Invalid email or password');
    if (!user.active) throw new Error('Account is deactivated');

    const valid = await verifyPassword(password, user.password);
    if (!valid) throw new Error('Invalid email or password');

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    authLogger.info('User logged in', { userId: user.id, email: user.email });
    return { user, token };
  }

  async getProfile(userId: string) {
    return userRepository.findWithDetails(userId);
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string; company?: string }) {
    return userRepository.update(userId, data as any);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) throw new Error('Current password is incorrect');

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.update(userId, { password: hashedPassword } as any);
    authLogger.info('Password changed', { userId });
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return null; // Don't reveal if email exists

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await passwordResetRepository.create({
      email,
      token,
      expiresAt,
    } as any);

    authLogger.info('Password reset requested', { email });
    return token;
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await passwordResetRepository.findValidByToken(token);
    if (!reset) throw new Error('Invalid or expired reset token');

    const hashedPassword = await hashPassword(newPassword);
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: reset.email },
        data: { password: hashedPassword },
      });
      await tx.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      });
    });

    authLogger.info('Password reset completed', { email: reset.email });
  }
}

export const authService = new AuthService();

import { userRepository } from '../repositories';
import { hashPassword } from '../auth';
import { apiLogger } from '../logger';

export class UserService {
  async getAllUsers(page = 1, limit = 20) {
    return userRepository.findPaginated({ page, limit, sortBy: 'createdAt', sortOrder: 'desc' });
  }

  async getUserById(id: string) {
    return userRepository.findWithDetails(id);
  }

  async createUser(data: { email: string; password: string; name: string; phone?: string; company?: string; role: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new Error('Email already exists');

    const hashedPassword = await hashPassword(data.password);
    const user = await userRepository.create({ ...data, password: hashedPassword } as any);
    apiLogger.info('User created by admin', { userId: user.id, role: data.role });
    return user;
  }

  async updateUser(id: string, data: { name?: string; phone?: string; company?: string; role?: string; active?: boolean }) {
    return userRepository.update(id, data as any);
  }

  async deleteUser(id: string) {
    return userRepository.update(id, { active: false } as any);
  }

  async getCustomers(page = 1, limit = 20) {
    return userRepository.findByRole('CUSTOMER', { page, limit });
  }

  async getStaff(page = 1, limit = 20) {
    const [admins, warehouse] = await Promise.all([
      userRepository.findByRole('ADMIN', { page, limit }),
      userRepository.findByRole('WAREHOUSE_STAFF', { page, limit }),
    ]);
    return { admins, warehouse };
  }
}

export const userService = new UserService();

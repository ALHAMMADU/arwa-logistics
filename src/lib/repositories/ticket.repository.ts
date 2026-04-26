import { BaseRepository, type PaginatedResult, type PaginationOptions } from './base.repository';
import { db } from '../db';
import type { SupportTicket, TicketMessage, Prisma } from '@prisma/client';

export class TicketRepository extends BaseRepository<SupportTicket, Prisma.SupportTicketCreateInput, Prisma.SupportTicketUpdateInput> {
  protected getModel() { return db.supportTicket; }

  async findByTicketId(ticketId: string): Promise<SupportTicket | null> {
    return this.getModel().findUnique({ where: { ticketId } });
  }

  async findByCustomer(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<SupportTicket>> {
    return this.findPaginated({ ...options, where: { customerId } });
  }

  async findByAssignee(assignedTo: string, options?: PaginationOptions): Promise<PaginatedResult<SupportTicket>> {
    return this.findPaginated({ ...options, where: { assignedTo } });
  }

  async findByStatus(status: string, options?: PaginationOptions): Promise<PaginatedResult<SupportTicket>> {
    return this.findPaginated({ ...options, where: { status } });
  }

  async findWithMessages(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        shipment: { select: { id: true, shipmentId: true, trackingNumber: true } },
        messages: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true, role: true } } } },
      },
    });
  }

  async addMessage(data: Prisma.TicketMessageCreateInput): Promise<TicketMessage> {
    return db.ticketMessage.create({ data });
  }
}

export const ticketRepository = new TicketRepository();

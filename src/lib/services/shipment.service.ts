import { shipmentRepository, shipmentTrackingRepository } from '../repositories';
import { publishMessage } from '../queue';
import { generateShipmentId, generateTrackingNumber } from '../shipping-server';
import { apiLogger } from '../logger';

export class ShipmentService {
  async createShipment(data: {
    senderName: string;
    senderPhone?: string;
    receiverName: string;
    receiverPhone?: string;
    receiverAddress?: string;
    destinationCountry: string;
    destinationCity: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    productDescription: string;
    shipmentValue: number;
    shippingMethod: string;
    shipmentType: string;
    customerId: string;
    warehouseId?: string;
    routeId?: string;
    notes?: string;
  }) {
    const shipmentId = await generateShipmentId();
    const trackingNumber = generateTrackingNumber();

    const shipment = await shipmentRepository.create({
      ...data,
      shipmentId,
      trackingNumber,
      shippingMethod: data.shippingMethod as any,
      shipmentType: data.shipmentType as any,
    } as any);

    // Publish event
    await publishMessage('shipment.created', {
      customerId: data.customerId,
      shipmentId: shipment.id,
      trackingNumber,
    }).catch(err => apiLogger.error('Failed to publish shipment.created', { error: err.message }));

    apiLogger.info('Shipment created', { shipmentId, trackingNumber, customerId: data.customerId });
    return shipment;
  }

  async updateShipmentStatus(id: string, status: string, location: string, notes?: string, userId?: string) {
    const shipment = await shipmentRepository.findById(id);
    if (!shipment) throw new Error('Shipment not found');

    // Update shipment status
    const updated = await shipmentRepository.updateStatus(id, status);

    // Create tracking event
    await shipmentTrackingRepository.create({
      shipmentId: id,
      status: status as any,
      location,
      notes,
    } as any);

    // Publish event
    await publishMessage('shipment.status_updated', {
      customerId: shipment.customerId,
      shipmentId: id,
      status,
      trackingNumber: shipment.trackingNumber,
    }).catch(err => apiLogger.error('Failed to publish shipment.status_updated', { error: err.message }));

    apiLogger.info('Shipment status updated', { shipmentId: id, status, userId });
    return updated;
  }

  async getShipmentWithDetails(id: string) {
    return shipmentRepository.findWithDetails(id);
  }

  async getCustomerShipments(customerId: string, page = 1, limit = 20) {
    return shipmentRepository.findByCustomer(customerId, { page, limit });
  }

  async getShipmentByTracking(trackingNumber: string) {
    return shipmentRepository.findByTrackingNumber(trackingNumber);
  }

  async getShipmentStats() {
    const [total, byStatus, active] = await Promise.all([
      shipmentRepository.count({ active: true }),
      shipmentRepository.countByStatus(),
      shipmentRepository.count({ active: true }),
    ]);
    return { total, byStatus, active };
  }

  async softDelete(id: string) {
    return shipmentRepository.update(id, { active: false } as any);
  }
}

export const shipmentService = new ShipmentService();

// Shipment status flow constants and utilities

export const STATUS_FLOW = [
  'CREATED', 'WAITING_WAREHOUSE_ARRIVAL', 'RECEIVED_AT_WAREHOUSE', 'PROCESSING',
  'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION',
  'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED',
] as const;

export function getStatusProgress(currentStatus: string): number {
  const idx = STATUS_FLOW.indexOf(currentStatus as any);
  return idx >= 0 ? ((idx + 1) / STATUS_FLOW.length) * 100 : 0;
}

export function getNextStatuses(currentStatus: string): string[] {
  const idx = STATUS_FLOW.indexOf(currentStatus as any);
  if (idx < 0) return [...STATUS_FLOW];
  return STATUS_FLOW.slice(idx + 1, idx + 3);
}

export function getStatusIndex(status: string): number {
  return STATUS_FLOW.indexOf(status as any);
}

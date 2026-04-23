// Shipping utility constants - shared between client and server

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Shipment Created',
  WAITING_WAREHOUSE_ARRIVAL: 'Waiting Warehouse Arrival',
  RECEIVED_AT_WAREHOUSE: 'Received at Warehouse',
  PROCESSING: 'Processing',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_DESTINATION: 'Arrived at Destination',
  CUSTOMS_CLEARANCE: 'Customs Clearance',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
};

export const SHIPMENT_STATUS_I18N_KEYS: Record<string, string> = {
  CREATED: 'status.created',
  WAITING_WAREHOUSE_ARRIVAL: 'status.waitingWarehouse',
  RECEIVED_AT_WAREHOUSE: 'status.receivedWarehouse',
  PROCESSING: 'status.processing',
  READY_FOR_DISPATCH: 'status.readyDispatch',
  DISPATCHED: 'status.dispatched',
  IN_TRANSIT: 'status.inTransit',
  ARRIVED_AT_DESTINATION: 'status.arrivedDestination',
  CUSTOMS_CLEARANCE: 'status.customsClearance',
  OUT_FOR_DELIVERY: 'status.outDelivery',
  DELIVERED: 'status.delivered',
};

export const SHIPMENT_STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  WAITING_WAREHOUSE_ARRIVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  RECEIVED_AT_WAREHOUSE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  READY_FOR_DISPATCH: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  DISPATCHED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  IN_TRANSIT: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  ARRIVED_AT_DESTINATION: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CUSTOMS_CLEARANCE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  OUT_FOR_DELIVERY: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export const SHIPPING_METHOD_LABELS: Record<string, string> = {
  AIR: 'Air Freight',
  SEA: 'Sea Freight',
  LAND: 'Land Freight',
};

export const SHIPMENT_TYPE_LABELS: Record<string, string> = {
  PARCEL: 'Parcel',
  LCL: 'LCL (Less than Container Load)',
  FCL: 'FCL (Full Container Load)',
};

import { 
  database, 
  RESTAURANT_ID 
} from './firebase/config';
import { 
  ref, 
  get, 
  set, 
  update, 
  push,
  serverTimestamp 
} from 'firebase/database';
import { 
  Order, 
  OrderItem, 
  Product, 
  Category, 
  Table, 
  Room,
  getProducts,
  getCategories,
  getTables,
  getRooms,
  setTableStatus,
  setRoomStatus
} from './firebase/database';
import * as PC from './utils/precision';

// POS Types
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  emoji?: string;
  variationId?: string;
  variationName?: string;
  unitPrice: number;
  quantity: number;
  note?: string;
  lineTotal: number;
}

export interface POSOrder {
  items: CartItem[];
  subtotal: number;
  discount: { percent: number; amount: number };
  tax: { percent: number; amount: number };
  total: number;
  orderType: 'table' | 'room' | 'takeaway';
  tableId?: string;
  tableNumber?: string;
  roomId?: string;
  roomNumber?: string;
  roomGender?: 'male' | 'female';
  roomPrice?: number;
  customerName?: string;
  customerPhone?: string;
}

export interface PaymentInfo {
  method: 'cash' | 'card';
  receivedAmount: number;
  change: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card';
  receivedAmount?: number;
  change?: number;
  cashierId: string;
  cashierName?: string;
  createdAt: string;
  restaurantId: string;
}

// Database paths
const getPath = (collection: string) => `restaurant-system/${collection}/${RESTAURANT_ID}`;

// Get active products for POS
export const getPOSProducts = async (): Promise<Product[]> => {
  const products = await getProducts();
  return products.filter(p => p.active !== false && p.isActive !== false);
};

// Get active categories for POS
export const getPOSCategories = async (): Promise<Category[]> => {
  const categories = await getCategories();
  return categories.filter(c => c.active !== false && c.isActive !== false);
};

// Get available tables
export const getAvailableTables = async (): Promise<Table[]> => {
  const tables = await getTables();
  return tables.filter(t => t.status === 'available');
};

// Get available rooms (متاحة + محجوزة — لأخذ طلب جديد)
export const getAvailableRooms = async (): Promise<Room[]> => {
  const rooms = await getRooms();
  return rooms.filter(
    r =>
      r.isActive !== false &&
      (r.status === 'available' || r.status === 'reserved')
  );
};

// Create POS Order
export const createPOSOrder = async (
  order: POSOrder,
  userId: string,
  userName?: string
): Promise<string> => {
  const newOrderRef = push(ref(database, getPath('orders')));
  const orderId = newOrderRef.key;
  if (!orderId) throw new Error('فشل في توليد معرف الطلب');
  
  // Clean items - remove undefined values (Firebase doesn't accept undefined)
  const orderItems: OrderItem[] = order.items.map(item => {
    const cleanItem: OrderItem = {
      id: item.productId,
      name: item.name,
      price: item.unitPrice,
      quantity: item.quantity,
      itemTotal: item.lineTotal,
    };
    if (item.emoji) cleanItem.emoji = item.emoji;
    if (item.note) cleanItem.note = item.note;
    return cleanItem;
  });

  // Build order data - only include defined values
  const orderData: any = {
    id: orderId,
    items: orderItems,
    subtotal: order.subtotal || 0,
    discount: {
      percent: order.discount?.percent || 0,
      amount: order.discount?.amount || 0,
    },
    total: order.total || 0,
    status: 'pending',
    paymentStatus: 'pending',
    orderType: order.orderType,
    workerId: userId,
    source: 'cashier',
    restaurantId: RESTAURANT_ID,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
    itemsCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
  };

  // Add optional fields only if they have values
  if (order.tableId) orderData.tableId = order.tableId;
  if (order.tableNumber) orderData.tableNumber = order.tableNumber;
  if (order.roomId) orderData.roomId = order.roomId;
  if (order.roomNumber) orderData.roomNumber = order.roomNumber;
  if (order.roomGender) orderData.roomGender = order.roomGender;
  if (order.roomPrice) orderData.roomPrice = order.roomPrice;
  if (order.customerName) orderData.customerName = order.customerName;
  if (userName) orderData.workerName = userName;

  await set(newOrderRef, orderData);

  // Update table/room status
  if (order.orderType === 'table' && order.tableId) {
    await setTableStatus(order.tableId, 'occupied', orderId);
  } else if (order.orderType === 'room' && order.roomId) {
    await setRoomStatus(order.roomId, 'occupied', orderId);
  }

  return orderId;
};

// Pay and close order
export const payAndCloseOrder = async (
  orderId: string,
  payment: PaymentInfo,
  userId: string,
  userName?: string
): Promise<string> => {
  // Get order
  const orderSnapshot = await get(ref(database, `${getPath('orders')}/${orderId}`));
  if (!orderSnapshot.exists()) {
    throw new Error('Order not found');
  }
  
  const order = orderSnapshot.val() as Order;
  
  // Create invoice - clean data to prevent undefined values
  const invoiceRef = push(ref(database, getPath('invoices')));
  const invoiceId = invoiceRef.key;
  if (!invoiceId) throw new Error('فشل في توليد معرف الفاتورة');
  
  // Clean invoice items (using precision calculation)
  const invoiceItems = order.items.map(item => {
    const cleanItem: any = {
      id: item.id,
      productId: item.id,
      name: item.name,
      unitPrice: item.price || 0,
      quantity: item.quantity,
      // حساب بدقة عالية
      lineTotal: item.itemTotal || PC.multiply(item.price || 0, item.quantity),
    };
    if (item.emoji) cleanItem.emoji = item.emoji;
    if (item.note) cleanItem.note = item.note;
    return cleanItem;
  });

  const invoiceData: any = {
    id: invoiceId,
    orderId: orderId,
    orderNumber: orderId.slice(-6).toUpperCase(),
    items: invoiceItems,
    subtotal: order.subtotal || order.total || 0,
    discount: order.discount?.amount || 0,
    tax: 0,
    total: order.total || 0,
    paymentMethod: payment.method,
    receivedAmount: payment.receivedAmount || order.total || 0,
    change: payment.change || 0,
    cashierId: userId,
    createdAt: new Date().toISOString(),
    restaurantId: RESTAURANT_ID,
  };
  
  // Add optional fields only if defined
  if (userName) invoiceData.cashierName = userName;
  
  await set(invoiceRef, invoiceData);
  
  // Update order
  await update(ref(database, `${getPath('orders')}/${orderId}`), {
    status: 'completed',
    paymentStatus: 'paid',
    paymentMethod: payment.method,
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Release table/room
  if (order.tableId) {
    await setTableStatus(order.tableId, 'available');
  }
  if (order.roomId) {
    await setRoomStatus(order.roomId, 'available');
  }
  
  return invoiceId;
};

// Get today's pending orders (from all sources: cashier, staff-menu, etc.)
export const getTodayPendingOrders = async (): Promise<Order[]> => {
  const snapshot = await get(ref(database, getPath('orders')));
  const data = snapshot.val() || {};
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  
  return Object.entries(data)
    .map(([id, order]: [string, any]) => ({ id, ...order }))
    .filter((order: Order) => {
      const orderTime = order.timestamp || new Date(order.createdAt).getTime();
      return orderTime >= todayStart && 
        order.status !== 'completed' && 
        order.status !== 'cancelled' &&
        order.paymentStatus !== 'paid';
    })
    .sort((a, b) => {
      const timeA = a.timestamp || new Date(a.createdAt).getTime();
      const timeB = b.timestamp || new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
};

// Get order by ID
export const getPOSOrder = async (orderId: string): Promise<Order | null> => {
  const snapshot = await get(ref(database, `${getPath('orders')}/${orderId}`));
  if (!snapshot.exists()) return null;
  return { id: orderId, ...snapshot.val() };
};

// Update order items (add more items to existing order)
export const addItemsToOrder = async (
  orderId: string,
  newItems: CartItem[],
  newTotal: number
): Promise<void> => {
  const orderSnapshot = await get(ref(database, `${getPath('orders')}/${orderId}`));
  if (!orderSnapshot.exists()) {
    throw new Error('Order not found');
  }
  
  const order = orderSnapshot.val() as Order;
  
  const updatedItems = [
    ...order.items,
    ...newItems.map(item => ({
      id: item.productId,
      name: item.name,
      price: item.unitPrice,
      quantity: item.quantity,
      itemTotal: item.lineTotal,
      emoji: item.emoji,
      note: item.note,
    })),
  ];
  
  await update(ref(database, `${getPath('orders')}/${orderId}`), {
    items: updatedItems,
    total: newTotal,
    itemsCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: new Date().toISOString(),
  });
};

// Cancel order
export const cancelPOSOrder = async (orderId: string): Promise<void> => {
  const orderSnapshot = await get(ref(database, `${getPath('orders')}/${orderId}`));
  if (!orderSnapshot.exists()) {
    throw new Error('Order not found');
  }
  
  const order = orderSnapshot.val() as Order;
  
  await update(ref(database, `${getPath('orders')}/${orderId}`), {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  });
  
  // Release table/room
  if (order.tableId) {
    await setTableStatus(order.tableId, 'available');
  }
  if (order.roomId) {
    await setRoomStatus(order.roomId, 'available');
  }
};

// Apply discount to order (using precision calculation)
export const applyDiscount = (
  subtotal: number,
  discountPercent: number
): { percent: number; amount: number } => {
  // تحقق من نسبة الخصم (0-100)
  const clampedPercent = Math.max(0, Math.min(100, discountPercent));
  const amount = PC.percentage(subtotal, clampedPercent);
  return { percent: clampedPercent, amount };
};

// Calculate totals (using precision calculation)
export const calculateTotals = (
  items: CartItem[],
  discountPercent: number = 0,
  taxPercent: number = 0
): { subtotal: number; discount: { percent: number; amount: number }; tax: { percent: number; amount: number }; total: number } => {
  // حساب المجموع الفرعي بدقة عالية
  const subtotal = PC.sum(items.map(item => item.lineTotal));
  
  // حساب الخصم بدقة عالية (مع تحقق 0-100)
  const clampedDiscount = Math.max(0, Math.min(100, discountPercent));
  const discountAmount = PC.percentage(subtotal, clampedDiscount);
  const discount = { percent: clampedDiscount, amount: discountAmount };
  
  // حساب المبلغ بعد الخصم
  const afterDiscount = PC.subtract(subtotal, discountAmount);
  
  // حساب الضريبة بدقة عالية
  const taxAmount = PC.percentage(afterDiscount, taxPercent);
  
  // حساب الإجمالي النهائي
  const total = PC.add(afterDiscount, taxAmount);
  
  return {
    subtotal,
    discount,
    tax: { percent: taxPercent, amount: taxAmount },
    total,
  };
};

// Generate order number
export const generateOrderNumber = (): string => {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
  const timePart = now.getTime().toString().slice(-4);
  return `${datePart}-${timePart}`;
};






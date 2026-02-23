import { database, RESTAURANT_ID } from './firebase/config';
import { 
  ref, 
  get, 
  set, 
  update, 
  push, 
  query, 
  orderByChild, 
  limitToLast,
  startAt,
  endAt,
  equalTo,
  runTransaction
} from 'firebase/database';
import * as PC from './utils/precision';

// Types
export interface InventoryProduct {
  id: string;
  name: string;
  nameEn?: string;
  category: string;
  categoryId: string;
  categoryName?: string;
  sku?: string;
  barcode?: string;
  stockQty: number;
  minStock: number;
  cost?: number;
  price: number;
  imageUrl?: string;
  emoji?: string;
  isActive: boolean;
  lastStockUpdate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjust';
  qtyChange: number;
  prevQty: number;
  newQty: number;
  reason?: string;
  note?: string;
  supplier?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  timestamp: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalInStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  todayMovementsIn: number;
  todayMovementsOut: number;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// Database paths
const getPath = (collection: string) => `restaurant-system/${collection}/${RESTAURANT_ID}`;

// Get stock status
export const getStockStatus = (product: InventoryProduct): StockStatus => {
  if (product.stockQty <= 0) return 'out_of_stock';
  if (product.stockQty <= product.minStock) return 'low_stock';
  return 'in_stock';
};

// Get all inventory products
export const getInventoryProducts = async (): Promise<InventoryProduct[]> => {
  const snapshot = await get(ref(database, getPath('menu')));
  const data = snapshot.val() || {};
  
  const products = Object.entries(data).map(([id, product]: [string, any]) => ({
    id,
    name: product.name || '',
    nameEn: product.nameEn,
    category: product.category || '',
    categoryId: product.categoryId || product.category || '',
    sku: product.sku || '',
    barcode: product.barcode || '',
    stockQty: product.stockQty ?? product.stock ?? 0,
    minStock: product.minStock ?? 10,
    cost: product.cost,
    price: product.price || 0,
    imageUrl: product.imageUrl || product.image,
    emoji: product.emoji,
    isActive: product.active !== false && product.isActive !== false,
    lastStockUpdate: product.lastStockUpdate,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }));

  return products.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
};

// Get inventory stats
export const getInventoryStats = async (): Promise<InventoryStats> => {
  const products = await getInventoryProducts();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  // Get today's movements
  const movementsSnapshot = await get(ref(database, getPath('stock_movements')));
  const movementsData = movementsSnapshot.val() || {};
  
  let todayIn = 0;
  let todayOut = 0;

  Object.values(movementsData).forEach((movement: any) => {
    if (movement.timestamp >= todayStart) {
      if (movement.type === 'in') {
        todayIn += Math.abs(movement.qtyChange);
      } else if (movement.type === 'out') {
        todayOut += Math.abs(movement.qtyChange);
      }
    }
  });

  const totalProducts = products.length;
  const outOfStockCount = products.filter(p => p.stockQty <= 0).length;
  const lowStockCount = products.filter(p => p.stockQty > 0 && p.stockQty <= p.minStock).length;
  const totalInStock = totalProducts - outOfStockCount;
  // حساب قيمة المخزون بدقة عالية
  const totalStockValue = PC.sum(
    products.map(p => PC.multiply(p.stockQty, p.cost || p.price))
  );

  return {
    totalProducts,
    totalInStock,
    lowStockCount,
    outOfStockCount,
    totalStockValue,
    todayMovementsIn: todayIn,
    todayMovementsOut: todayOut,
  };
};

// Add stock (IN) — عملية ذرية باستخدام runTransaction
export const addStock = async (
  productId: string,
  quantity: number,
  userId: string,
  userName?: string,
  note?: string,
  supplier?: string
): Promise<void> => {
  if (quantity <= 0) throw new Error('الكمية يجب أن تكون أكبر من صفر');
  
  const productRef = ref(database, `${getPath('menu')}/${productId}`);
  
  // Atomic transaction to prevent race conditions
  let prevQty = 0;
  let newQty = 0;
  let productName = '';
  
  await runTransaction(ref(database, `${getPath('menu')}/${productId}/stockQty`), (currentQty) => {
    prevQty = currentQty ?? 0;
    newQty = prevQty + quantity;
    return newQty;
  });
  
  // جلب اسم المنتج وتحديث الحقول الإضافية
  const productSnapshot = await get(productRef);
  if (productSnapshot.exists()) {
    const product = productSnapshot.val();
    productName = product.name || '';
    await update(productRef, {
      stock: newQty,
      lastStockUpdate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Create stock movement record
  const movementRef = push(ref(database, getPath('stock_movements')));
  const movement: Omit<StockMovement, 'id'> = {
    productId,
    productName,
    type: 'in',
    qtyChange: quantity,
    prevQty,
    newQty,
    reason: 'إضافة مخزون',
    note,
    supplier,
    createdBy: userId,
    createdByName: userName,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
  };

  await set(movementRef, { id: movementRef.key, ...movement });
};

// Remove stock (OUT) — عملية ذرية
export const removeStock = async (
  productId: string,
  quantity: number,
  reason: string,
  userId: string,
  userName?: string,
  note?: string
): Promise<void> => {
  if (quantity <= 0) throw new Error('الكمية يجب أن تكون أكبر من صفر');
  
  const productRef = ref(database, `${getPath('menu')}/${productId}`);
  
  let prevQty = 0;
  let newQty = 0;
  let productName = '';
  
  await runTransaction(ref(database, `${getPath('menu')}/${productId}/stockQty`), (currentQty) => {
    prevQty = currentQty ?? 0;
    newQty = Math.max(0, prevQty - quantity);
    return newQty;
  });
  
  const productSnapshot = await get(productRef);
  if (productSnapshot.exists()) {
    const product = productSnapshot.val();
    productName = product.name || '';
    await update(productRef, {
      stock: newQty,
      lastStockUpdate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Create stock movement record
  const movementRef = push(ref(database, getPath('stock_movements')));
  const movement: Omit<StockMovement, 'id'> = {
    productId,
    productName,
    type: 'out',
    qtyChange: -quantity,
    prevQty,
    newQty,
    reason,
    note,
    createdBy: userId,
    createdByName: userName,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
  };

  await set(movementRef, { id: movementRef.key, ...movement });
};

// Adjust stock (set exact quantity) — عملية ذرية
export const adjustStock = async (
  productId: string,
  newQuantity: number,
  reason: string,
  userId: string,
  userName?: string,
  note?: string
): Promise<void> => {
  if (newQuantity < 0) throw new Error('الكمية لا يمكن أن تكون سالبة');
  
  const productRef = ref(database, `${getPath('menu')}/${productId}`);
  
  let prevQty = 0;
  let productName = '';
  
  await runTransaction(ref(database, `${getPath('menu')}/${productId}/stockQty`), (currentQty) => {
    prevQty = currentQty ?? 0;
    return newQuantity;
  });
  
  const productSnapshot = await get(productRef);
  if (productSnapshot.exists()) {
    const product = productSnapshot.val();
    productName = product.name || '';
    await update(productRef, {
      stock: newQuantity,
      lastStockUpdate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  const qtyChange = newQuantity - prevQty;

  // Create stock movement record
  const movementRef = push(ref(database, getPath('stock_movements')));
  const movement: Omit<StockMovement, 'id'> = {
    productId,
    productName,
    type: 'adjust',
    qtyChange,
    prevQty,
    newQty: newQuantity,
    reason,
    note,
    createdBy: userId,
    createdByName: userName,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
  };

  await set(movementRef, { id: movementRef.key, ...movement });
};

// Get stock movements for a product
export const getProductStockHistory = async (
  productId: string,
  startDate?: Date,
  endDate?: Date
): Promise<StockMovement[]> => {
  const snapshot = await get(ref(database, getPath('stock_movements')));
  const data = snapshot.val() || {};

  let movements = Object.entries(data)
    .map(([id, movement]: [string, any]) => ({
      id,
      ...movement,
    }))
    .filter((m: StockMovement) => m.productId === productId);

  // Filter by date range
  if (startDate) {
    const startTime = startDate.getTime();
    movements = movements.filter((m: StockMovement) => m.timestamp >= startTime);
  }
  if (endDate) {
    const endTime = endDate.getTime();
    movements = movements.filter((m: StockMovement) => m.timestamp <= endTime);
  }

  return movements.sort((a, b) => b.timestamp - a.timestamp);
};

// Get all stock movements (for admin view)
export const getAllStockMovements = async (
  limit: number = 100,
  startDate?: Date,
  endDate?: Date
): Promise<StockMovement[]> => {
  const snapshot = await get(ref(database, getPath('stock_movements')));
  const data = snapshot.val() || {};

  let movements = Object.entries(data)
    .map(([id, movement]: [string, any]) => ({
      id,
      ...movement,
    }));

  // Filter by date range
  if (startDate) {
    const startTime = startDate.getTime();
    movements = movements.filter((m: StockMovement) => m.timestamp >= startTime);
  }
  if (endDate) {
    const endTime = endDate.getTime();
    movements = movements.filter((m: StockMovement) => m.timestamp <= endTime);
  }

  return movements
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

// Update product stock settings (minStock, cost, sku, barcode)
export const updateProductStockSettings = async (
  productId: string,
  updates: {
    minStock?: number;
    cost?: number;
    sku?: string;
    barcode?: string;
  }
): Promise<void> => {
  const productRef = ref(database, `${getPath('menu')}/${productId}`);
  await update(productRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

// Export inventory to CSV
export const exportInventoryToCSV = (products: InventoryProduct[]): string => {
  const headers = [
    'اسم المنتج',
    'التصنيف',
    'SKU',
    'الباركود',
    'الكمية',
    'الحد الأدنى',
    'التكلفة',
    'السعر',
    'الحالة',
  ];

  const rows = products.map(p => [
    p.name,
    p.categoryName || p.category,
    p.sku || '',
    p.barcode || '',
    p.stockQty.toString(),
    p.minStock.toString(),
    p.cost?.toString() || '',
    p.price.toString(),
    getStockStatus(p) === 'out_of_stock' ? 'نفد' : 
      getStockStatus(p) === 'low_stock' ? 'منخفض' : 'متوفر',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
};

// Download CSV
export const downloadCSV = (csvContent: string, filename: string): void => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// Stock out reasons
export const STOCK_OUT_REASONS = [
  { id: 'sale', label: 'بيع' },
  { id: 'waste', label: 'تالف / هدر' },
  { id: 'return', label: 'مرتجع للمورد' },
  { id: 'damage', label: 'تلف' },
  { id: 'expired', label: 'منتهي الصلاحية' },
  { id: 'internal', label: 'استخدام داخلي' },
  { id: 'other', label: 'سبب آخر' },
];

// Adjustment reasons
export const ADJUSTMENT_REASONS = [
  { id: 'inventory_count', label: 'جرد المخزون' },
  { id: 'correction', label: 'تصحيح خطأ' },
  { id: 'initial', label: 'إدخال أولي' },
  { id: 'system_sync', label: 'مزامنة النظام' },
  { id: 'other', label: 'سبب آخر' },
];






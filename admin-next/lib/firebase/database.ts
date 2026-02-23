import { database, RESTAURANT_ID } from './config';
import { ref, get, set, update, remove, push, query, orderByChild, limitToLast, equalTo, onValue, off, DataSnapshot } from 'firebase/database';
import * as PC from '../utils/precision';

// Types
export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  discount?: { percent: number; amount: number };
  status: 'pending' | 'processing' | 'preparing' | 'ready' | 'paid' | 'completed' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'later';
  paymentStatus?: 'pending' | 'paid';
  customerName?: string;
  tableNumber?: string;
  tableId?: string;
  roomId?: string;
  roomNumber?: string;
  orderType?: 'table' | 'room' | 'takeaway';
  workerId?: string;
  workerName?: string;
  createdAt: string;
  timestamp?: number;
  restaurantId: string;
  source?: string;
  itemsCount?: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  itemTotal?: number;
  emoji?: string;
  note?: string;
}

export interface ProductVariation {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  isDefault?: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  basePrice?: number;
  category: string;
  categoryId?: string;
  image?: string;
  imageUrl?: string;
  active: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  emoji?: string;
  sortOrder?: number;
  variations?: ProductVariation[];
  // Legacy fields
  sizes?: Record<string, { name: string; price: number }>;
  shishaTypes?: Record<string, { name: string; price: number; icon?: string }>;
  isShisha?: boolean;
}

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  emoji?: string;
  order: number;
  sortOrder?: number;
  active: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Worker Permission System
export interface WorkerPermissions {
  // Module access
  modules: {
    staffMenu: boolean;
    orders: boolean;
    tables: boolean;
    rooms: boolean;
    cashier: boolean;
    inventory: boolean;
    reports: boolean;
    products: boolean;
  };
  // Action permissions
  actions: {
    createOrder: boolean;
    editOrder: boolean;
    cancelOrder: boolean;
    processPayment: boolean;
    applyDiscount: boolean;
    viewFinancials: boolean;
    manageProducts: boolean;
    manageTables: boolean;
    manageRooms: boolean;
    dailyClosing: boolean;
  };
}

// Default permissions for new workers
export const getDefaultWorkerPermissions = (): WorkerPermissions => ({
  modules: {
    staffMenu: true,
    orders: false,
    tables: false,
    rooms: false,
    cashier: false,
    inventory: false,
    reports: false,
    products: false,
  },
  actions: {
    createOrder: true,
    editOrder: false,
    cancelOrder: false,
    processPayment: false,
    applyDiscount: false,
    viewFinancials: false,
    manageProducts: false,
    manageTables: false,
    manageRooms: false,
    dailyClosing: false,
  },
});

// Full permissions for admin/cashier
export const getFullPermissions = (): WorkerPermissions => ({
  modules: {
    staffMenu: true,
    orders: true,
    tables: true,
    rooms: true,
    cashier: true,
    inventory: true,
    reports: true,
    products: true,
  },
  actions: {
    createOrder: true,
    editOrder: true,
    cancelOrder: true,
    processPayment: true,
    applyDiscount: true,
    viewFinancials: true,
    manageProducts: true,
    manageTables: true,
    manageRooms: true,
    dailyClosing: true,
  },
});

export interface Worker {
  id: string;
  name?: string;
  fullName?: string;
  username: string;
  password: string;
  position: string;
  phone?: string;
  active?: boolean;
  isActive?: boolean;
  permissions?: 'full' | 'menu-only' | string[]; // Legacy
  detailedPermissions?: WorkerPermissions; // New detailed permissions
  role?: 'staff' | 'cashier' | 'worker';
  restaurantId: string;
}


export interface Restaurant {
  id: string;
  name: string;
  type: string;
  username: string;
  password: string;
  phone?: string;
  address?: string;
  status: string;
}

export interface Table {
  id: string;
  tableNumber: string;
  name?: string;
  area: 'داخلي' | 'VIP';
  status: 'available' | 'reserved' | 'occupied';
  activeOrderId?: string | null;
  activeOrder?: Order | null;
  reservedBy?: string;
  reservedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  status: 'available' | 'reserved' | 'occupied';
  notes?: string;
  isActive: boolean;
  activeOrderId?: string | null;
  activeOrder?: Order | null;
  reservedBy?: string;
  reservedAt?: string;
  // Pricing
  priceType?: 'free' | 'fixed' | 'gender'; // free = مجاني, fixed = سعر ثابت, gender = حسب الجنس
  hourlyRate?: number; // For fixed pricing
  malePrice?: number; // سعر الذكور (e.g., 3 OMR)
  femalePrice?: number; // سعر الإناث (e.g., 0 = free)
  createdAt?: string;
  updatedAt?: string;
}

// Database paths
const getPath = (collection: string) => `restaurant-system/${collection}/${RESTAURANT_ID}`;

// Types for pagination
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Orders - with pagination support
export const getOrders = async (limit?: number): Promise<Order[]> => {
  const snapshot = await get(ref(database, getPath('orders')));
  const data = snapshot.val() || {};
  let orders = Object.entries(data).map(([id, order]: [string, any]) => ({
    id,
    ...order,
  }));
  
  // Sort by timestamp descending
  orders.sort((a, b) => {
    const timeA = a.timestamp || new Date(a.createdAt).getTime();
    const timeB = b.timestamp || new Date(b.createdAt).getTime();
    return timeB - timeA;
  });
  
  // Apply limit if specified
  if (limit && limit > 0) {
    orders = orders.slice(0, limit);
  }
  
  return orders;
};

// Get orders with date range filter (optimized)
export const getOrdersByDateRange = async (dateRange: DateRange, limit?: number): Promise<Order[]> => {
  const snapshot = await get(ref(database, getPath('orders')));
  const data = snapshot.val() || {};
  
  const startTime = dateRange.start.getTime();
  const endTime = dateRange.end.getTime();
  
  let orders = Object.entries(data)
    .map(([id, order]: [string, any]) => ({ id, ...order }))
    .filter((order: Order) => {
      const orderTime = order.timestamp || new Date(order.createdAt).getTime();
      return orderTime >= startTime && orderTime <= endTime;
    })
    .sort((a, b) => {
      const timeA = a.timestamp || new Date(a.createdAt).getTime();
      const timeB = b.timestamp || new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  
  if (limit && limit > 0) {
    orders = orders.slice(0, limit);
  }
  
  return orders;
};

// Helper to get date range for common filters
export const getDateRangeForFilter = (
  filter: 'today' | 'week' | 'month' | 'year' | 'custom',
  customStart?: string,
  customEnd?: string
): DateRange => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case 'today':
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'custom':
      if (customStart) start = new Date(customStart);
      if (customEnd) {
        end.setTime(new Date(customEnd).getTime());
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { start, end };
};

export const getOrder = async (orderId: string): Promise<Order | null> => {
  const snapshot = await get(ref(database, `${getPath('orders')}/${orderId}`));
  if (!snapshot.exists()) return null;
  return { id: orderId, ...snapshot.val() };
};

export const listenToOrders = (callback: (orders: Order[]) => void): () => void => {
  const ordersRef = ref(database, getPath('orders'));
  const unsubscribe = onValue(ordersRef, (snapshot) => {
    const data = snapshot.val() || {};
    const orders = Object.entries(data).map(([id, order]: [string, any]) => ({
      id,
      ...order,
    }));
    callback(orders);
  });
  return unsubscribe;
};

export const updateOrderStatus = async (orderId: string, status: string): Promise<void> => {
  await update(ref(database, `${getPath('orders')}/${orderId}`), {
    status,
    updatedAt: new Date().toISOString(),
  });
};

export const createOrder = async (order: Omit<Order, 'id'>): Promise<string> => {
  const newRef = push(ref(database, getPath('orders')));
  
  // Clean the order data to remove undefined values (Firebase doesn't accept undefined)
  const cleanItems = order.items.map(item => {
    const cleanItem: any = {
      id: item.id,
      name: item.name,
      price: item.price || 0,
      quantity: item.quantity,
      // حساب إجمالي العنصر بدقة عالية
      itemTotal: item.itemTotal || PC.multiply(item.price, item.quantity),
    };
    if (item.emoji) cleanItem.emoji = item.emoji;
    if (item.note) cleanItem.note = item.note;
    return cleanItem;
  });

  const orderData: any = {
    items: cleanItems,
    total: order.total || 0,
    status: order.status || 'pending',
    restaurantId: RESTAURANT_ID,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
    itemsCount: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
  };

  // Add optional fields only if they have values
  if (order.subtotal !== undefined) orderData.subtotal = order.subtotal;
  if (order.discount) orderData.discount = order.discount;
  if (order.paymentMethod) orderData.paymentMethod = order.paymentMethod;
  if (order.paymentStatus) orderData.paymentStatus = order.paymentStatus;
  if (order.customerName) orderData.customerName = order.customerName;
  if (order.tableNumber) orderData.tableNumber = order.tableNumber;
  if (order.tableId) orderData.tableId = order.tableId;
  if (order.roomId) orderData.roomId = order.roomId;
  if (order.roomNumber) orderData.roomNumber = order.roomNumber;
  if (order.orderType) orderData.orderType = order.orderType;
  if (order.workerId) orderData.workerId = order.workerId;
  if (order.workerName) orderData.workerName = order.workerName;
  if (order.source) orderData.source = order.source;

  // Auto-detect table and set tableId/orderType if tableNumber is provided
  let foundTableId: string | null = null;
  if (order.tableNumber && !order.tableId) {
    const table = await getTableByNumber(order.tableNumber);
    if (table) {
      foundTableId = table.id;
      orderData.tableId = table.id;
      orderData.orderType = 'table';
    }
  } else if (order.tableId) {
    foundTableId = order.tableId;
  }

  await set(newRef, orderData);
  const orderId = newRef.key;
  if (!orderId) {
    throw new Error('فشل في إنشاء معرف الطلب');
  }

  // Automatically set table status to 'occupied' when order is created for a table
  if (foundTableId) {
    try {
      await setTableStatus(foundTableId, 'occupied', orderId);
    } catch (error) {
      console.error('Failed to update table status:', error);
      // Don't throw - the order was created successfully
    }
  }

  return orderId;
};

export const listenToOrder = (orderId: string, callback: (order: Order | null) => void): () => void => {
  const orderRef = ref(database, `${getPath('orders')}/${orderId}`);
  const listener = onValue(orderRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: orderId, ...snapshot.val() });
    } else {
      callback(null);
    }
  });
  return () => off(orderRef, 'value', listener);
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  const snapshot = await get(ref(database, getPath('menu')));
  const data = snapshot.val() || {};
  return Object.entries(data).map(([id, product]: [string, any]) => {
    // Convert price to number if it's a string
    const cleanProduct: any = {
      id,
      ...product,
      price: typeof product.price === 'string' ? parseFloat(product.price) || 0 : (product.price || 0),
      basePrice: product.basePrice ? (typeof product.basePrice === 'string' ? parseFloat(product.basePrice) : product.basePrice) : undefined,
    };
    
    // Convert variation prices to numbers
    if (cleanProduct.variations && Array.isArray(cleanProduct.variations)) {
      cleanProduct.variations = cleanProduct.variations.map((v: any) => ({
        ...v,
        price: typeof v.price === 'string' ? parseFloat(v.price) || 0 : (v.price || 0),
      }));
    }
    
    // Convert sizes prices to numbers
    if (cleanProduct.sizes && typeof cleanProduct.sizes === 'object') {
      const cleanSizes: Record<string, { name: string; price: number }> = {};
      Object.entries(cleanProduct.sizes).forEach(([key, size]: [string, any]) => {
        cleanSizes[key] = {
          ...size,
          price: typeof size.price === 'string' ? parseFloat(size.price) || 0 : (size.price || 0),
        };
      });
      cleanProduct.sizes = cleanSizes;
    }
    
    // Convert shishaTypes prices to numbers
    if (cleanProduct.shishaTypes && typeof cleanProduct.shishaTypes === 'object') {
      const cleanShishaTypes: Record<string, { name: string; price: number; icon?: string }> = {};
      Object.entries(cleanProduct.shishaTypes).forEach(([key, type]: [string, any]) => {
        cleanShishaTypes[key] = {
          ...type,
          price: typeof type.price === 'string' ? parseFloat(type.price) || 0 : (type.price || 0),
        };
      });
      cleanProduct.shishaTypes = cleanShishaTypes;
    }
    
    return cleanProduct;
  });
};

export const getProduct = async (productId: string): Promise<Product | null> => {
  const snapshot = await get(ref(database, `${getPath('menu')}/${productId}`));
  if (!snapshot.exists()) return null;
  const product = snapshot.val();
  
  // Convert price to number if it's a string
  const cleanProduct: any = {
    id: productId,
    ...product,
    price: typeof product.price === 'string' ? parseFloat(product.price) || 0 : (product.price || 0),
    basePrice: product.basePrice ? (typeof product.basePrice === 'string' ? parseFloat(product.basePrice) : product.basePrice) : undefined,
  };
  
  // Convert variation prices to numbers
  if (cleanProduct.variations && Array.isArray(cleanProduct.variations)) {
    cleanProduct.variations = cleanProduct.variations.map((v: any) => ({
      ...v,
      price: typeof v.price === 'string' ? parseFloat(v.price) || 0 : (v.price || 0),
    }));
  }
  
  // Convert sizes prices to numbers
  if (cleanProduct.sizes && typeof cleanProduct.sizes === 'object') {
    const cleanSizes: Record<string, { name: string; price: number }> = {};
    Object.entries(cleanProduct.sizes).forEach(([key, size]: [string, any]) => {
      cleanSizes[key] = {
        ...size,
        price: typeof size.price === 'string' ? parseFloat(size.price) || 0 : (size.price || 0),
      };
    });
    cleanProduct.sizes = cleanSizes;
  }
  
  // Convert shishaTypes prices to numbers
  if (cleanProduct.shishaTypes && typeof cleanProduct.shishaTypes === 'object') {
    const cleanShishaTypes: Record<string, { name: string; price: number; icon?: string }> = {};
    Object.entries(cleanProduct.shishaTypes).forEach(([key, type]: [string, any]) => {
      cleanShishaTypes[key] = {
        ...type,
        price: typeof type.price === 'string' ? parseFloat(type.price) || 0 : (type.price || 0),
      };
    });
    cleanProduct.shishaTypes = cleanShishaTypes;
  }
  
  return cleanProduct;
};

export const createProduct = async (product: Omit<Product, 'id'>): Promise<string> => {
  const newRef = push(ref(database, getPath('menu')));
  
  // Remove undefined values and ensure numeric types for prices
  const cleanProduct: Record<string, any> = {};
  Object.entries(product).forEach(([key, value]) => {
    if (value !== undefined) {
      // Ensure price and basePrice are numbers
      if (key === 'price' || key === 'basePrice') {
        cleanProduct[key] = typeof value === 'string' ? parseFloat(value) || 0 : (value || 0);
      } else if (key === 'variations' && Array.isArray(value)) {
        // Ensure variation prices are numbers
        cleanProduct[key] = value.map((v: any) => ({
          ...v,
          price: typeof v.price === 'string' ? parseFloat(v.price) || 0 : (v.price || 0),
        }));
      } else if (key === 'sizes' && typeof value === 'object') {
        // Ensure sizes prices are numbers
        const cleanSizes: Record<string, any> = {};
        Object.entries(value).forEach(([sizeKey, size]: [string, any]) => {
          cleanSizes[sizeKey] = {
            ...size,
            price: typeof size.price === 'string' ? parseFloat(size.price) || 0 : (size.price || 0),
          };
        });
        cleanProduct[key] = cleanSizes;
      } else if (key === 'shishaTypes' && typeof value === 'object') {
        // Ensure shishaTypes prices are numbers
        const cleanTypes: Record<string, any> = {};
        Object.entries(value).forEach(([typeKey, type]: [string, any]) => {
          cleanTypes[typeKey] = {
            ...type,
            price: typeof type.price === 'string' ? parseFloat(type.price) || 0 : (type.price || 0),
          };
        });
        cleanProduct[key] = cleanTypes;
      } else {
        cleanProduct[key] = value;
      }
    }
  });
  
  if (!newRef.key) {
    throw new Error('فشل في إنشاء معرف المنتج');
  }
  await set(newRef, {
    ...cleanProduct,
    category: product.categoryId || product.category,
    categoryId: product.categoryId || product.category,
    active: product.isActive ?? product.active ?? true,
    isActive: product.isActive ?? product.active ?? true,
    createdAt: new Date().toISOString(),
  });
  return newRef.key;
};

export const updateProduct = async (productId: string, updates: Partial<Product>): Promise<void> => {
  const updateData: any = {
    updatedAt: new Date().toISOString(),
  };
  
  // Process updates and ensure numeric types for prices
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      // Ensure price and basePrice are numbers
      if (key === 'price' || key === 'basePrice') {
        updateData[key] = typeof value === 'string' ? parseFloat(value) || 0 : (value || 0);
      } else if (key === 'variations' && Array.isArray(value)) {
        // Ensure variation prices are numbers
        updateData[key] = value.map((v: any) => ({
          ...v,
          price: typeof v.price === 'string' ? parseFloat(v.price) || 0 : (v.price || 0),
        }));
      } else if (key === 'sizes' && typeof value === 'object') {
        // Ensure sizes prices are numbers
        const cleanSizes: Record<string, any> = {};
        Object.entries(value).forEach(([sizeKey, size]: [string, any]) => {
          cleanSizes[sizeKey] = {
            ...size,
            price: typeof size.price === 'string' ? parseFloat(size.price) || 0 : (size.price || 0),
          };
        });
        updateData[key] = cleanSizes;
      } else if (key === 'shishaTypes' && typeof value === 'object') {
        // Ensure shishaTypes prices are numbers
        const cleanTypes: Record<string, any> = {};
        Object.entries(value).forEach(([typeKey, type]: [string, any]) => {
          cleanTypes[typeKey] = {
            ...type,
            price: typeof type.price === 'string' ? parseFloat(type.price) || 0 : (type.price || 0),
          };
        });
        updateData[key] = cleanTypes;
      } else {
        updateData[key] = value;
      }
    }
  });
  
  if (updates.categoryId) {
    updateData.category = updates.categoryId;
  }
  if (updates.isActive !== undefined) {
    updateData.active = updates.isActive;
  }
  
  await update(ref(database, `${getPath('menu')}/${productId}`), updateData);
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await remove(ref(database, `${getPath('menu')}/${productId}`));
};

export const bulkUpdateProducts = async (updates: { id: string; data: Partial<Product> }[]): Promise<void> => {
  const batchUpdates: Record<string, any> = {};
  
  updates.forEach(({ id, data }) => {
    Object.entries(data).forEach(([key, value]) => {
      batchUpdates[`${getPath('menu')}/${id}/${key}`] = value;
    });
    batchUpdates[`${getPath('menu')}/${id}/updatedAt`] = new Date().toISOString();
  });
  
  await update(ref(database), batchUpdates);
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const snapshot = await get(ref(database, getPath('categories')));
  const data = snapshot.val() || {};
  return Object.entries(data)
    .map(([id, category]: [string, any]) => ({
      id,
      ...category,
    }))
    .sort((a, b) => (a.order || a.sortOrder || 0) - (b.order || b.sortOrder || 0));
};

export const createCategory = async (category: Omit<Category, 'id'>): Promise<string> => {
  const newRef = push(ref(database, getPath('categories')));
  
  // Remove undefined values (Firebase doesn't accept undefined)
  const cleanCategory: Record<string, any> = {};
  Object.entries(category).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanCategory[key] = value;
    }
  });
  
  await set(newRef, {
    ...cleanCategory,
    createdAt: new Date().toISOString(),
  });
  if (!newRef.key) throw new Error('فشل في إنشاء معرف الفئة');
  return newRef.key;
};

export const updateCategory = async (categoryId: string, updates: Partial<Category>): Promise<void> => {
  // Remove undefined values (Firebase doesn't accept undefined)
  const cleanUpdates: Record<string, any> = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });
  
  await update(ref(database, `${getPath('categories')}/${categoryId}`), {
    ...cleanUpdates,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await remove(ref(database, `${getPath('categories')}/${categoryId}`));
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  const products = await getProducts();
  return products.filter(p => p.category === categoryId || p.categoryId === categoryId);
};

export const getCategoryProductCount = async (categoryId: string): Promise<number> => {
  const products = await getProductsByCategory(categoryId);
  return products.length;
};

export const moveProductsToCategory = async (fromCategoryId: string, toCategoryId: string): Promise<void> => {
  const products = await getProductsByCategory(fromCategoryId);
  const updates: Record<string, any> = {};
  
  products.forEach(product => {
    updates[`${getPath('menu')}/${product.id}/category`] = toCategoryId;
    updates[`${getPath('menu')}/${product.id}/categoryId`] = toCategoryId;
    updates[`${getPath('menu')}/${product.id}/updatedAt`] = new Date().toISOString();
  });
  
  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
};

// Workers
export const getWorkers = async (): Promise<Worker[]> => {
  const snapshot = await get(ref(database, getPath('workers')));
  const data = snapshot.val() || {};
  return Object.entries(data).map(([id, worker]: [string, any]) => ({
    id,
    ...worker,
  }));
};

export const getWorker = async (workerId: string): Promise<Worker | null> => {
  const snapshot = await get(ref(database, `${getPath('workers')}/${workerId}`));
  if (!snapshot.exists()) return null;
  return { id: workerId, ...snapshot.val() };
};

export const createWorker = async (worker: Omit<Worker, 'id'>): Promise<string> => {
  const newRef = push(ref(database, getPath('workers')));
  await set(newRef, {
    ...worker,
    restaurantId: RESTAURANT_ID,
  });
  if (!newRef.key) throw new Error('فشل في إنشاء معرف الموظف');
  return newRef.key;
};

export const updateWorker = async (workerId: string, updates: Partial<Worker>): Promise<void> => {
  await update(ref(database, `${getPath('workers')}/${workerId}`), updates);
};

export const deleteWorker = async (workerId: string): Promise<void> => {
  await remove(ref(database, `${getPath('workers')}/${workerId}`));
};

// Worker Permission Management
export const updateWorkerPermissions = async (
  workerId: string, 
  permissions: WorkerPermissions
): Promise<void> => {
  await update(ref(database, `${getPath('workers')}/${workerId}`), {
    detailedPermissions: permissions,
  });
};

export const getWorkerPermissions = async (workerId: string): Promise<WorkerPermissions> => {
  const worker = await getWorker(workerId);
  if (!worker) {
    return getDefaultWorkerPermissions();
  }
  
  // If detailed permissions exist, use them
  if (worker.detailedPermissions) {
    return worker.detailedPermissions;
  }
  
  // Migrate from legacy permissions
  if (worker.permissions === 'full') {
    return getFullPermissions();
  }
  
  return getDefaultWorkerPermissions();
};

// Restaurant
export const getRestaurant = async (): Promise<Restaurant | null> => {
  const snapshot = await get(ref(database, `restaurant-system/restaurants/${RESTAURANT_ID}`));
  if (!snapshot.exists()) return null;
  return { id: RESTAURANT_ID, ...snapshot.val() };
};

// Sales/Statistics
export const getTodayOrders = async (): Promise<Order[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  
  const orders = await getOrders();
  return orders.filter((order) => {
    const orderTime = order.timestamp || (order.createdAt ? new Date(order.createdAt).getTime() : 0);
    return orderTime >= todayStart && order.status !== 'cancelled';
  });
};

export const getDateRangeForFilterLegacy = (filter: 'today' | 'week' | 'month' | 'year' | 'custom', customStart?: string, customEnd?: string): DateRange => {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (filter) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      const daysFromSaturday = dayOfWeek === 6 ? 0 : dayOfWeek + 1; // Saturday is start of week
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromSaturday, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = customEnd ? new Date(customEnd) : now;
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return { start, end };
};

// Alias for backward compatibility
export { getOrdersByDateRange as getOrdersByDateRangeNew };

export const getOrdersByDateRangeLegacy = async (dateRange: DateRange): Promise<Order[]> => {
  return getOrdersByDateRange(dateRange);
};

export const updateOrderPaymentStatus = async (orderId: string, paymentStatus: 'pending' | 'paid'): Promise<void> => {
  const updates: any = {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  };
  
  if (paymentStatus === 'paid') {
    updates.paidAt = new Date().toISOString();
  }
  
  await update(ref(database, `${getPath('orders')}/${orderId}`), updates);
};

// Add items to existing order (for occupied tables)
export const addItemsToOrder = async (orderId: string, newItems: OrderItem[]): Promise<void> => {
  const order = await getOrder(orderId);
  if (!order) throw new Error('Order not found');
  
  // Merge new items with existing items
  const existingItems = order.items || [];
  const mergedItems: OrderItem[] = [...existingItems];
  
  for (const newItem of newItems) {
    // Check if item already exists (same id and name)
    const existingIndex = mergedItems.findIndex(item => item.id === newItem.id && item.name === newItem.name);
    
    if (existingIndex >= 0) {
      // Update quantity
      mergedItems[existingIndex].quantity += newItem.quantity;
      mergedItems[existingIndex].itemTotal = 
        PC.multiply(mergedItems[existingIndex].price, mergedItems[existingIndex].quantity);
    } else {
      // Add new item (clean undefined values)
      const cleanItem: OrderItem = {
        id: newItem.id,
        name: newItem.name,
        price: newItem.price || 0,
        quantity: newItem.quantity,
        itemTotal: PC.multiply(newItem.price || 0, newItem.quantity),
      };
      // Only add optional fields if they have values
      if (newItem.emoji) cleanItem.emoji = newItem.emoji;
      if (newItem.note) cleanItem.note = newItem.note;
      
      mergedItems.push(cleanItem);
    }
  }
  
  // Clean all items (remove undefined values)
  const cleanedItems = mergedItems.map(item => {
    const clean: OrderItem = {
      id: item.id,
      name: item.name,
      price: item.price || 0,
      quantity: item.quantity,
      // حساب بدقة عالية
      itemTotal: PC.multiply(item.price || 0, item.quantity),
    };
    if (item.emoji) clean.emoji = item.emoji;
    if (item.note) clean.note = item.note;
    return clean;
  });
  
  // Recalculate total (using precision calculation)
  const newTotal = PC.sum(cleanedItems.map(item => item.itemTotal || 0));
  const itemsCount = cleanedItems.reduce((sum, item) => sum + item.quantity, 0);
  
  await update(ref(database, `${getPath('orders')}/${orderId}`), {
    items: cleanedItems,
    total: newTotal,
    itemsCount,
    updatedAt: new Date().toISOString(),
  });
};

/** إزالة صنف من الطلب (بالترتيب) — للأدمن */
export const removeItemFromOrder = async (orderId: string, itemIndex: number): Promise<void> => {
  const order = await getOrder(orderId);
  if (!order) throw new Error('Order not found');
  const items = order.items || [];
  if (itemIndex < 0 || itemIndex >= items.length) throw new Error('Invalid item index');
  const next = items.filter((_, i) => i !== itemIndex);
  const cleaned = next.map((item) => {
    const c: OrderItem = {
      id: item.id,
      name: item.name,
      price: item.price || 0,
      quantity: item.quantity,
      // حساب بدقة عالية
      itemTotal: item.itemTotal ?? PC.multiply(item.quantity, item.price || 0),
    };
    if (item.emoji) c.emoji = item.emoji;
    if (item.note) c.note = item.note;
    return c;
  });
  // حساب بدقة عالية
  const newTotal = PC.sum(cleaned.map(i => i.itemTotal ?? PC.multiply(i.quantity, i.price)));
  const itemsCount = cleaned.reduce((s, i) => s + i.quantity, 0);
  const updates: Record<string, unknown> = {
    items: cleaned,
    total: newTotal,
    itemsCount,
    updatedAt: new Date().toISOString(),
  };
  await update(ref(database, `${getPath('orders')}/${orderId}`), updates);
};

export const getSalesStats = async (startDate?: Date, endDate?: Date) => {
  const orders = await getOrders();
  
  let filteredOrders = orders.filter((o) => o.status !== 'cancelled');
  
  if (startDate && endDate) {
    const start = startDate.getTime();
    const end = endDate.getTime();
    filteredOrders = filteredOrders.filter((order) => {
      const orderTime = order.timestamp || (order.createdAt ? new Date(order.createdAt).getTime() : 0);
      return orderTime >= start && orderTime <= end;
    });
  }
  
  // حساب بدقة عالية
  const totalRevenue = PC.sum(
    filteredOrders
      .filter((o) => o.status === 'paid' || o.status === 'completed')
      .map(o => o.total || 0)
  );
  
  const ordersCount = filteredOrders.length;
  const paidOrders = filteredOrders.filter((o) => o.status === 'paid' || o.status === 'completed').length;
  const itemsSold = filteredOrders.reduce((sum, o) => sum + (o.itemsCount || o.items?.length || 0), 0);
  
  return {
    totalRevenue,
    ordersCount,
    paidOrders,
    itemsSold,
    averageOrder: paidOrders > 0 ? PC.divide(totalRevenue, paidOrders) : 0,
  };
};

// Tables
export const getTables = async (): Promise<Table[]> => {
  const snapshot = await get(ref(database, getPath('tables')));
  const data = snapshot.val() || {};
  return Object.entries(data).map(([id, table]: [string, any]) => ({
    id,
    ...table,
  }));
};

export const getTable = async (tableId: string): Promise<Table | null> => {
  const snapshot = await get(ref(database, `${getPath('tables')}/${tableId}`));
  if (!snapshot.exists()) return null;
  return { id: tableId, ...snapshot.val() };
};

export const listenToTables = (callback: (tables: Table[]) => void): () => void => {
  const tablesRef = ref(database, getPath('tables'));
  const listener = onValue(tablesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const tables = Object.entries(data).map(([id, table]: [string, any]) => ({
      id,
      ...table,
    }));
    callback(tables);
  });
  return () => off(tablesRef, 'value', listener);
};

// Check if tableNumber is unique
export const isTableNumberUnique = async (tableNumber: string, excludeTableId?: string): Promise<boolean> => {
  const tables = await getTables();
  return !tables.some(t => 
    t.tableNumber === tableNumber && t.id !== excludeTableId
  );
};

// Get table by table number (flexible matching)
export const getTableByNumber = async (tableNumber: string): Promise<Table | null> => {
  const tables = await getTables();
  const searchNum = tableNumber.trim().toLowerCase();
  
  // Extract just the number from the input (e.g., "طاولة 5" -> "5", "Table 3" -> "3")
  const extractNumber = (str: string): string => {
    const match = str.match(/\d+/);
    return match ? match[0] : str;
  };
  
  const inputNum = extractNumber(searchNum);
  
  // Try exact match first
  let table = tables.find(t => t.tableNumber === tableNumber);
  if (table) return table;
  
  // Try matching just the number part
  table = tables.find(t => {
    const tableNum = extractNumber(t.tableNumber.toLowerCase());
    return tableNum === inputNum;
  });
  if (table) return table;
  
  // Try case-insensitive contains match
  table = tables.find(t => 
    t.tableNumber.toLowerCase().includes(searchNum) || 
    searchNum.includes(t.tableNumber.toLowerCase())
  );
  
  return table || null;
};

export const createTable = async (table: Omit<Table, 'id'>): Promise<string> => {
  // Check for duplicate tableNumber
  const isUnique = await isTableNumberUnique(table.tableNumber);
  if (!isUnique) {
    throw new Error(`رقم الطاولة "${table.tableNumber}" موجود مسبقاً`);
  }

  // Remove undefined values to prevent Firebase errors
  const tableData: any = {
    tableNumber: table.tableNumber,
    area: table.area,
    status: table.status || 'available',
    activeOrderId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Only include name if it's provided and not empty
  if (table.name && table.name.trim()) {
    tableData.name = table.name.trim();
  }

  const newRef = push(ref(database, getPath('tables')));
  await set(newRef, tableData);
  if (!newRef.key) throw new Error('فشل في إنشاء معرف الطاولة');
  return newRef.key;
};

export const updateTable = async (tableId: string, updates: Partial<Table>): Promise<void> => {
  // If tableNumber is being updated, check for uniqueness
  if (updates.tableNumber) {
    const isUnique = await isTableNumberUnique(updates.tableNumber, tableId);
    if (!isUnique) {
      throw new Error(`رقم الطاولة "${updates.tableNumber}" موجود مسبقاً`);
    }
  }

  // Remove undefined values to prevent Firebase errors
  const updateData: any = {
    updatedAt: new Date().toISOString(),
  };

  // Only include defined values
  if (updates.tableNumber !== undefined) {
    updateData.tableNumber = updates.tableNumber;
  }
  if (updates.area !== undefined) {
    updateData.area = updates.area;
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }
  if (updates.activeOrderId !== undefined) {
    updateData.activeOrderId = updates.activeOrderId;
  }
  if (updates.reservedBy !== undefined) {
    updateData.reservedBy = updates.reservedBy;
  }
  if (updates.reservedAt !== undefined) {
    updateData.reservedAt = updates.reservedAt;
  }
  // For name: if it's an empty string or undefined, we can either omit it or set it to null
  // If we want to clear the name, we should explicitly set it to null
  if (updates.name !== undefined) {
    if (updates.name && updates.name.trim()) {
      updateData.name = updates.name.trim();
    } else {
      // If name is empty, we can remove it by setting to null (Firebase will remove the field)
      updateData.name = null;
    }
  }

  await update(ref(database, `${getPath('tables')}/${tableId}`), updateData);
};

export const deleteTable = async (tableId: string): Promise<void> => {
  await remove(ref(database, `${getPath('tables')}/${tableId}`));
};

export const setTableStatus = async (
  tableId: string, 
  status: 'available' | 'reserved' | 'occupied',
  activeOrderId?: string | null,
  reservedBy?: string
): Promise<void> => {
  const updates: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  
  if (status === 'available') {
    updates.activeOrderId = null;
    updates.reservedBy = null;
    updates.reservedAt = null;
  } else if (status === 'reserved') {
    updates.reservedBy = reservedBy || null;
    updates.reservedAt = new Date().toISOString();
  } else if (status === 'occupied' && activeOrderId) {
    updates.activeOrderId = activeOrderId;
  }
  
  await update(ref(database, `${getPath('tables')}/${tableId}`), updates);
};

export const getTableWithOrder = async (tableId: string): Promise<Table | null> => {
  const table = await getTable(tableId);
  if (!table) return null;
  
  if (table.activeOrderId) {
    const order = await getOrder(table.activeOrderId);
    return { ...table, activeOrder: order };
  }
  
  return table;
};

export const getOrdersByTable = async (tableId: string): Promise<Order[]> => {
  const orders = await getOrders();
  return orders
    .filter(order => order.tableId === tableId)
    .sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
};

// Rooms
export const getRooms = async (): Promise<Room[]> => {
  const snapshot = await get(ref(database, getPath('rooms')));
  const data = snapshot.val() || {};
  return Object.entries(data)
    .map(([id, room]: [string, any]) => ({
      id,
      ...room,
    }))
    .sort((a, b) => {
      const numA = parseInt(String(a.roomNumber)) || 0;
      const numB = parseInt(String(b.roomNumber)) || 0;
      return numA - numB;
    });
};

export const getRoom = async (roomId: string): Promise<Room | null> => {
  const snapshot = await get(ref(database, `${getPath('rooms')}/${roomId}`));
  if (!snapshot.exists()) return null;
  return { id: roomId, ...snapshot.val() };
};

export const listenToRooms = (callback: (rooms: Room[]) => void): () => void => {
  const roomsRef = ref(database, getPath('rooms'));
  const listener = onValue(roomsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const rooms = Object.entries(data)
      .map(([id, room]: [string, any]) => ({
        id,
        ...room,
      }))
      .sort((a, b) => {
        const numA = parseInt(String(a.roomNumber)) || 0;
        const numB = parseInt(String(b.roomNumber)) || 0;
        return numA - numB;
      });
    callback(rooms);
  });
  return () => off(roomsRef, 'value', listener);
};

export const createRoom = async (room: Omit<Room, 'id'>): Promise<string> => {
  const newRef = push(ref(database, getPath('rooms')));
  
  // Build clean data object, excluding undefined values (Firebase doesn't accept undefined)
  const cleanData: Record<string, unknown> = {
    roomNumber: room.roomNumber,
    status: room.status || 'available',
    isActive: room.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Only add optional fields if they have values
  if (room.name) cleanData.name = room.name;
  if (room.notes) cleanData.notes = room.notes;
  if (room.hourlyRate !== undefined && room.hourlyRate > 0) cleanData.hourlyRate = room.hourlyRate;
  if (room.priceType) cleanData.priceType = room.priceType;
  if (room.malePrice !== undefined) cleanData.malePrice = room.malePrice;
  if (room.femalePrice !== undefined) cleanData.femalePrice = room.femalePrice;
  
  await set(newRef, cleanData);
  if (!newRef.key) throw new Error('فشل في إنشاء معرف الغرفة');
  return newRef.key;
};

export const updateRoom = async (roomId: string, updates: Partial<Room>): Promise<void> => {
  // Filter out undefined values (Firebase doesn't accept undefined)
  const cleanUpdates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });
  
  await update(ref(database, `${getPath('rooms')}/${roomId}`), cleanUpdates);
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  await remove(ref(database, `${getPath('rooms')}/${roomId}`));
};

export const setRoomStatus = async (
  roomId: string, 
  status: 'available' | 'reserved' | 'occupied',
  activeOrderId?: string | null,
  reservedBy?: string
): Promise<void> => {
  const updates: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  
  if (status === 'available') {
    updates.activeOrderId = null;
    updates.reservedBy = null;
    updates.reservedAt = null;
  } else if (status === 'reserved') {
    updates.reservedBy = reservedBy || null;
    updates.reservedAt = new Date().toISOString();
  } else if (status === 'occupied' && activeOrderId) {
    updates.activeOrderId = activeOrderId;
  }
  
  await update(ref(database, `${getPath('rooms')}/${roomId}`), updates);
};

export const getRoomWithOrder = async (roomId: string): Promise<Room | null> => {
  const room = await getRoom(roomId);
  if (!room) return null;
  
  if (room.activeOrderId) {
    const order = await getOrder(room.activeOrderId);
    return { ...room, activeOrder: order };
  }
  
  return room;
};

export const getOrdersByRoom = async (roomId: string): Promise<Order[]> => {
  const orders = await getOrders();
  return orders
    .filter(order => order.roomId === roomId)
    .sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
};

export const getRoomOrders = async (): Promise<Order[]> => {
  const orders = await getOrders();
  return orders
    .filter(order => order.orderType === 'room' || order.roomId)
    .sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
};

export const getRoomOrdersByDateRange = async (dateRange: DateRange): Promise<Order[]> => {
  const orders = await getRoomOrders();
  return orders.filter((order) => {
    const orderTime = order.timestamp || (order.createdAt ? new Date(order.createdAt).getTime() : 0);
    return orderTime >= dateRange.start.getTime() && orderTime <= dateRange.end.getTime();
  });
};

export const createRoomOrder = async (
  roomId: string, 
  orderData: Omit<Order, 'id' | 'createdAt' | 'restaurantId' | 'orderType' | 'roomId'>
): Promise<string> => {
  // Get room details
  const room = await getRoom(roomId);
  if (!room) throw new Error('Room not found');

  // Create the order
  const newRef = push(ref(database, getPath('orders')));
  if (!newRef.key) throw new Error('فشل في إنشاء معرف طلب الغرفة');
  const order: Order = {
    id: newRef.key,
    ...orderData,
    roomId,
    roomNumber: room.roomNumber,
    orderType: 'room',
    restaurantId: RESTAURANT_ID,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
    status: orderData.status || 'pending',
    itemsCount: orderData.items.reduce((sum, item) => sum + item.quantity, 0),
  };
  await set(newRef, order);

  // Update room status to occupied
  await setRoomStatus(roomId, 'occupied', newRef.key);

  return newRef.key;
};

export const closeRoomOrder = async (orderId: string, roomId: string): Promise<void> => {
  // Update order status
  await updateOrderStatus(orderId, 'completed');
  await updateOrderPaymentStatus(orderId, 'paid');
  
  // Release room
  await setRoomStatus(roomId, 'available');
};


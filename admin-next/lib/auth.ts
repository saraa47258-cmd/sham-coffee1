import { database, RESTAURANT_ID } from './firebase/config';
import { ref, get, set, remove, update } from 'firebase/database';
import { WorkerPermissions, getFullPermissions, getDefaultWorkerPermissions } from './firebase/database';

export type UserRole = 'admin' | 'cashier' | 'staff';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  restaurantId: string;
  position?: string;
  permissions?: string[];
  detailedPermissions?: WorkerPermissions; // الصلاحيات التفصيلية
}

interface Session {
  userId: string;
  userType: UserRole;
  createdAt: number;
  expiresAt: number;
  restaurantId?: string;
}

// Check if we're in browser
const isBrowser = typeof window !== 'undefined';

// Session management
const SESSION_KEY = 'auth_session_id';
const USER_DATA_KEY = 'auth_user_data';
const USER_TYPE_KEY = 'auth_user_type';
const AUTH_COOKIE_NAME = 'auth_session';

// مساعد لإدارة الكوكيز
const CookieHelper = {
  set(name: string, value: string, days: number = 1) {
    if (!isBrowser) return;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
  },
  
  get(name: string): string | null {
    if (!isBrowser) return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  },
  
  remove(name: string) {
    if (!isBrowser) return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
};

// تشفير كلمة المرور باستخدام SHA-256 مع salt
export const hashPassword = async (password: string): Promise<string> => {
  if (!isBrowser || !crypto?.subtle) {
    // Fallback: simple hash for SSR/testing
    return `sha256:${password}`;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sham-coffee-salt-v2');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// مقارنة كلمة المرور — تدعم كلمات المرور المُشفّرة والقديمة (نص عادي)
const verifyPassword = async (inputPassword: string, storedPassword: string): Promise<boolean> => {
  // إذا كانت كلمة المرور مشفرة (تبدأ بـ sha256:)
  if (storedPassword.startsWith('sha256:')) {
    const hashedInput = await hashPassword(inputPassword);
    return hashedInput === storedPassword;
  }
  // التوافق مع كلمات المرور القديمة (نص عادي) — مقارنة مباشرة
  // سيتم تحديثها تلقائياً عند تسجيل الدخول
  return inputPassword === storedPassword;
};

// ترقية كلمة المرور القديمة إلى مشفرة عند تسجيل الدخول
const upgradePasswordIfNeeded = async (path: string, password: string, storedPassword: string): Promise<void> => {
  if (!storedPassword.startsWith('sha256:')) {
    const hashed = await hashPassword(password);
    try {
      await update(ref(database, path), { password: hashed });
    } catch { /* silent — non-critical */ }
  }
};

// Login for admin (via restaurants)
export const loginAdmin = async (username: string, password: string): Promise<User> => {
  // First, try to find in restaurants (restaurant admin)
  const adminRef = ref(database, 'restaurant-system/restaurants');
  const snapshot = await get(adminRef);
  const restaurants = snapshot.val() || {};
  
  let adminFound: any = null;
  for (const key in restaurants) {
    const restaurant = restaurants[key];
    const passwordMatch = await verifyPassword(password, restaurant.password);
    if (restaurant.username === username && passwordMatch) {
      adminFound = { id: key, ...restaurant, isRestaurantAdmin: true };
      break;
    }
  }

  // If not found in restaurants, try workers with admin role
  if (!adminFound) {
    const workersRef = ref(database, `restaurant-system/workers/${RESTAURANT_ID}`);
    const workersSnapshot = await get(workersRef);
    const workers = workersSnapshot.val() || {};

    for (const key in workers) {
      const worker = workers[key];
      const passwordMatch = await verifyPassword(password, worker.password);
      if (
        worker.username === username && 
        passwordMatch &&
        (worker.active !== false && worker.isActive !== false)
      ) {
        adminFound = { id: key, ...worker, isWorker: true };
        break;
      }
    }
  }
  
  if (!adminFound) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  // Check if user is active (for workers)
  if (adminFound.isWorker && (adminFound.active === false || adminFound.isActive === false)) {
    throw new Error('هذا الحساب معطل. تواصل مع المدير.');
  }
  
  // Determine role
  const role: UserRole = adminFound.isRestaurantAdmin ? 'admin' : (adminFound.role || 'staff');
  
  // Load detailed permissions for workers
  let detailedPermissions: WorkerPermissions | undefined;
  if (adminFound.isWorker) {
    if (adminFound.detailedPermissions) {
      detailedPermissions = adminFound.detailedPermissions;
    } else if (adminFound.permissions === 'full') {
      detailedPermissions = getFullPermissions();
    } else {
      detailedPermissions = getDefaultWorkerPermissions();
    }
  } else if (role === 'admin') {
    // Admin always has full permissions
    detailedPermissions = getFullPermissions();
  }
  
  // ترقية كلمة المرور القديمة إلى مشفرة
  if (adminFound.isWorker) {
    await upgradePasswordIfNeeded(
      `restaurant-system/workers/${RESTAURANT_ID}/${adminFound.id}`,
      password, adminFound.password || ''
    );
  } else if (adminFound.isRestaurantAdmin) {
    await upgradePasswordIfNeeded(
      `restaurant-system/restaurants/${adminFound.id}`,
      password, adminFound.password || ''
    );
  }
  
  // توليد Session ID آمن باستخدام crypto
  const sessionId = isBrowser && crypto?.randomUUID
    ? crypto.randomUUID()
    : `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  
  const userData: User = {
    id: adminFound.id,
    username: adminFound.username,
    name: adminFound.name || adminFound.fullName || 'مستخدم',
    role,
    restaurantId: RESTAURANT_ID,
    position: adminFound.position,
    permissions: adminFound.permissions,
    detailedPermissions,
  };

  // حفظ في sessionStorage فقط (أكثر أماناً من localStorage)
  if (isBrowser) {
    sessionStorage.setItem(SESSION_KEY, sessionId);
    sessionStorage.setItem(USER_TYPE_KEY, role);
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    
    // حفظ في الكوكي للميدل وير
    CookieHelper.set(AUTH_COOKIE_NAME, JSON.stringify({ 
      sessionId, 
      role, 
      userId: userData.id 
    }), 1);
  }
  
  // Save session to database
  await set(ref(database, `sessions/${sessionId}`), {
    userId: adminFound.id,
    userType: role,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    restaurantId: RESTAURANT_ID,
  });

  // Update last login for workers
  if (adminFound.isWorker) {
    await update(ref(database, `restaurant-system/workers/${RESTAURANT_ID}/${adminFound.id}`), {
      lastLoginAt: new Date().toISOString(),
    });
  }
  
  return userData;
};

// Login for employees (staff/cashier)
export const loginEmployee = async (username: string, password: string): Promise<User> => {
  const workersRef = ref(database, `restaurant-system/workers/${RESTAURANT_ID}`);
  const snapshot = await get(workersRef);
  const workers = snapshot.val() || {};
  
  let workerFound: any = null;
  let workerId: string = '';
  
  for (const key in workers) {
    const worker = workers[key];
    const passwordMatch = await verifyPassword(password, worker.password);
    if (worker.username === username && passwordMatch) {
      workerFound = { id: key, ...worker };
      workerId = key;
      break;
    }
  }
  
  if (!workerFound) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  // Check if active
  if (workerFound.active === false || workerFound.isActive === false) {
    throw new Error('هذا الحساب معطل. تواصل مع المدير.');
  }
  
  const role: UserRole = workerFound.role || 'staff';
  
  // Load detailed permissions
  let detailedPermissions: WorkerPermissions;
  if (workerFound.detailedPermissions) {
    detailedPermissions = workerFound.detailedPermissions;
  } else if (workerFound.permissions === 'full') {
    detailedPermissions = getFullPermissions();
  } else {
    detailedPermissions = getDefaultWorkerPermissions();
  }
  
  // ترقية كلمة المرور القديمة
  await upgradePasswordIfNeeded(
    `restaurant-system/workers/${RESTAURANT_ID}/${workerId}`,
    password, workerFound.password || ''
  );
  
  // توليد Session ID آمن
  const sessionId = isBrowser && crypto?.randomUUID
    ? crypto.randomUUID()
    : `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  
  const userData: User = {
    id: workerId,
    username: workerFound.username,
    name: workerFound.name || workerFound.fullName || 'موظف',
    role,
    restaurantId: RESTAURANT_ID,
    position: workerFound.position,
    permissions: workerFound.permissions,
    detailedPermissions,
  };

  // حفظ في sessionStorage فقط
  if (isBrowser) {
    sessionStorage.setItem(SESSION_KEY, sessionId);
    sessionStorage.setItem(USER_TYPE_KEY, role);
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    
    // حفظ في الكوكي للميدل وير
    CookieHelper.set(AUTH_COOKIE_NAME, JSON.stringify({ 
      sessionId, 
      role, 
      userId: userData.id 
    }), 0.5); // 12 ساعة
  }
  
  // Save session to database
  await set(ref(database, `sessions/${sessionId}`), {
    userId: workerId,
    userType: role,
    createdAt: Date.now(),
    expiresAt: Date.now() + (12 * 60 * 60 * 1000), // 12 hours for employees
    restaurantId: RESTAURANT_ID,
  });

  // Update last login
  await update(ref(database, `restaurant-system/workers/${RESTAURANT_ID}/${workerId}`), {
    lastLoginAt: new Date().toISOString(),
  });
  
  return userData;
};

export const logout = async (): Promise<void> => {
  if (!isBrowser) return;
  
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (sessionId) {
    try { await remove(ref(database, `sessions/${sessionId}`)); } catch { /* silent */ }
  }
  
  // مسح كل البيانات المحلية
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_DATA_KEY);
  sessionStorage.removeItem(USER_TYPE_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(USER_TYPE_KEY);
  
  // مسح الكوكي
  CookieHelper.remove(AUTH_COOKIE_NAME);
};

export const checkAuth = async (): Promise<{ isAuthenticated: boolean; user?: User }> => {
  if (!isBrowser) {
    return { isAuthenticated: false };
  }
  
  // القراءة من sessionStorage فقط (أكثر أماناً)
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  let userDataStr = sessionStorage.getItem(USER_DATA_KEY);
  
  // إذا لم يكن هناك بيانات، تحقق من الكوكي
  if (!sessionId && !userDataStr) {
    const cookieData = CookieHelper.get(AUTH_COOKIE_NAME);
    if (!cookieData) {
      return { isAuthenticated: false };
    }
  }
  
  // إذا كانت بيانات المستخدم موجودة، استخدمها مباشرة
  if (userDataStr) {
    try {
      const userData: User = JSON.parse(userDataStr);
      
      // تحقق اختياري من Firebase (لا يمنع الدخول إذا فشل)
      try {
        const currentSessionId = sessionId || (() => {
          try {
            const cookieData = CookieHelper.get(AUTH_COOKIE_NAME);
            return cookieData ? JSON.parse(cookieData).sessionId : null;
          } catch { return null; }
        })();
        
        if (currentSessionId) {
          const sessionRef = ref(database, `sessions/${currentSessionId}`);
          const snapshot = await get(sessionRef);
          const session: Session | null = snapshot.val();
          
          // Check expiration only if session exists
          if (session && session.expiresAt && Date.now() > session.expiresAt) {
            await remove(sessionRef);
            sessionStorage.clear();
            CookieHelper.remove(AUTH_COOKIE_NAME);
            return { isAuthenticated: false };
          }
        }
        
        // إذا كان المستخدم ليس admin، حاول تحديث الصلاحيات
        if (userData.role !== 'admin' && userData.id) {
          const { getWorker, getFullPermissions, getDefaultWorkerPermissions } = await import('./firebase/database');
          const worker = await getWorker(userData.id);
          
          if (worker) {
            if (worker.detailedPermissions) {
              userData.detailedPermissions = worker.detailedPermissions;
            } else if (worker.permissions === 'full') {
              userData.detailedPermissions = getFullPermissions();
            } else {
              userData.detailedPermissions = getDefaultWorkerPermissions();
            }
            sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
          }
        }
      } catch (error) {
        // إذا فشل الاتصال بـ Firebase، استمر مع البيانات المحلية
      }
      
      return {
        isAuthenticated: true,
        user: userData,
      };
    } catch {
      return { isAuthenticated: false };
    }
  }
  
  // إذا لم تكن البيانات في sessionStorage، حاول استرجاعها من الكوكي + Firebase
  const cookieData = CookieHelper.get(AUTH_COOKIE_NAME);
  if (cookieData) {
    try {
      const parsed = JSON.parse(cookieData);
      if (parsed.sessionId && parsed.userId) {
        const sessionRef = ref(database, `sessions/${parsed.sessionId}`);
        const snapshot = await get(sessionRef);
        const session: Session | null = snapshot.val();
        
        if (session && session.userId && (!session.expiresAt || Date.now() <= session.expiresAt)) {
          // استرجاع بيانات المستخدم من قاعدة البيانات
          try {
            const { getWorker, getFullPermissions, getDefaultWorkerPermissions } = await import('./firebase/database');
            const role = session.userType || parsed.role || 'staff';
            
            if (role === 'admin') {
              // مدير — استرجاع من المطاعم
              const adminRef = ref(database, `restaurant-system/restaurants/${session.userId}`);
              const adminSnap = await get(adminRef);
              if (adminSnap.exists()) {
                const admin = adminSnap.val();
                const userData: User = {
                  id: session.userId,
                  username: admin.username || '',
                  name: admin.name || 'مدير',
                  role: 'admin',
                  restaurantId: RESTAURANT_ID,
                  detailedPermissions: getFullPermissions(),
                };
                sessionStorage.setItem(SESSION_KEY, parsed.sessionId);
                sessionStorage.setItem(USER_TYPE_KEY, 'admin');
                sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
                return { isAuthenticated: true, user: userData };
              }
            }
            
            // موظف
            const worker = await getWorker(session.userId);
            if (worker) {
              let detailedPermissions;
              if (worker.detailedPermissions) detailedPermissions = worker.detailedPermissions;
              else if (worker.permissions === 'full') detailedPermissions = getFullPermissions();
              else detailedPermissions = getDefaultWorkerPermissions();
              
              const userData: User = {
                id: session.userId,
                username: worker.username || '',
                name: worker.name || worker.fullName || 'موظف',
                role: role as UserRole,
                restaurantId: RESTAURANT_ID,
                position: worker.position,
                detailedPermissions,
              };
              sessionStorage.setItem(SESSION_KEY, parsed.sessionId);
              sessionStorage.setItem(USER_TYPE_KEY, role);
              sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
              return { isAuthenticated: true, user: userData };
            }
          } catch {
            // فشل استرجاع البيانات — أعد تسجيل الدخول
          }
        }
      }
    } catch {
      // خطأ في تحليل الكوكي
    }
  }
  
  return { isAuthenticated: false };
};

export const getCurrentUser = (): User | null => {
  if (!isBrowser) return null;
  
  // القراءة من sessionStorage فقط
  const userDataStr = sessionStorage.getItem(USER_DATA_KEY);
  
  if (userDataStr) {
    try {
      return JSON.parse(userDataStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const isAdmin = (): boolean => {
  if (!isBrowser) return false;
  return sessionStorage.getItem(USER_TYPE_KEY) === 'admin';
};

export const isCashier = (): boolean => {
  if (!isBrowser) return false;
  const role = sessionStorage.getItem(USER_TYPE_KEY);
  return role === 'cashier' || role === 'admin';
};

export const isStaff = (): boolean => {
  if (!isBrowser) return false;
  const role = sessionStorage.getItem(USER_TYPE_KEY);
  return role === 'staff' || role === 'cashier' || role === 'admin';
};

// Helper: Get current user with detailed permissions
const getCurrentUserWithPermissions = (): User | null => {
  const user = getCurrentUser();
  if (!user) return null;
  
  // If user doesn't have detailedPermissions, try to load them
  if (!user.detailedPermissions && user.id) {
    // For now, return user as-is - permissions should be loaded during login
    // This is a fallback for edge cases
    return user;
  }
  
  return user;
};

// Check if user has access to a specific module
export const hasModuleAccess = (module: keyof WorkerPermissions['modules']): boolean => {
  if (!isBrowser) return false;
  
  const user = getCurrentUserWithPermissions();
  if (!user) return false;
  
  // Admin always has access
  if (user.role === 'admin') return true;
  
  // Check detailed permissions
  if (user.detailedPermissions) {
    return user.detailedPermissions.modules[module] === true;
  }
  
  // Fallback to role-based check for backward compatibility
  const role = user.role;
  
  // Default module access based on role (legacy)
  const roleModules: Record<Exclude<UserRole, 'admin'>, (keyof WorkerPermissions['modules'])[]> = {
    cashier: ['staffMenu', 'orders', 'tables', 'rooms', 'cashier', 'products'],
    staff: ['staffMenu', 'orders', 'tables', 'rooms'],
  };
  
  return roleModules[role]?.includes(module) ?? false;
};

// Check if user has permission for a specific action
export const hasActionPermission = (action: keyof WorkerPermissions['actions']): boolean => {
  if (!isBrowser) return false;
  
  const user = getCurrentUserWithPermissions();
  if (!user) return false;
  
  // Admin always has all permissions
  if (user.role === 'admin') return true;
  
  // Check detailed permissions
  if (user.detailedPermissions) {
    return user.detailedPermissions.actions[action] === true;
  }
  
  // Fallback: cashier has most permissions, staff has limited
  const role = user.role;
  if (role === 'cashier') {
    // Cashier can do most actions except dailyClosing (admin only)
    return action !== 'dailyClosing';
  }
  
  // Staff has very limited actions
  return action === 'createOrder';
};

// Routes that are admin-only
const adminOnlyRoutes = [
  '/admin/workers',
  '/admin/permissions',
];

// Map routes to modules
const routeToModuleMap: Record<string, keyof WorkerPermissions['modules']> = {
  '/admin/staff-menu': 'staffMenu',
  '/admin/orders': 'orders',
  '/admin/tables': 'tables',
  '/admin/rooms': 'rooms',
  '/admin/room-orders': 'rooms', // Room orders require rooms module
  '/admin/cashier': 'cashier',
  '/admin/inventory': 'inventory',
  '/admin/reports': 'reports',
  '/admin/products': 'products',
  '/admin/menu': 'products', // Menu requires products module
};

// Check if user has permission to access a route
export const hasRouteAccess = (path: string): boolean => {
  if (!isBrowser) return false;
  
  const user = getCurrentUserWithPermissions();
  if (!user) return false;
  
  // Admin has full access
  if (user.role === 'admin') return true;
  
  // Check if route is admin-only
  for (const adminRoute of adminOnlyRoutes) {
    if (path.startsWith(adminRoute)) {
      return false; // Only admin can access these routes
    }
  }
  
  // Dashboard is accessible to all authenticated users
  if (path === '/admin' || path === '/admin/') return true;
  
  // Check module-based access
  for (const [route, module] of Object.entries(routeToModuleMap)) {
    if (path.startsWith(route)) {
      return hasModuleAccess(module);
    }
  }
  
  // If route not in map, deny access (secure by default)
  return false;
};

// Get user role label
export const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'admin': return 'مدير';
    case 'cashier': return 'كاشير';
    case 'staff': return 'موظف';
    default: return 'مستخدم';
  }
};

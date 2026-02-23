import { database, RESTAURANT_ID } from './firebase/config';
import { 
  ref, 
  get, 
  set, 
  update, 
  remove, 
  push,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import { hashPassword } from './auth';

// Types
export type EmployeeRole = 'staff' | 'cashier' | 'admin';

export interface Employee {
  id: string;
  uid?: string; // Firebase Auth UID
  fullName: string;
  username: string;
  email?: string;
  role: EmployeeRole;
  isActive: boolean;
  phone?: string;
  position?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  createdBy?: string;
  permissions?: string[];
}

export interface CreateEmployeeData {
  fullName: string;
  username: string;
  password: string;
  role: EmployeeRole;
  phone?: string;
  position?: string;
}

export interface UpdateEmployeeData {
  fullName?: string;
  role?: EmployeeRole;
  isActive?: boolean;
  phone?: string;
  position?: string;
}

// Permission labels for display
export const PERMISSION_LABELS: Record<string, string> = {
  'dashboard': 'لوحة التحكم',
  'staff-menu': 'منيو الموظفين',
  'cashier': 'الكاشير',
  'orders': 'الطلبات',
  'tables': 'الطاولات',
  'rooms': 'الغرف',
  'room-orders': 'طلبات الغرف',
  'products': 'المنتجات',
  'menu': 'المنيو',
  'inventory': 'المخزن',
  'workers': 'إدارة الموظفين',
  'reports': 'التقارير',
  'all': 'صلاحيات كاملة',
};

// Role labels and colors
export const ROLE_CONFIG: Record<EmployeeRole, { 
  label: string; 
  color: string; 
  bgColor: string;
  description: string;
  permissions: string[];
}> = {
  admin: {
    label: 'مدير',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.1)',
    description: 'صلاحيات كاملة للنظام',
    permissions: ['dashboard', 'staff-menu', 'cashier', 'orders', 'tables', 'rooms', 'room-orders', 'products', 'menu', 'inventory', 'workers', 'reports'],
  },
  cashier: {
    label: 'كاشير',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.1)',
    description: 'الكاشير، الطلبات، الطاولات، الغرف',
    permissions: ['staff-menu', 'cashier', 'orders', 'tables', 'rooms', 'room-orders'],
  },
  staff: {
    label: 'موظف',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    description: 'منيو الموظفين والطلبات فقط',
    permissions: ['staff-menu', 'orders'],
  },
};

// Database paths
const getPath = (collection: string) => `restaurant-system/${collection}/${RESTAURANT_ID}`;

// Normalize role (for backward compatibility with old 'worker' role)
const normalizeRole = (role: string | undefined): EmployeeRole => {
  if (!role) return 'staff';
  if (role === 'worker') return 'staff';
  if (role === 'admin' || role === 'cashier' || role === 'staff') return role;
  return 'staff';
};

// Get all employees
export const getEmployees = async (): Promise<Employee[]> => {
  const snapshot = await get(ref(database, getPath('workers')));
  const data = snapshot.val() || {};

  return Object.entries(data)
    .map(([id, employee]: [string, any]) => ({
      id,
      uid: employee.uid || id,
      fullName: employee.name || employee.fullName || '',
      username: employee.username || '',
      email: employee.email,
      role: normalizeRole(employee.role),
      isActive: employee.active !== false && employee.isActive !== false,
      phone: employee.phone,
      position: employee.position,
      createdAt: employee.createdAt || new Date().toISOString(),
      updatedAt: employee.updatedAt,
      lastLoginAt: employee.lastLoginAt,
      createdBy: employee.createdBy,
      permissions: employee.permissions,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
};

// Get employee by ID
export const getEmployee = async (employeeId: string): Promise<Employee | null> => {
  const snapshot = await get(ref(database, `${getPath('workers')}/${employeeId}`));
  if (!snapshot.exists()) return null;
  
  const employee = snapshot.val();
  return {
    id: employeeId,
    uid: employee.uid || employeeId,
    fullName: employee.name || employee.fullName || '',
    username: employee.username || '',
    email: employee.email,
    role: normalizeRole(employee.role),
    isActive: employee.active !== false && employee.isActive !== false,
    phone: employee.phone,
    position: employee.position,
    createdAt: employee.createdAt || new Date().toISOString(),
    updatedAt: employee.updatedAt,
    lastLoginAt: employee.lastLoginAt,
    createdBy: employee.createdBy,
    permissions: employee.permissions,
  };
};

// Check if username exists
export const checkUsernameExists = async (username: string): Promise<boolean> => {
  const employees = await getEmployees();
  return employees.some(e => e.username.toLowerCase() === username.toLowerCase());
};

// Create employee (without Firebase Auth - for simple username/password)
export const createEmployee = async (
  data: CreateEmployeeData,
  createdBy: string
): Promise<string> => {
  // Check username uniqueness
  const exists = await checkUsernameExists(data.username);
  if (exists) {
    throw new Error('اسم المستخدم مستخدم بالفعل');
  }

  const employeeRef = push(ref(database, getPath('workers')));
  const employeeId = employeeRef.key!;

  const employee: Omit<Employee, 'id'> & { password: string } = {
    uid: employeeId,
    fullName: data.fullName,
    username: data.username,
    password: await hashPassword(data.password),
    role: data.role,
    isActive: true,
    phone: data.phone,
    position: data.position || getRolePosition(data.role),
    createdAt: new Date().toISOString(),
    createdBy,
    permissions: ROLE_CONFIG[data.role].permissions,
  };

  await set(employeeRef, employee);
  return employeeId;
};

// Update employee
export const updateEmployee = async (
  employeeId: string,
  data: UpdateEmployeeData
): Promise<void> => {
  const updates: any = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (data.fullName) {
    updates.name = data.fullName;
  }

  if (data.role) {
    updates.permissions = ROLE_CONFIG[data.role].permissions;
    updates.position = data.position || getRolePosition(data.role);
  }

  if (data.isActive !== undefined) {
    updates.active = data.isActive;
  }

  await update(ref(database, `${getPath('workers')}/${employeeId}`), updates);
};

// Toggle employee active status
export const toggleEmployeeStatus = async (
  employeeId: string,
  isActive: boolean
): Promise<void> => {
  await update(ref(database, `${getPath('workers')}/${employeeId}`), {
    isActive,
    active: isActive,
    updatedAt: new Date().toISOString(),
  });
};

// Delete employee (with session cleanup)
export const deleteEmployee = async (employeeId: string): Promise<void> => {
  // حذف جلسات الموظف النشطة
  try {
    const sessionsRef = ref(database, 'sessions');
    const sessionsSnap = await get(sessionsRef);
    const sessions = sessionsSnap.val() || {};
    const deletePromises: Promise<void>[] = [];
    for (const [sessionId, session] of Object.entries(sessions) as [string, any][]) {
      if (session.userId === employeeId) {
        deletePromises.push(remove(ref(database, `sessions/${sessionId}`)));
      }
    }
    await Promise.all(deletePromises);
  } catch { /* التنظيف غير حرج */ }
  
  await remove(ref(database, `${getPath('workers')}/${employeeId}`));
};

// Reset password
export const resetEmployeePassword = async (
  employeeId: string,
  newPassword: string
): Promise<void> => {
  const hashedPassword = await hashPassword(newPassword);
  await update(ref(database, `${getPath('workers')}/${employeeId}`), {
    password: hashedPassword,
    updatedAt: new Date().toISOString(),
  });
};

// Get default position based on role
const getRolePosition = (role: EmployeeRole): string => {
  switch (role) {
    case 'admin': return 'مدير';
    case 'cashier': return 'كاشير';
    case 'staff': return 'نادل';
    default: return 'موظف';
  }
};

// Authenticate employee (for login)
export const authenticateEmployee = async (
  username: string,
  password: string
): Promise<Employee | null> => {
  const snapshot = await get(ref(database, getPath('workers')));
  const data = snapshot.val() || {};

  for (const [id, employee] of Object.entries(data) as [string, any][]) {
    if (
      employee.username === username &&
      employee.password === password &&
      (employee.active !== false && employee.isActive !== false)
    ) {
      // Update last login
      await update(ref(database, `${getPath('workers')}/${id}`), {
        lastLoginAt: new Date().toISOString(),
      });

      return {
        id,
        uid: employee.uid || id,
        fullName: employee.name || employee.fullName || '',
        username: employee.username,
        role: normalizeRole(employee.role),
        isActive: true,
        createdAt: employee.createdAt,
        permissions: employee.permissions,
      };
    }
  }

  return null;
};

// Check if user has permission
export const hasPermission = (
  role: EmployeeRole,
  requiredPermission: string
): boolean => {
  const roleConfig = ROLE_CONFIG[role];
  if (roleConfig.permissions.includes('all')) return true;
  return roleConfig.permissions.includes(requiredPermission);
};

// Get allowed routes for role
export const getAllowedRoutes = (role: EmployeeRole): string[] => {
  switch (role) {
    case 'admin':
      return ['/admin', '/admin/*'];
    case 'cashier':
      return ['/admin/cashier', '/admin/orders', '/admin/tables', '/admin/rooms', '/admin/room-orders'];
    case 'staff':
      return ['/admin/staff-menu', '/admin/orders'];
    default:
      return [];
  }
};

// Check if route is allowed for role
export const isRouteAllowed = (role: EmployeeRole, path: string): boolean => {
  if (role === 'admin') return true;
  
  const allowedRoutes = getAllowedRoutes(role);
  return allowedRoutes.some(route => {
    if (route.endsWith('/*')) {
      return path.startsWith(route.replace('/*', ''));
    }
    return path === route;
  });
};


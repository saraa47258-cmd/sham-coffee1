'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkAuth, getCurrentUser, User, hasRouteAccess } from '../auth';

export default function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const verifyAuth = async () => {
      console.log('🔍 ProtectedRoute: Starting auth verification...');
      
      // تحقق مما هو موجود في Storage
      const sessionData = sessionStorage.getItem('auth_user_data');
      const localData = localStorage.getItem('auth_user_data');
      console.log('📦 sessionStorage data exists:', !!sessionData);
      console.log('📦 localStorage data exists:', !!localData);
      
      if (sessionData) {
        console.log('📦 sessionStorage user:', JSON.parse(sessionData).name);
      }
      if (localData) {
        console.log('📦 localStorage user:', JSON.parse(localData).name);
      }
      
      // فحص سريع للـ sessionStorage أولاً
      const quickUser = getCurrentUser();
      console.log('👤 getCurrentUser result:', quickUser?.name || 'null');
      
      if (quickUser) {
        // المستخدم موجود في sessionStorage، اعرض المحتوى فوراً
        if (requireAdmin && quickUser.role !== 'admin') {
          console.log('⛔ User is not admin, redirecting...');
          router.push('/login');
          return;
        }
        
        const currentPath = pathname || window.location.pathname;
        if (!hasRouteAccess(currentPath)) {
          console.log('⛔ User has no access to:', currentPath);
          router.push('/admin');
          return;
        }
        
        console.log('✅ User authenticated locally:', quickUser.name);
        setUser(quickUser);
        setLoading(false);
        
        // تحقق في الخلفية من صحة الجلسة (بدون حجب)
        checkAuth().then(authResult => {
          console.log('🔄 Background check result:', authResult.isAuthenticated);
          if (!authResult.isAuthenticated) {
            console.log('⚠️ Session expired, redirecting...');
            router.push('/login');
          } else if (authResult.user) {
            setUser(authResult.user);
          }
        }).catch(err => {
          console.warn('⚠️ Background auth check failed:', err);
        });
        
        return;
      }
      
      // إذا لم يكن في sessionStorage، تحقق بشكل كامل
      console.log('🔄 No local user, doing full checkAuth...');
      try {
        const authResult = await checkAuth();
        console.log('🔄 Full checkAuth result:', authResult.isAuthenticated, authResult.user?.name);
        
        if (!authResult.isAuthenticated || !authResult.user) {
          console.log('❌ Not authenticated, redirecting to login...');
          setDebugInfo('Not authenticated');
          router.push('/login');
          return;
        }
        
        if (requireAdmin && authResult.user.role !== 'admin') {
          console.log('⛔ Require admin but user is:', authResult.user.role);
          router.push('/login');
          return;
        }
        
        const currentPath = pathname || window.location.pathname;
        if (!hasRouteAccess(currentPath)) {
          router.push('/admin');
          return;
        }
        
        console.log('✅ User authenticated via checkAuth:', authResult.user.name);
        setUser(authResult.user);
        setLoading(false);
      } catch (error) {
        console.error('❌ Auth verification error:', error);
        setDebugInfo('Error: ' + String(error));
        // عرض الخطأ لمدة 3 ثوان قبل إعادة التوجيه
        setTimeout(() => router.push('/login'), 3000);
      }
    };
    
    verifyAuth();
  }, [router, requireAdmin, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">جاري التحميل...</p>
          {debugInfo && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg max-w-md mx-auto">
              <p className="text-red-300 text-sm font-mono break-all">{debugInfo}</p>
              <p className="text-gray-400 text-xs mt-2">سيتم إعادة التوجيه خلال 3 ثوان...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

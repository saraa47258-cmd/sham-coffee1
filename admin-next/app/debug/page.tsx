'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [sessionData, setSessionData] = useState<string>('');
  const [localData, setLocalData] = useState<string>('');
  const [cookieData, setCookieData] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // قراءة البيانات المخزنة
    const session = sessionStorage.getItem('auth_user_data');
    const local = localStorage.getItem('auth_user_data');
    const sessionId = sessionStorage.getItem('auth_session_id');
    const localSessionId = localStorage.getItem('auth_session_id');
    
    setSessionData(session ? `✅ موجود: ${JSON.parse(session).name}` : '❌ غير موجود');
    setLocalData(local ? `✅ موجود: ${JSON.parse(local).name}` : '❌ غير موجود');
    setCookieData(document.cookie || '❌ لا يوجد cookies');
  }, []);

  const testLogin = async () => {
    setLoading(true);
    setTestResult('جاري الاختبار...');
    
    try {
      const { loginAdmin } = await import('@/lib/auth');
      
      setTestResult('🔄 محاولة تسجيل الدخول...');
      const user = await loginAdmin('admin', 'admin123');
      
      // تحقق من التخزين
      const session = sessionStorage.getItem('auth_user_data');
      const local = localStorage.getItem('auth_user_data');
      
      setTestResult(`✅ نجح تسجيل الدخول!
      
المستخدم: ${user.name}
الدور: ${user.role}
sessionStorage: ${session ? 'محفوظ ✅' : 'غير محفوظ ❌'}
localStorage: ${local ? 'محفوظ ✅' : 'غير محفوظ ❌'}`);
      
      // تحديث العرض
      setSessionData(session ? `✅ موجود: ${JSON.parse(session).name}` : '❌ غير موجود');
      setLocalData(local ? `✅ موجود: ${JSON.parse(local).name}` : '❌ غير موجود');
      
    } catch (error: any) {
      setTestResult(`❌ فشل: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    sessionStorage.clear();
    localStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    setSessionData('❌ تم المسح');
    setLocalData('❌ تم المسح');
    setCookieData('❌ تم المسح');
    setTestResult('تم مسح جميع البيانات');
  };

  const goToAdmin = () => {
    window.location.href = '/admin/';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: 'white',
      padding: '40px',
      fontFamily: 'monospace',
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>🔧 صفحة التشخيص</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', color: '#a5b4fc', marginBottom: '10px' }}>حالة التخزين:</h2>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '10px' }}>
          <p><strong>sessionStorage:</strong> {sessionData}</p>
          <p><strong>localStorage:</strong> {localData}</p>
          <p><strong>Cookies:</strong> {cookieData}</p>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', color: '#a5b4fc', marginBottom: '10px' }}>اختبار تسجيل الدخول:</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            onClick={testLogin}
            disabled={loading}
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'جاري...' : '🔐 اختبار الدخول (admin/admin123)'}
          </button>
          
          <button 
            onClick={clearAll}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            🗑️ مسح كل البيانات
          </button>
          
          <button 
            onClick={goToAdmin}
            style={{
              background: '#22c55e',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ➡️ الذهاب للوحة التحكم
          </button>
        </div>
        
        {testResult && (
          <pre style={{ 
            background: '#1e293b', 
            padding: '20px', 
            borderRadius: '10px',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
          }}>
            {testResult}
          </pre>
        )}
      </div>
      
      <div style={{ marginTop: '40px', padding: '20px', background: '#1e293b', borderRadius: '10px' }}>
        <h3 style={{ color: '#fbbf24', marginBottom: '10px' }}>📋 تعليمات:</h3>
        <ol style={{ lineHeight: '2' }}>
          <li>اضغط "🗑️ مسح كل البيانات" أولاً</li>
          <li>اضغط "🔐 اختبار الدخول"</li>
          <li>إذا نجح، اضغط "➡️ الذهاب للوحة التحكم"</li>
        </ol>
      </div>
    </div>
  );
}

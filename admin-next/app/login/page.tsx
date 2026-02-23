'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/lib/auth';
import { useTranslation } from '@/lib/context/LanguageContext';
import LanguageSwitcher from '@/lib/components/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { t, isRtl } = useTranslation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      console.log('🔐 Attempting login with:', username);
      const user = await loginAdmin(username, password);
      console.log('✅ Login successful:', user?.name, user?.role);
      
      // تأكد من حفظ البيانات
      const savedData = sessionStorage.getItem('auth_user_data');
      const savedLocal = localStorage.getItem('auth_user_data');
      console.log('📦 Session stored:', !!savedData, '| Local stored:', !!savedLocal);
      
      if (!savedData && !savedLocal) {
        setError(t.auth.loginError);
        setLoading(false);
        return;
      }
      
      // انتظر قليلاً ثم قم بالتوجيه
      console.log('🚀 Waiting before redirect...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🚀 Redirecting to /admin/...');
      window.location.replace('/admin/');
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || t.auth.loginError);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {/* Gradient Orbs */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float 10s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.08) 0%, transparent 60%)',
          filter: 'blur(100px)',
        }} />

        {/* Grid Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
        }} />
      </div>

      {/* Login Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        zIndex: 10,
      }}>
        {/* Logo Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          {/* Coffee Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)',
          }}>
            <svg 
              width="40" 
              height="40" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="url(#gradient)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" x2="6" y1="2" y2="4" />
              <line x1="10" x2="10" y1="2" y2="4" />
              <line x1="14" x2="14" y1="2" y2="4" />
            </svg>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
            letterSpacing: '-0.5px',
          }}>
            {t.auth.loginTitle}
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'rgba(148, 163, 184, 0.8)',
            fontWeight: 400,
          }}>
            {t.auth.loginSubtitle}
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: `
            0 4px 6px rgba(0, 0, 0, 0.1),
            0 10px 40px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
        }}>
          <form onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <span style={{ fontSize: '14px', color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: '10px',
              }}>
                {t.auth.username}
              </label>
              <div style={{
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  ...(isRtl ? { right: '16px' } : { left: '16px' }),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'username' ? '#a855f7' : '#64748b',
                  transition: 'color 0.2s',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  autoComplete="username"
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={t.auth.username}
                  style={{
                    width: '100%',
                    padding: isRtl ? '16px 48px 16px 16px' : '16px 16px 16px 48px',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    border: focusedField === 'username' 
                      ? '2px solid rgba(168, 85, 247, 0.5)' 
                      : '2px solid rgba(71, 85, 105, 0.3)',
                    borderRadius: '14px',
                    fontSize: '15px',
                    color: '#f1f5f9',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: focusedField === 'username' 
                      ? '0 0 0 4px rgba(168, 85, 247, 0.1)' 
                      : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: '10px',
              }}>
                {t.auth.password}
              </label>
              <div style={{
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  ...(isRtl ? { right: '16px' } : { left: '16px' }),
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: focusedField === 'password' ? '#a855f7' : '#64748b',
                  transition: 'color 0.2s',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={t.auth.password}
                  style={{
                    width: '100%',
                    padding: '16px 48px',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    border: focusedField === 'password' 
                      ? '2px solid rgba(168, 85, 247, 0.5)' 
                      : '2px solid rgba(71, 85, 105, 0.3)',
                    borderRadius: '14px',
                    fontSize: '15px',
                    color: '#f1f5f9',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: focusedField === 'password' 
                      ? '0 0 0 4px rgba(168, 85, 247, 0.1)' 
                      : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    ...(isRtl ? { left: '16px' } : { right: '16px' }),
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#a855f7'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" x2="23" y1="1" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: loading 
                  ? 'rgba(99, 102, 241, 0.5)' 
                  : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: loading 
                  ? 'none' 
                  : '0 4px 20px rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)';
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  {t.auth.loggingIn}
                </>
              ) : (
                <>
                  {t.auth.loginButton}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }}>
                    <line x1="5" x2="19" y1="12" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'rgba(100, 116, 139, 0.6)',
          marginTop: '32px',
        }}>
          © 2026 {t.common.appName}
        </p>

        {/* Language Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <LanguageSwitcher variant="topbar" />
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: #64748b !important;
        }
      `}</style>
    </div>
  );
}

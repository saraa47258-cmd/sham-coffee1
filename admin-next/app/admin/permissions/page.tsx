'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getWorkers,
  updateWorkerPermissions,
  Worker,
  WorkerPermissions,
  getDefaultWorkerPermissions,
  getFullPermissions,
} from '@/lib/firebase/database';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { useTranslation } from '@/lib/context/LanguageContext';
import { useScreenSize } from '@/lib/hooks/useScreenSize';
import { Shield, Users, Check, X, Save, RefreshCw, Eye, EyeOff, ChevronLeft } from 'lucide-react';

// Module and action labels
const moduleLabels: Record<keyof WorkerPermissions['modules'], string> = {
  staffMenu: 'staffMenu',
  orders: 'orders',
  tables: 'tables',
  rooms: 'rooms',
  cashier: 'cashier',
  inventory: 'inventory',
  reports: 'reports',
  products: 'products',
};

const actionLabels: Record<keyof WorkerPermissions['actions'], string> = {
  createOrder: 'createOrder',
  editOrder: 'editOrder',
  cancelOrder: 'cancelOrder',
  processPayment: 'processPayment',
  applyDiscount: 'applyDiscount',
  viewFinancials: 'viewFinancials',
  manageProducts: 'manageProducts',
  manageTables: 'manageTables',
  manageRooms: 'manageRooms',
  dailyClosing: 'dailyClosingAction',
};

export default function PermissionsPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { isMobile, isTablet, isMobileOrTablet } = useScreenSize();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [permissions, setPermissions] = useState<WorkerPermissions>(getDefaultWorkerPermissions());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Helper to get worker display name
  const getWorkerName = (worker: Worker): string => {
    return worker.fullName || worker.name || worker.username || t.permissionsPage.worker;
  };

  // Check if user is admin
  useEffect(() => {
    const user = getCurrentUser();
    if (!user || !isAdmin()) {
      // Redirect to dashboard if not admin
      router.push('/admin');
      return;
    }
    loadWorkers();
  }, [router]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const data = await getWorkers();
      // Filter active workers - check both active and isActive
      setWorkers(data.filter(w => w.active || w.isActive));
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setSaved(false);
    // Load existing permissions or default
    if (worker.detailedPermissions) {
      setPermissions(worker.detailedPermissions);
    } else if (worker.permissions === 'full') {
      setPermissions(getFullPermissions());
    } else {
      setPermissions(getDefaultWorkerPermissions());
    }
  };

  const toggleModule = (module: keyof WorkerPermissions['modules']) => {
    setPermissions(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]: !prev.modules[module],
      },
    }));
    setSaved(false);
  };

  const toggleAction = (action: keyof WorkerPermissions['actions']) => {
    setPermissions(prev => ({
      ...prev,
      actions: {
        ...prev.actions,
        [action]: !prev.actions[action],
      },
    }));
    setSaved(false);
  };

  const setAllModules = (value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      modules: Object.keys(prev.modules).reduce((acc, key) => {
        acc[key as keyof WorkerPermissions['modules']] = value;
        return acc;
      }, {} as WorkerPermissions['modules']),
    }));
    setSaved(false);
  };

  const setAllActions = (value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      actions: Object.keys(prev.actions).reduce((acc, key) => {
        acc[key as keyof WorkerPermissions['actions']] = value;
        return acc;
      }, {} as WorkerPermissions['actions']),
    }));
    setSaved(false);
  };

  const savePermissions = async () => {
    if (!selectedWorker) return;
    
    setSaving(true);
    try {
      await updateWorkerPermissions(selectedWorker.id, permissions);
      setSaved(true);
      // Update local state
      setWorkers(prev => prev.map(w => 
        w.id === selectedWorker.id 
          ? { ...w, detailedPermissions: permissions }
          : w
      ));
      setSelectedWorker(prev => prev ? { ...prev, detailedPermissions: permissions } : null);
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert(t.permissionsPage.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: isMobile ? '0' : '0' }}>
      {/* Page Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        <Shield style={{ width: isMobile ? '20px' : '24px', height: isMobile ? '20px' : '24px', color: '#6366f1' }} />
        <h1 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {t.permissionsPage.title}
        </h1>
      </div>

      {/* Mobile: show back button when a worker is selected */}
      {isMobile && selectedWorker && (
        <button
          onClick={() => setSelectedWorker(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            marginBottom: '12px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft style={{ width: '16px', height: '16px' }} />
          {language === 'ar' ? 'العودة للقائمة' : 'Back to list'}
        </button>
      )}

      <div style={{ 
        display: isMobile ? 'flex' : 'grid', 
        flexDirection: 'column',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '260px 1fr' : '320px 1fr', 
        gap: isMobile ? '16px' : '24px',
      }}>
            {/* Workers List */}
            {(!isMobile || !selectedWorker) && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: isMobile ? '12px' : '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Users style={{ width: '20px', height: '20px', color: '#fff' }} />
                  </div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {t.permissionsPage.workers}
                  </h2>
                </div>
                <button
                  onClick={loadWorkers}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#f1f5f9',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw style={{ width: '16px', height: '16px', color: '#64748b' }} />
                </button>
              </div>
              
              <div style={{ padding: '12px', maxHeight: isMobile ? 'none' : 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: '#64748b' }}>{t.common.loading}</p>
                  </div>
                ) : workers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: '#64748b' }}>{t.workers.noWorkers}</p>
                  </div>
                ) : (
                  workers.map(worker => (
                    <button
                      key={worker.id}
                      onClick={() => selectWorker(worker)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        marginBottom: '8px',
                        borderRadius: '12px',
                        border: selectedWorker?.id === worker.id 
                          ? '2px solid #6366f1' 
                          : '1px solid #e2e8f0',
                        backgroundColor: selectedWorker?.id === worker.id 
                          ? '#f5f3ff' 
                          : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'right',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          backgroundColor: selectedWorker?.id === worker.id ? '#6366f1' : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 700,
                          color: selectedWorker?.id === worker.id ? '#fff' : '#64748b',
                        }}>
                          {getWorkerName(worker).charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ 
                            fontSize: '15px', 
                            fontWeight: 600, 
                            color: '#0f172a',
                            margin: 0,
                          }}>
                            {getWorkerName(worker)}
                          </p>
                          <p style={{ 
                            fontSize: '13px', 
                            color: '#64748b',
                            margin: '4px 0 0 0',
                          }}>
                            {worker.position}
                          </p>
                        </div>
                        {worker.detailedPermissions && (
                          <Shield style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            )}

            {/* Permissions Panel */}
            {(!isMobile || selectedWorker) && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: isMobile ? '12px' : '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}>
              {!selectedWorker ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '400px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Shield style={{ width: '64px', height: '64px', color: '#cbd5e1', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '16px', color: '#64748b' }}>
                      {t.permissionsPage.selectWorker}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div style={{
                    padding: isMobile ? '14px' : '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: isMobile ? '40px' : '48px',
                        height: isMobile ? '40px' : '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#fff',
                      }}>
                        {getWorkerName(selectedWorker).charAt(0)}
                      </div>
                      <div>
                        <h2 style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {t.permissionsPage.permissionsOf} {getWorkerName(selectedWorker)}
                        </h2>
                        {!isMobile && <p style={{ fontSize: '14px', color: '#64748b', margin: '2px 0 0 0' }}>
                          {selectedWorker.position} • @{selectedWorker.username}
                        </p>}
                      </div>
                    </div>
                    
                    <button
                      onClick={savePermissions}
                      disabled={saving || saved}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: isMobile ? '8px 14px' : '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: saved 
                          ? '#22c55e' 
                          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: saving || saved ? 'default' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? (
                        <>
                          <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                          {t.common.saving}
                        </>
                      ) : saved ? (
                        <>
                          <Check style={{ width: '16px', height: '16px' }} />
                          {t.common.saved}
                        </>
                      ) : (
                        <>
                          <Save style={{ width: '16px', height: '16px' }} />
                          {t.permissionsPage.savePermissions}
                        </>
                      )}
                    </button>
                  </div>

                  {/* Permissions Content */}
                  <div style={{ padding: isMobile ? '14px' : '24px', maxHeight: isMobile ? 'none' : 'calc(100vh - 320px)', overflowY: 'auto' }}>
                    {/* Modules Section */}
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                      }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          🗂️ {t.permissionsPage.modulesAccess}
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setAllModules(true)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #22c55e',
                              backgroundColor: '#f0fdf4',
                              color: '#22c55e',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {t.permissionsPage.enableAll}
                          </button>
                          <button
                            onClick={() => setAllModules(false)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ef4444',
                              backgroundColor: '#fef2f2',
                              color: '#ef4444',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {t.permissionsPage.disableAll}
                          </button>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '12px',
                      }}>
                        {(Object.keys(permissions.modules) as (keyof WorkerPermissions['modules'])[]).map(module => (
                          <button
                            key={module}
                            onClick={() => toggleModule(module)}
                            style={{
                              padding: '16px',
                              borderRadius: '12px',
                              border: permissions.modules[module]
                                ? '2px solid #22c55e'
                                : '1px solid #e2e8f0',
                              backgroundColor: permissions.modules[module]
                                ? '#f0fdf4'
                                : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.2s',
                            }}
                          >
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: permissions.modules[module] ? '#166534' : '#475569',
                            }}>
                              {(t.nav as any)[moduleLabels[module]] || moduleLabels[module]}
                            </span>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              backgroundColor: permissions.modules[module] ? '#22c55e' : '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {permissions.modules[module] ? (
                                <Check style={{ width: '14px', height: '14px', color: '#fff' }} />
                              ) : (
                                <X style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions Section */}
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                      }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          ⚡ {t.permissionsPage.allowedActions}
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setAllActions(true)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #22c55e',
                              backgroundColor: '#f0fdf4',
                              color: '#22c55e',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {t.permissionsPage.enableAll}
                          </button>
                          <button
                            onClick={() => setAllActions(false)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ef4444',
                              backgroundColor: '#fef2f2',
                              color: '#ef4444',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {t.permissionsPage.disableAll}
                          </button>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '12px',
                      }}>
                        {(Object.keys(permissions.actions) as (keyof WorkerPermissions['actions'])[]).map(action => (
                          <button
                            key={action}
                            onClick={() => toggleAction(action)}
                            style={{
                              padding: '16px',
                              borderRadius: '12px',
                              border: permissions.actions[action]
                                ? '2px solid #3b82f6'
                                : '1px solid #e2e8f0',
                              backgroundColor: permissions.actions[action]
                                ? '#eff6ff'
                                : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.2s',
                            }}
                          >
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: permissions.actions[action] ? '#1e40af' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}>
                              {action === 'viewFinancials' && (
                                permissions.actions[action] 
                                  ? <Eye style={{ width: '14px', height: '14px' }} />
                                  : <EyeOff style={{ width: '14px', height: '14px' }} />
                              )}
                              {(t.permissionsPage as any)[actionLabels[action]] || actionLabels[action]}
                            </span>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              backgroundColor: permissions.actions[action] ? '#3b82f6' : '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {permissions.actions[action] ? (
                                <Check style={{ width: '14px', height: '14px', color: '#fff' }} />
                              ) : (
                                <X style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Financial Data Warning */}
                    {!permissions.actions.viewFinancials && (
                      <div style={{
                        marginTop: '24px',
                        padding: isMobile ? '12px' : '16px',
                        borderRadius: '12px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fbbf24',
                        display: 'flex',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        gap: '12px',
                      }}>
                        <EyeOff style={{ width: '20px', height: '20px', color: '#d97706' }} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', margin: 0 }}>
                            {t.permissionsPage.financialDataHidden}
                          </p>
                          <p style={{ fontSize: '13px', color: '#a16207', margin: '4px 0 0 0' }}>
                            {t.permissionsPage.financialDataWarning}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            )}
          </div>
    </div>
  );
}

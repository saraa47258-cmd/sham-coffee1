'use client';

import { useState, useEffect } from 'react';
import { Order, updateOrderStatus, removeItemFromOrder } from '@/lib/firebase/database';
import { 
  X, 
  Clock, 
  User, 
  MapPin, 
  Phone,
  Receipt,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
  CreditCard,
  Banknote,
  DoorOpen,
  Coffee,
  Trash2
} from 'lucide-react';

interface OrderDetailsDrawerProps {
  order: Order | null;
  isOpen?: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: string) => Promise<void>;
  /** بعد إلغاء الطلب أو إزالة صنف */
  onOrderUpdated?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  pending: { label: 'معلق', color: '#f59e0b', bgColor: '#fef3c7', icon: Clock },
  processing: { label: 'قيد التنفيذ', color: '#3b82f6', bgColor: '#dbeafe', icon: AlertCircle },
  preparing: { label: 'قيد التحضير', color: '#f59e0b', bgColor: '#fef3c7', icon: Coffee },
  ready: { label: 'جاهز', color: '#06b6d4', bgColor: '#cffafe', icon: CheckCircle },
  paid: { label: 'مدفوع', color: '#16a34a', bgColor: '#dcfce7', icon: CheckCircle },
  completed: { label: 'مكتمل', color: '#16a34a', bgColor: '#dcfce7', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: '#dc2626', bgColor: '#fee2e2', icon: XCircle },
};

export default function OrderDetailsDrawer({ order, isOpen = true, onClose, onUpdateStatus, onOrderUpdated }: OrderDetailsDrawerProps) {
  const [updating, setUpdating] = useState(false);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<Order | null>(order);

  if (!isOpen || !order) return null;
  const displayOrder = localOrder ?? order;
  const canEdit = displayOrder.status !== 'completed' && displayOrder.status !== 'cancelled' && displayOrder.paymentStatus !== 'paid';

  useEffect(() => {
    setLocalOrder(order);
  }, [order?.id, order?.items?.length, order?.total, order?.status]);

  const statusConfig = STATUS_CONFIG[displayOrder.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-OM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!onUpdateStatus) return;
    setUpdating(true);
    try {
      await onUpdateStatus(displayOrder.id, newStatus);
      onOrderUpdated?.();
      if (newStatus === 'cancelled') onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (itemIndex: number) => {
    if (!canEdit) return;
    setRemovingIndex(itemIndex);
    try {
      await removeItemFromOrder(displayOrder.id, itemIndex);
      const next = (displayOrder.items || []).filter((_, i) => i !== itemIndex);
      const newTotal = next.reduce((s, i) => s + (i.itemTotal ?? i.quantity * (i.price || 0)), 0);
      setLocalOrder({
        ...displayOrder,
        items: next,
        total: newTotal,
        itemsCount: next.reduce((sum, i) => sum + i.quantity, 0),
      });
      onOrderUpdated?.();
      if (next.length === 0) onClose();
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setRemovingIndex(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        }} 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '450px',
        maxWidth: '95%',
        height: '100%',
        backgroundColor: '#ffffff',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
        animation: 'slideIn 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Receipt style={{ width: '22px', height: '22px', color: '#ffffff' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  فاتورة #{displayOrder.id.slice(-6).toUpperCase()}
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  {formatDate(displayOrder.createdAt)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f1f5f9',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <X style={{ width: '20px', height: '20px', color: '#64748b' }} />
            </button>
          </div>
          
          {/* Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: statusConfig.bgColor,
            borderRadius: '8px',
          }}>
            <StatusIcon style={{ width: '16px', height: '16px', color: statusConfig.color }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: statusConfig.color }}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Order Info */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase' }}>
              معلومات الطلب
            </h3>
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* Order Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DoorOpen style={{ width: '18px', height: '18px', color: '#64748b' }} />
                <span style={{ fontSize: '14px', color: '#475569' }}>
                  {displayOrder.orderType === 'table' ? 'طاولة' : displayOrder.orderType === 'room' ? 'غرفة' : 'استلام'}
                  {displayOrder.tableNumber && ` رقم ${displayOrder.tableNumber}`}
                  {displayOrder.roomNumber && ` رقم ${displayOrder.roomNumber}`}
                </span>
              </div>
              
              {/* Customer Name */}
              {displayOrder.customerName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User style={{ width: '18px', height: '18px', color: '#64748b' }} />
                  <span style={{ fontSize: '14px', color: '#475569' }}>{displayOrder.customerName}</span>
                </div>
              )}
              
              {/* Worker */}
              {displayOrder.workerName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User style={{ width: '18px', height: '18px', color: '#64748b' }} />
                  <span style={{ fontSize: '14px', color: '#475569' }}>
                    الموظف: {displayOrder.workerName}
                  </span>
                </div>
              )}

              {/* Source */}
              {displayOrder.source && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MapPin style={{ width: '18px', height: '18px', color: '#64748b' }} />
                  <span style={{ fontSize: '14px', color: '#475569' }}>
                    المصدر: {displayOrder.source === 'cashier' ? 'الكاشير' : displayOrder.source === 'staff-menu' ? 'منيو الموظفين' : displayOrder.source}
                  </span>
                </div>
              )}

              {/* Payment Method */}
              {displayOrder.paymentMethod && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {displayOrder.paymentMethod === 'cash' ? (
                    <Banknote style={{ width: '18px', height: '18px', color: '#64748b' }} />
                  ) : (
                    <CreditCard style={{ width: '18px', height: '18px', color: '#64748b' }} />
                  )}
                  <span style={{ fontSize: '14px', color: '#475569' }}>
                    {displayOrder.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase' }}>
              العناصر ({displayOrder.items?.length || 0})
            </h3>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}>
              {displayOrder.items?.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '14px 16px',
                    borderBottom: index < (displayOrder.items?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.emoji && <span style={{ fontSize: '18px' }}>{item.emoji}</span>}
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                        {item.name}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                      {item.quantity} × {(item.price || 0).toFixed(3)} ر.ع
                    </p>
                    {item.note && (
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                        ملاحظة: {item.note}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {(item.itemTotal || item.quantity * (item.price || 0)).toFixed(3)} ر.ع
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveItem(index)}
                        disabled={removingIndex !== null}
                        title="إزالة من الفاتورة"
                        style={{
                          padding: '6px 8px',
                          backgroundColor: '#fee2e2',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: removingIndex !== null ? 'not-allowed' : 'pointer',
                          color: '#dc2626',
                          opacity: removingIndex === index ? 0.6 : 1,
                        }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>المجموع الفرعي</span>
              <span style={{ fontSize: '14px', color: '#475569' }}>
                {(displayOrder.subtotal ?? displayOrder.total ?? 0).toFixed(3)} ر.ع
              </span>
            </div>
            
            {displayOrder.discount && displayOrder.discount.amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>
                  الخصم ({displayOrder.discount.percent}%)
                </span>
                <span style={{ fontSize: '14px', color: '#dc2626' }}>
                  -{displayOrder.discount.amount.toFixed(3)} ر.ع
                </span>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px dashed #e2e8f0',
              marginTop: '8px',
            }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>الإجمالي</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>
                {(displayOrder.total ?? 0).toFixed(3)} ر.ع
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
        }}>
          {/* Status Update Buttons */}
          {onUpdateStatus && displayOrder.status !== 'completed' && displayOrder.status !== 'cancelled' && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              {displayOrder.status === 'pending' && (
                <button
                  onClick={() => handleStatusChange('preparing')}
                  disabled={updating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                    opacity: updating ? 0.7 : 1,
                  }}
                >
                  بدء التحضير
                </button>
              )}
              {(displayOrder.status === 'preparing' || displayOrder.status === 'processing') && (
                <button
                  onClick={() => handleStatusChange('ready')}
                  disabled={updating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#06b6d4',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                    opacity: updating ? 0.7 : 1,
                  }}
                >
                  جاهز للاستلام
                </button>
              )}
              {displayOrder.status === 'ready' && (
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={updating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#16a34a',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                    opacity: updating ? 0.7 : 1,
                  }}
                >
                  تم التسليم
                </button>
              )}
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={updating}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fee2e2',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#dc2626',
                  cursor: 'pointer',
                  opacity: updating ? 0.7 : 1,
                }}
              >
                إلغاء الطلب بالكامل
              </button>
            </div>
          )}
          
          <button
            onClick={handlePrint}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Printer style={{ width: '18px', height: '18px' }} />
            طباعة الفاتورة
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

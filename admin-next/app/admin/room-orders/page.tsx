'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Order, 
  Room,
  getRoomOrdersByDateRange, 
  getDateRangeForFilter,
  getRooms,
  updateOrderStatus,
  updateOrderPaymentStatus,
  closeRoomOrder,
  DateRange 
} from '@/lib/firebase/database';
import OrderDetailsDrawer from '@/lib/components/orders/OrderDetailsDrawer';
import { useTranslation } from '@/lib/context/LanguageContext';
import { useScreenSize } from '@/lib/hooks/useScreenSize';
import { 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  DoorOpen,
  CheckCircle,
  Ban,
  RefreshCw,
  Search,
  X,
  Calendar,
  CreditCard,
  ShoppingCart,
  DollarSign
} from 'lucide-react';

const PAGE_SIZE = 15;

export default function RoomOrdersPage() {
  const { t, language } = useTranslation();
  const { isMobile, isTablet, isMobileOrTablet } = useScreenSize();

  const STATUS_CONFIG = {
    pending: { label: t.orderStatus.pending, color: '#f59e0b', bg: '#fef3c7' },
    processing: { label: t.orderStatus.processing, color: '#3b82f6', bg: '#dbeafe' },
    preparing: { label: t.orderStatus.preparing, color: '#f59e0b', bg: '#fef3c7' },
    ready: { label: t.orderStatus.ready, color: '#06b6d4', bg: '#cffafe' },
    paid: { label: t.orderStatus.paid, color: '#10b981', bg: '#dcfce7' },
    completed: { label: t.orderStatus.completed, color: '#10b981', bg: '#dcfce7' },
    cancelled: { label: t.orderStatus.cancelled, color: '#ef4444', bg: '#fee2e2' },
  };

  const PAYMENT_STATUS = {
    pending: { label: t.payment.unpaid, color: '#f59e0b', bg: '#fef3c7' },
    paid: { label: t.payment.paid, color: '#10b981', bg: '#dcfce7' },
  };

  const DATE_RANGES = [
    { value: 'today', label: t.common.today },
    { value: 'week', label: t.common.thisWeek },
    { value: 'month', label: t.common.thisMonth },
    { value: 'year', label: t.common.thisYear },
    { value: 'custom', label: t.common.custom },
  ];

  const [orders, setOrders] = useState<Order[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load rooms
  useEffect(() => {
    getRooms().then(setRooms);
  }, []);

  // Load orders
  const loadOrders = async (): Promise<Order[]> => {
    setLoading(true);
    try {
      const range = getDateRangeForFilter(dateRange, customStart, customEnd);
      const data = await getRoomOrdersByDateRange(range);
      setOrders(data);
      return data;
    } catch (error) {
      console.error('Error loading room orders:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    loadOrders();
    setCurrentPage(1);
  }, [dateRange, customStart, customEnd]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterRoom !== 'all' && order.roomId !== filterRoom) {
        return false;
      }
      
      if (filterStatus !== 'all' && order.status !== filterStatus) {
        return false;
      }
      
      if (filterPayment !== 'all') {
        const isPaid = order.paymentStatus === 'paid' || order.status === 'paid';
        if (filterPayment === 'paid' && !isPaid) return false;
        if (filterPayment === 'pending' && isPaid) return false;
      }
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const orderIdMatch = order.id.toLowerCase().includes(searchLower);
        const roomMatch = order.roomNumber?.toLowerCase().includes(searchLower);
        const customerMatch = order.customerName?.toLowerCase().includes(searchLower);
        if (!orderIdMatch && !roomMatch && !customerMatch) return false;
      }
      
      return true;
    });
  }, [orders, filterRoom, filterStatus, filterPayment, searchTerm]);

  // Paginated orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const total = orders.length;
    const totalSales = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const paidCount = orders.filter(o => o.paymentStatus === 'paid' || o.status === 'paid').length;
    const unpaidCount = orders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'paid' && o.status !== 'cancelled').length;
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    return { total, totalSales, paidCount, unpaidCount, pendingCount };
  }, [orders]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      
      if (status === 'paid') {
        await updateOrderPaymentStatus(orderId, 'paid');
        await updateOrderStatus(orderId, 'completed');
        if (order?.roomId) {
          await closeRoomOrder(orderId, order.roomId);
        }
      } else if (status === 'cancelled' && order?.roomId) {
        await updateOrderStatus(orderId, 'cancelled');
        await closeRoomOrder(orderId, order.roomId);
      } else {
        await updateOrderStatus(orderId, status);
      }
      
      await loadOrders();
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleOrderUpdated = async () => {
    const data = await loadOrders();
    if (selectedOrder) {
      const updated = data.find(o => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clearFilters = () => {
    setFilterRoom('all');
    setFilterStatus('all');
    setFilterPayment('all');
    setSearchTerm('');
  };

  const hasActiveFilters = filterRoom !== 'all' || filterStatus !== 'all' || filterPayment !== 'all' || searchTerm !== '';

  return (
    <div style={{ padding: isMobile ? '12px' : isTablet ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? '16px' : '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {t.nav.roomOrders}
          </h1>
          {!isMobile && <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            {t.orders.subtitle}
          </p>}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: isMobile ? '8px 14px' : '10px 20px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: isMobile ? '13px' : '14px',
            fontWeight: 600,
            color: '#475569',
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw 
            style={{ 
              width: '18px', 
              height: '18px',
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }} 
          />
          {!isMobile && t.common.refresh}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '10px' : '16px',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        <div style={{
          padding: isMobile ? '12px' : '20px',
          backgroundColor: '#ffffff',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '16px',
        }}>
          <div style={{
            width: isMobile ? '36px' : '48px',
            height: isMobile ? '36px' : '48px',
            borderRadius: isMobile ? '8px' : '12px',
            backgroundColor: '#f3e8ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShoppingCart style={{ width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px', color: '#a855f7' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#64748b', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.reports.totalOrders}</p>
            <p style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stats.total}</p>
          </div>
        </div>
        <div style={{
          padding: isMobile ? '12px' : '20px',
          backgroundColor: '#f0fdf4',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #16a34a',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '16px',
        }}>
          <div style={{
            width: isMobile ? '36px' : '48px',
            height: isMobile ? '36px' : '48px',
            borderRadius: isMobile ? '8px' : '12px',
            backgroundColor: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <DollarSign style={{ width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px', color: '#16a34a' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#16a34a', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.reports.totalSales}</p>
            <p style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700, color: '#16a34a', margin: 0 }}>{stats.totalSales.toFixed(2)}</p>
          </div>
        </div>
        <div style={{
          padding: isMobile ? '12px' : '20px',
          backgroundColor: '#ffffff',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '16px',
        }}>
          <div style={{
            width: isMobile ? '36px' : '48px',
            height: isMobile ? '36px' : '48px',
            borderRadius: isMobile ? '8px' : '12px',
            backgroundColor: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <CreditCard style={{ width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px', color: '#16a34a' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#64748b', marginBottom: '2px' }}>{t.payment.paid}</p>
            <p style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700, color: '#16a34a', margin: 0 }}>
              {stats.paidCount}
              {!isMobile && <span style={{ fontSize: '14px', color: '#f59e0b', marginRight: '8px' }}>
                / {stats.unpaidCount} {t.payment.unpaid}
              </span>}
            </p>
          </div>
        </div>
        <div style={{
          padding: isMobile ? '12px' : '20px',
          backgroundColor: '#fef3c7',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '16px',
        }}>
          <div style={{
            width: isMobile ? '36px' : '48px',
            height: isMobile ? '36px' : '48px',
            borderRadius: isMobile ? '8px' : '12px',
            backgroundColor: '#fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Clock style={{ width: isMobile ? '18px' : '24px', height: isMobile ? '18px' : '24px', color: '#f59e0b' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#f59e0b', marginBottom: '2px' }}>{t.orderStatus.pending}</p>
            <p style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>{stats.pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: isMobile ? '12px' : '16px',
        border: '1px solid #e2e8f0',
        padding: isMobile ? '12px' : '20px',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        {/* Date Range */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}>
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: dateRange === range.value ? '#f59e0b' : '#f1f5f9',
                color: dateRange === range.value ? '#ffffff' : '#475569',
              }}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Custom Date */}
        {dateRange === 'custom' && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                {t.common.from}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                {t.common.to}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Other Filters */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}>
          {/* Search */}
          <div style={{ flex: 2, minWidth: isMobile ? '100%' : '200px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0 14px',
              height: '44px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            }}>
              <Search style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.common.search}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#0f172a',
                  backgroundColor: 'transparent',
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                >
                  <X style={{ width: '16px', height: '16px' }} />
                </button>
              )}
            </div>
          </div>

          {/* Room Filter */}
          <div style={{ flex: 1, minWidth: isMobile ? 'calc(50% - 6px)' : '140px' }}>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="all">{language === 'ar' ? 'جميع الغرف' : 'All Rooms'}</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {language === 'ar' ? 'غرفة' : 'Room'} {room.roomNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: 1, minWidth: isMobile ? 'calc(50% - 6px)' : '120px' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="all">{t.orders.allStatuses}</option>
              <option value="pending">{t.orderStatus.pending}</option>
              <option value="preparing">{t.orderStatus.preparing}</option>
              <option value="ready">{t.orderStatus.ready}</option>
              <option value="completed">{t.orderStatus.completed}</option>
              <option value="cancelled">{t.orderStatus.cancelled}</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div style={{ flex: 1, minWidth: isMobile ? 'calc(50% - 6px)' : '120px' }}>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="all">{t.common.all}</option>
              <option value="paid">{t.payment.paid}</option>
              <option value="pending">{t.payment.unpaid}</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 16px',
                height: '44px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#dc2626',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: '16px', height: '16px' }} />
              {language === 'ar' ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: isMobile ? '12px' : '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#f59e0b',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px',
          }}>
            <DoorOpen style={{ width: '48px', height: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', color: '#475569', marginBottom: '8px' }}>
              {t.orders.noOrders}
            </p>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
              {hasActiveFilters ? (language === 'ar' ? 'جرب تغيير الفلاتر' : 'Try changing filters') : (language === 'ar' ? 'لم يتم تسجيل أي طلبات غرف في هذه الفترة' : 'No room orders recorded in this period')}
            </p>
          </div>
        ) : (
          <>
            {isMobile ? (
              /* Mobile Card Layout */
              <div style={{ padding: '8px' }}>
                {paginatedOrders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  const isPaid = order.paymentStatus === 'paid' || order.status === 'paid';
                  const paymentConfig = isPaid ? PAYMENT_STATUS.paid : PAYMENT_STATUS.pending;
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: '14px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <DoorOpen style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{order.roomNumber || '-'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDate(order.createdAt)} {formatTime(order.createdAt)}</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          {order.total.toFixed(3)} {t.common.currency}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                          {statusConfig.label}
                        </span>
                        <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: paymentConfig.bg, color: paymentConfig.color }}>
                          {paymentConfig.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', alignSelf: 'center' }}>
                          {(order.itemsCount || order.items?.length || 0)} {t.dashboard.product}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Desktop/Tablet: Scrollable Table */
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isTablet ? '80px 80px 110px 60px 90px 90px 90px 60px' : '100px 100px 140px 80px 100px 100px 100px 80px',
              gap: '12px',
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              minWidth: isTablet ? '660px' : 'auto',
            }}>
              <div>{language === 'ar' ? 'رقم الطلب' : 'Order #'}</div>
              <div>{language === 'ar' ? 'الغرفة' : 'Room'}</div>
              <div>{t.common.date}/{t.common.time}</div>
              <div style={{ textAlign: 'center' }}>{t.orders.orderItems}</div>
              <div style={{ textAlign: 'center' }}>{t.common.total}</div>
              <div style={{ textAlign: 'center' }}>{language === 'ar' ? 'الدفع' : 'Payment'}</div>
              <div style={{ textAlign: 'center' }}>{t.common.status}</div>
              <div style={{ textAlign: 'center' }}>{t.common.actions}</div>
            </div>

            {/* Table Body */}
            {paginatedOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const isPaid = order.paymentStatus === 'paid' || order.status === 'paid';
              const paymentConfig = isPaid ? PAYMENT_STATUS.paid : PAYMENT_STATUS.pending;

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isTablet ? '80px 80px 110px 60px 90px 90px 90px 60px' : '100px 100px 140px 80px 100px 100px 100px 80px',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    minWidth: isTablet ? '660px' : 'auto',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Order ID */}
                  <div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#a855f7',
                      fontFamily: 'monospace',
                    }}>
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  {/* Room */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <DoorOpen style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                      {order.roomNumber || '-'}
                    </span>
                  </div>

                  {/* Date/Time */}
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', margin: 0 }}>
                      {formatDate(order.createdAt)}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                      {formatTime(order.createdAt)}
                    </p>
                  </div>

                  {/* Items Count */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      {order.itemsCount || order.items?.length || 0}
                    </span>
                  </div>

                  {/* Total */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {order.total.toFixed(3)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '4px' }}>
                      {t.common.currency}
                    </span>
                  </div>

                  {/* Payment Status */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: paymentConfig.bg,
                      color: paymentConfig.color,
                    }}>
                      {paymentConfig.label}
                    </span>
                  </div>

                  {/* Order Status */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color,
                    }}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div 
                    style={{ textAlign: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: '8px',
                        backgroundColor: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                    >
                      <Eye style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
              );
            })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: isMobile ? '12px' : '16px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}>
                {!isMobile && <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {language === 'ar' ? 'عرض' : 'Showing'} {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} {language === 'ar' ? 'من' : 'of'} {filteredOrders.length}
                </span>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      backgroundColor: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      color: currentPage === 1 ? '#cbd5e1' : '#475569',
                    }}
                  >
                    <ChevronRight style={{ width: '18px', height: '18px' }} />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: '36px',
                          height: '36px',
                          backgroundColor: currentPage === pageNum ? '#f59e0b' : '#ffffff',
                          border: '1px solid ' + (currentPage === pageNum ? '#f59e0b' : '#e2e8f0'),
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: currentPage === pageNum ? '#ffffff' : '#475569',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      color: currentPage === totalPages ? '#cbd5e1' : '#475569',
                    }}
                  >
                    <ChevronLeft style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Details Drawer */}
      {selectedOrder && (
        <OrderDetailsDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleStatusUpdate}
          onOrderUpdated={handleOrderUpdated}
        />
      )}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}






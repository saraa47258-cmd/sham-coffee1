'use client';

import { useState, useEffect, useMemo } from 'react';
import { Table, Room } from '@/lib/firebase/database';
import { CartItem, POSOrder, calculateTotals } from '@/lib/pos';
import * as PC from '@/lib/utils/precision';
import { 
  CreditCard, 
  Banknote, 
  Users, 
  DoorOpen, 
  ShoppingBag,
  Percent,
  Receipt,
  User,
  Phone,
  ChevronDown,
  Check,
  UserCircle2
} from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageContext';

interface PaymentPanelProps {
  items: CartItem[];
  tables: Table[];
  rooms: Room[];
  onPlaceOrder: (order: POSOrder) => void;
  onPayNow: (order: POSOrder, paymentMethod: 'cash' | 'card', receivedAmount: number) => void;
  loading: boolean;
  /** عند فتح الكاشير من غرفة (طلب جديد أو إضافة طلب) */
  initialRoomId?: string;
  initialOrderType?: 'table' | 'room' | 'takeaway';
}

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export default function PaymentPanel({ 
  items, 
  tables, 
  rooms, 
  onPlaceOrder, 
  onPayNow,
  loading,
  initialRoomId,
  initialOrderType = 'takeaway',
}: PaymentPanelProps) {
  const { t, language } = useTranslation();
  const [orderType, setOrderType] = useState<'table' | 'room' | 'takeaway'>(
    initialRoomId ? 'room' : initialOrderType
  );
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomGender, setRoomGender] = useState<'male' | 'female' | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = screenSize === 'mobile';

  // Calculate room price based on gender
  const roomPrice = useMemo(() => {
    if (!selectedRoom || orderType !== 'room') return 0;
    
    if (selectedRoom.priceType === 'free') return 0;
    if (selectedRoom.priceType === 'fixed') return selectedRoom.hourlyRate || 0;
    if (selectedRoom.priceType === 'gender') {
      if (roomGender === 'male') return selectedRoom.malePrice || 0;
      if (roomGender === 'female') return selectedRoom.femalePrice || 0;
      return 0; // No gender selected yet
    }
    return 0;
  }, [selectedRoom, roomGender, orderType]);

  // Calculate totals including room price
  const totals = useMemo(() => {
    const itemsTotals = calculateTotals(items, discountPercent, 0);
    return {
      ...itemsTotals,
      roomPrice,
      total: PC.add(itemsTotals.total, roomPrice),
    };
  }, [items, discountPercent, roomPrice]);

  useEffect(() => {
    if (orderType === 'table') {
      setSelectedRoom(null);
      setRoomGender(null);
    } else if (orderType === 'room') {
      setSelectedTable(null);
    } else {
      setSelectedTable(null);
      setSelectedRoom(null);
      setRoomGender(null);
    }
  }, [orderType]);

  // Reset gender when room changes
  useEffect(() => {
    setRoomGender(null);
  }, [selectedRoom?.id]);

  // Pre-select room + order type when opening from room (طلب جديد / إضافة طلب جديد)
  useEffect(() => {
    if (!initialRoomId || rooms.length === 0) return;
    const room = rooms.find((r) => r.id === initialRoomId);
    if (room) {
      setOrderType('room');
      setSelectedTable(null);
      setSelectedRoom(room);
    }
  }, [initialRoomId, rooms]);

  // Reset payment panel state when cart is cleared
  useEffect(() => {
    if (items.length === 0) {
      setShowPayment(false);
      setReceivedAmount('');
      setPaymentMethod('cash');
      setDiscountPercent(0);
      setCustomerName('');
      setCustomerPhone('');
      if (!initialRoomId) {
        setOrderType('takeaway');
        setSelectedTable(null);
        setSelectedRoom(null);
        setRoomGender(null);
      }
    }
  }, [items.length, initialRoomId]);

  const change = paymentMethod === 'cash' && parseFloat(receivedAmount) > totals.total
    ? PC.subtract(parseFloat(receivedAmount), totals.total)
    : 0;

  // Check if gender is required for room
  const needsGenderSelection = selectedRoom?.priceType === 'gender';
  const genderSelected = !needsGenderSelection || roomGender !== null;

  const canPlaceOrder = items.length > 0 && (
    orderType === 'takeaway' ||
    (orderType === 'table' && selectedTable) ||
    (orderType === 'room' && selectedRoom && genderSelected)
  );

  const canPay = canPlaceOrder && (
    paymentMethod === 'card' ||
    (paymentMethod === 'cash' && parseFloat(receivedAmount) >= totals.total)
  );

  const buildOrder = (): POSOrder => ({
    items,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    orderType,
    tableId: selectedTable?.id,
    tableNumber: selectedTable?.tableNumber,
    roomId: selectedRoom?.id,
    roomNumber: selectedRoom?.roomNumber,
    roomGender: roomGender || undefined,
    roomPrice: roomPrice || undefined,
    customerName: customerName || undefined,
    customerPhone: customerPhone || undefined,
  });

  const handlePlaceOrder = () => {
    onPlaceOrder(buildOrder());
  };

  const handlePayNow = () => {
    onPayNow(buildOrder(), paymentMethod, parseFloat(receivedAmount) || totals.total);
  };

  const quickAmounts = [1, 2, 5, 10, 20, 50];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: isMobile ? 'auto' : '100%',
      minHeight: isMobile ? 'calc(100vh - 200px)' : undefined,
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? '12px' : '16px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '12px 14px' : '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
      }}>
        <h2 style={{
          fontSize: isMobile ? '14px' : '16px',
          fontWeight: 700,
          color: '#0f172a',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Receipt style={{ width: isMobile ? '18px' : '20px', height: isMobile ? '18px' : '20px', color: '#6366f1' }} />
          {language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
        </h2>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '12px' : '16px',
      }}>
        {/* Order Type */}
        <div style={{ marginBottom: isMobile ? '16px' : '20px' }}>
          <label style={{
            display: 'block',
            fontSize: isMobile ? '11px' : '12px',
            fontWeight: 600,
            color: '#64748b',
            marginBottom: isMobile ? '8px' : '10px',
          }}>
            {language === 'ar' ? 'نوع الطلب' : 'Order Type'}
          </label>
          <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px' }}>
            {[
              { value: 'takeaway', label: t.cashier.takeaway, icon: ShoppingBag },
              { value: 'table', label: t.cashier.table, icon: Users },
              { value: 'room', label: t.cashier.room, icon: DoorOpen },
            ].map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setOrderType(type.value as any)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '6px',
                    padding: isMobile ? '10px' : '12px',
                    borderRadius: isMobile ? '10px' : '12px',
                    border: orderType === type.value 
                      ? '2px solid #6366f1' 
                      : '2px solid #e2e8f0',
                    backgroundColor: orderType === type.value 
                      ? '#eef2ff' 
                      : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon style={{
                    width: '20px',
                    height: '20px',
                    color: orderType === type.value ? '#6366f1' : '#64748b',
                  }} />
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: orderType === type.value ? '#4f46e5' : '#475569',
                  }}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table/Room Selection */}
        {orderType === 'table' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              marginBottom: '10px',
            }}>
              {t.cashier.selectTable}
            </label>
            {tables.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
                {language === 'ar' ? 'لا توجد طاولات متاحة' : 'No tables available'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: selectedTable?.id === table.id 
                        ? '2px solid #16a34a' 
                        : '1px solid #e2e8f0',
                      backgroundColor: selectedTable?.id === table.id 
                        ? '#dcfce7' 
                        : '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {selectedTable?.id === table.id && (
                      <Check style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                    )}
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: selectedTable?.id === table.id ? '#16a34a' : '#475569',
                    }}>
                      {table.tableNumber}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {orderType === 'room' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              marginBottom: '10px',
            }}>
              {t.cashier.selectRoom}
            </label>
            {rooms.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
                {language === 'ar' ? 'لا توجد غرف متاحة' : 'No rooms available'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: selectedRoom?.id === room.id 
                        ? '2px solid #f59e0b' 
                        : '1px solid #e2e8f0',
                      backgroundColor: selectedRoom?.id === room.id 
                        ? '#fef3c7' 
                        : '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {selectedRoom?.id === room.id && (
                      <Check style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                    )}
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: selectedRoom?.id === room.id ? '#92400e' : '#475569',
                    }}>
                      {room.name || `${t.cashier.room} ${room.roomNumber}`}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Gender Selection for room with gender-based pricing */}
            {selectedRoom && selectedRoom.priceType === 'gender' && (
              <div style={{ marginTop: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: '10px',
                }}>
                  <UserCircle2 style={{ width: '14px', height: '14px' }} />
                  {language === 'ar' ? 'نوع العميل (مطلوب)' : 'Customer Type (Required)'}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setRoomGender('male')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '12px',
                      border: roomGender === 'male' 
                        ? '2px solid #3b82f6' 
                        : '1px solid #e2e8f0',
                      backgroundColor: roomGender === 'male' 
                        ? '#dbeafe' 
                        : '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>👦</span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: roomGender === 'male' ? '#1d4ed8' : '#475569',
                    }}>
                      {t.rooms.male}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: roomGender === 'male' ? '#1d4ed8' : '#ef4444',
                    }}>
                      {(selectedRoom.malePrice || 0).toFixed(3)} {t.common.currency}
                    </span>
                  </button>
                  <button
                    onClick={() => setRoomGender('female')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '12px',
                      border: roomGender === 'female' 
                        ? '2px solid #ec4899' 
                        : '1px solid #e2e8f0',
                      backgroundColor: roomGender === 'female' 
                        ? '#fce7f3' 
                        : '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>👧</span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: roomGender === 'female' ? '#be185d' : '#475569',
                    }}>
                      {t.rooms.female}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: roomGender === 'female' ? '#be185d' : '#16a34a',
                    }}>
                      {(selectedRoom.femalePrice || 0) === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : `${(selectedRoom.femalePrice || 0).toFixed(3)} ${t.common.currency}`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Show room price info for other price types */}
            {selectedRoom && selectedRoom.priceType === 'fixed' && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#fef3c7',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#92400e',
                textAlign: 'center',
              }}>
                {language === 'ar' ? `سعر الغرفة: ${(selectedRoom.hourlyRate || 0).toFixed(3)} ${t.common.currency}` : `Room Price: ${(selectedRoom.hourlyRate || 0).toFixed(3)} ${t.common.currency}`}
              </div>
            )}

            {selectedRoom && selectedRoom.priceType === 'free' && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#dcfce7',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#16a34a',
                textAlign: 'center',
              }}>
                {language === 'ar' ? '✨ الغرفة مجانية' : '✨ Room is free'}
              </div>
            )}
          </div>
        )}

        {/* Customer Info */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '8px',
              }}>
                <User style={{ width: '14px', height: '14px' }} />
                {language === 'ar' ? 'اسم العميل' : 'Customer Name'}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t.common.optional}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '8px',
              }}>
                <Phone style={{ width: '14px', height: '14px' }} />
                {language === 'ar' ? 'الهاتف' : 'Phone'}
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder={t.common.optional}
                dir="ltr"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                  textAlign: 'left',
                }}
              />
            </div>
          </div>
        </div>

        {/* Discount */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            marginBottom: '8px',
          }}>
            <Percent style={{ width: '14px', height: '14px' }} />
            {t.cashier.discountPercent}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 5, 10, 15, 20].map((percent) => (
              <button
                key={percent}
                onClick={() => setDiscountPercent(percent)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: discountPercent === percent 
                    ? '2px solid #6366f1' 
                    : '1px solid #e2e8f0',
                  backgroundColor: discountPercent === percent 
                    ? '#eef2ff' 
                    : '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: discountPercent === percent ? '#4f46e5' : '#475569',
                  cursor: 'pointer',
                }}
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          marginBottom: '16px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>{language === 'ar' ? 'المجموع الفرعي (المنتجات)' : 'Subtotal (Products)'}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              {totals.subtotal.toFixed(3)} {t.common.currency}
            </span>
          </div>
          {totals.roomPrice > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <span style={{ fontSize: '13px', color: '#f59e0b' }}>
                {language === 'ar' ? `سعر الغرفة ${roomGender === 'male' ? `(${t.rooms.male})` : roomGender === 'female' ? `(${t.rooms.female})` : ''}` : `Room Price ${roomGender === 'male' ? `(${t.rooms.male})` : roomGender === 'female' ? `(${t.rooms.female})` : ''}`}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
                +{totals.roomPrice.toFixed(3)} {t.common.currency}
              </span>
            </div>
          )}
          {selectedRoom && roomGender === 'female' && (selectedRoom.femalePrice || 0) === 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <span style={{ fontSize: '13px', color: '#16a34a' }}>
                {language === 'ar' ? `سعر الغرفة (${t.rooms.female})` : `Room Price (${t.rooms.female})`}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                {language === 'ar' ? 'مجاني' : 'Free'} ✨
              </span>
            </div>
          )}
          {totals.discount.amount > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <span style={{ fontSize: '13px', color: '#dc2626' }}>
                {language === 'ar' ? `الخصم (${totals.discount.percent}%)` : `Discount (${totals.discount.percent}%)`}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                -{totals.discount.amount.toFixed(3)} {t.common.currency}
              </span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{t.common.total}</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>
              {totals.total.toFixed(3)} {t.common.currency}
            </span>
          </div>
        </div>

        {/* Payment Section */}
        {showPayment && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef3c7',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#92400e',
              marginBottom: '12px',
            }}>
              {t.payment.paymentMethod}
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => setPaymentMethod('cash')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '10px',
                  border: paymentMethod === 'cash' 
                    ? '2px solid #16a34a' 
                    : '1px solid #e2e8f0',
                  backgroundColor: paymentMethod === 'cash' 
                    ? '#dcfce7' 
                    : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <Banknote style={{
                  width: '20px',
                  height: '20px',
                  color: paymentMethod === 'cash' ? '#16a34a' : '#64748b',
                }} />
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: paymentMethod === 'cash' ? '#16a34a' : '#475569',
                }}>
                  {t.payment.cash}
                </span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '10px',
                  border: paymentMethod === 'card' 
                    ? '2px solid #6366f1' 
                    : '1px solid #e2e8f0',
                  backgroundColor: paymentMethod === 'card' 
                    ? '#eef2ff' 
                    : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <CreditCard style={{
                  width: '20px',
                  height: '20px',
                  color: paymentMethod === 'card' ? '#6366f1' : '#64748b',
                }} />
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: paymentMethod === 'card' ? '#4f46e5' : '#475569',
                }}>
                  {t.payment.card}
                </span>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#92400e',
                  marginBottom: '8px',
                }}>
                  {t.payment.receivedAmount}
                </label>
                <input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder={totals.total.toFixed(3)}
                  step="0.001"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '18px',
                    fontWeight: 700,
                    border: '1px solid #fcd34d',
                    borderRadius: '10px',
                    outline: 'none',
                    textAlign: 'center',
                    marginBottom: '12px',
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setReceivedAmount(amount.toString())}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {amount}
                    </button>
                  ))}
                  <button
                    onClick={() => setReceivedAmount(totals.total.toFixed(3))}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#16a34a',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'ar' ? 'المبلغ الكامل' : 'Full Amount'}
                  </button>
                </div>
                {change > 0 && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#dcfce7',
                    borderRadius: '10px',
                    textAlign: 'center',
                  }}>
                    <span style={{ fontSize: '13px', color: '#16a34a' }}>{t.payment.change} </span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>
                      {change.toFixed(3)} {t.common.currency}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
      }}>
        {!showPayment ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder || loading}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: '#6366f1',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: !canPlaceOrder || loading ? 'not-allowed' : 'pointer',
                opacity: !canPlaceOrder || loading ? 0.5 : 1,
              }}
            >
              {loading ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (language === 'ar' ? 'إنشاء طلب' : 'Create Order')}
            </button>
            <button
              onClick={() => setShowPayment(true)}
              disabled={!canPlaceOrder}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: !canPlaceOrder ? 'not-allowed' : 'pointer',
                opacity: !canPlaceOrder ? 0.5 : 1,
              }}
            >
              {language === 'ar' ? 'دفع الآن' : 'Pay Now'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowPayment(false)}
              style={{
                padding: '14px 20px',
                backgroundColor: '#f1f5f9',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              {t.common.back}
            </button>
            <button
              onClick={handlePayNow}
              disabled={!canPay || loading}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: !canPay || loading ? 'not-allowed' : 'pointer',
                opacity: !canPay || loading ? 0.5 : 1,
              }}
            >
              {loading ? t.cashier.paying : t.payment.payAndClose}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}






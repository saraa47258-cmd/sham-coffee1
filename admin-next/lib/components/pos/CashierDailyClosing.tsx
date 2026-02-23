'use client';

import { useState, useEffect } from 'react';
import { 
  createEnhancedDailyClosing, 
  isDayClosed,
  getTodaySalesForClosing,
  DailyClosing 
} from '@/lib/reports';
import * as PC from '@/lib/utils/precision';
import { 
  X, 
  Calendar, 
  DollarSign, 
  Calculator, 
  FileText, 
  AlertCircle,
  Lock,
  CheckCircle,
  ShoppingBag,
  CreditCard,
  Banknote,
  Coffee,
  DoorOpen,
  Receipt,
  TrendingUp
} from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageContext';

interface CashierDailyClosingProps {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userName?: string;
}

export default function CashierDailyClosing({
  onClose,
  onSuccess,
  userId,
  userName,
}: CashierDailyClosingProps) {
  const { t, language } = useTranslation();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingCash, setOpeningCash] = useState('0');
  const [cashSales, setCashSales] = useState('0');
  const [cardSales, setCardSales] = useState('0');
  const [ordersCount, setOrdersCount] = useState('0');
  const [paidOrdersCount, setPaidOrdersCount] = useState('0');
  const [unpaidOrdersCount, setUnpaidOrdersCount] = useState('0');
  const [tableOrdersCount, setTableOrdersCount] = useState('0');
  const [roomOrdersCount, setRoomOrdersCount] = useState('0');
  const [takeawayOrdersCount, setTakeawayOrdersCount] = useState('0');
  const [expenses, setExpenses] = useState('0');
  const [actualCash, setActualCash] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [alreadyClosed, setAlreadyClosed] = useState(false);
  const [checkingClosed, setCheckingClosed] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Check if day is already closed and auto-load data
  useEffect(() => {
    checkIfClosedAndLoadData();
  }, [date]);

  const checkIfClosedAndLoadData = async () => {
    setCheckingClosed(true);
    setLoadingData(true);
    setDataLoaded(false);
    try {
      const closed = await isDayClosed(date);
      setAlreadyClosed(closed);
      
      if (!closed) {
        // جلب بيانات المبيعات المحسوبة تلقائياً من الطلبات
        const salesData = await getTodaySalesForClosing(date);
        setCashSales(PC.format(salesData.cashSales));
        setCardSales(PC.format(salesData.cardSales));
        setOrdersCount(salesData.ordersCount.toString());
        setPaidOrdersCount(salesData.paidOrdersCount.toString());
        setUnpaidOrdersCount(salesData.unpaidOrdersCount.toString());
        setTableOrdersCount(salesData.tableOrdersCount.toString());
        setRoomOrdersCount(salesData.roomOrdersCount.toString());
        setTakeawayOrdersCount(salesData.takeawayOrdersCount.toString());
        setDataLoaded(true);
      }
    } catch (error) {
      // ignore
    } finally {
      setCheckingClosed(false);
      setLoadingData(false);
    }
  };

  const reloadData = async () => {
    if (loadingData) return;
    setLoadingData(true);
    try {
      const salesData = await getTodaySalesForClosing(date);
      setCashSales(PC.format(salesData.cashSales));
      setCardSales(PC.format(salesData.cardSales));
      setOrdersCount(salesData.ordersCount.toString());
      setPaidOrdersCount(salesData.paidOrdersCount.toString());
      setUnpaidOrdersCount(salesData.unpaidOrdersCount.toString());
      setTableOrdersCount(salesData.tableOrdersCount.toString());
      setRoomOrdersCount(salesData.roomOrdersCount.toString());
      setTakeawayOrdersCount(salesData.takeawayOrdersCount.toString());
      setDataLoaded(true);
    } catch (error) {
      // ignore
    } finally {
      setLoadingData(false);
    }
  };

  const totalSales = PC.add(parseFloat(cashSales || '0'), parseFloat(cardSales || '0'));
  const expectedCash = PC.subtract(
    PC.add(parseFloat(openingCash || '0'), parseFloat(cashSales || '0')),
    parseFloat(expenses || '0')
  );
  const difference = PC.subtract(parseFloat(actualCash || '0'), expectedCash);

  const handleSubmit = async () => {
    if (step === 'input') {
      // Move to confirmation step
      setStep('confirm');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await createEnhancedDailyClosing({
        date,
        openingCash: parseFloat(openingCash || '0'),
        cashSales: parseFloat(cashSales || '0'),
        cardSales: parseFloat(cardSales || '0'),
        totalSales: PC.add(parseFloat(cashSales || '0'), parseFloat(cardSales || '0')),
        expenses: parseFloat(expenses || '0'),
        actualCash: parseFloat(actualCash || '0'),
        difference: PC.subtract(parseFloat(actualCash || '0'), expectedCash),
        notes: notes || undefined,
        closedBy: userId,
        closedByName: userName,
        ordersCount: parseInt(ordersCount || '0'),
        paidOrdersCount: parseInt(paidOrdersCount || '0'),
        unpaidOrdersCount: parseInt(unpaidOrdersCount || '0'),
        tableOrdersCount: parseInt(tableOrdersCount || '0'),
        roomOrdersCount: parseInt(roomOrdersCount || '0'),
        takeawayOrdersCount: parseInt(takeawayOrdersCount || '0'),
        isLocked: true,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || t.common.error);
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '680px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        zIndex: 101,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
            }}>
              <Lock style={{ width: '28px', height: '28px', color: '#ffffff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                {language === 'ar' ? `إغلاق اليوم ${dataLoaded ? '' : '(يدوي)'}` : `Close Day ${dataLoaded ? '' : '(Manual)'}`}
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                {step === 'input' ? (dataLoaded ? (language === 'ar' ? 'بيانات من النظام - يمكنك تعديلها' : 'System data - you can edit') : (language === 'ar' ? 'إدخال بيانات المبيعات يدوياً' : 'Enter sales data manually')) : t.reports.confirmAndClose}
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
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {checkingClosed ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ color: '#64748b' }}>{t.common.loading}</p>
            </div>
          ) : alreadyClosed ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <CheckCircle style={{ width: '40px', height: '40px', color: '#ffffff' }} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                {t.reports.alreadyClosed}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {language === 'ar' ? 'لا يمكن إجراء إغلاق آخر لنفس اليوم' : 'Cannot perform another closing for the same day'}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}>
                  <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444' }} />
                  <span style={{ fontSize: '14px', color: '#ef4444' }}>{error}</span>
                </div>
              )}

              {/* Date Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '10px',
                }}>
                  <Calendar style={{ width: '16px', height: '16px' }} />
                  {t.reports.closingDate}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  disabled={step === 'confirm'}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: step === 'confirm' ? '#e2e8f0' : '#f8fafc',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Sales Input Section */}
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '2px solid #bbf7d0',
                borderRadius: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '10px', 
                  marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendingUp style={{ width: '22px', height: '22px', color: '#16a34a' }} />
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>
                      {language === 'ar' ? `بيانات المبيعات ${dataLoaded ? '(من النظام)' : '(إدخال يدوي)'}` : `Sales Data ${dataLoaded ? '(From System)' : '(Manual Entry)'}`}
                    </span>
                  </div>
                  {step !== 'confirm' && (
                    <button
                      type="button"
                      onClick={reloadData}
                      disabled={loadingData}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: loadingData ? '#e2e8f0' : '#dcfce7',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#16a34a',
                        cursor: loadingData ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loadingData ? t.common.loading : t.common.refresh}
                    </button>
                  )}
                </div>

                {/* Sales Amount Inputs */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px',
                    }}>
                      <Banknote style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                      {t.reports.cashSales}
                    </label>
                    <input
                      type="number"
                      value={cashSales}
                      onChange={(e) => setCashSales(e.target.value)}
                      step="0.001"
                      min="0"
                      disabled={step === 'confirm'}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: step === 'confirm' ? '#e2e8f0' : '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: 600,
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
                      color: '#374151',
                      marginBottom: '8px',
                    }}>
                      <CreditCard style={{ width: '14px', height: '14px', color: '#8b5cf6' }} />
                      {t.reports.cardSales}
                    </label>
                    <input
                      type="number"
                      value={cardSales}
                      onChange={(e) => setCardSales(e.target.value)}
                      step="0.001"
                      min="0"
                      disabled={step === 'confirm'}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: step === 'confirm' ? '#e2e8f0' : '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: 600,
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
                      color: '#374151',
                      marginBottom: '8px',
                    }}>
                      <ShoppingBag style={{ width: '14px', height: '14px', color: '#6366f1' }} />
                      {t.reports.ordersCount}
                    </label>
                    <input
                      type="number"
                      value={ordersCount}
                      onChange={(e) => setOrdersCount(e.target.value)}
                      min="0"
                      disabled={step === 'confirm'}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: step === 'confirm' ? '#e2e8f0' : '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Order Statistics (Optional) */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
                    {language === 'ar' ? 'تفاصيل الطلبات (اختياري)' : 'Order Details (Optional)'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>{t.reports.paidOrdersCount}</label>
                      <input
                        type="number"
                        value={paidOrdersCount}
                        onChange={(e) => setPaidOrdersCount(e.target.value)}
                        min="0"
                        disabled={step === 'confirm'}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: step === 'confirm' ? '#f1f5f9' : '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>{t.reports.unpaidOrdersCount}</label>
                      <input
                        type="number"
                        value={unpaidOrdersCount}
                        onChange={(e) => setUnpaidOrdersCount(e.target.value)}
                        min="0"
                        disabled={step === 'confirm'}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: step === 'confirm' ? '#f1f5f9' : '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <DoorOpen style={{ width: '14px', height: '14px', color: '#6366f1' }} />
                      <input
                        type="number"
                        value={tableOrdersCount}
                        onChange={(e) => setTableOrdersCount(e.target.value)}
                        min="0"
                        placeholder={t.reports.tableOrders}
                        disabled={step === 'confirm'}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: step === 'confirm' ? '#f1f5f9' : '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Coffee style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                      <input
                        type="number"
                        value={roomOrdersCount}
                        onChange={(e) => setRoomOrdersCount(e.target.value)}
                        min="0"
                        placeholder={t.reports.roomOrders}
                        disabled={step === 'confirm'}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: step === 'confirm' ? '#f1f5f9' : '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Receipt style={{ width: '14px', height: '14px', color: '#22c55e' }} />
                      <input
                        type="number"
                        value={takeawayOrdersCount}
                        onChange={(e) => setTakeawayOrdersCount(e.target.value)}
                        min="0"
                        placeholder={t.reports.takeawayOrders}
                        disabled={step === 'confirm'}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: step === 'confirm' ? '#f1f5f9' : '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Total Sales Display */}
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#ffffff',
                }}>
                  <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>
                    {t.reports.totalSales}
                  </p>
                  <p style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>
                    {PC.format(totalSales)} {t.common.currency}
                  </p>
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div style={{
                padding: '20px',
                backgroundColor: '#fffbeb',
                border: '2px solid #fbbf24',
                borderRadius: '16px',
                marginBottom: '20px',
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calculator style={{ width: '18px', height: '18px' }} />
                  {t.reports.cashReconciliation}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                      {t.reports.openingCash}
                    </label>
                    <input
                      type="number"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      step="0.001"
                      min="0"
                      disabled={step === 'confirm'}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        backgroundColor: step === 'confirm' ? '#e2e8f0' : '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                      {t.reports.expenses}
                    </label>
                    <input
                      type="number"
                      value={expenses}
                      onChange={(e) => setExpenses(e.target.value)}
                      step="0.001"
                      min="0"
                      disabled={step === 'confirm'}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        backgroundColor: step === 'confirm' ? '#e2e8f0' : '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                    {t.reports.actualCash}
                  </label>
                  <input
                    type="number"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    step="0.001"
                    min="0"
                    required
                    disabled={step === 'confirm'}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      backgroundColor: step === 'confirm' ? '#e2e8f0' : '#ffffff',
                      border: '2px solid #f59e0b',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Difference Display */}
                <div style={{
                  padding: '16px',
                  backgroundColor: PC.equals(difference, 0) ? 'rgba(34, 197, 94, 0.15)' :
                                difference > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    {language === 'ar' ? `الفرق (الفعلي - المتوقع: ${PC.format(expectedCash)})` : `Difference (Actual - Expected: ${PC.format(expectedCash)})`}
                  </p>
                  <p style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: PC.equals(difference, 0) ? '#22c55e' :
                           difference > 0 ? '#3b82f6' : '#ef4444',
                    margin: 0,
                  }}>
                    {difference > 0 ? '+' : ''}{PC.format(difference)} {t.common.currency}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '10px',
                }}>
                  <FileText style={{ width: '16px', height: '16px' }} />
                  {`${t.common.notes} (${t.common.optional})`}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'أي ملاحظات إضافية عن إغلاق اليوم...' : 'Any additional notes about closing the day...'}
                  rows={3}
                  disabled={step === 'confirm'}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: step === 'confirm' ? '#e2e8f0' : '#f8fafc',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {step === 'confirm' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                }}>
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', margin: 0 }}>
                      {language === 'ar' ? 'تحذير: هذا الإجراء نهائي' : 'Warning: This action is final'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', margin: 0 }}>
                      {language === 'ar' ? 'بعد الإغلاق لن يمكن إضافة أو تعديل طلبات هذا اليوم' : 'After closing, orders for this day cannot be added or modified'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!alreadyClosed && !checkingClosed && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '12px',
            backgroundColor: '#f8fafc',
          }}>
            {step === 'confirm' && (
              <button
                type="button"
                onClick={() => setStep('input')}
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                {t.common.back}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: step === 'input' ? 1 : 'none',
                padding: '14px 24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: loading ? '#94a3b8' : step === 'input' 
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                t.common.loading
              ) : step === 'input' ? (
                <>
                  <Calculator style={{ width: '18px', height: '18px' }} />
                  {t.reports.reviewAndConfirm}
                </>
              ) : (
                <>
                  <Lock style={{ width: '18px', height: '18px' }} />
                  {t.reports.confirmAndClose}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

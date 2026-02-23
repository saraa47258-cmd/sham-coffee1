'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  DateRange,
  ReportTab,
  ReportStats,
  DailyStats,
  DailyClosing,
  TopProduct,
  getDateRangeBounds,
  getOrdersByDateRange,
  calculateReportStats,
  getDailyStatsForRange,
  getWeeklyStats,
  getMonthlyStats,
  getTopProducts,
  getDailyClosings,
  getSalesTrend,
} from '@/lib/reports';
import * as PC from '@/lib/utils/precision';
import ReportKPIs from '@/lib/components/reports/ReportKPIs';
import DateRangeFilter from '@/lib/components/reports/DateRangeFilter';
import SalesChart from '@/lib/components/reports/SalesChart';
import DailyClosingModal from '@/lib/components/reports/DailyClosingModal';
import DailyClosingTable from '@/lib/components/reports/DailyClosingTable';
import SummaryTable from '@/lib/components/reports/SummaryTable';
import {
  BarChart3,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle,
  FileDown,
} from 'lucide-react';
import { exportReportToPDF } from '@/lib/utils/pdfExport';
import { useTranslation } from '@/lib/context/LanguageContext';

export default function ReportsPage() {
  const { user } = useAuth();
  const { t, language } = useTranslation();

  // Filter State
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [filters, setFilters] = useState<{
    paymentMethod?: 'cash' | 'card' | '';
    orderType?: 'table' | 'room' | 'takeaway' | '';
  }>({});

  // Data State
  const [stats, setStats] = useState<ReportStats>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    cashSales: 0,
    cardSales: 0,
    paidOrders: 0,
    unpaidOrders: 0,
    tableOrders: 0,
    roomOrders: 0,
    takeawayOrders: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [periodData, setPeriodData] = useState<{ period: string; stats: DailyStats }[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [trend, setTrend] = useState<{ percentChange: number } | undefined>();

  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Calculate date bounds
  const dateBounds = useMemo(() => {
    return getDateRangeBounds(
      dateRange,
      customStart ? new Date(customStart) : undefined,
      customEnd ? new Date(customEnd) : undefined
    );
  }, [dateRange, customStart, customEnd]);

  // Load data
  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { start, end } = dateBounds;

      // Load orders with filters
      const queryFilters: any = {};
      if (filters.paymentMethod) queryFilters.paymentMethod = filters.paymentMethod;
      if (filters.orderType) queryFilters.orderType = filters.orderType;

      const orders = await getOrdersByDateRange(start, end, 
        Object.keys(queryFilters).length > 0 ? queryFilters : undefined
      );

      // Calculate stats
      const calculatedStats = calculateReportStats(orders);
      setStats(calculatedStats);

      // Load daily stats for chart
      const daily = await getDailyStatsForRange(start, end);
      setDailyStats(daily);

      // Load period data based on active tab
      let periodDataResult: { period: string; stats: DailyStats }[] = [];
      switch (activeTab) {
        case 'daily':
          periodDataResult = daily.map(d => ({ period: d.date, stats: d }));
          break;
        case 'weekly':
          const weekly = await getWeeklyStats(start, end);
          periodDataResult = weekly.map(w => ({ period: w.week, stats: w.stats }));
          break;
        case 'monthly':
          const monthly = await getMonthlyStats(start, end);
          periodDataResult = monthly.map(m => ({ period: m.month, stats: m.stats }));
          break;
        case 'yearly':
          // Group by year
          const yearlyMap = new Map<string, DailyStats>();
          daily.forEach(d => {
            const year = d.date.substring(0, 4);
            const existing = yearlyMap.get(year) || {
              date: year,
              totalSales: 0,
              totalOrders: 0,
              cashSales: 0,
              cardSales: 0,
              averageOrder: 0,
            };
            existing.totalSales = PC.add(existing.totalSales, d.totalSales);
            existing.totalOrders += d.totalOrders;
            existing.cashSales = PC.add(existing.cashSales, d.cashSales);
            existing.cardSales = PC.add(existing.cardSales, d.cardSales);
            yearlyMap.set(year, existing);
          });
          periodDataResult = Array.from(yearlyMap.entries())
            .map(([year, s]) => ({
              period: year,
              stats: { ...s, averageOrder: s.totalOrders > 0 ? PC.divide(s.totalSales, s.totalOrders) : 0 },
            }))
            .sort((a, b) => a.period.localeCompare(b.period));
          break;
      }
      setPeriodData(periodDataResult);

      // Load top products
      const products = await getTopProducts(start, end, 10);
      setTopProducts(products);

      // Load sales trend
      const trendData = await getSalesTrend(start, end);
      setTrend({ percentChange: trendData.percentChange });

      // Load daily closings
      const closingsData = await getDailyClosings(30);
      setClosings(closingsData);

    } catch (error) {
      console.error('Error loading reports:', error);
      showToast(t.reports.errorLoading, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateBounds, activeTab, filters]);

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleClosingSuccess = () => {
    showToast(t.reports.closingSavedSuccess, 'success');
    loadData(true);
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportReportToPDF({
        stats,
        dailyStats,
        topProducts,
        closings,
        dateRange: dateBounds,
        restaurantName: 'Sham Coffee',
      });
      showToast(t.reports.exportSuccess, 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast(t.reports.exportError, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      padding: '0',
      minHeight: 'calc(100vh - 120px)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <BarChart3 style={{ width: '28px', height: '28px', color: '#6366f1' }} />
            {t.reports.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            {t.reports.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: exporting || loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
            }}
          >
            <FileDown style={{ width: '18px', height: '18px' }} />
            {exporting ? t.reports.exporting : t.reports.exportPDF}
          </button>
          <button
            onClick={() => setShowClosingModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            {t.reports.dailyClosing}
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
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
            {t.common.refresh}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <ReportKPIs stats={stats} trend={trend} loading={loading} />

      {/* Date Range Filter */}
      <DateRangeFilter
        dateRange={dateRange}
        customStart={customStart}
        customEnd={customEnd}
        activeTab={activeTab}
        onDateRangeChange={setDateRange}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        onTabChange={setActiveTab}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Sales Chart */}
      <SalesChart data={dailyStats} loading={loading} trend={trend} />

      {/* Summary Tables */}
      <SummaryTable
        type={activeTab}
        data={periodData}
        topProducts={topProducts}
        loading={loading}
      />

      {/* Daily Closing Section */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: '16px',
        }}>
          {t.reports.closingLog}
        </h2>
        <DailyClosingTable closings={closings} loading={loading} />
      </div>

      {/* Daily Closing Modal */}
      {showClosingModal && user && (
        <DailyClosingModal
          onClose={() => setShowClosingModal(false)}
          onSuccess={handleClosingSuccess}
          userId={user.id}
          userName={user.name}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 24px',
          backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 200,
          animation: 'slideUp 0.3s ease-out',
        }}>
          {toast.type === 'success' ? (
            <CheckCircle style={{ width: '20px', height: '20px', color: '#ffffff' }} />
          ) : (
            <AlertCircle style={{ width: '20px', height: '20px', color: '#ffffff' }} />
          )}
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
            {toast.message}
          </span>
        </div>
      )}


    </div>
  );
}

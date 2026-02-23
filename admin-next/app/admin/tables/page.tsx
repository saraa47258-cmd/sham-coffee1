'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Table, 
  Order,
  listenToTables, 
  getOrder,
  getOrders,
  createTable,
  isTableNumberUnique
} from '@/lib/firebase/database';
import TableCard from '@/lib/components/tables/TableCard';
import TableDetailsModal from '@/lib/components/tables/TableDetailsModal';
import { useTranslation } from '@/lib/context/LanguageContext';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Grid3X3,
  Coffee,
  Crown,
  CheckCircle,
  XCircle,
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export default function TablesPage() {
  const { t, language } = useTranslation();

  const AREA_OPTIONS = useMemo(() => [
    { value: 'all', label: language === 'ar' ? 'جميع المناطق' : 'All Areas', icon: Grid3X3 },
    { value: 'داخلي', label: language === 'ar' ? 'داخلي' : 'Indoor', icon: Coffee },
    { value: 'VIP', label: 'VIP', icon: Crown },
  ], [language]);

  const STATUS_OPTIONS = useMemo(() => [
    { value: 'all', label: t.common.all, icon: Grid3X3, color: '#64748b' },
    { value: 'available', label: t.tables.statusAvailable, icon: CheckCircle, color: '#16a34a' },
    { value: 'reserved', label: t.tables.statusReserved, icon: AlertCircle, color: '#f59e0b' },
    { value: 'occupied', label: t.tables.statusOccupied, icon: XCircle, color: '#dc2626' },
  ], [t]);
  const [tables, setTables] = useState<Table[]>([]);
  const [tableOrders, setTableOrders] = useState<Record<string, Order>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  
  // Filters
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
  const isTablet = screenSize === 'tablet';

  // Real-time tables listener
  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToTables(async (tablesData) => {
      setTables(tablesData);
      
      // Fetch all orders to find active orders for tables
      const ordersMap: Record<string, Order> = {};
      
      try {
        // Get all pending orders
        const allOrders = await getOrders();
        const pendingOrders = allOrders.filter(o => 
          o.status !== 'completed' && 
          o.status !== 'cancelled' && 
          o.paymentStatus !== 'paid'
        );
        
        await Promise.all(
          tablesData
            .filter(t => t.status === 'occupied')
            .map(async (table) => {
              try {
                // First try using activeOrderId
                if (table.activeOrderId) {
                  const order = await getOrder(table.activeOrderId);
                  if (order) {
                    ordersMap[table.id] = order;
                    return;
                  }
                }
                
                // Fallback: Find order by tableId from pending orders
                const tableOrder = pendingOrders.find(o => o.tableId === table.id);
                if (tableOrder) {
                  ordersMap[table.id] = tableOrder;
                }
              } catch (error) {
                console.error('Error fetching order:', error);
              }
            })
        );
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
      
      setTableOrders(ordersMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // Area filter
      if (filterArea !== 'all' && table.area !== filterArea) {
        return false;
      }
      
      // Status filter
      if (filterStatus !== 'all' && table.status !== filterStatus) {
        return false;
      }
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const tableNumber = String(table.tableNumber).toLowerCase();
        const tableName = (table.name || '').toLowerCase();
        if (!tableNumber.includes(searchLower) && !tableName.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by table number
      const numA = parseInt(String(a.tableNumber)) || 0;
      const numB = parseInt(String(b.tableNumber)) || 0;
      return numA - numB;
    });
  }, [tables, filterArea, filterStatus, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter(t => t.status === 'available').length;
    const reserved = tables.filter(t => t.status === 'reserved').length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    return { total, available, reserved, occupied };
  }, [tables]);

  const handleRefresh = () => {
    // The listener will automatically refresh
    window.location.reload();
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
  };

  const handleStatusChange = () => {
    // Will be refreshed by real-time listener
  };

  return (
    <div style={{ padding: isMobile ? '16px' : isTablet ? '20px' : '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '16px' : '0',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {t.tables.title}
          </h1>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#64748b', marginTop: '4px' }}>
            {t.tables.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px' }}>
          <button
            onClick={handleRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '4px' : '8px',
              padding: isMobile ? '8px 12px' : '10px 16px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: isMobile ? '10px' : '12px',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: isMobile ? '16px' : '18px', height: isMobile ? '16px' : '18px' }} />
            {!isMobile && t.common.refresh}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            {t.tables.addTable}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '10px' : '16px',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        <div style={{
          padding: isMobile ? '14px' : '20px',
          backgroundColor: '#ffffff',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #e2e8f0',
        }}>
          <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#64748b', marginBottom: '4px' }}>{language === 'ar' ? 'إجمالي الطاولات' : 'Total Tables'}</p>
          <p style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stats.total}</p>
        </div>
        <div style={{
          padding: isMobile ? '14px' : '20px',
          backgroundColor: '#f0fdf4',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #16a34a',
        }}>
          <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#16a34a', marginBottom: '4px' }}>{t.tables.statusAvailable}</p>
          <p style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: '#16a34a', margin: 0 }}>{stats.available}</p>
        </div>
        <div style={{
          padding: isMobile ? '14px' : '20px',
          backgroundColor: '#fef3c7',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #f59e0b',
        }}>
          <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#f59e0b', marginBottom: '4px' }}>{t.tables.statusReserved}</p>
          <p style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>{stats.reserved}</p>
        </div>
        <div style={{
          padding: isMobile ? '14px' : '20px',
          backgroundColor: '#fee2e2',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #dc2626',
        }}>
          <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#dc2626', marginBottom: '4px' }}>{t.tables.statusOccupied}</p>
          <p style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: '#dc2626', margin: 0 }}>{stats.occupied}</p>
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
        <div style={{
          display: 'flex',
          gap: isMobile ? '10px' : '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : '200px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0 14px',
              height: isMobile ? '40px' : '44px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: isMobile ? '10px' : '12px',
            }}>
              <Search style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث برقم الطاولة...' : 'Search by table number...'}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: isMobile ? '13px' : '14px',
                  color: '#0f172a',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Area Filter - Scrollable on mobile */}
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            overflowX: 'auto',
            minWidth: isMobile ? '100%' : 'auto',
            paddingBottom: isMobile ? '4px' : '0',
          }}>
            {AREA_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setFilterArea(option.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: isMobile ? '6px 10px' : '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: isMobile ? '12px' : '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: filterArea === option.value ? '#6366f1' : '#f1f5f9',
                    color: filterArea === option.value ? '#ffffff' : '#475569',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: '14px', height: '14px' }} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Status Filter - Scrollable on mobile */}
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            overflowX: 'auto',
            minWidth: isMobile ? '100%' : 'auto',
            paddingBottom: isMobile ? '4px' : '0',
          }}>
            {STATUS_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: isMobile ? '6px 10px' : '8px 14px',
                    borderRadius: '10px',
                    border: filterStatus === option.value 
                      ? `2px solid ${option.color}` 
                      : '1px solid #e2e8f0',
                    fontSize: isMobile ? '12px' : '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: filterStatus === option.value ? `${option.color}20` : '#ffffff',
                    color: filterStatus === option.value ? option.color : '#475569',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: '14px', height: '14px' }} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#6366f1' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <LayoutGrid style={{ width: '18px', height: '18px' }} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#6366f1' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <List style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          color: '#64748b',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      ) : filteredTables.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}>
          <Grid3X3 style={{ width: '48px', height: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#475569', marginBottom: '8px' }}>
            {searchTerm || filterArea !== 'all' || filterStatus !== 'all' 
              ? (language === 'ar' ? 'لا توجد طاولات تطابق البحث' : 'No tables match the search') 
              : t.tables.noTables}
          </p>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            {searchTerm || filterArea !== 'all' || filterStatus !== 'all' 
              ? (language === 'ar' ? 'جرب تغيير الفلاتر' : 'Try changing the filters') 
              : (language === 'ar' ? 'ابدأ بإضافة طاولة جديدة' : 'Start by adding a new table')}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'grid' 
            ? isMobile 
              ? 'repeat(auto-fill, minmax(150px, 1fr))'
              : isTablet
                ? 'repeat(auto-fill, minmax(200px, 1fr))'
                : 'repeat(auto-fill, minmax(260px, 1fr))' 
            : '1fr',
          gap: isMobile ? '10px' : '16px',
        }}>
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              activeOrder={tableOrders[table.id]}
              onClick={() => handleTableClick(table)}
            />
          ))}
        </div>
      )}

      {/* Table Details Modal */}
      {selectedTable && (
        <TableDetailsModal
          table={selectedTable}
          activeOrder={tableOrders[selectedTable.id]}
          onClose={() => setSelectedTable(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <AddTableModal
          onClose={() => setShowAddModal(false)}
          onSave={async (tableData) => {
            await createTable(tableData);
            setShowAddModal(false);
          }}
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

// Add Table Modal Component
function AddTableModal({ 
  onClose, 
  onSave 
}: { 
  onClose: () => void; 
  onSave: (data: any) => Promise<void>;
}) {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    tableNumber: '',
    name: '',
    area: 'داخلي' as 'داخلي' | 'VIP',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tableNumber) return;
    
    setLoading(true);
    setError('');
    
    try {
      await onSave({
        tableNumber: formData.tableNumber.trim(),
        name: formData.name.trim() || undefined,
        area: formData.area,
        status: 'available',
      });
    } catch (err: any) {
      console.error('Error creating table:', err);
      setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء إضافة الطاولة' : 'An error occurred while adding the table'));
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 90,
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '420px',
        maxWidth: '95vw',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        zIndex: 100,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {t.tables.addTable}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              borderRadius: '12px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Table Number */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                {t.tables.tableNumber} *
              </label>
              <input
                type="text"
                value={formData.tableNumber}
                onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: 1, A1, VIP1' : 'e.g. 1, A1, VIP1'}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                {t.tables.tableName} ({t.common.optional})
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: طاولة الشرفة' : 'e.g. Balcony Table'}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Area - Only داخلي and VIP */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                {t.tables.area} *
              </label>
              <select
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value as 'داخلي' | 'VIP' })}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <option value="داخلي">{language === 'ar' ? 'داخلي' : 'Indoor'}</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="submit"
              disabled={loading || !formData.tableNumber}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: loading || !formData.tableNumber ? 'not-allowed' : 'pointer',
                opacity: loading || !formData.tableNumber ? 0.7 : 1,
              }}
            >
              {loading ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...') : t.tables.addTable}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '14px 24px',
                backgroundColor: '#f1f5f9',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}




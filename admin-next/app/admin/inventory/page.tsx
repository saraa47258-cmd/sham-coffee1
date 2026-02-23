'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  InventoryProduct, 
  InventoryStats,
  getInventoryProducts, 
  getInventoryStats,
  addStock,
  removeStock,
  adjustStock,
  exportInventoryToCSV,
  downloadCSV
} from '@/lib/inventory';
import { getCategories, Category } from '@/lib/firebase/database';
import InventoryKPIs from '@/lib/components/inventory/InventoryKPIs';
import InventoryTable from '@/lib/components/inventory/InventoryTable';
import StockModal from '@/lib/components/inventory/StockModal';
import HistoryModal from '@/lib/components/inventory/HistoryModal';
import { 
  Package, 
  RefreshCw, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageContext';

type ModalType = 'add' | 'remove' | 'adjust' | 'history' | null;

export default function InventoryPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  
  // Data
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalInStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalStockValue: 0,
    todayMovementsIn: 0,
    todayMovementsOut: 0,
  });

  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load data
  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [productsData, categoriesData, statsData] = await Promise.all([
        getInventoryProducts(),
        getCategories(),
        getInventoryStats(),
      ]);

      // Map category names to products
      const productsWithCategories = productsData.map(p => ({
        ...p,
        categoryName: categoriesData.find(c => c.id === p.categoryId)?.name || p.category,
      }));

      setProducts(productsWithCategories);
      setCategories(categoriesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading inventory:', error);
      showToast(language === 'ar' ? 'خطأ في تحميل البيانات' : 'Error loading data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modal handlers
  const handleAddStock = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setModalType('add');
  };

  const handleRemoveStock = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setModalType('remove');
  };

  const handleAdjustStock = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setModalType('adjust');
  };

  const handleViewHistory = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setModalType('history');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedProduct(null);
  };

  // Stock operations
  const handleStockOperation = async (data: {
    quantity: number;
    reason?: string;
    note?: string;
    supplier?: string;
  }) => {
    if (!selectedProduct || !user) return;

    setProcessing(true);
    try {
      switch (modalType) {
        case 'add':
          await addStock(
            selectedProduct.id,
            data.quantity,
            user.id,
            user.name,
            data.note,
            data.supplier
          );
          showToast(language === 'ar' ? `تم إضافة ${data.quantity} وحدة بنجاح` : `${data.quantity} units added successfully`, 'success');
          break;
        case 'remove':
          await removeStock(
            selectedProduct.id,
            data.quantity,
            data.reason || '',
            user.id,
            user.name,
            data.note
          );
          showToast(language === 'ar' ? `تم سحب ${data.quantity} وحدة بنجاح` : `${data.quantity} units removed successfully`, 'success');
          break;
        case 'adjust':
          await adjustStock(
            selectedProduct.id,
            data.quantity,
            data.reason || '',
            user.id,
            user.name,
            data.note
          );
          showToast(language === 'ar' ? 'تم تعديل الكمية بنجاح' : 'Quantity adjusted successfully', 'success');
          break;
      }

      closeModal();
      await loadData(true);
    } catch (error: any) {
      console.error('Stock operation error:', error);
      showToast(error.message || t.common.error, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Export
  const handleExport = () => {
    const csvContent = exportInventoryToCSV(products);
    const filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
    showToast(language === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully', 'success');
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
        gap: '12px',
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
            <Package style={{ width: '28px', height: '28px', color: '#6366f1' }} />
            {t.inventory.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            {t.inventory.subtitle}
          </p>
        </div>
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

      {/* KPI Cards */}
      <InventoryKPIs stats={stats} loading={loading} />

      {/* Inventory Table */}
      <InventoryTable
        products={products}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        loading={loading}
        onAddStock={handleAddStock}
        onRemoveStock={handleRemoveStock}
        onAdjustStock={handleAdjustStock}
        onViewHistory={handleViewHistory}
        onExport={handleExport}
      />

      {/* Stock Modal */}
      {(modalType === 'add' || modalType === 'remove' || modalType === 'adjust') && selectedProduct && (
        <StockModal
          type={modalType}
          product={selectedProduct}
          onClose={closeModal}
          onConfirm={handleStockOperation}
          loading={processing}
        />
      )}

      {/* History Modal */}
      {modalType === 'history' && selectedProduct && (
        <HistoryModal
          product={selectedProduct}
          onClose={closeModal}
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

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}






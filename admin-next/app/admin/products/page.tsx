'use client';

import { useEffect, useState } from 'react';
import { 
  getProducts, 
  getCategories, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProductCount,
  moveProductsToCategory,
  Product, 
  Category 
} from '@/lib/firebase/database';
import Topbar from '@/lib/components/Topbar';
import { useTranslation } from '@/lib/context/LanguageContext';
import { getLocalizedName, getLocalizedDescription, getLocalizedCategoryName } from '@/lib/utils/localized';
import CategoryModal from '@/lib/components/admin/CategoryModal';
import ProductModal from '@/lib/components/admin/ProductModal';
import DeleteCategoryModal from '@/lib/components/admin/DeleteCategoryModal';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FolderPlus,
  Package,
  Grid3X3,
  List,
  ChevronDown,
  MoreVertical,
  Eye,
  EyeOff
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type TabMode = 'products' | 'categories';

export default function MenuManagerPage() {
  const { t, language } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabMode>('products');
  
  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{ category: Category; productCount: number } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Category CRUD
  const handleSaveCategory = async (data: Partial<Category>) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data);
    } else {
      await createCategory(data as Omit<Category, 'id'>);
    }
    await loadData();
  };

  const handleDeleteCategoryClick = async (category: Category) => {
    const productCount = await getCategoryProductCount(category.id);
    setDeletingCategory({ category, productCount });
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    
    // Delete all products in this category first
    const categoryProducts = products.filter(
      p => p.category === deletingCategory.category.id || p.categoryId === deletingCategory.category.id
    );
    for (const product of categoryProducts) {
      await deleteProduct(product.id);
    }
    
    await deleteCategory(deletingCategory.category.id);
    await loadData();
  };

  const handleMoveProducts = async (toCategoryId: string) => {
    if (!deletingCategory) return;
    await moveProductsToCategory(deletingCategory.category.id, toCategoryId);
  };

  const handleDeactivateCategory = async () => {
    if (!deletingCategory) return;
    await updateCategory(deletingCategory.category.id, { isActive: false, active: false });
    await loadData();
  };

  // Product CRUD
  const handleSaveProduct = async (data: Partial<Product>) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    } else {
      await createProduct(data as Omit<Product, 'id'>);
    }
    await loadData();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t.products.confirmDelete)) return;
    await deleteProduct(productId);
    await loadData();
  };

  const handleToggleProductStatus = async (product: Product) => {
    const newStatus = !(product.isActive ?? product.active);
    await updateProduct(product.id, { isActive: newStatus, active: newStatus });
    await loadData();
  };

  // Filtered data
  const filteredProducts = products.filter((product) => {
    if (filterCategory !== 'all' && product.category !== filterCategory && product.categoryId !== filterCategory) {
      return false;
    }
    if (filterStatus === 'active' && !(product.isActive ?? product.active)) {
      return false;
    }
    if (filterStatus === 'inactive' && (product.isActive ?? product.active)) {
      return false;
    }
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.nameEn?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.descriptionEn?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? getLocalizedCategoryName(cat, language) : categoryId;
  };

  const getProductCountForCategory = (categoryId: string) => {
    return products.filter(p => p.category === categoryId || p.categoryId === categoryId).length;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }}></div>
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>{t.common.loading}</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar title={t.products.title} subtitle={t.products.subtitle} />

      <div style={{ padding: '24px' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          padding: '4px',
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          width: 'fit-content',
        }}>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'products' ? '#ffffff' : 'transparent',
              color: activeTab === 'products' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'products' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Package style={{ width: '18px', height: '18px' }} />
            {t.nav.products} ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'categories' ? '#ffffff' : 'transparent',
              color: activeTab === 'categories' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'categories' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Grid3X3 style={{ width: '18px', height: '18px' }} />
            {t.products.categories} ({categories.length})
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <>
            {/* Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 14px',
                  height: '44px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  minWidth: '220px',
                  flex: 1,
                  maxWidth: '320px',
                }}>
                  <Search style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث عن منتج...' : 'Search for product...'}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: '14px',
                      color: '#0f172a',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{
                    padding: '0 16px',
                    height: '44px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#0f172a',
                    cursor: 'pointer',
                    minWidth: '160px',
                  }}
                >
                  <option value="all">{t.menuView.allCategories}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {getLocalizedCategoryName(cat, language)}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  style={{
                    padding: '0 16px',
                    height: '44px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">{t.common.all}</option>
                  <option value="active">{t.common.active}</option>
                  <option value="inactive">{t.common.inactive}</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {/* View Toggle */}
                <div style={{
                  display: 'flex',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '4px',
                }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      padding: '8px',
                      backgroundColor: viewMode === 'grid' ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: viewMode === 'grid' ? '#6366f1' : '#64748b',
                    }}
                  >
                    <Grid3X3 style={{ width: '18px', height: '18px' }} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '8px',
                      backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: viewMode === 'list' ? '#6366f1' : '#64748b',
                    }}
                  >
                    <List style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>

                {/* Add Product Button */}
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setShowProductModal(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 20px',
                    height: '44px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  <Plus style={{ width: '18px', height: '18px' }} />
                  {t.products.addProduct}
                </button>
              </div>
            </div>

            {/* Products Grid/List */}
            {filteredProducts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
              }}>
                <Package style={{ width: '48px', height: '48px', color: '#94a3b8', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>{t.products.noProducts}</p>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>{language === 'ar' ? 'أضف منتجات جديدة للبدء' : 'Add new products to get started'}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      opacity: (product.isActive ?? product.active) ? 1 : 0.6,
                    }}
                  >
                    {/* Image */}
                    <div style={{
                      height: '140px',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {product.imageUrl || product.image ? (
                        <img
                          src={product.imageUrl || product.image}
                          alt={product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '48px' }}>{product.emoji || '☕'}</span>
                      )}
                      
                      {/* Variations Badge */}
                      {product.variations && product.variations.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          padding: '4px 10px',
                          backgroundColor: '#6366f1',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#ffffff',
                        }}>
                          {product.variations.length} {language === 'ar' ? 'خيارات' : 'options'}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '16px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                      }}>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                            {getLocalizedName(product, language)}
                          </h3>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {getCategoryName(product.category || product.categoryId || '')}
                          </p>
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#16a34a',
                        }}>
                          {product.price.toFixed(3)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                      }}>
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowProductModal(true);
                          }}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 style={{ width: '14px', height: '14px' }} />
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleToggleProductStatus(product)}
                          style={{
                            padding: '10px',
                            backgroundColor: (product.isActive ?? product.active) ? '#dcfce7' : '#f1f5f9',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            color: (product.isActive ?? product.active) ? '#16a34a' : '#94a3b8',
                          }}
                        >
                          {(product.isActive ?? product.active) ? (
                            <Eye style={{ width: '16px', height: '16px' }} />
                          ) : (
                            <EyeOff style={{ width: '16px', height: '16px' }} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          style={{
                            padding: '10px',
                            backgroundColor: '#fef2f2',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            color: '#dc2626',
                          }}
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.dashboard.product}</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.common.category}</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.common.price}</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{language === 'ar' ? 'الخيارات' : 'Options'}</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.common.status}</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product, index) => (
                      <tr key={product.id} style={{
                        borderTop: index > 0 ? '1px solid #f1f5f9' : 'none',
                        opacity: (product.isActive ?? product.active) ? 1 : 0.6,
                      }}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              backgroundColor: '#f8fafc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}>
                              {product.imageUrl || product.image ? (
                                <img src={product.imageUrl || product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '22px' }}>{product.emoji || '☕'}</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{getLocalizedName(product, language)}</div>
                              {(product.description || product.descriptionEn) && (
                                <div style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {getLocalizedDescription(product, language)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '14px', color: '#475569' }}>
                          {getCategoryName(product.category || product.categoryId || '')}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: '#16a34a' }}>
                          {product.price.toFixed(3)} {t.common.currency}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748b' }}>
                          {product.variations?.length || 0} {language === 'ar' ? 'خيار' : 'option'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: (product.isActive ?? product.active) ? '#dcfce7' : '#f1f5f9',
                            color: (product.isActive ?? product.active) ? '#16a34a' : '#64748b',
                          }}>
                            {(product.isActive ?? product.active) ? t.common.active : t.common.inactive}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowProductModal(true);
                              }}
                              style={{
                                padding: '8px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: '#64748b',
                              }}
                            >
                              <Edit2 style={{ width: '14px', height: '14px' }} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              style={{
                                padding: '8px',
                                backgroundColor: '#fef2f2',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: '#dc2626',
                              }}
                            >
                              <Trash2 style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <>
            {/* Toolbar */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '20px',
            }}>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 20px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                }}
              >
                <FolderPlus style={{ width: '18px', height: '18px' }} />
                {t.products.addCategory}
              </button>
            </div>

            {/* Categories Grid */}
            {categories.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
              }}>
                <Grid3X3 style={{ width: '48px', height: '48px', color: '#94a3b8', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>{language === 'ar' ? 'لا توجد تصنيفات' : 'No categories'}</p>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>{language === 'ar' ? 'أضف تصنيفات لتنظيم المنتجات' : 'Add categories to organize products'}</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      opacity: (category.isActive ?? category.active) ? 1 : 0.6,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                        }}>
                          {category.icon || category.emoji || '📦'}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                            {getLocalizedName(category, language)}
                          </h3>
                          {language === 'ar' && category.nameEn && (
                            <p style={{ fontSize: '12px', color: '#94a3b8' }}>{category.nameEn}</p>
                          )}
                          {language === 'en' && category.name && category.nameEn && (
                            <p style={{ fontSize: '12px', color: '#94a3b8' }}>{category.name}</p>
                          )}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: (category.isActive ?? category.active) ? '#dcfce7' : '#f1f5f9',
                        color: (category.isActive ?? category.active) ? '#16a34a' : '#64748b',
                      }}>
                        {(category.isActive ?? category.active) ? t.common.active : t.common.inactive}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {getProductCountForCategory(category.id)} {t.dashboard.product}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setShowCategoryModal(true);
                          }}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Edit2 style={{ width: '14px', height: '14px' }} />
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleDeleteCategoryClick(category)}
                          style={{
                            padding: '8px',
                            backgroundColor: '#fef2f2',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#dc2626',
                          }}
                        >
                          <Trash2 style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
          existingCategories={categories}
        />
      )}

      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {deletingCategory && (
        <DeleteCategoryModal
          category={deletingCategory.category}
          productCount={deletingCategory.productCount}
          categories={categories}
          onClose={() => setDeletingCategory(null)}
          onDelete={handleConfirmDeleteCategory}
          onMoveProducts={handleMoveProducts}
          onDeactivate={handleDeactivateCategory}
        />
      )}
    </div>
  );
}

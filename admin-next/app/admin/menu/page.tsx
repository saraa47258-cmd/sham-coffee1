'use client';

import { useEffect, useState } from 'react';
import { getProducts, getCategories, Product, Category } from '@/lib/firebase/database';
import Topbar from '@/lib/components/Topbar';
import CategoryTabs from '@/lib/components/menu/CategoryTabs';
import ProductCard from '@/lib/components/menu/ProductCard';
import ProductModal from '@/lib/components/menu/ProductModal';
import SearchBar from '@/lib/components/menu/SearchBar';
import { Coffee, Package } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageContext';

export default function CustomerMenuPage() {
  const { t, language } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);
      // Filter active products (check both active and isActive fields)
      const activeProducts = productsData.filter(p => 
        p.active !== false && p.isActive !== false
      );
      // Filter active categories (check both active and isActive fields)
      const activeCategories = categoriesData.filter(c => 
        c.active !== false && c.isActive !== false
      );
      setProducts(activeProducts);
      setCategories(activeCategories);
      console.log('Loaded products:', activeProducts.length);
      console.log('Loaded categories:', activeCategories.length);
    } catch (error) {
      console.error('Error loading menu:', error);
      // Set empty arrays on error
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    // Match category by both category and categoryId fields
    if (activeCategory !== 'all' && 
        product.category !== activeCategory && 
        product.categoryId !== activeCategory) {
      return false;
    }
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.nameEn?.toLowerCase().includes(searchLower) ||
        product.descriptionEn?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getCategory = (categoryId: string) => {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.5s infinite',
          }}>
            <Coffee style={{ width: '28px', height: '28px', color: '#ffffff' }} />
          </div>
          <p style={{ fontSize: '14px', color: '#64748b' }}>{t.common.loading}</p>
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <Topbar title={t.menuView.title} subtitle={t.menuView.subtitle} />

      <div style={{ padding: '24px' }}>
        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t.menuView.searchPlaceholder}
          />
        </div>

        {/* Categories */}
        <div style={{ marginBottom: '24px' }}>
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Products Count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#64748b',
        }}>
          <Package style={{ width: '18px', height: '18px' }} />
          <span>{filteredProducts.length} {t.dashboard.product}</span>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '16px',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Package style={{ width: '28px', height: '28px', color: '#94a3b8' }} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              {t.products.noProducts}
            </p>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
              {language === 'ar' ? 'جرب البحث بكلمة أخرى أو اختر تصنيف مختلف' : 'Try a different search or select another category'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '20px',
          }}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={setSelectedProduct}
                isStaffMode={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          category={getCategory(selectedProduct.category)}
          onClose={() => setSelectedProduct(null)}
          isStaffMode={false}
        />
      )}
    </div>
  );
}






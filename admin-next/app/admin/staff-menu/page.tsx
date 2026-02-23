'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts, getCategories, Product, Category, createOrder, getTables, Table } from '@/lib/firebase/database';
import Topbar from '@/lib/components/Topbar';
import CategoryTabs from '@/lib/components/menu/CategoryTabs';
import ProductCard from '@/lib/components/menu/ProductCard';
import ProductModal from '@/lib/components/menu/ProductModal';
import SearchBar from '@/lib/components/menu/SearchBar';
import CartSidebar, { CartItem } from '@/lib/components/menu/CartSidebar';
import { Coffee, Package, ShoppingCart, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageContext';
import { getLocalizedName } from '@/lib/utils/localized';

export default function StaffMenuPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData, tablesData] = await Promise.all([
        getProducts(),
        getCategories(),
        getTables(),
      ]);
      // Filter active products
      const activeProducts = productsData.filter(p => 
        p.active !== false && p.isActive !== false
      );
      // Filter active categories
      const activeCategories = categoriesData.filter(c => 
        c.active !== false && c.isActive !== false
      );
      setProducts(activeProducts);
      setCategories(activeCategories);
      setTables(tablesData);
    } catch (error) {
      console.error('Error loading menu:', error);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
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

  // Cart functions
  const addToCart = (product: Product, variation?: any) => {
    const cartItemId = variation ? `${product.id}-${variation.id}` : product.id;
    const price = variation ? variation.price : product.price;
    
    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === cartItemId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product,
        quantity: 1,
        variation,
        cartItemId,
      }];
    });
    setSelectedProduct(null);
  };

  const incrementItem = (cartItemId: string) => {
    setCart(prev => prev.map(item => 
      item.cartItemId === cartItemId 
        ? { ...item, quantity: item.quantity + 1 }
        : item
    ));
  };

  const decrementItem = (cartItemId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.cartItemId === cartItemId);
      if (item && item.quantity > 1) {
        return prev.map(i => 
          i.cartItemId === cartItemId 
            ? { ...i, quantity: i.quantity - 1 }
            : i
        );
      }
      return prev.filter(i => i.cartItemId !== cartItemId);
    });
  };

  const removeItem = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const updateNote = (cartItemId: string, note: string) => {
    setCart(prev => prev.map(item => 
      item.cartItemId === cartItemId 
        ? { ...item, note }
        : item
    ));
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !tableNumber.trim()) return;
    
    setIsSubmitting(true);
    try {
      const items = cart.map(item => ({
        id: item.product.id,
        name: item.variation 
          ? `${getLocalizedName(item.product, language)} - ${getLocalizedName(item.variation, language)}`
          : getLocalizedName(item.product, language),
        price: item.variation ? item.variation.price : item.product.price,
        quantity: item.quantity,
        itemTotal: item.quantity * (item.variation ? item.variation.price : item.product.price),
        emoji: item.product.emoji,
        note: item.note,
      }));

      const total = items.reduce((sum, item) => sum + item.itemTotal, 0);

      await createOrder({
        items,
        total,
        status: 'pending',
        tableNumber: tableNumber.trim(),
        orderType: 'table',
        source: 'staff-menu',
        restaurantId: 'sham-coffee-1',
        createdAt: new Date().toISOString(),
      });

      setCart([]);
      setTableNumber('');
      setIsCartOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting order:', error);
      alert(t.menuView.orderSubmitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.5s infinite',
          }}>
            <Coffee style={{ width: '28px', height: '28px', color: '#ffffff' }} />
          </div>
          <p style={{ fontSize: '14px', color: '#64748b' }}>{t.menuView.loadingMenu}</p>
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
      <Topbar title={t.nav.staffMenu} subtitle={t.menuView.selectAndOrder} />

      {/* Success Toast */}
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px 24px',
          backgroundColor: '#16a34a',
          color: '#ffffff',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 200,
          boxShadow: '0 10px 25px rgba(22, 163, 74, 0.3)',
        }}>
          <CheckCircle style={{ width: '22px', height: '22px' }} />
          <span style={{ fontWeight: 600 }}>{t.menuView.orderSentSuccess}</span>
        </div>
      )}

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
          <span>{filteredProducts.length} {t.menuView.productCount}</span>
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
              {t.menuView.noProductsMessage}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '20px',
            paddingBottom: '100px',
          }}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={setSelectedProduct}
                isStaffMode={true}
                onAddToCart={() => addToCart(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
          zIndex: 50,
        }}
      >
        <ShoppingCart style={{ width: '28px', height: '28px', color: '#ffffff' }} />
        {cartItemsCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '26px',
            height: '26px',
            backgroundColor: '#dc2626',
            borderRadius: '50%',
            fontSize: '13px',
            fontWeight: 700,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffffff',
          }}>
            {cartItemsCount}
          </span>
        )}
      </button>

      {/* Cart Sidebar */}
      <CartSidebar
        items={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
        onRemove={removeItem}
        onNoteChange={updateNote}
        onSubmit={handleSubmitOrder}
        tableNumber={tableNumber}
        onTableChange={setTableNumber}
        isSubmitting={isSubmitting}
      />

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          category={getCategory(selectedProduct.category)}
          onClose={() => setSelectedProduct(null)}
          isStaffMode={true}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}

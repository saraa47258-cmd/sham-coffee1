'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Product, Category, Table, Room, Order, ProductVariation, listenToOrders, getOrder, addItemsToOrder, OrderItem } from '@/lib/firebase/database';
import { 
  CartItem, 
  POSOrder, 
  getPOSProducts, 
  getPOSCategories, 
  getAvailableTables, 
  getAvailableRooms,
  createPOSOrder,
  payAndCloseOrder,
  getTodayPendingOrders,
  calculateTotals
} from '@/lib/pos';
import ProductGrid from '@/lib/components/pos/ProductGrid';
import CartPanel from '@/lib/components/pos/CartPanel';
import PaymentPanel from '@/lib/components/pos/PaymentPanel';
import * as PC from '@/lib/utils/precision';
import VariationModal from '@/lib/components/pos/VariationModal';
import ReceiptPrint from '@/lib/components/pos/ReceiptPrint';
import CashierDailyClosing from '@/lib/components/pos/CashierDailyClosing';
import { useTranslation } from '@/lib/context/LanguageContext';
import { getLocalizedName } from '@/lib/utils/localized';
import { 
  RefreshCw, 
  ClipboardList, 
  Clock, 
  AlertCircle,
  CheckCircle,
  X,
  ShoppingCart,
  CreditCard,
  Lock
} from 'lucide-react';

// Responsive breakpoints
type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'wide';

export default function CashierPage() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  
  // Screen size state
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [activePanel, setActivePanel] = useState<'products' | 'cart' | 'payment'>('products');
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPendingOrders, setShowPendingOrders] = useState(false);
  const [showDailyClosing, setShowDailyClosing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<Order | null>(null);
  
  // Add to existing order mode
  const [addToOrderMode, setAddToOrderMode] = useState(false);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  /** طلب جديد للغرفة (من تفاصيل الغرفة: متاحة أو محجوزة) */
  const [newOrderForRoomId, setNewOrderForRoomId] = useState<string | null>(null);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else if (width < 1440) {
        setScreenSize('desktop');
      } else {
        setScreenSize('wide');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData, tablesData, roomsData, ordersData] = await Promise.all([
        getPOSProducts(),
        getPOSCategories(),
        getAvailableTables(),
        getAvailableRooms(),
        getTodayPendingOrders(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setTables(tablesData);
      setRooms(roomsData);
      setPendingOrders(ordersData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast(t.cashier.errorLoadingData, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL parameters to load specific order
  useEffect(() => {
    const loadOrderFromUrl = async () => {
      // Use window.location to get URL params (works with static export)
      if (typeof window === 'undefined') return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('orderId');
      const roomId = urlParams.get('roomId');
      const tableId = urlParams.get('tableId');
      const mode = urlParams.get('mode');
      
      // If orderId is provided with mode=add, enable add-to-order mode
      if (orderId && orderId.trim() && mode === 'add') {
        try {
          const order = await getOrder(orderId);
          if (order && order.paymentStatus !== 'paid' && order.status !== 'completed') {
            setExistingOrder(order);
            setAddToOrderMode(true);
            // تأكد من عدم فتح صفحة الدفع - لا نضع الطلب في selectedPendingOrder
            setSelectedPendingOrder(null);
            const isRoom = order.orderType === 'room' || !!order.roomId;
            const roomLabel = isRoom
              ? `${t.cashier.room} ${order.roomNumber || roomId || ''}`
              : `${t.cashier.table} ${order.tableNumber || order.tableId?.slice(-4) || ''}`;
            const prevTotal = (order.total ?? 0).toFixed(3);
            showToast(`${t.cashier.addItems} — ${roomLabel} | ${t.cashier.previousPrice} ${prevTotal} ${t.common.currency}`, 'success');
            return;
          } else if (order) {
            showToast(t.cashier.cannotAddToPaid, 'error');
          }
        } catch (error) {
          console.error('Error loading order for add mode:', error);
        }
        return;
      }
      
      // If orderId is provided, load that specific order
      if (orderId && orderId.trim()) {
        try {
          console.log('Loading order from URL:', orderId);
          const order = await getOrder(orderId);
          console.log('Loaded order:', order);
          if (order && order.paymentStatus !== 'paid' && order.status !== 'completed') {
            setSelectedPendingOrder(order);
            showToast(`${t.cashier.orderNumber} #${orderId.slice(-6).toUpperCase()}`, 'success');
            return;
          } else if (order) {
            showToast(t.cashier.orderAlreadyPaid, 'error');
          }
        } catch (error) {
          console.error('Error loading order from URL:', error);
        }
      }
      
      // If roomId is provided but no orderId, search for pending order for that room
      if (roomId && roomId.trim()) {
        try {
          const todayOrders = await getTodayPendingOrders();
          const roomOrder = todayOrders.find(o => 
            o.roomId === roomId && 
            o.paymentStatus !== 'paid' && 
            o.status !== 'completed'
          );
          if (roomOrder) {
            setSelectedPendingOrder(roomOrder);
            showToast(`${t.cashier.room} #${roomOrder.id.slice(-6).toUpperCase()}`, 'success');
            return;
          }
          // لا يوجد طلب: وضع "طلب جديد للغرفة" (متاحة أو محجوزة)
          setNewOrderForRoomId(roomId);
          showToast(t.cashier.startNewRoomOrder, 'success');
        } catch (error) {
          console.error('Error searching room order:', error);
        }
      }
      
      // If tableId is provided but no orderId, search for pending order for that table
      if (tableId && tableId.trim()) {
        try {
          console.log('Searching for table order:', tableId);
          const todayOrders = await getTodayPendingOrders();
          const tableOrder = todayOrders.find(o => 
            o.tableId === tableId && 
            o.paymentStatus !== 'paid' && 
            o.status !== 'completed'
          );
          if (tableOrder) {
            setSelectedPendingOrder(tableOrder);
            showToast(`${t.cashier.orderNumber} #${tableOrder.id.slice(-6).toUpperCase()}`, 'success');
            return;
          } else {
            showToast(t.cashier.noActiveOrderForTable, 'error');
          }
        } catch (error) {
          console.error('Error searching table order:', error);
        }
      }
    };
    
    if (!loading) {
      loadOrderFromUrl();
    }
  }, [loading]);

  // Real-time listener for pending orders
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const unsubscribe = listenToOrders((allOrders) => {
      // Filter to today's pending orders
      const pending = allOrders.filter((order) => {
        const orderTime = order.timestamp || new Date(order.createdAt).getTime();
        return orderTime >= todayStart && 
          order.status !== 'completed' && 
          order.status !== 'cancelled' &&
          order.paymentStatus !== 'paid';
      }).sort((a, b) => {
        const timeA = a.timestamp || new Date(a.createdAt).getTime();
        const timeB = b.timestamp || new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      
      setPendingOrders(pending);
    });

    return () => unsubscribe();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedProduct) {
          setSelectedProduct(null);
        } else if (receiptData) {
          setReceiptData(null);
        } else if (cart.length > 0) {
          setShowClearConfirm(true);
        }
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="ابحث"], input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProduct, receiptData, cart]);

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check if product has variations
  const hasVariations = (product: Product): boolean => {
    return !!(product.variations && product.variations.length > 0) ||
           !!(product.sizes && Object.keys(product.sizes).length > 0) ||
           !!(product.shishaTypes && Object.keys(product.shishaTypes).length > 0);
  };

  // Handle product click
  const handleProductClick = (product: Product) => {
    if (hasVariations(product)) {
      setSelectedProduct(product);
    } else {
      // Add directly to cart
      addToCart(product, null, 1, '');
    }
  };

  // Add to cart
  const addToCart = (
    product: Product,
    variation: ProductVariation | null,
    quantity: number,
    note: string
  ) => {
    const price = variation ? variation.price : (product.price || product.basePrice || 0);
    const cartItemId = `${product.id}_${variation?.id || 'default'}_${Date.now()}`;
    
    const newItem: CartItem = {
      id: cartItemId,
      productId: product.id,
      name: getLocalizedName(product, language),
      emoji: product.emoji,
      variationId: variation?.id,
      variationName: variation ? getLocalizedName(variation, language) : undefined,
      unitPrice: price,
      quantity,
      note: note || undefined,
      lineTotal: PC.multiply(price, quantity),
    };
    
    setCart(prev => [...prev, newItem]);
    showToast(`${t.cashier.addedToCart} ${getLocalizedName(product, language)}`, 'success');
  };

  // Update cart item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity, lineTotal: PC.multiply(item.unitPrice, quantity) };
      }
      return item;
    }));
  };

  // Remove item from cart
  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Update item note
  const updateNote = (itemId: string, note: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, note: note || undefined };
      }
      return item;
    }));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setShowClearConfirm(false);
    showToast(t.cashier.cartCleared, 'success');
  };

  // Place order (without payment)
  const handlePlaceOrder = async (order: POSOrder) => {
    if (!user) {
      showToast(t.cashier.mustLogin, 'error');
      return;
    }

    setProcessing(true);
    try {
      // If in add-to-order mode, add items to existing order
      if (addToOrderMode && existingOrder) {
        const newItems: OrderItem[] = order.items.map(item => {
          const orderItem: OrderItem = {
            id: item.productId || item.id,
            name: item.name,
            price: item.unitPrice || 0,
            quantity: item.quantity,
            itemTotal: item.lineTotal || (item.quantity * (item.unitPrice || 0)),
          };
          // Only add optional fields if they have values
          if (item.emoji) orderItem.emoji = item.emoji;
          if (item.note) orderItem.note = item.note;
          return orderItem;
        });
        
        await addItemsToOrder(existingOrder.id, newItems);
        showToast(`${t.cashier.addedToCart} ${newItems.length} #${existingOrder.id.slice(-6).toUpperCase()}`, 'success');
        setCart([]);
        setAddToOrderMode(false);
        setExistingOrder(null);
        // Navigate back to tables
        window.history.back();
      } else {
        // Create new order
        const orderId = await createPOSOrder(order, user.id, user.name);
        showToast(`${t.cashier.newOrder} #${orderId.slice(-6).toUpperCase()}`, 'success');
        setCart([]);
        await loadData(); // Refresh tables/rooms
      }
    } catch (error) {
      console.error('Error creating/updating order:', error);
      showToast(t.cashier.orderError, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Pay and close order
  const handlePayNow = async (
    order: POSOrder,
    paymentMethod: 'cash' | 'card',
    receivedAmount: number
  ) => {
    if (!user) {
      showToast(t.cashier.mustLogin, 'error');
      return;
    }

    setProcessing(true);
    try {
      // Ensure receivedAmount is a valid number
      const validReceivedAmount = isNaN(receivedAmount) ? order.total : receivedAmount;
      
      // Create order first
      const orderId = await createPOSOrder(order, user.id, user.name);
      
      // Then pay
      const change = paymentMethod === 'cash' ? Math.max(0, validReceivedAmount - order.total) : 0;
      await payAndCloseOrder(
        orderId,
        { method: paymentMethod, receivedAmount: validReceivedAmount, change },
        user.id,
        user.name
      );

      // Show receipt
      setReceiptData({
        orderNumber: orderId.slice(-6).toUpperCase(),
        items: order.items,
        subtotal: order.subtotal || 0,
        discount: order.discount?.amount || 0,
        tax: order.tax?.amount || 0,
        total: order.total || 0,
        paymentMethod,
        receivedAmount: validReceivedAmount,
        change,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        roomNumber: order.roomNumber,
        cashierName: user.name,
        orderType: order.orderType,
      });

      setCart([]);
      showToast(t.cashier.paymentSuccess, 'success');
      await loadData();
    } catch (error) {
      console.error('Error processing payment:', error);
      showToast(t.cashier.paymentError, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Pay existing pending order
  const handlePayPendingOrder = async (
    order: Order,
    paymentMethod: 'cash' | 'card',
    receivedAmount: number
  ) => {
    if (!user) {
      showToast(t.cashier.mustLogin, 'error');
      return;
    }

    setProcessing(true);
    try {
      // Ensure receivedAmount is a valid number
      const validReceivedAmount = isNaN(receivedAmount) ? order.total : receivedAmount;
      const change = paymentMethod === 'cash' ? Math.max(0, validReceivedAmount - order.total) : 0;
      await payAndCloseOrder(
        order.id,
        { method: paymentMethod, receivedAmount: validReceivedAmount, change },
        user.id,
        user.name
      );

      // Show receipt
      setReceiptData({
        orderNumber: order.id.slice(-6).toUpperCase(),
        items: order.items.map(item => ({
          id: item.id,
          productId: item.id,
          name: item.name,
          unitPrice: item.price || 0,
          quantity: item.quantity,
          lineTotal: item.itemTotal || (item.price || 0) * item.quantity,
          emoji: item.emoji,
          note: item.note,
        })),
        subtotal: order.subtotal || order.total || 0,
        discount: order.discount?.amount || 0,
        tax: 0,
        total: order.total || 0,
        paymentMethod,
        receivedAmount: validReceivedAmount,
        change,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        roomNumber: order.roomNumber,
        cashierName: user.name,
        orderType: order.orderType || 'takeaway',
      });

      setSelectedPendingOrder(null);
      showToast(t.cashier.paymentSuccess, 'success');
      await loadData();
    } catch (error) {
      console.error('Error paying pending order:', error);
      showToast(t.cashier.paymentError, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f1f5f9',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: '16px', color: '#64748b' }}>{t.cashier.loadingCashier}</p>
        </div>
      </div>
    );
  }

  // Responsive grid calculation
  const getGridColumns = () => {
    if (screenSize === 'mobile') {
      return '1fr'; // Single column on mobile - will stack
    }
    if (screenSize === 'tablet') {
      // Two columns on tablet
      return showPendingOrders ? '200px 1fr 280px' : '1fr 280px';
    }
    if (screenSize === 'desktop') {
      return showPendingOrders ? '240px 1fr 300px 280px' : '1fr 300px 280px';
    }
    // Wide screens
    return showPendingOrders ? '280px 1fr 340px 320px' : '1fr 340px 320px';
  };

  const isMobileView = screenSize === 'mobile';
  const isTabletView = screenSize === 'tablet';
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 120px)',
      minHeight: isMobileView ? 'auto' : undefined,
      backgroundColor: '#f1f5f9',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobileView ? '12px 16px' : screenSize === 'tablet' ? '14px 20px' : '16px 24px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        flexWrap: isMobileView ? 'wrap' : 'nowrap',
        gap: isMobileView ? '12px' : '0',
      }}>
        <div style={{ flex: isMobileView ? '1 1 100%' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ 
              fontSize: isMobileView ? '18px' : '20px', 
              fontWeight: 700, 
              color: '#0f172a', 
              margin: 0 
            }}>
              {addToOrderMode
                ? (existingOrder?.orderType === 'room' || existingOrder?.roomId)
                  ? t.cashier.addOrderToRoom
                  : t.cashier.addOrderToTable
                : t.cashier.title}
            </h1>
            {/* Add Mode Badge */}
            {addToOrderMode && existingOrder && (
              <span style={{
                padding: '4px 12px',
                backgroundColor: (existingOrder.orderType === 'room' || existingOrder.roomId) ? '#eef2ff' : '#dbeafe',
                color: (existingOrder.orderType === 'room' || existingOrder.roomId) ? '#4f46e5' : '#1d4ed8',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {(existingOrder.orderType === 'room' || existingOrder.roomId) ? (
                  <>
                    {t.cashier.room} {existingOrder.roomNumber || '-'}
                    <span style={{ opacity: 0.8 }}>|</span>
                    {t.cashier.previousPrice} {(existingOrder.total ?? 0).toFixed(3)} {t.common.currency}
                  </>
                ) : (
                  <>{t.cashier.table} {existingOrder.tableNumber || existingOrder.tableId?.slice(-4)}</>
                )}
                <button
                  onClick={() => {
                    setAddToOrderMode(false);
                    setExistingOrder(null);
                    window.history.back();
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: (existingOrder.orderType === 'room' || existingOrder.roomId) ? '#4f46e5' : '#1d4ed8',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                  }}
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <p style={{ fontSize: isMobileView ? '12px' : '13px', color: '#64748b', marginTop: '2px' }}>
            {addToOrderMode 
              ? (existingOrder?.orderType === 'room' || existingOrder?.roomId)
                ? `${t.cashier.addItems} — ${t.cashier.room} ${existingOrder?.roomNumber || ''} | ${t.cashier.previousPrice} ${(existingOrder?.total ?? 0).toFixed(3)} ${t.common.currency}`
                : `${t.cashier.addItems} #${existingOrder?.id.slice(-6).toUpperCase() || ''}`
              : `${t.cashier.subtitle} - ${user?.name || t.common.user}`
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: isMobileView ? '8px' : '12px', flexWrap: 'wrap' }}>
          {!isMobileView && (
            <button
              onClick={() => setShowPendingOrders(!showPendingOrders)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: screenSize === 'tablet' ? '8px 12px' : '10px 16px',
                backgroundColor: showPendingOrders ? '#6366f1' : '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: screenSize === 'tablet' ? '12px' : '13px',
                fontWeight: 600,
                color: showPendingOrders ? '#ffffff' : '#475569',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <ClipboardList style={{ width: '18px', height: '18px' }} />
              {screenSize !== 'tablet' && t.cashier.pendingOrders}
              {pendingOrders.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '-6px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#dc2626',
                  borderRadius: '50%',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {pendingOrders.length}
                </span>
              )}
            </button>
          )}
          {/* Daily Closing Button */}
          {!isMobileView && (
            <button
              onClick={() => setShowDailyClosing(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: screenSize === 'tablet' ? '8px 12px' : '10px 16px',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                border: 'none',
                borderRadius: '10px',
                fontSize: screenSize === 'tablet' ? '12px' : '13px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              }}
            >
              <Lock style={{ width: '16px', height: '16px' }} />
              {screenSize !== 'tablet' && t.cashier.dailyClosing}
            </button>
          )}
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobileView ? '4px' : '8px',
              padding: isMobileView ? '8px 12px' : screenSize === 'tablet' ? '8px 12px' : '10px 16px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: isMobileView ? '12px' : '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: isMobileView ? '16px' : '18px', height: isMobileView ? '16px' : '18px' }} />
            {t.common.refresh}
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Bottom Navigation */}
      {(isMobileView || isTabletView) && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          zIndex: 100,
          padding: '8px',
          gap: '8px',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
        }}>
          <button
            onClick={() => setActivePanel('products')}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px',
              backgroundColor: activePanel === 'products' ? '#6366f1' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activePanel === 'products' ? '#ffffff' : '#64748b',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            <ClipboardList style={{ width: '20px', height: '20px' }} />
            {t.cashier.products}
          </button>
          <button
            onClick={() => setActivePanel('cart')}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px',
              backgroundColor: activePanel === 'cart' ? '#6366f1' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activePanel === 'cart' ? '#ffffff' : '#64748b',
              fontSize: '11px',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <ShoppingCart style={{ width: '20px', height: '20px' }} />
            {t.cashier.cart}
            {cartItemsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '50%',
                transform: 'translateX(14px)',
                minWidth: '18px',
                height: '18px',
                backgroundColor: '#dc2626',
                borderRadius: '9px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}>
                {cartItemsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActivePanel('payment')}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px',
              backgroundColor: activePanel === 'payment' ? '#6366f1' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activePanel === 'payment' ? '#ffffff' : '#64748b',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            <CreditCard style={{ width: '20px', height: '20px' }} />
            {t.cashier.payment}
          </button>
          <button
            onClick={() => setShowPendingOrders(!showPendingOrders)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px',
              backgroundColor: showPendingOrders ? '#f59e0b' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: showPendingOrders ? '#ffffff' : '#64748b',
              fontSize: '11px',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Clock style={{ width: '20px', height: '20px' }} />
            {t.cashier.pending}
            {pendingOrders.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '50%',
                transform: 'translateX(14px)',
                minWidth: '18px',
                height: '18px',
                backgroundColor: '#dc2626',
                borderRadius: '9px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}>
                {pendingOrders.length}
              </span>
            )}
          </button>
          {/* Daily Closing for Mobile */}
          <button
            onClick={() => setShowDailyClosing(true)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            <Lock style={{ width: '20px', height: '20px' }} />
            {t.cashier.closing}
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: (isMobileView || isTabletView) ? 'block' : 'grid',
        gridTemplateColumns: (isMobileView || isTabletView) ? '1fr' : getGridColumns(),
        gap: (isMobileView || isTabletView) ? '0' : '16px',
        padding: isMobileView ? '12px' : isTabletView ? '12px 16px' : '16px 24px',
        paddingBottom: (isMobileView || isTabletView) ? '80px' : undefined,
        overflow: 'auto',
      }}>
        {/* Pending Orders Panel */}
        {showPendingOrders && (!(isMobileView || isTabletView) || activePanel === 'products') && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#fef3c7',
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#92400e',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Clock style={{ width: '18px', height: '18px' }} />
                {t.cashier.pendingOrders} ({pendingOrders.length})
              </h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {pendingOrders.length === 0 ? (
                <p style={{
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13px',
                  padding: '24px',
                }}>
                  {t.cashier.noPendingOrders}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedPendingOrder(order)}
                      style={{
                        padding: '12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#6366f1';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#6366f1',
                        }}>
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: '#fef3c7',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#f59e0b',
                        }}>
                          {order.status === 'pending' ? t.orderStatus.pending : t.orderStatus.preparing}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#64748b',
                      }}>
                        <span>{order.itemsCount || order.items?.length} {t.cashier.itemsCount}</span>
                        <span style={{ fontWeight: 600, color: '#16a34a' }}>
                          {order.total.toFixed(3)} {t.common.currency}
                        </span>
                      </div>
                      {(order.tableNumber || order.roomNumber) && (
                        <p style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          marginTop: '6px',
                        }}>
                          {order.tableNumber ? `${t.cashier.table} ${order.tableNumber}` : `${t.cashier.room} ${order.roomNumber}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Grid */}
        {(!(isMobileView || isTabletView) || activePanel === 'products') && (
          <ProductGrid
            products={products}
            categories={categories}
            onProductClick={handleProductClick}
          />
        )}

        {/* Cart Panel */}
        {(!(isMobileView || isTabletView) || activePanel === 'cart') && (
          <CartPanel
            items={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onUpdateNote={updateNote}
            onClearCart={() => setShowClearConfirm(true)}
          />
        )}

        {/* Payment Panel */}
        {(!(isMobileView || isTabletView) || activePanel === 'payment') && (
          <PaymentPanel
            items={cart}
            tables={tables}
            rooms={rooms}
            onPlaceOrder={handlePlaceOrder}
            onPayNow={handlePayNow}
            loading={processing}
            initialRoomId={newOrderForRoomId ?? undefined}
            initialOrderType={newOrderForRoomId ? 'room' : undefined}
          />
        )}
      </div>

      {/* Variation Modal */}
      {selectedProduct && (
        <VariationModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptPrint
          {...receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Clear Cart Confirmation */}
      {showClearConfirm && (
        <>
          <div
            onClick={() => setShowClearConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 100,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '360px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            zIndex: 101,
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertCircle style={{ width: '28px', height: '28px', color: '#f59e0b' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              {t.cashier.clearCartConfirm}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              {t.cashier.clearCartMessage}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={clearCart}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                {t.cashier.yesClear}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
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
          </div>
        </>
      )}

      {/* Pending Order Payment Modal */}
      {selectedPendingOrder && (
        <PendingOrderModal
          order={selectedPendingOrder}
          onClose={() => setSelectedPendingOrder(null)}
          onPay={handlePayPendingOrder}
          processing={processing}
        />
      )}

      {/* Daily Closing Modal */}
      {showDailyClosing && user && (
        <CashierDailyClosing
          onClose={() => setShowDailyClosing(false)}
          onSuccess={() => {
            showToast(t.cashier.dailyClosingSuccess, 'success');
            loadData();
          }}
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
          backgroundColor: toast.type === 'success' ? '#16a34a' : '#dc2626',
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

// Pending Order Payment Modal Component
function PendingOrderModal({
  order,
  onClose,
  onPay,
  processing,
}: {
  order: Order;
  onClose: () => void;
  onPay: (order: Order, method: 'cash' | 'card', amount: number) => void;
  processing: boolean;
}) {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [receivedAmount, setReceivedAmount] = useState('');

  const canPay = paymentMethod === 'card' || parseFloat(receivedAmount) >= order.total;
  const change = paymentMethod === 'cash' && parseFloat(receivedAmount) > order.total
    ? parseFloat(receivedAmount) - order.total
    : 0;

  const quickAmounts = [1, 2, 5, 10, 20, 50];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '480px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        zIndex: 101,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {t.cashier.payOrder} #{order.id.slice(-6).toUpperCase()}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                {order.source === 'staff-menu' ? t.cashier.fromStaffMenu : t.cashier.fromCashier}
                {order.tableNumber && ` • ${t.cashier.table} ${order.tableNumber}`}
                {order.roomNumber && ` • ${t.cashier.room} ${order.roomNumber}`}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Order Items */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>
              {t.cashier.items} ({order.items?.length || 0})
            </h4>
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              {order.items?.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < (order.items?.length || 0) - 1 ? '1px solid #e2e8f0' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                      {item.emoji && <span style={{ marginLeft: '6px' }}>{item.emoji}</span>}
                      {item.name}
                    </span>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                      {item.quantity} × {(item.price || 0).toFixed(3)} {t.common.currency}
                    </p>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    {(item.itemTotal || item.price * item.quantity).toFixed(3)} {t.common.currency}
                  </span>
                </div>
              ))}
              <div style={{
                padding: '14px 16px',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{t.common.total}</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>
                  {order.total.toFixed(3)} {t.common.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '10px' }}>
              {t.payment.paymentMethod}
            </h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPaymentMethod('cash')}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: paymentMethod === 'cash' ? '#16a34a' : '#f8fafc',
                  border: `2px solid ${paymentMethod === 'cash' ? '#16a34a' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: paymentMethod === 'cash' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                💵 {t.payment.cash}
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: paymentMethod === 'card' ? '#6366f1' : '#f8fafc',
                  border: `2px solid ${paymentMethod === 'card' ? '#6366f1' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: paymentMethod === 'card' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                💳 {t.payment.card}
              </button>
            </div>
          </div>

          {/* Cash Amount */}
          {paymentMethod === 'cash' && (
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '10px' }}>
                {t.payment.receivedAmount}
              </h4>
              <input
                type="number"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder={`${t.cashier.minAmount}: ${order.total.toFixed(3)} ${t.common.currency}`}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '18px',
                  fontWeight: 600,
                  textAlign: 'center',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  outline: 'none',
                  marginBottom: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setReceivedAmount(amount.toString())}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {amount} {t.common.currency}
                  </button>
                ))}
                <button
                  onClick={() => setReceivedAmount(order.total.toString())}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #16a34a',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#16a34a',
                    cursor: 'pointer',
                  }}
                >
                  {t.cashier.fullAmount}
                </button>
              </div>
              
              {change > 0 && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>{t.payment.change}</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                    {change.toFixed(3)} {t.common.currency}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
        }}>
          <button
            onClick={() => onPay(order, paymentMethod, parseFloat(receivedAmount) || order.total)}
            disabled={!canPay || processing}
            style={{
              width: '100%',
              padding: '16px',
              background: canPay && !processing
                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                : '#e2e8f0',
              border: 'none',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: 700,
              color: canPay && !processing ? '#ffffff' : '#94a3b8',
              cursor: canPay && !processing ? 'pointer' : 'not-allowed',
            }}
          >
            {processing ? t.cashier.paying : `${t.payment.pay} ${order.total.toFixed(3)} ${t.common.currency}`}
          </button>
        </div>
      </div>
    </>
  );
}






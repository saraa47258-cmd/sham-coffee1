'use client';

import { Product, ProductVariation } from '@/lib/firebase/database';
import { X, Minus, Plus, Trash2, ShoppingCart, Send, Layers } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageContext';
import { getLocalizedName } from '@/lib/utils/localized';

export interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
  variation?: ProductVariation;
  cartItemId: string; // Unique ID for cart item (product + variation combo)
}

interface CartSidebarProps {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onIncrement: (cartItemId: string) => void;
  onDecrement: (cartItemId: string) => void;
  onRemove: (cartItemId: string) => void;
  onNoteChange: (cartItemId: string, note: string) => void;
  onSubmit: () => void;
  tableNumber: string;
  onTableChange: (table: string) => void;
  isSubmitting: boolean;
}

export default function CartSidebar({
  items,
  isOpen,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onNoteChange,
  onSubmit,
  tableNumber,
  onTableChange,
  isSubmitting,
}: CartSidebarProps) {
  const { language } = useTranslation();
  // Calculate total with variation prices
  const total = items.reduce((sum, item) => {
    const price = item.variation ? item.variation.price : item.product.price;
    return sum + (price * item.quantity);
  }, 0);
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 90,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: '380px',
        maxWidth: '100vw',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShoppingCart style={{ width: '22px', height: '22px', color: '#ffffff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>الطلب</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{itemsCount} صنف</p>
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
              backgroundColor: '#f1f5f9',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Table Selection */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '8px',
          }}>
            رقم الطاولة / الغرفة
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => onTableChange(e.target.value)}
            placeholder="مثال: طاولة 5، غرفة VIP..."
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              outline: 'none',
            }}
          />
        </div>

        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
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
                <ShoppingCart style={{ width: '28px', height: '28px', color: '#94a3b8' }} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>{language === 'ar' ? 'السلة فارغة' : 'Cart is empty'}</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{language === 'ar' ? 'أضف منتجات للطلب' : 'Add products to order'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {items.map((item) => {
                const price = item.variation ? item.variation.price : item.product.price;
                const displayName = item.variation 
                  ? `${getLocalizedName(item.product, language)} - ${getLocalizedName(item.variation, language)}`
                  : getLocalizedName(item.product, language);
                
                return (
                  <div
                    key={item.cartItemId}
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '16px',
                      padding: '16px',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '12px',
                    }}>
                      {/* Product Image/Emoji */}
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {item.product.image || item.product.imageUrl ? (
                          <img
                            src={item.product.image || item.product.imageUrl}
                            alt={item.product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          item.product.emoji || '☕'
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#0f172a',
                          marginBottom: '4px',
                        }}>
                          {getLocalizedName(item.product, language)}
                        </h4>
                        {/* Variation Badge */}
                        {item.variation && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#6366f1',
                            marginBottom: '4px',
                          }}>
                            <Layers style={{ width: '10px', height: '10px' }} />
                            {getLocalizedName(item.variation, language)}
                          </div>
                        )}
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
                          {price.toFixed(3)} ر.ع
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemove(item.cartItemId)}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#fef2f2',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: '#dc2626',
                        }}
                      >
                        <Trash2 style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        padding: '4px',
                      }}>
                        <button
                          onClick={() => onDecrement(item.cartItemId)}
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f1f5f9',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#dc2626',
                          }}
                        >
                          <Minus style={{ width: '14px', height: '14px' }} />
                        </button>
                        <span style={{
                          minWidth: '28px',
                          textAlign: 'center',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onIncrement(item.cartItemId)}
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#6366f1',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#ffffff',
                          }}
                        >
                          <Plus style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}>
                        {(price * item.quantity).toFixed(3)} ر.ع
                      </div>
                    </div>

                    {/* Note Input */}
                    <input
                      type="text"
                      value={item.note || ''}
                      onChange={(e) => onNoteChange(item.cartItemId, e.target.value)}
                      placeholder="ملاحظة..."
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        outline: 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{
            padding: '20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}>
            {/* Total */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>الإجمالي</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                {total.toFixed(3)} <span style={{ fontSize: '14px', fontWeight: 500 }}>ر.ع</span>
              </span>
            </div>

            {/* Submit Button */}
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !tableNumber.trim()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '16px',
                background: !tableNumber.trim() 
                  ? '#e2e8f0' 
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 700,
                color: !tableNumber.trim() ? '#94a3b8' : '#ffffff',
                cursor: !tableNumber.trim() ? 'not-allowed' : 'pointer',
                boxShadow: tableNumber.trim() ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send style={{ width: '20px', height: '20px' }} />
                  إرسال الطلب
                </>
              )}
            </button>
            {!tableNumber.trim() && (
              <p style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#f59e0b',
                marginTop: '8px',
              }}>
                يرجى إدخال رقم الطاولة أولاً
              </p>
            )}
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Product, ProductVariation } from '@/lib/firebase/database';
import { X, Plus, Minus, ShoppingCart, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/context/LanguageContext';
import { getLocalizedName, getLocalizedDescription } from '@/lib/utils/localized';

interface VariationModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    variation: ProductVariation | null,
    quantity: number,
    note: string
  ) => void;
}

export default function VariationModal({ product, onClose, onAddToCart }: VariationModalProps) {
  const { language } = useTranslation();
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  // Get variations from different sources
  const variations: ProductVariation[] = (() => {
    if (product.variations && product.variations.length > 0) {
      return product.variations.filter(v => v.isActive !== false);
    }
    
    // Convert legacy sizes to variations
    if (product.sizes && Object.keys(product.sizes).length > 0) {
      return Object.entries(product.sizes).map(([id, size]: [string, any]) => ({
        id,
        name: size.name,
        price: size.price,
        isDefault: false,
        isActive: true,
        sortOrder: 0,
      }));
    }
    
    // Convert legacy shishaTypes to variations
    if (product.shishaTypes && Object.keys(product.shishaTypes).length > 0) {
      return Object.entries(product.shishaTypes).map(([id, type]: [string, any]) => ({
        id,
        name: type.name,
        price: type.price,
        isDefault: false,
        isActive: true,
        sortOrder: 0,
      }));
    }
    
    return [];
  })();

  // Select default variation on mount
  useEffect(() => {
    if (variations.length > 0) {
      const defaultVar = variations.find(v => v.isDefault) || variations[0];
      setSelectedVariation(defaultVar);
    }
  }, []);

  const getPrice = (): number => {
    if (selectedVariation) {
      return selectedVariation.price;
    }
    return product.price || product.basePrice || 0;
  };

  const handleAdd = () => {
    onAddToCart(product, selectedVariation, quantity, note);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '440px',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              overflow: 'hidden',
            }}>
              {product.imageUrl || product.image ? (
                <img
                  src={product.imageUrl || product.image}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                product.emoji || '📦'
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {getLocalizedName(product, language)}
              </h2>
              {getLocalizedDescription(product, language) && (
                <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                  {getLocalizedDescription(product, language).slice(0, 40)}{getLocalizedDescription(product, language).length > 40 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
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
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {/* Variations */}
          {variations.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '12px',
              }}>
                اختر الحجم/النوع
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {variations.map((variation) => (
                  <button
                    key={variation.id}
                    onClick={() => setSelectedVariation(variation)}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '12px',
                      border: selectedVariation?.id === variation.id 
                        ? '2px solid #6366f1' 
                        : '2px solid #e2e8f0',
                      backgroundColor: selectedVariation?.id === variation.id 
                        ? '#eef2ff' 
                        : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: selectedVariation?.id === variation.id ? '#4f46e5' : '#0f172a',
                      margin: 0,
                    }}>
                      {getLocalizedName(variation, language)}
                    </p>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: selectedVariation?.id === variation.id ? '#4f46e5' : '#16a34a',
                      margin: '4px 0 0 0',
                    }}>
                      {variation.price.toFixed(3)} ر.ع
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '12px',
            }}>
              الكمية
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: '#475569',
                  fontSize: '20px',
                }}
              >
                <Minus style={{ width: '20px', height: '20px' }} />
              </button>
              <span style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                minWidth: '60px',
                textAlign: 'center',
              }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#6366f1',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: '20px',
                }}
              >
                <Plus style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '12px',
            }}>
              <FileText style={{ width: '16px', height: '16px' }} />
              ملاحظة (اختياري)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: بدون سكر، حار جداً..."
              rows={2}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* Total */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>الإجمالي</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', margin: '4px 0 0 0' }}>
              {(getPrice() * quantity).toFixed(3)}
              <span style={{ fontSize: '14px', marginRight: '4px' }}>ر.ع</span>
            </p>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <ShoppingCart style={{ width: '20px', height: '20px' }} />
            إضافة للسلة
          </button>
        </div>
      </div>
    </>
  );
}






/**
 * نظام الحساب الدقيق - Sham Coffee (TypeScript)
 * يستخدم الحساب بالأعداد الصحيحة لتجنب أخطاء الفاصلة العائمة
 * الدقة: 3 خانات عشرية (للريال العماني)
 */

// معامل التحويل (1000 = 3 خانات عشرية)
const PRECISION = 1000;

/**
 * تحويل الرقم إلى عدد صحيح للحساب الداخلي
 */
export function toInt(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  return Math.round(num * PRECISION);
}

/**
 * تحويل من العدد الصحيح الداخلي إلى رقم عشري
 */
export function toDecimal(intValue: number): number {
  return intValue / PRECISION;
}

/**
 * تنسيق الرقم للعرض (3 خانات عشرية)
 */
export function format(value: number, isInt = false): string {
  const decimal = isInt ? toDecimal(value) : value;
  return decimal.toFixed(3);
}

/**
 * جمع رقمين بدقة عالية
 */
export function add(a: number, b: number): number {
  const intA = toInt(a);
  const intB = toInt(b);
  return toDecimal(intA + intB);
}

/**
 * طرح رقمين بدقة عالية
 */
export function subtract(a: number, b: number): number {
  const intA = toInt(a);
  const intB = toInt(b);
  return toDecimal(intA - intB);
}

/**
 * ضرب رقمين بدقة عالية (يدعم الكميات الكسرية)
 */
export function multiply(price: number, quantity: number): number {
  const intPrice = toInt(price);
  const intQuantity = toInt(quantity);
  // نضرب ثم نقسم على PRECISION لأن كلا الرقمين مضروب في PRECISION
  const result = Math.round((intPrice * intQuantity) / PRECISION);
  return toDecimal(result);
}

/**
 * قسمة رقمين بدقة عالية
 */
export function divide(a: number, b: number): number {
  if (b === 0) return 0;
  const intA = toInt(a);
  const intB = toInt(b);
  // نضرب في PRECISION للحفاظ على الدقة
  const result = Math.round((intA * PRECISION) / intB);
  return toDecimal(result);
}

/**
 * حساب نسبة مئوية بدقة عالية
 */
export function percentage(amount: number, percent: number): number {
  const intAmount = toInt(amount);
  const result = Math.round((intAmount * percent) / 100);
  return toDecimal(result);
}

/**
 * تقريب الرقم لأقرب 3 خانات عشرية
 */
export function round(value: number): number {
  return toDecimal(toInt(value));
}

/**
 * مقارنة رقمين بدقة
 */
export function equals(a: number, b: number): boolean {
  return toInt(a) === toInt(b);
}

/**
 * التحقق من أن الرقم أكبر من صفر
 */
export function isPositive(value: number): boolean {
  return toInt(value) > 0;
}

/**
 * جمع مصفوفة من الأرقام بدقة عالية
 */
export function sum(values: number[]): number {
  let total = 0;
  for (const value of values) {
    total += toInt(value);
  }
  return toDecimal(total);
}

/**
 * حساب إجمالي عناصر السلة/الطلب بدقة عالية
 */
export function calculateSubtotal(
  items: Array<{ price: number; quantity: number }>
): number {
  if (!items || items.length === 0) return 0;

  let totalInt = 0;
  for (const item of items) {
    const priceInt = toInt(item.price);
    const qty = Math.round(item.quantity || 1);
    totalInt += priceInt * qty;
  }

  return toDecimal(totalInt);
}

/**
 * نتيجة حساب الخصم
 */
export interface DiscountResult {
  discountAmount: number;
  total: number;
}

/**
 * حساب الخصم بدقة عالية
 */
export function applyDiscount(
  subtotal: number,
  discountPercent: number
): DiscountResult {
  if (!discountPercent || discountPercent <= 0) {
    return {
      discountAmount: 0,
      total: subtotal,
    };
  }

  const subtotalInt = toInt(subtotal);
  const discountInt = Math.round((subtotalInt * discountPercent) / 100);
  const totalInt = subtotalInt - discountInt;

  return {
    discountAmount: toDecimal(discountInt),
    total: toDecimal(totalInt),
  };
}

/**
 * نتيجة حساب الطلب الكامل
 */
export interface OrderCalculation {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

/**
 * حساب كامل للطلب بدقة عالية
 */
export function calculateOrder(
  items: Array<{ price: number; quantity: number }>,
  discountPercent = 0,
  taxPercent = 0
): OrderCalculation {
  // المجموع الفرعي
  const subtotal = calculateSubtotal(items);
  const subtotalInt = toInt(subtotal);

  // الخصم
  const discountInt =
    discountPercent > 0
      ? Math.round((subtotalInt * discountPercent) / 100)
      : 0;

  // المبلغ بعد الخصم
  const afterDiscountInt = subtotalInt - discountInt;

  // الضريبة (على المبلغ بعد الخصم)
  const taxInt =
    taxPercent > 0
      ? Math.round((afterDiscountInt * taxPercent) / 100)
      : 0;

  // الإجمالي النهائي
  const totalInt = afterDiscountInt + taxInt;

  return {
    subtotal: toDecimal(subtotalInt),
    discountAmount: toDecimal(discountInt),
    taxAmount: toDecimal(taxInt),
    total: toDecimal(totalInt),
  };
}

/**
 * حساب سعر العنصر × الكمية
 */
export function itemTotal(price: number, quantity: number): string {
  return format(multiply(price, quantity));
}

/**
 * حساب الباقي (المبلغ المدفوع - الإجمالي)
 */
export function calculateChange(received: number, total: number): number {
  return subtract(received, total);
}

/**
 * تحويل نص أو رقم إلى رقم آمن
 */
export function toNumber(value: number | string | null | undefined): number {
  return toDecimal(toInt(value));
}

/**
 * Precision Calculator object للتوافق
 */
export const PrecisionCalc = {
  PRECISION,
  toInt,
  toDecimal,
  format,
  add,
  subtract,
  multiply,
  divide,
  percentage,
  round,
  equals,
  isPositive,
  sum,
  calculateSubtotal,
  applyDiscount,
  calculateOrder,
  itemTotal,
  calculateChange,
  toNumber,
};

export default PrecisionCalc;

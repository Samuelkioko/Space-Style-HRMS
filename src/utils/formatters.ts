export const CURRENCY_SYMBOLS: Record<string, string> = {
  KES: 'KSh ',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'AU$',
};

export const getCurrencySymbol = (currency: string = 'KES'): string => {
  return CURRENCY_SYMBOLS[currency] || `${currency} `;
};

export const formatCurrency = (amount: number, currency: string = 'KES'): string => {
  const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const symbol = getCurrencySymbol(currency);
  const formatted = Math.abs(validAmount).toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(validAmount) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${validAmount < 0 ? '-' : ''}${symbol}${formatted}`;
};

export const formatPercent = (val: number): string => {
  const validVal = typeof val === 'number' && !isNaN(val) ? val : 0;
  const prefix = validVal > 0 ? '+' : '';
  return `${prefix}${validVal.toFixed(1)}%`;
};

export const getCategoryIconName = (category: string, type: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('coffee') || cat.includes('food') || cat.includes('beverage') || cat.includes('meal')) return 'coffee';
  if (cat.includes('office') || cat.includes('supplies') || cat.includes('inventory')) return 'inventory';
  if (cat.includes('consulting') || cat.includes('service') || cat.includes('design')) return 'services';
  if (cat.includes('tech') || cat.includes('cloud') || cat.includes('software')) return 'tech';
  if (cat.includes('rent') || cat.includes('facilities') || cat.includes('building')) return 'building';
  if (cat.includes('logistics') || cat.includes('delivery') || cat.includes('courier')) return 'truck';
  if (cat.includes('payroll') || cat.includes('salary') || cat.includes('team')) return 'users';
  if (cat.includes('marketing') || cat.includes('ads')) return 'megaphone';
  if (type === 'sale') return 'payments';
  return 'receipt';
};

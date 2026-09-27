import { Transaction, DayData, NotificationItem } from '../types';

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const getClean7DaysData = (): DayData[] => {
  const result: DayData[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = i === 0 ? 'Today' : dayNames[d.getDay()];
    result.push({
      date: dateStr,
      dayLabel,
      revenue: 0,
      expenses: 0,
      profit: 0,
    });
  }
  return result;
};

export const getClean30DaysData = (): DayData[] => {
  const result: DayData[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  for (let i = 28; i >= 0; i -= 4) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = i === 0 ? 'Today' : `${monthNames[d.getMonth()]} ${d.getDate()}`;
    result.push({
      date: dateStr,
      dayLabel,
      revenue: 0,
      expenses: 0,
      profit: 0,
    });
  }
  return result;
};

export const INITIAL_7_DAYS_DATA: DayData[] = getClean7DaysData();
export const INITIAL_30_DAYS_DATA: DayData[] = getClean30DaysData();

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const SALE_CATEGORIES = [
  'Fabrication & Machining',
  'Finishing & Coating',
  'Fabricated Enclosures',
  'Custom Orders & Contracts',
  'CNC Works',
  'Cutting & Bending',
  'Retail Sales',
  'Professional Services',
  'Consulting',
  'Other Sales',
];

export const EXPENSE_CATEGORIES = [
  'Lunch',
  'KRA payment',
  'Accountant',
  'miscellaneous',
  'electricity',
  'Airtime',
  'Powder coating',
  'Black sheet painting',
  'A4 Copier paper',
  'Office Internet',
  'Transaction',
  'security',
  'Warehouse cleaning',
  'Restaurant',
  'Water',
  'Raw Materials (Sheets & Steel)',
  'Other Expenses',
];

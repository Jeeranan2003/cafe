export interface Product {
  id: string;
  name: string; // Mapped from 'title' in DB
  price: number;
  category: string;
  imageUrl?: string; // Mapped from 'image' in DB
  description?: string; // Mapped from 'detail' in DB
  unit?: string; // New field
  status?: 'In Stock' | 'Sold Out'; // New field
}

export interface CartItem extends Product {
  quantity: number;
}

export type Category = 'All' | 'Coffee' | 'Bakery' | 'Dessert';

export type PaymentMethod = 'Cash' | 'QR Code' | 'Credit Card';

export interface Transaction {
  id?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  cashReceived?: number;
  change?: number;
  paymentMethod: PaymentMethod;
  timestamp: any; // Firestore Timestamp
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  taxId?: string;
  logoUrl?: string;
}

export interface DashboardData {
  todaySales: number;
  totalSales: number;
  totalTransactions: number;
  topProducts: { name: string; quantity: number; total: number }[];
  salesByMethod: { name: string; value: number }[];
  last7DaysSales: { date: string; amount: number }[];
}

export interface HeldBill {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  timestamp: number;
}

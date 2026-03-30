import { collection, getDocs, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, limit, setDoc, getDoc, where, Timestamp, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { Product, Transaction, StoreSettings, DashboardData } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Cloudinary Credentials
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dx5ijoahn";
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || "877828595332252";
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET || "J3FQSoTeq7zaoZnUHATvh_L8gNg";

// Local Storage Key
const STORAGE_KEY = 'cafe_pos_products';

// Initial Mock Data (Used if DB is empty AND LocalStorage is empty)
const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'ครีมมี เพียวมัทฉะ ลาเต้', price: 150, category: 'Coffee', imageUrl: 'https://images.unsplash.com/photo-1515825838458-f2a94b20105a?auto=format&fit=crop&w=300&q=80', description: 'สูตรเข้มข้น ตาตื่น 100%', status: 'In Stock', unit: 'แก้ว' },
  { id: '2', name: 'คลาสสิค ช็อกโกแลต', price: 125, category: 'Coffee', imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=300&q=80', description: 'ช็อกโกแลตเบลเยี่ยมแท้', status: 'In Stock', unit: 'แก้ว' },
  { id: '3', name: 'ครัวซองต์เนยสด', price: 85, category: 'Bakery', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80', description: 'หอมเนยฝรั่งเศส', status: 'In Stock', unit: 'ชิ้น' },
  { id: '4', name: 'เค้กส้ม', price: 95, category: 'Dessert', imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=300&q=80', description: 'เปรี้ยวหวานลงตัว', status: 'In Stock', unit: 'ชิ้น' },
  { id: '5', name: 'อเมริกาโน่เย็น', price: 110, category: 'Coffee', imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=300&q=80', description: 'เมล็ดคั่วกลาง หอมละมุน', status: 'In Stock', unit: 'แก้ว' },
];

// Helper to manage local storage
const loadLocalProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [...MOCK_PRODUCTS];
  } catch {
    return [...MOCK_PRODUCTS];
  }
};

const saveLocalProducts = (products: Product[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
};

// State to hold current products (synced with DB or Local)
let currentProducts: Product[] = loadLocalProducts();

// --- Pure JS SHA-1 Implementation (No external dependencies) ---
function sha1(message: string): string {
  function rotl(n: number, s: number) { return (n << s) | (n >>> (32 - s)); }
  function toHex(n: number) {
      let s = "", v;
      for (let i = 7; i >= 0; i--) { v = (n >>> (i * 4)) & 0xf; s += v.toString(16); }
      return s;
  }
  
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  
  const msg = new TextEncoder().encode(message); 
  
  // Pre-processing
  const len = msg.length * 8;
  const nBlks = ((msg.length + 8) >> 6) + 1; 
  const blks = new Int32Array(nBlks * 16);
  
  for(let i=0; i<msg.length; i++) {
      blks[i>>2] |= msg[i] << (24 - (i%4)*8);
  }
  blks[msg.length >> 2] |= 0x80 << (24 - (msg.length%4)*8);
  blks[nBlks*16 - 1] = len;

  const w = new Int32Array(80);
  for(let i=0; i<nBlks; i++) {
      for(let j=0; j<16; j++) w[j] = blks[i*16 + j];
      for(let j=16; j<80; j++) w[j] = rotl(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      
      for(let j=0; j<80; j++) {
          const f = Math.floor(j/20);
          const t = (rotl(a, 5) +
              ((f===0) ? ((b&c)^((~b)&d)) :
              (f===1) ? (b^c^d) :
              (f===2) ? ((b&c)^(b&d)^(c&d)) :
              (b^c^d)) + e + w[j] + 
              [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6][f]
          ) | 0;
          
          e = d; d = c; c = rotl(b, 30); b = a; a = t;
      }
      
      h0 = (h0+a)|0; h1 = (h1+b)|0; h2 = (h2+c)|0; h3 = (h3+d)|0; h4 = (h4+e)|0;
  }
  
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

// --- Cloudinary Signed Upload Helper ---
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const timestamp = Math.round((new Date()).getTime() / 1000);
  
  try {
    // Generate Signature: timestamp=1234567890<api_secret>
    const strToSign = `timestamp=${timestamp}${API_SECRET}`;
    const signature = sha1(strToSign);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", API_KEY);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
        const errData = await response.json();
        console.error("Cloudinary Error Data:", errData);
        throw new Error(errData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error: any) {
    console.error("Error uploading image:", error);
    throw new Error(`Cloudinary Upload Error: ${error.message}`, { cause: error });
  }
};

// --- Firestore CRUD with Persistent Fallback ---

export const getProducts = async (): Promise<Product[]> => {
  const path = "cafe";
  try {
    const q = query(collection(db, path));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        return currentProducts;
    }

    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.title || data.name || "Unknown Item",
        price: Number(data.price) || 0,
        category: data.category || "General",
        imageUrl: data.image || data.imageUrl || "https://placehold.co/200x200?text=No+Image",
        description: data.detail || data.description || "",
        unit: data.unit || "item",
        status: data.status || "In Stock"
      });
    });
    
    currentProducts = products;
    saveLocalProducts(currentProducts);
    
    return products;
  } catch (error: any) {
    console.warn("Firestore access failed (using offline mode):", error.message);
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.GET, path);
    }
    return currentProducts;
  }
};

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  const path = "cafe";
  const q = query(collection(db, path));
  
  // Immediately call callback with local data to speed up initial load
  callback(currentProducts);
  
  return onSnapshot(q, async (querySnapshot) => {
    if (querySnapshot.empty && currentProducts.length === 0) {
      // If DB is empty and we have no local data, seed with mock data
      console.log("Database is empty, seeding initial data...");
      seedInitialData();
      return;
    }

    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.title || data.name || "Unknown Item",
        price: Number(data.price) || 0,
        category: data.category || "General",
        imageUrl: data.image || data.imageUrl || "https://placehold.co/200x200?text=No+Image",
        description: data.detail || data.description || "",
        unit: data.unit || "item",
        status: data.status || "In Stock"
      });
    });
    currentProducts = products;
    saveLocalProducts(currentProducts);
    callback(products);
  }, (error) => {
    console.warn("Firestore subscription failed:", error.message);
    // Ensure UI stops loading even on error
    callback(currentProducts);
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.GET, path);
    }
  });
};

export const addProduct = async (productData: Partial<Product>, imageFile?: File): Promise<void> => {
  let imageUrl = productData.imageUrl || "";

  if (imageFile) {
    imageUrl = await uploadImageToCloudinary(imageFile);
  }

  const newProduct: Product = {
    id: 'local_' + Date.now(),
    name: productData.name || "New Product",
    price: Number(productData.price) || 0,
    category: productData.category || "General",
    imageUrl: imageUrl,
    description: productData.description || "",
    unit: productData.unit || "unit",
    status: productData.status || "In Stock"
  };

  currentProducts.push(newProduct);
  saveLocalProducts(currentProducts);

  try {
    const dbData = {
      title: newProduct.name,
      price: newProduct.price,
      unit: newProduct.unit,
      detail: newProduct.description,
      image: newProduct.imageUrl,
      status: newProduct.status,
      category: newProduct.category,
      createdAt: new Date()
    };
    await addDoc(collection(db, "cafe"), dbData);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.WRITE, "cafe");
    }
    console.warn("Firestore write failed (saved locally only):", error.message);
  }
};

export const updateProduct = async (id: string, productData: Partial<Product>, imageFile?: File): Promise<void> => {
  let imageUrl = productData.imageUrl;

  if (imageFile) {
    imageUrl = await uploadImageToCloudinary(imageFile);
  }

  currentProducts = currentProducts.map(p => 
    p.id === id ? { 
      ...p, 
      ...productData, 
      price: Number(productData.price || p.price),
      imageUrl: imageUrl || p.imageUrl 
    } as Product : p
  );
  saveLocalProducts(currentProducts);

  try {
    const dbData: any = {
      title: productData.name,
      price: Number(productData.price),
      unit: productData.unit,
      detail: productData.description,
      status: productData.status,
      category: productData.category,
      updatedAt: new Date()
    };

    if (imageUrl) dbData.image = imageUrl;

    if (!id.startsWith('local_')) {
        const productRef = doc(db, "cafe", id);
        await updateDoc(productRef, dbData);
    }
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.UPDATE, "cafe/" + id);
    }
    console.warn("Firestore update failed (saved locally only):", error.message);
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  currentProducts = currentProducts.filter(p => p.id !== id);
  saveLocalProducts(currentProducts);

  try {
    if (!id.startsWith('local_')) {
        const productRef = doc(db, "cafe", id);
        await deleteDoc(productRef);
    }
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.DELETE, "cafe/" + id);
    }
    console.warn("Firestore delete failed (saved locally only):", error.message);
  }
};

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
  const path = "transactions";
  try {
    const transactionData = {
      ...transaction,
      timestamp: serverTimestamp()
    };
    await addDoc(collection(db, path), transactionData);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    console.error("Failed to save transaction:", error.message);
    throw error;
  }
};

// --- Seeding Logic ---
export const seedInitialData = async () => {
  try {
    const q = query(collection(db, "cafe"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return; // Already has data

    console.log("Seeding mock products to Firestore...");
    for (const p of MOCK_PRODUCTS) {
      await addDoc(collection(db, "cafe"), {
        title: p.name,
        price: p.price,
        unit: p.unit,
        detail: p.description,
        image: p.imageUrl,
        status: p.status,
        category: p.category,
        createdAt: new Date()
      });
    }
    console.log("Seeding complete.");
  } catch (e) {
    console.error("Seeding failed:", e);
  }
};

export const getTransactions = async (limitCount: number = 20): Promise<Transaction[]> => {
  const path = "transactions";
  try {
    const q = query(
      collection(db, path),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    return transactions;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    console.error("Failed to fetch transactions:", error.message);
    return [];
  }
};

// --- Store Settings ---
const SETTINGS_DOC_ID = 'store_settings';

export const getStoreSettings = async (): Promise<StoreSettings> => {
  const defaultSettings: StoreSettings = {
    name: 'Cafe POS',
    address: '123 Coffee St, Bangkok',
    phone: '02-123-4567',
    taxId: '1234567890123'
  };

  // Return local storage immediately if available to avoid waiting for Firestore
  const local = localStorage.getItem('store_settings');
  const cachedSettings = local ? JSON.parse(local) : defaultSettings;

  try {
    const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
    // Use getDocFromServer to bypass local cache if we want fresh settings, 
    // but getDoc is usually fine.
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const data = settingsSnap.data() as StoreSettings;
      localStorage.setItem('store_settings', JSON.stringify(data));
      return data;
    }
    
    return cachedSettings;
  } catch (error: any) {
    console.warn("Failed to fetch settings from Firestore:", error.message);
    if (error.code === 'permission-denied') {
      // Don't throw here, just return cached settings to keep the app running
      console.error("Permission denied for settings. Using cached data.");
    }
    return cachedSettings;
  }
};

export const saveStoreSettings = async (settings: StoreSettings, logoFile?: File): Promise<void> => {
  let logoUrl = settings.logoUrl;

  if (logoFile) {
    logoUrl = await uploadImageToCloudinary(logoFile);
  }

  const updatedSettings = { ...settings, logoUrl };
  localStorage.setItem('store_settings', JSON.stringify(updatedSettings));
  try {
    const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
    await setDoc(settingsRef, updatedSettings);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.WRITE, "settings/" + SETTINGS_DOC_ID);
    }
    console.error("Failed to save settings to DB");
  }
};

// --- Dashboard Data ---
export const getDashboardData = async (): Promise<DashboardData> => {
  const path = "transactions";
  try {
    // Fetch all transactions for the last 7 days for dashboard
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, path),
      where("timestamp", ">=", Timestamp.fromDate(sevenDaysAgo)),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let todaySales = 0;
    let totalSales = 0;
    const productMap: Record<string, { quantity: number; total: number }> = {};
    const methodMap: Record<string, number> = { 'Cash': 0, 'QR Code': 0, 'Credit Card': 0 };
    const dailyMap: Record<string, number> = {};

    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      dailyMap[dateStr] = 0;
    }

    transactions.forEach(tx => {
      const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
      const txAmount = tx.totalAmount;

      totalSales += txAmount;
      if (txDate.getTime() >= today) {
        todaySales += txAmount;
      }

      // Method stats
      methodMap[tx.paymentMethod] = (methodMap[tx.paymentMethod] || 0) + txAmount;

      // Daily stats
      const dateStr = txDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += txAmount;
      }

      // Product stats
      tx.items.forEach(item => {
        if (!productMap[item.name]) {
          productMap[item.name] = { quantity: 0, total: 0 };
        }
        productMap[item.name].quantity += item.quantity;
        productMap[item.name].total += item.price * item.quantity;
      });
    });

    const topProducts = Object.entries(productMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const salesByMethod = Object.entries(methodMap).map(([name, value]) => ({ name, value }));
    
    const last7DaysSales = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .reverse();

    return {
      todaySales,
      totalSales,
      totalTransactions: transactions.length,
      topProducts,
      salesByMethod,
      last7DaysSales
    };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    console.error("Dashboard error:", error);
    return {
      todaySales: 0,
      totalSales: 0,
      totalTransactions: 0,
      topProducts: [],
      salesByMethod: [],
      last7DaysSales: []
    };
  }
};

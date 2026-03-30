import React, { useEffect, useState } from 'react';
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { getProducts, saveTransaction, getTransactions, getStoreSettings, subscribeToProducts, deleteProduct } from '../services/posService';
import { Product, CartItem, Category, PaymentMethod, Transaction, HeldBill, StoreSettings } from '../types';
import ProductCard from './ProductCard';
import StoreManagement from './StoreManagement';
import { LogOut, RefreshCcw, Coffee, Cake, IceCream, Utensils, X, Plus, Minus, Trash2, Pencil, AlertTriangle, Save, Settings, CreditCard, QrCode, Banknote, CheckCircle2, History, Archive, Printer } from 'lucide-react';

const POSLayout: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // State for Management
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // State for Delete Confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // State for Edit Mode
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editQuantity, setEditQuantity] = useState<number | string>(1);

  // State for Payment
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<Transaction | null>(null);
  const [discount, setDiscount] = useState<string>('0');

  // State for Held Bills
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    const stored = localStorage.getItem('held_bills');
    return stored ? JSON.parse(stored) : [];
  });
  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);

  // State for History
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // State for General Confirmation Modal
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type: 'danger' | 'warning' | 'info';
    hideCancel?: boolean;
  } | null>(null);

  const showMsg = (title: string, message: string, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({
      title,
      message,
      onConfirm: () => setConfirmConfig(null),
      type,
      hideCancel: true
    });
  };

  useEffect(() => {
    localStorage.setItem('held_bills', JSON.stringify(heldBills));
  }, [heldBills]);

  useEffect(() => {
    fetchStoreSettings();
    
    // Real-time products subscription
    setLoading(true);
    const unsubscribe = subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      const settings = await getStoreSettings();
      setStoreSettings(settings);
    } catch {
      console.error("Failed to load store settings");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleProductDelete = (id: string) => {
    setProductToDelete(id);
  };

  const confirmProductDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete);
      setProductToDelete(null);
      // Products will update via subscription
    } catch {
      showMsg("เกิดข้อผิดพลาด", "ไม่สามารถลบสินค้าได้", "danger");
    }
  };

  const addToCart = (product: Product) => {
    // Check if sold out
    if (product.status === 'Sold Out') {
        showMsg("สินค้าหมด", "สินค้านี้หมดชั่วคราว", "warning");
        return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  // --- Delete Logic ---
  const confirmDelete = () => {
    if (deleteId) {
      setCart(prev => prev.filter(item => item.id !== deleteId));
      setDeleteId(null);
    }
  };

  // --- Edit Logic ---
  const handleEditClick = (item: CartItem) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      const newQty = parseInt(String(editQuantity), 10);
      if (!isNaN(newQty) && newQty > 0) {
        setCart(prev => prev.map(item => 
            item.id === editingItem.id ? { ...item, quantity: newQty } : item
        ));
        setEditingItem(null);
      } else {
        showMsg("ข้อมูลไม่ถูกต้อง", "กรุณาระบุจำนวนให้ถูกต้อง (มากกว่า 0)", "warning");
      }
    }
  };

  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const subtotal = totalAmount;
    const disc = parseFloat(discount) || 0;
    const finalTotal = Math.max(0, subtotal - disc);
    
    const newHeldBill: HeldBill = {
      id: 'held_' + Date.now(),
      items: [...cart],
      subtotal: subtotal,
      discount: disc,
      totalAmount: finalTotal,
      timestamp: Date.now()
    };
    setHeldBills(prev => [newHeldBill, ...prev]);
    setCart([]);
    setDiscount('0');
    showMsg("สำเร็จ", "พักบิลเรียบร้อยแล้ว", "info");
  };

  const restoreHeldBill = (bill: HeldBill) => {
    if (cart.length > 0) {
      setConfirmConfig({
        title: 'ยืนยันการเรียกคืนบิล',
        message: 'มีรายการในตระกร้าอยู่ คุณต้องการแทนที่ด้วยบิลที่พักไว้หรือไม่?',
        type: 'warning',
        onConfirm: () => {
          setCart(bill.items);
          setDiscount(bill.discount.toString());
          setHeldBills(prev => prev.filter(b => b.id !== bill.id));
          setIsHeldBillsOpen(false);
          setConfirmConfig(null);
        }
      });
      return;
    }
    setCart(bill.items);
    setDiscount(bill.discount.toString());
    setHeldBills(prev => prev.filter(b => b.id !== bill.id));
    setIsHeldBillsOpen(false);
  };

  const deleteHeldBill = (id: string) => {
    setConfirmConfig({
      title: 'ลบบิลที่พักไว้',
      message: 'คุณแน่ใจหรือไม่ที่จะลบบิลที่พักไว้นี้?',
      type: 'danger',
      onConfirm: () => {
        setHeldBills(prev => prev.filter(b => b.id !== id));
        setConfirmConfig(null);
      }
    });
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await getTransactions();
      setHistory(data);
    } catch {
      console.error("Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
    fetchHistory();
  };

  const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);

  const handlePrintReceipt = (transaction: Transaction) => {
    setPrintingTransaction(transaction);
    setTimeout(() => {
        window.print();
        setPrintingTransaction(null);
    }, 100);
  };

  const handleProcessPayment = async () => {
    if (cart.length === 0) return;

    const subtotal = totalAmount;
    const disc = parseFloat(discount) || 0;
    const total = Math.max(0, subtotal - disc);
    let cash = 0;
    let change = 0;

    if (paymentMethod === 'Cash') {
      cash = parseFloat(cashReceived);
      if (isNaN(cash) || cash < total) {
        showMsg("ข้อมูลไม่ถูกต้อง", "กรุณาระบุจำนวนเงินที่รับมาให้ถูกต้อง และต้องไม่น้อยกว่ายอดรวม", "warning");
        return;
      }
      change = cash - total;
    }

    setIsProcessing(true);
    try {
      const transaction: Transaction = {
        items: [...cart],
        subtotal: subtotal,
        discount: disc,
        totalAmount: total,
        paymentMethod,
        cashReceived: paymentMethod === 'Cash' ? cash : undefined,
        change: paymentMethod === 'Cash' ? change : undefined,
        timestamp: new Date() // Will be replaced by serverTimestamp in service
      };

      await saveTransaction(transaction);
      setPaymentSuccess(transaction);
      setCart([]);
      setCashReceived('');
      setDiscount('0');
      setIsPaymentOpen(false);
    } catch {
      showMsg("เกิดข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึกข้อมูลการชำระเงิน", "danger");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.category === activeCategory || (activeCategory === 'Coffee' && !p.category));

  const categories: {id: Category, label: string, icon: React.ReactNode}[] = [
    { id: 'All', label: 'ทั้งหมด', icon: <Utensils size={18} /> },
    { id: 'Coffee', label: 'กาแฟ', icon: <Coffee size={18} /> },
    { id: 'Bakery', label: 'เบเกอรี่', icon: <Cake size={18} /> },
    { id: 'Dessert', label: 'ของหวาน', icon: <IceCream size={18} /> },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-20">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
           {storeSettings?.logoUrl ? (
             <img src={storeSettings.logoUrl} alt="Store Logo" className="w-8 h-8 rounded-full object-cover" />
           ) : (
             <Coffee className="text-green-600" />
           )}
           {storeSettings?.name || 'ระบบขายหน้าร้าน'}
        </h1>
        <div className="flex items-center gap-4">
            <button 
                onClick={handleOpenHistory}
                className="flex items-center gap-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-4 py-2 rounded-full transition-colors text-sm font-medium"
            >
                <History size={18} />
                ประวัติการขาย
            </button>
            <button 
                onClick={() => setIsHeldBillsOpen(true)}
                className="relative flex items-center gap-2 bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-700 px-4 py-2 rounded-full transition-colors text-sm font-medium"
            >
                <Archive size={18} />
                บิลที่พัก ({heldBills.length})
                {heldBills.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                  </span>
                )}
            </button>
            <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${
                  isEditMode 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                  : 'bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700'
                }`}
            >
                {isEditMode ? <X size={18} /> : <Trash2 size={18} />}
                {isEditMode ? 'ยกเลิกการลบ' : 'โหมดลบสินค้า'}
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <button 
                onClick={() => setIsManageOpen(true)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-700 px-4 py-2 rounded-full transition-colors text-sm font-medium"
            >
                <Settings size={18} />
                จัดการร้านค้า
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
            >
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Product Selection */}
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col bg-gray-100 border-r border-gray-200">
          
          {/* Category Tabs */}
          <div className="p-4 bg-white shadow-sm overflow-x-auto whitespace-nowrap">
            <h2 className="text-lg font-bold mb-3 text-gray-700">โซนเลือกสินค้า</h2>
            <div className="flex space-x-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeCategory === cat.id 
                    ? 'bg-green-600 text-white shadow-md transform scale-105' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="flex justify-center items-center h-full text-gray-400">
                <RefreshCcw className="animate-spin mr-2" /> กำลังโหลดสินค้า...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onClick={addToCart}
                    onImageClick={setLightboxImg}
                    onDelete={isEditMode ? handleProductDelete : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart & Checkout */}
        <div className="w-full md:w-1/3 lg:w-1/4 bg-white flex flex-col shadow-xl h-full z-10">
          <div className="p-4 bg-green-50 border-b border-green-100">
             <h2 className="text-xl font-bold text-gray-800">โซนจ่ายเงิน</h2>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                  <Utensils size={48} className="mb-2" />
                  <p>ยังไม่มีรายการสินค้า</p>
               </div>
             ) : (
               <table className="w-full text-sm">
                 <thead className="text-gray-500 border-b">
                   <tr>
                     <th className="text-left pb-2 font-normal">รายการ</th>
                     <th className="text-right pb-2 font-normal">ราคา</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {cart.map((item) => (
                     <tr key={item.id} className="group">
                       <td className="py-3 pr-2">
                         <div className="font-medium text-gray-800">{item.name}</div>
                         <div className="text-xs text-gray-400">{item.unit}</div>
                         <div className="flex items-center mt-1 space-x-2">
                            <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="p-1 bg-gray-200 rounded hover:bg-gray-300 text-gray-600"
                            >
                                <Minus size={12} />
                            </button>
                            <span className="font-bold w-6 text-center">{item.quantity}</span>
                            <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="p-1 bg-gray-200 rounded hover:bg-gray-300 text-gray-600"
                            >
                                <Plus size={12} />
                            </button>
                            
                            {/* Edit Button */}
                            <button 
                                onClick={() => handleEditClick(item)}
                                className="ml-2 text-blue-400 hover:text-blue-600 p-1 transition-opacity"
                                title="แก้ไข"
                            >
                                <Pencil size={14} />
                            </button>

                            {/* Delete Button */}
                            <button 
                              onClick={() => setDeleteId(item.id)}
                              className="text-red-400 hover:text-red-600 p-1 transition-opacity"
                              title="ลบรายการ"
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                       </td>
                       <td className="text-right align-top py-3 font-semibold text-gray-700">
                         {(item.price * item.quantity).toLocaleString()}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
          </div>

          {/* Summary & Actions */}
          <div className="bg-gray-50 p-4 border-t border-gray-200 shadow-inner">
             <div className="flex justify-between items-end mb-4 border-b border-gray-200 pb-4">
                <span className="text-lg font-medium text-gray-600">ยอดรวมสุทธิ</span>
                <span className="text-3xl font-bold text-green-700">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
             </div>

             <div className="grid grid-cols-2 gap-3 mb-3">
                <button 
                  onClick={handleHoldBill}
                  disabled={cart.length === 0}
                  className={`font-semibold py-3 rounded-lg transition-colors ${
                    cart.length === 0 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'
                  }`}
                >
                  พักบิล
                </button>
                <button 
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className={`border font-semibold py-3 rounded-lg transition-colors ${
                    cart.length === 0 
                    ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed' 
                    : 'bg-white border-red-500 text-red-500 hover:bg-red-50'
                  }`}
                >
                  ล้างตระกร้า
                </button>
             </div>
             <button 
               onClick={() => setIsPaymentOpen(true)}
               disabled={cart.length === 0}
               className={`w-full font-bold text-xl py-4 rounded-xl shadow-lg transition-all transform active:scale-95 ${
                 cart.length === 0 
                 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                 : 'bg-green-700 hover:bg-green-800 text-white hover:shadow-green-500/30'
               }`}
             >
               ชำระเงิน
             </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt (Hidden) */}
      {(paymentSuccess || printingTransaction) && (
        <div id="receipt-print" className="hidden print:block text-black font-mono text-sm w-[300px]">
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold">{storeSettings?.name || 'ระบบขายหน้าร้าน'}</h2>
                <p className="text-xs">{storeSettings?.address}</p>
                <p className="text-xs">โทร: {storeSettings?.phone}</p>
                {storeSettings?.taxId && <p className="text-xs">Tax ID: {storeSettings.taxId}</p>}
            </div>
            <div className="border-t border-dashed border-black my-2"></div>
            <div className="flex justify-between text-xs mb-2">
                <span>วันที่: {new Date((paymentSuccess || printingTransaction)!.timestamp?.seconds * 1000 || (paymentSuccess || printingTransaction)!.timestamp).toLocaleString()}</span>
            </div>
            <div className="border-t border-dashed border-black my-2"></div>
            <table className="w-full text-xs mb-4">
                <thead>
                    <tr>
                        <th className="text-left">รายการ</th>
                        <th className="text-right">จำนวน</th>
                        <th className="text-right">รวม</th>
                    </tr>
                </thead>
                <tbody>
                    {(paymentSuccess || printingTransaction)!.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="py-1">{item.name}</td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right">{(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="border-t border-dashed border-black my-2"></div>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span>ยอดรวม:</span>
                    <span>{(paymentSuccess || printingTransaction)!.subtotal?.toLocaleString() || (paymentSuccess || printingTransaction)!.totalAmount.toLocaleString()} ฿</span>
                </div>
                {((paymentSuccess || printingTransaction)!.discount || 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                        <span>ส่วนลด:</span>
                        <span>-{(paymentSuccess || printingTransaction)!.discount?.toLocaleString()} ฿</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1 mt-1">
                    <span>ยอดรวมสุทธิ:</span>
                    <span>{(paymentSuccess || printingTransaction)!.totalAmount.toLocaleString()} ฿</span>
                </div>
                <div className="flex justify-between">
                    <span>วิธีชำระเงิน:</span>
                    <span>{(paymentSuccess || printingTransaction)!.paymentMethod}</span>
                </div>
                {(paymentSuccess || printingTransaction)!.paymentMethod === 'Cash' && (
                    <>
                        <div className="flex justify-between">
                            <span>รับเงิน:</span>
                            <span>{(paymentSuccess || printingTransaction)!.cashReceived?.toLocaleString()} ฿</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>เงินทอน:</span>
                            <span>{(paymentSuccess || printingTransaction)!.change?.toLocaleString()} ฿</span>
                        </div>
                    </>
                )}
            </div>
            <div className="border-t border-dashed border-black my-4"></div>
            <div className="text-center text-xs">
                <p>ขอบคุณที่ใช้บริการ</p>
                <p>ยินดีต้อนรับเสมอ</p>
            </div>
        </div>
      )}

      {/* Store Management Drawer */}
      <StoreManagement 
        isOpen={isManageOpen} 
        onClose={() => {
          setIsManageOpen(false);
          fetchStoreSettings(); // Refresh settings in case they changed
        }} 
        products={products}
        onRefresh={fetchData}
      />

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxImg(null)}
        >
            <button 
                className="absolute top-5 right-5 text-white hover:text-gray-300 transition-colors"
                onClick={() => setLightboxImg(null)}
            >
                <X size={40} />
            </button>
            <img 
                src={lightboxImg} 
                alt="Enlarged" 
                className="max-w-[90%] max-h-[90%] rounded-lg shadow-2xl transform transition-transform duration-300 scale-100"
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-up">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-red-100 p-3 rounded-full mb-4">
                        <Trash2 className="text-red-600 h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">ลบสินค้าออกจากระบบ</h3>
                    <p className="text-gray-500 mb-8">คุณแน่ใจหรือไม่ที่จะลบสินค้านี้ออกจากระบบถาวร?</p>
                    <div className="flex w-full gap-3">
                        <button 
                            onClick={() => setProductToDelete(null)}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"
                        >
                            ยกเลิก
                        </button>
                        <button 
                            onClick={confirmProductDelete}
                            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold"
                        >
                            ยืนยันลบ
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* General Confirmation Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-up">
                <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${
                        confirmConfig.type === 'danger' ? 'bg-red-100' : 
                        confirmConfig.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                        <AlertTriangle className={
                            confirmConfig.type === 'danger' ? 'text-red-600' : 
                            confirmConfig.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        } size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmConfig.title}</h3>
                    <p className="text-gray-500 mb-8">{confirmConfig.message}</p>
                    <div className="flex w-full gap-3">
                        {!confirmConfig.hideCancel && (
                            <button 
                                onClick={() => setConfirmConfig(null)}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"
                            >
                                ยกเลิก
                            </button>
                        )}
                        <button 
                            onClick={confirmConfig.onConfirm}
                            className={`flex-1 px-4 py-3 text-white rounded-xl transition-colors font-bold ${
                                confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                                confirmConfig.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {confirmConfig.hideCancel ? 'ตกลง' : 'ยืนยัน'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Cart Item) */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm animate-scale-up">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-red-100 p-3 rounded-full mb-4">
                        <AlertTriangle className="text-red-600 h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">ยืนยันการลบสินค้า</h3>
                    <p className="text-sm text-gray-500 mb-6">คุณแน่ใจหรือไม่ที่จะลบสินค้ารายการนี้ออกจากตระกร้า?</p>
                    <div className="flex w-full gap-3">
                        <button 
                            onClick={() => setDeleteId(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            ยกเลิก
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            ยืนยันลบ
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm animate-scale-up">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900">แก้ไขจำนวน</h3>
                    <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {editingItem.name}
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
                        <input 
                            type="number" 
                            min="1"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-full p-3 text-center text-lg outline-none"
                            autoFocus
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">ราคาต่อชิ้น: {editingItem.price.toLocaleString()} บาท</p>
                </div>

                <button 
                    onClick={handleSaveEdit}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
                >
                    <Save size={18} />
                    บันทึกการแก้ไข
                </button>
            </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up">
                <div className="flex">
                    {/* Left: Summary */}
                    <div className="w-1/2 bg-gray-50 p-8 border-r border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">สรุปรายการสั่งซื้อ</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6 pr-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{item.name} x {item.quantity}</span>
                                    <span className="font-semibold">{(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-200 pt-4 mt-auto">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 text-sm">ยอดรวม</span>
                                <span className="font-semibold">{totalAmount.toLocaleString()} ฿</span>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-500 text-sm">ส่วนลด</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        className="w-20 p-1 text-right border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                        placeholder="0"
                                    />
                                    <span className="text-sm font-medium">฿</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-gray-500">ยอดรวมทั้งสิ้น</span>
                                <span className="text-3xl font-bold text-green-700">{(Math.max(0, totalAmount - (parseFloat(discount) || 0))).toLocaleString()} ฿</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Payment Methods */}
                    <div className="w-1/2 p-8 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">เลือกวิธีชำระเงิน</h3>
                            <button onClick={() => setIsPaymentOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-8">
                            <button 
                                onClick={() => setPaymentMethod('Cash')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                    paymentMethod === 'Cash' 
                                    ? 'border-green-600 bg-green-50 text-green-700' 
                                    : 'border-gray-100 hover:border-gray-200 text-gray-500'
                                }`}
                            >
                                <Banknote size={24} className="mb-2" />
                                <span className="text-xs font-bold">เงินสด</span>
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('QR Code')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                    paymentMethod === 'QR Code' 
                                    ? 'border-green-600 bg-green-50 text-green-700' 
                                    : 'border-gray-100 hover:border-gray-200 text-gray-500'
                                }`}
                            >
                                <QrCode size={24} className="mb-2" />
                                <span className="text-xs font-bold">คิวอาร์โค้ด</span>
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('Credit Card')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                    paymentMethod === 'Credit Card' 
                                    ? 'border-green-600 bg-green-50 text-green-700' 
                                    : 'border-gray-100 hover:border-gray-200 text-gray-500'
                                }`}
                            >
                                <CreditCard size={24} className="mb-2" />
                                <span className="text-xs font-bold">บัตรเครดิต</span>
                            </button>
                        </div>

                        {paymentMethod === 'Cash' && (
                            <div className="mb-8 animate-fade-in">
                                <label className="block text-sm font-bold text-gray-700 mb-2">รับเงินสดมา (บาท)</label>
                                <input 
                                    type="number" 
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-4 text-2xl font-bold text-center border-2 border-gray-200 rounded-xl focus:border-green-600 outline-none transition-colors"
                                    autoFocus
                                />
                                {cashReceived && parseFloat(cashReceived) >= (totalAmount - (parseFloat(discount) || 0)) && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg flex justify-between items-center animate-bounce-in">
                                        <span className="text-blue-700 font-medium">เงินทอน</span>
                                        <span className="text-2xl font-bold text-blue-800">{(parseFloat(cashReceived) - (totalAmount - (parseFloat(discount) || 0))).toLocaleString()} ฿</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {paymentMethod !== 'Cash' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center mb-8 animate-fade-in">
                                <div className="p-6 bg-gray-50 rounded-full mb-4">
                                    {paymentMethod === 'QR Code' ? <QrCode size={64} className="text-gray-400" /> : <CreditCard size={64} className="text-gray-400" />}
                                </div>
                                <p className="text-gray-500">กรุณาดำเนินการชำระเงินผ่านเครื่องรับชำระ</p>
                            </div>
                        )}

                        <button 
                            onClick={handleProcessPayment}
                            disabled={isProcessing || (paymentMethod === 'Cash' && (!cashReceived || parseFloat(cashReceived) < (totalAmount - (parseFloat(discount) || 0))))}
                            className={`w-full py-4 rounded-xl font-bold text-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                                isProcessing || (paymentMethod === 'Cash' && (!cashReceived || parseFloat(cashReceived) < (totalAmount - (parseFloat(discount) || 0))))
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white transform active:scale-95'
                            }`}
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCcw className="animate-spin" size={24} />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    ยืนยันการชำระเงิน
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center animate-bounce-in">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                    <CheckCircle2 size={64} className="text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">ชำระเงินสำเร็จ!</h2>
                <p className="text-gray-500 mb-8">บันทึกรายการสั่งซื้อเรียบร้อยแล้ว</p>
                
                <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">ยอดรวม</span>
                        <span className="font-bold">{paymentSuccess.subtotal?.toLocaleString() || paymentSuccess.totalAmount.toLocaleString()} ฿</span>
                    </div>
                    {paymentSuccess.discount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                            <span className="text-gray-500">ส่วนลด</span>
                            <span className="font-bold">-{paymentSuccess.discount.toLocaleString()} ฿</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-700 font-bold">ยอดรวมสุทธิ</span>
                        <span className="text-xl font-bold text-green-700">{paymentSuccess.totalAmount.toLocaleString()} ฿</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">วิธีชำระเงิน</span>
                        <span className="font-bold">{paymentSuccess.paymentMethod}</span>
                    </div>
                    {paymentSuccess.paymentMethod === 'Cash' && (
                        <>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">รับเงินมา</span>
                                <span className="font-bold">{paymentSuccess.cashReceived?.toLocaleString()} ฿</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                                <span className="text-gray-700 font-bold">เงินทอน</span>
                                <span className="text-xl font-bold text-blue-600">{paymentSuccess.change?.toLocaleString()} ฿</span>
                            </div>
                        </>
                    )}
                </div>

                <button 
                    onClick={() => setPaymentSuccess(null)}
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition-all transform active:scale-95 shadow-lg mb-3"
                >
                    สั่งซื้อรายการใหม่
                </button>
                <button 
                    onClick={() => handlePrintReceipt(paymentSuccess)}
                    className="w-full py-4 bg-white border-2 border-gray-900 text-gray-900 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <Printer size={20} />
                    พิมพ์ใบเสร็จ
                </button>
            </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {isHeldBillsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Archive className="text-yellow-500" />
                        รายการบิลที่พักไว้
                    </h3>
                    <button onClick={() => setIsHeldBillsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 max-h-[400px] overflow-y-auto">
                    {heldBills.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <Archive size={48} className="mx-auto mb-2 opacity-20" />
                            <p>ไม่มีบิลที่พักไว้</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {heldBills.map(bill => (
                                <div key={bill.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-yellow-300 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-gray-800">บิล #{bill.id.split('_')[1]}</div>
                                            <div className="text-xs text-gray-400">{new Date(bill.timestamp).toLocaleString()}</div>
                                        </div>
                                        <div className="text-lg font-bold text-green-700">{bill.totalAmount.toLocaleString()} ฿</div>
                                    </div>
                                    <div className="text-sm text-gray-500 mb-4 line-clamp-1">
                                        {bill.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => restoreHeldBill(bill)}
                                            className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-bold text-sm transition-colors"
                                        >
                                            เรียกคืนบิล
                                        </button>
                                        <button 
                                            onClick={() => deleteHeldBill(bill.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scale-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <History className="text-blue-500" />
                        ประวัติการขาย (ล่าสุด 20 รายการ)
                    </h3>
                    <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-0 max-h-[500px] overflow-y-auto">
                    {loadingHistory ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <RefreshCcw className="animate-spin mb-2" size={32} />
                            <p>กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <History size={48} className="mx-auto mb-2 opacity-20" />
                            <p>ยังไม่มีประวัติการขาย</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 font-bold">วัน/เวลา</th>
                                    <th className="px-6 py-3 font-bold">รายการ</th>
                                    <th className="px-6 py-3 font-bold">วิธีชำระ</th>
                                    <th className="px-6 py-3 font-bold text-right">ยอดรวม</th>
                                    <th className="px-6 py-3 font-bold text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map(tx => (
                                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-medium text-gray-800">
                                                {new Date(tx.timestamp?.seconds * 1000 || tx.timestamp).toLocaleTimeString()}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(tx.timestamp?.seconds * 1000 || tx.timestamp).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px]">
                                            <div className="truncate">
                                                {tx.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                tx.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' :
                                                tx.paymentMethod === 'QR Code' ? 'bg-blue-100 text-blue-700' :
                                                'bg-purple-100 text-purple-700'
                                            }`}>
                                                {tx.paymentMethod === 'Cash' ? 'เงินสด' : 
                                                 tx.paymentMethod === 'QR Code' ? 'คิวอาร์โค้ด' : 
                                                 'บัตรเครดิต'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-800">
                                            {tx.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handlePrintReceipt(tx)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="พิมพ์ใบเสร็จ"
                                            >
                                                <Printer size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default POSLayout;
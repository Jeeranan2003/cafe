import React, { useState, useRef, useEffect } from 'react';
import { Product, Category, StoreSettings, DashboardData } from '../types';
import { addProduct, updateProduct, deleteProduct, getStoreSettings, saveStoreSettings, getDashboardData } from '../services/posService';
import { X, Upload, Save, Trash2, Edit, Plus, Loader2, LayoutDashboard, Package, Settings, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface StoreManagementProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRefresh: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const StoreManagement: React.FC<StoreManagementProps> = ({ isOpen, onClose, products, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'settings'>('dashboard');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Dashboard State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<StoreSettings>({
    name: '',
    address: '',
    phone: '',
    taxId: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Message Modal State
  const [message, setMessage] = useState<{ title: string; text: string; type: 'success' | 'error' } | null>(null);

  // Product Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: 0,
    unit: 'แก้ว',
    description: '',
    category: 'Coffee',
    status: 'In Stock',
    imageUrl: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      if (activeTab === 'dashboard') {
        fetchDashboard();
      }
    }
  }, [isOpen, activeTab]);

  const fetchSettings = async () => {
    const data = await getStoreSettings();
    setSettings(data);
    setLogoPreviewUrl(data.logoUrl || null);
  };

  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const data = await getDashboardData();
      setDashboardData(data);
    } catch {
      console.error("Dashboard failed");
    } finally {
      setLoadingDashboard(false);
    }
  };

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      unit: 'แก้ว',
      description: '',
      category: 'Coffee',
      status: 'In Stock',
      imageUrl: ''
    });
    setImageFile(null);
    setPreviewUrl(null);
    setEditingId(null);
    setView('list');
  };

  const handleEditClick = (product: Product) => {
    setFormData(product);
    setPreviewUrl(product.imageUrl || null);
    setEditingId(product.id);
    setView('form');
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirmId) return;
    setIsLoading(true);
    try {
      await deleteProduct(deleteConfirmId);
      onRefresh();
      setDeleteConfirmId(null);
    } catch {
      setMessage({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบสินค้าได้', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        await updateProduct(editingId, formData, imageFile || undefined);
      } else {
        await addProduct(formData, imageFile || undefined);
      }
      onRefresh();
      resetForm();
    } catch (error: any) {
      setMessage({ title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถบันทึกข้อมูลได้', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveStoreSettings(settings, logoFile || undefined);
      setMessage({ title: 'สำเร็จ', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว', type: 'success' });
      fetchSettings();
    } catch {
      setMessage({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกการตั้งค่าได้', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setLogoPreviewUrl(objectUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-4xl w-full bg-white shadow-xl transform transition-transform duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold">จัดการร้านค้า</h2>
            <nav className="flex gap-1">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <LayoutDashboard size={18} /> แดชบอร์ด
              </button>
              <button 
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Package size={18} /> สินค้า
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Settings size={18} /> ตั้งค่า
              </button>
            </nav>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-300 p-1">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {activeTab === 'dashboard' && (
            <div className="p-6 space-y-6">
              {loadingDashboard ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p>กำลังโหลดข้อมูลแดชบอร์ด...</p>
                </div>
              ) : dashboardData ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                          <DollarSign size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 font-medium">ยอดขายวันนี้</p>
                          <h3 className="text-2xl font-bold text-gray-900">{dashboardData.todaySales.toLocaleString()} ฿</h3>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                          <ShoppingBag size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 font-medium">รายการขายวันนี้</p>
                          <h3 className="text-2xl font-bold text-gray-900">{dashboardData.totalTransactions} รายการ</h3>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 font-medium">ยอดขายรวม (7 วัน)</p>
                          <h3 className="text-2xl font-bold text-gray-900">{dashboardData.totalSales.toLocaleString()} ฿</h3>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-lg font-bold text-gray-800 mb-6">ยอดขายรายวัน (7 วันล่าสุด)</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardData.last7DaysSales}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                            <Tooltip 
                              contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                              cursor={{fill: '#f9fafb'}}
                            />
                            <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-lg font-bold text-gray-800 mb-6">สัดส่วนการชำระเงิน</h4>
                      <div className="h-64 flex items-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dashboardData.salesByMethod}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {dashboardData.salesByMethod.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-2 ml-4">
                          {dashboardData.salesByMethod.map((item, index) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                              <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="text-lg font-bold text-gray-800 mb-6">สินค้าขายดี (Top 5)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase border-b border-gray-100">
                          <tr>
                            <th className="pb-4 font-medium">ชื่อสินค้า</th>
                            <th className="pb-4 font-medium text-center">จำนวนที่ขายได้</th>
                            <th className="pb-4 font-medium text-right">ยอดขายรวม</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dashboardData.topProducts.map((product, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 font-medium text-gray-700">{product.name}</td>
                              <td className="py-4 text-center text-gray-600">{product.quantity}</td>
                              <td className="py-4 text-right font-bold text-green-600">{product.total.toLocaleString()} ฿</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-gray-400">ไม่มีข้อมูลการขาย</div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="p-6">
              {view === 'list' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">รายการสินค้าทั้งหมด</h3>
                    <button 
                      onClick={() => setView('form')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-green-600/20 transition-all active:scale-95"
                    >
                      <Plus size={20} /> เพิ่มสินค้าใหม่
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 font-medium">สินค้า</th>
                          <th className="px-6 py-4 font-medium text-center">ราคา</th>
                          <th className="px-6 py-4 font-medium text-center">สถานะ</th>
                          <th className="px-6 py-4 font-medium text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                      {product.imageUrl ? (
                                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <Package size={20} />
                                          </div>
                                      )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{product.name}</div>
                                        <div className="text-xs text-gray-400">{product.category} • {product.unit}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-gray-700">{product.price.toLocaleString()} ฿</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                product.status === 'In Stock' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                              }`}>
                                {product.status === 'In Stock' ? 'พร้อมขาย' : 'หมด'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button 
                                    onClick={() => handleEditClick(product)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="แก้ไข"
                                >
                                    <Edit size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteClick(product.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="ลบ"
                                >
                                    <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">{editingId ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Image Upload */}
                    <div className="flex justify-center">
                        <div 
                          className="relative w-full max-w-sm h-56 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all overflow-hidden group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {previewUrl ? (
                              <>
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Upload className="text-white" size={32} />
                                </div>
                              </>
                          ) : (
                              <div className="text-center text-gray-400">
                                  <Upload className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                  <p className="text-sm font-bold">คลิกเพื่ออัปโหลดรูปภาพ</p>
                                  <p className="text-xs mt-1">รองรับไฟล์ JPG, PNG</p>
                              </div>
                          )}
                          <input 
                              ref={fileInputRef}
                              type="file" 
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden" 
                          />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">ชื่อสินค้า</label>
                          <input 
                              type="text" 
                              required
                              value={formData.name}
                              onChange={e => setFormData({...formData, name: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                              placeholder="เช่น เอสเพรสโซ่เย็น"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">หมวดหมู่</label>
                          <select 
                              value={formData.category}
                              onChange={e => setFormData({...formData, category: e.target.value as Category})}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all bg-white"
                          >
                              <option value="Coffee">กาแฟ</option>
                              <option value="Bakery">เบเกอรี่</option>
                              <option value="Dessert">ของหวาน</option>
                          </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">ราคา (บาท)</label>
                          <input 
                              type="number" 
                              required
                              min="0"
                              value={formData.price}
                              onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">หน่วย</label>
                          <input 
                              type="text" 
                              value={formData.unit}
                              onChange={e => setFormData({...formData, unit: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                              placeholder="เช่น แก้ว, ชิ้น"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">สถานะ</label>
                          <select 
                              value={formData.status}
                              onChange={e => setFormData({...formData, status: e.target.value as any})}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all bg-white"
                          >
                              <option value="In Stock">พร้อมขาย</option>
                              <option value="Sold Out">หมดชั่วคราว</option>
                          </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">รายละเอียดสินค้า</label>
                          <textarea 
                              rows={3}
                              value={formData.description}
                              onChange={e => setFormData({...formData, description: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                              placeholder="ระบุรายละเอียดสินค้าเพิ่มเติม..."
                          />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={resetForm}
                            className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                            disabled={isLoading}
                        >
                            ยกเลิก
                        </button>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-6 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all active:scale-95 flex justify-center items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            บันทึกข้อมูล
                        </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6 max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                  <h3 className="text-lg font-bold text-gray-800">ตั้งค่าข้อมูลร้านค้า</h3>
                  <p className="text-sm text-gray-400">ข้อมูลนี้จะปรากฏบนใบเสร็จรับเงิน</p>
                </div>
                <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
                  {/* Logo Upload */}
                  <div className="flex flex-col items-center">
                    <label className="text-sm font-bold text-gray-700 mb-2">โลโก้ร้านค้า</label>
                    <div 
                      className="relative w-32 h-32 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all overflow-hidden group"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logoPreviewUrl ? (
                        <>
                          <img src={logoPreviewUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="text-white" size={20} />
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-gray-400">
                          <Upload className="w-8 h-8 mx-auto mb-1 opacity-20" />
                          <p className="text-[10px] font-bold">อัปโหลด</p>
                        </div>
                      )}
                      <input 
                        ref={logoInputRef}
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">ชื่อร้านค้า</label>
                    <input 
                      type="text" 
                      required
                      value={settings.name}
                      onChange={e => setSettings({...settings, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">ที่อยู่</label>
                    <textarea 
                      rows={3}
                      required
                      value={settings.address}
                      onChange={e => setSettings({...settings, address: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">เบอร์โทรศัพท์</label>
                      <input 
                        type="text" 
                        required
                        value={settings.phone}
                        onChange={e => setSettings({...settings, phone: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">เลขประจำตัวผู้เสียภาษี (ถ้ามี)</label>
                      <input 
                        type="text" 
                        value={settings.taxId}
                        onChange={e => setSettings({...settings, taxId: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={savingSettings}
                    className="w-full px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2"
                  >
                    {savingSettings ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    บันทึกการตั้งค่า
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-up">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-red-100 p-3 rounded-full mb-4">
                        <Trash2 className="text-red-600 h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบสินค้า</h3>
                    <p className="text-gray-500 mb-8">คุณแน่ใจหรือไม่ที่จะลบสินค้านี้ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                    <div className="flex w-full gap-3">
                        <button 
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"
                        >
                            ยกเลิก
                        </button>
                        <button 
                            onClick={confirmDeleteProduct}
                            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold flex items-center justify-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ยืนยันลบ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      {/* Message Modal */}
      {message && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-up text-center">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {message.type === 'success' ? <TrendingUp size={24} /> : <X size={24} />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{message.title}</h3>
            <p className="text-gray-500 mb-6">{message.text}</p>
            <button 
              onClick={() => setMessage(null)}
              className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${message.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreManagement;

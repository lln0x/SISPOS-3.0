import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  ArrowRightLeft,
  User,
  Ticket,
  X,
  ShoppingCart,
  Store,
  UserPlus,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, AppSettings, Customer } from '../types';
import { formatCurrency, cn } from '../lib/utils';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  
  // Customer states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: '', last_name: '', phone: '' });

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/categories').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/customers').then(res => res.json())
    ]).then(([productsData, categoriesData, settingsData, customersData]) => {
      setProducts(productsData);
      setCategories(categoriesData);
      setSettings(settingsData);
      setCustomers(customersData);
    });
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory && p.status === 'active';
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        const product = products.find(p => p.id === id);
        if (product && newQty > product.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.sale_price * item.quantity), 0);
  const taxRate = 0;
  const tax = 0;
  const total = subtotal;
  const change = parseFloat(receivedAmount) - total;

  const handleCheckout = async () => {
    const saleData = {
      items: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.sale_price })),
      total,
      subtotal,
      tax,
      payment_method: paymentMethod,
      customer_id: selectedCustomer?.id || null
    };

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });

    if (res.ok) {
      const data = await res.json();
      setLastSaleId(data.id);
      setIsCheckoutOpen(false);
      setShowTicket(true);
      // Refresh products to update stock
      fetch('/api/products').then(res => res.json()).then(setProducts);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.first_name) return;
    
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomer)
    });

    if (res.ok) {
      const data = await res.json();
      const created = { ...newCustomer, id: data.id } as Customer;
      setCustomers(prev => [...prev, created]);
      setSelectedCustomer(created);
      setIsAddingCustomer(false);
      setNewCustomer({ first_name: '', last_name: '', phone: '' });
    }
  };

  const handlePrint = () => {
    const printContent = ticketRef.current;
    if (!printContent) return;

    const windowPrint = window.open('', '', 'left=0,top=0,width=400,height=600,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    windowPrint.document.write(`
      <html>
        <head>
          <title>Ticket de Venta</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 70mm; 
              margin: 0; 
              padding: 5mm;
              font-size: 11px;
              line-height: 1.2;
              color: #000;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .border-y { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
            .mt-4 { margin-top: 15px; }
            .mb-2 { margin-bottom: 5px; }
            .w-full { width: 100%; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .gap-2 { gap: 8px; }
            .text-lg { font-size: 14px; }
            .font-black { font-weight: 900; }
            .text-gray-400 { color: #666; }
            .text-gray-500 { color: #444; }
            .text-xs { font-size: 9px; }
            button, .no-print { display: none !important; }
            img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  };

  const resetSale = () => {
    setCart([]);
    setShowTicket(false);
    setReceivedAmount('');
    setLastSaleId(null);
    setSelectedCustomer(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]">
      {/* Products Section */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 rounded-2xl border shadow-sm overflow-hidden",
        settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
      )}>
        <div className={cn(
          "p-4 border-b space-y-4",
          settings?.theme_mode === 'dark' ? "border-gray-800" : "border-gray-100"
        )}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar por nombre o código..."
              className={cn(
                "w-full pl-10 pr-4 py-2.5 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all",
                settings?.theme_mode === 'dark' ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-900"
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div 
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <button 
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all",
                selectedCategory === 'all' 
                  ? "bg-primary text-white" 
                  : settings?.theme_mode === 'dark'
                    ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all",
                  selectedCategory === cat.id 
                    ? "bg-primary text-white" 
                    : settings?.theme_mode === 'dark'
                      ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={cn(
                  "flex flex-col text-left border rounded-2xl overflow-hidden hover:shadow-xl transition-all group relative",
                  settings?.theme_mode === 'dark' 
                    ? "bg-gray-900 border-gray-800 hover:border-primary" 
                    : "bg-white border-gray-200 hover:border-primary",
                  product.stock <= 0 && "opacity-60 cursor-not-allowed grayscale"
                )}
              >
                <div className={cn(
                  "aspect-[4/3] relative overflow-hidden border-b",
                  settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"
                )}>
                  <img 
                    src={product.image || `https://picsum.photos/seed/${product.id}/400/300`} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur-sm text-[10px] font-black text-gray-900 px-2 py-1 rounded-lg shadow-sm border border-gray-100">
                      {product.code}
                    </span>
                  </div>
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">
                      ¡ÚLTIMOS!
                    </div>
                  )}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white font-black text-xs uppercase tracking-widest border-2 border-white px-3 py-1 rounded-lg">
                        Agotado
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <h4 className={cn(
                      "text-sm font-black leading-tight line-clamp-2 group-hover:text-primary transition-colors",
                      settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                    )}>
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{product.brand}</p>
                  </div>
                  <div className="flex items-end justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-black uppercase">Precio</span>
                      <span className="text-lg font-black text-primary leading-none">
                        {formatCurrency(product.sale_price)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-gray-400 font-black uppercase">Stock</span>
                      <span className={cn(
                        "text-xs font-black",
                        product.stock <= 5 ? "text-orange-500" : settings?.theme_mode === 'dark' ? "text-gray-300" : "text-gray-900"
                      )}>
                        {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Hover Action Indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className={cn(
        "w-full lg:w-96 flex flex-col rounded-2xl border shadow-sm overflow-hidden",
        settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
      )}>
        <div className={cn(
          "p-4 border-b flex items-center justify-between",
          settings?.theme_mode === 'dark' ? "border-gray-800" : "border-gray-100"
        )}>
          <h3 className={cn(
            "font-bold flex items-center gap-2",
            settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
          )}>
            <ShoppingCart size={20} className="text-primary" />
            Carrito
          </h3>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
            {cart.reduce((acc, item) => acc + item.quantity, 0)} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="text-sm font-medium">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                  <img src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "text-sm font-bold truncate",
                    settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                  )}>{item.name}</h4>
                  <p className="text-xs text-primary font-bold">{formatCurrency(item.sale_price)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors dark:text-gray-300"><Minus size={12} /></button>
                      <span className="text-xs font-bold w-6 text-center dark:text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors dark:text-gray-300"><Plus size={12} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={cn(
          "p-4 border-t space-y-3",
          settings?.theme_mode === 'dark' ? "bg-gray-800/50 border-gray-800" : "bg-gray-50 border-gray-100"
        )}>
          <div className={cn(
            "flex justify-between text-lg pt-2 border-t",
            settings?.theme_mode === 'dark' ? "border-gray-700" : "border-gray-200"
          )}>
            <span className={cn(
              "font-bold",
              settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
            )}>Total</span>
            <span className="font-black text-primary">{formatCurrency(total)}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            Pagar Ahora
            <ArrowRightLeft size={20} />
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden",
                settings?.theme_mode === 'dark' ? "bg-gray-900" : "bg-white"
              )}
            >
              <div className={cn(
                "p-6 border-b flex items-center justify-between",
                settings?.theme_mode === 'dark' ? "border-gray-800" : "border-gray-100"
              )}>
                <h3 className={cn(
                  "text-xl font-bold",
                  settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                )}>Finalizar Venta</h3>
                <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className={cn(
                  "text-center p-6 rounded-2xl border",
                  settings?.theme_mode === 'dark' ? "bg-primary/10 border-primary/20" : "bg-green-50 border-green-100"
                )}>
                  <p className={cn(
                    "text-sm font-bold uppercase tracking-wider",
                    settings?.theme_mode === 'dark' ? "text-primary" : "text-green-600"
                  )}>Total a Pagar</p>
                  <h2 className={cn(
                    "text-4xl font-black mt-1",
                    settings?.theme_mode === 'dark' ? "text-white" : "text-green-700"
                  )}>{formatCurrency(total)}</h2>
                </div>

                {/* Customer Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cliente</label>
                    <button 
                      onClick={() => setIsAddingCustomer(!isAddingCustomer)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      {isAddingCustomer ? 'Cancelar' : (
                        <>
                          <UserPlus size={14} />
                          Nuevo Cliente
                        </>
                      )}
                    </button>
                  </div>

                  {isAddingCustomer ? (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-xl border space-y-3",
                        settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"
                      )}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          placeholder="Nombre" 
                          className={cn(
                            "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                            settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                          )}
                          value={newCustomer.first_name}
                          onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                        />
                        <input 
                          type="text" 
                          placeholder="Apellido" 
                          className={cn(
                            "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                            settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                          )}
                          value={newCustomer.last_name}
                          onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Teléfono" 
                          className={cn(
                            "flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                            settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                          )}
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                        />
                        <button 
                          onClick={handleCreateCustomer}
                          className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-colors"
                        >
                          Guardar
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="relative">
                      <div 
                        className={cn(
                          "w-full px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer border transition-all",
                          settings?.theme_mode === 'dark' ? "bg-gray-800 border-transparent hover:border-gray-700" : "bg-gray-50 border-transparent hover:border-gray-200"
                        )}
                        onClick={() => setShowCustomerList(!showCustomerList)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border",
                            settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-gray-500" : "bg-white border-gray-100 text-gray-400"
                          )}>
                            <User size={16} />
                          </div>
                          <span className={cn(
                            "text-sm font-bold",
                            settings?.theme_mode === 'dark' ? "text-gray-300" : "text-gray-700"
                          )}>
                            {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Público General'}
                          </span>
                        </div>
                        <ChevronDown size={18} className={cn("text-gray-400 transition-transform", showCustomerList && "rotate-180")} />
                      </div>

                      <AnimatePresence>
                        {showCustomerList && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                              "absolute z-50 w-full mt-2 border rounded-xl shadow-xl max-h-48 overflow-y-auto",
                              settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                            )}
                          >
                            <div className={cn(
                              "p-2 sticky top-0 border-b",
                              settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-50"
                            )}>
                              <input 
                                type="text"
                                placeholder="Buscar cliente..."
                                className={cn(
                                  "w-full px-3 py-2 text-xs border-none rounded-lg focus:ring-2 focus:ring-primary",
                                  settings?.theme_mode === 'dark' ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
                                )}
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div 
                              className={cn(
                                "px-4 py-2 cursor-pointer text-sm font-medium transition-colors flex items-center justify-between",
                                settings?.theme_mode === 'dark' ? "hover:bg-gray-700 text-gray-300" : "hover:bg-green-50 text-gray-700"
                              )}
                              onClick={() => {
                                setSelectedCustomer(null);
                                setShowCustomerList(false);
                              }}
                            >
                              <span>Público General</span>
                              {!selectedCustomer && <Check size={14} className="text-primary" />}
                            </div>
                            {customers
                              .filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()))
                              .map(c => (
                                <div 
                                  key={c.id}
                                  className={cn(
                                    "px-4 py-2 cursor-pointer text-sm font-medium transition-colors flex items-center justify-between",
                                    settings?.theme_mode === 'dark' ? "hover:bg-gray-700 text-gray-300" : "hover:bg-green-50 text-gray-700"
                                  )}
                                  onClick={() => {
                                    setSelectedCustomer(c);
                                    setShowCustomerList(false);
                                  }}
                                >
                                  <span>{c.first_name} {c.last_name}</span>
                                  {selectedCustomer?.id === c.id && <Check size={14} className="text-primary" />}
                                </div>
                              ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'cash', label: 'Efectivo', icon: Banknote },
                      { id: 'card', label: 'Tarjeta', icon: CreditCard },
                      { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft },
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                          paymentMethod === method.id 
                            ? "border-primary bg-primary/10 text-primary" 
                            : settings?.theme_mode === 'dark'
                              ? "border-gray-800 hover:border-gray-700 text-gray-500"
                              : "border-gray-100 hover:border-gray-200 text-gray-500"
                        )}
                      >
                        <method.icon size={24} />
                        <span className="text-xs font-bold">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Monto Recibido</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">S/</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        className={cn(
                          "w-full pl-10 pr-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-primary text-xl font-bold",
                          settings?.theme_mode === 'dark' ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-900"
                        )}
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                      />
                    </div>
                    {receivedAmount && (
                      <div className={cn(
                        "p-3 rounded-xl flex justify-between items-center",
                        change >= 0 
                          ? settings?.theme_mode === 'dark' ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-700" 
                          : settings?.theme_mode === 'dark' ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700"
                      )}>
                        <span className="text-sm font-bold">Vuelto</span>
                        <span className="text-lg font-black">{formatCurrency(change)}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={paymentMethod === 'cash' && (!receivedAmount || change < 0)}
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all text-lg"
                >
                  Confirmar Venta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ticket Modal */}
      <AnimatePresence>
        {showTicket && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide" ref={ticketRef}>
                <div className="text-center space-y-2">
                  {settings?.business_logo ? (
                    <img 
                      src={settings.business_logo} 
                      alt="Logo" 
                      className="w-16 h-16 object-contain mx-auto mb-2" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-green-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-green-500/20 no-print">
                      <Store size={32} />
                    </div>
                  )}
                  <h3 className="text-xl font-black text-gray-900 uppercase">{settings?.business_name}</h3>
                  <p className="text-xs text-gray-500 font-medium">{settings?.address}</p>
                  <p className="text-xs text-gray-500 font-medium">Telf: {settings?.phone}</p>
                </div>

                <div className="border-y border-dashed border-gray-200 py-4 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span>Venta: #V{String(lastSaleId).padStart(6, '0')}</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Cliente: {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Público General'}
                  </p>
                  {selectedCustomer?.phone && (
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Telf: {selectedCustomer.phone}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-gray-500">{item.quantity} x {formatCurrency(item.sale_price)}</p>
                      </div>
                      <span className="font-bold text-gray-900">{formatCurrency(item.quantity * item.sale_price)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-lg pt-2">
                    <span className="font-black text-gray-900">TOTAL</span>
                    <span className="font-black text-green-600">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Método de Pago:</span>
                    <span className="font-bold uppercase">{paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                  </div>
                </div>

                <div className="text-center space-y-4 pt-4 no-print">
                  <p className="text-xs font-bold text-gray-500 italic">"{settings?.ticket_message}"</p>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handlePrint}
                      className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                    >
                      <Ticket size={18} />
                      Imprimir Ticket
                    </button>
                    <button 
                      onClick={resetSale}
                      className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
                    >
                      Nueva Venta
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

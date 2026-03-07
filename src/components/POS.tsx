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
import { useDataSync } from '../hooks/useDataSync';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    business_name: 'Cargando...',
    address: '',
    phone: '',
    email: '',
    currency: 'S/',
    ticket_message: '',
    theme_mode: 'light',
    primary_color: '#22c55e'
  });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [isQuotation, setIsQuotation] = useState(false);
  const [lastQuotationId, setLastQuotationId] = useState<number | null>(null);
  
  // Customer states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: '', last_name: '', dni: '', phone: '' });

  // Multiple payment methods state
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);

  const ticketRef = useRef<HTMLDivElement>(null);

  const fetchData = () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  useDataSync(fetchData);

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

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingAmount = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;

  const handleCheckout = async () => {
    const saleData = {
      items: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.sale_price })),
      total,
      subtotal,
      tax,
      payment_method: JSON.stringify(payments),
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
      setIsQuotation(false);
      setIsCheckoutOpen(false);
      setShowTicket(true);
      // Refresh products to update stock
      fetch('/api/products').then(res => res.json()).then(setProducts);
    }
  };

  const handleQuotation = async () => {
    const quotationData = {
      items: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.sale_price })),
      total,
      subtotal,
      tax,
      customer_id: selectedCustomer?.id || null
    };

    const res = await fetch('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotationData)
    });

    if (res.ok) {
      const data = await res.json();
      setLastQuotationId(data.id);
      setIsQuotation(true);
      setIsCheckoutOpen(false);
      setShowTicket(true);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.first_name || !newCustomer.dni) {
      alert('Por favor, ingrese al menos el Nombre y el DNI');
      return;
    }
    
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });

      const data = await res.json();

      if (res.ok) {
        const created = { ...newCustomer, id: data.id } as Customer;
        setCustomers(prev => [...prev, created]);
        setSelectedCustomer(created);
        setIsAddingCustomer(false);
        setNewCustomer({ first_name: '', last_name: '', dni: '', phone: '' });
        setCustomerSearch(created.dni);
      } else {
        alert(data.error || 'Error al crear cliente');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error de conexión al crear cliente');
    }
  };

  const handlePrint = () => {
    const printContent = ticketRef.current;
    if (!printContent) return;

    const windowPrint = window.open('', '', 'left=0,top=0,width=900,height=1000,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    const isA4 = isQuotation;
    const title = isQuotation ? 'Cotización' : 'Ticket de Venta';
    const primaryColor = settings?.primary_color || '#22c55e';

    windowPrint.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
            @page { 
              size: ${isA4 ? 'A4' : '80mm auto'}; 
              margin: ${isA4 ? '10mm' : '0'}; 
            }
            body { 
              font-family: ${isA4 ? "'Inter', sans-serif" : "'Courier New', Courier, monospace"}; 
              width: ${isA4 ? '100%' : '70mm'}; 
              margin: 0; 
              padding: ${isA4 ? '0' : '5mm'};
              font-size: ${isA4 ? '12px' : '11px'};
              line-height: 1.4;
              color: #1a1a1a;
              background-color: #fff;
              -webkit-print-color-adjust: exact;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            
            /* A4 Specific Styles */
            .a4-page {
              position: relative;
              width: 100%;
              min-height: 297mm;
              padding: 10mm;
              box-sizing: border-box;
            }
            
            .a4-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              border-bottom: 3px solid ${primaryColor};
              padding-bottom: 20px;
            }

            .a4-brand {
              display: flex;
              align-items: center;
              gap: 20px;
            }

            .a4-logo-box {
              width: 80px;
              height: 80px;
              background: ${primaryColor};
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 40px;
              font-weight: 900;
              box-shadow: 0 4px 10px ${primaryColor}44;
            }

            .a4-logo-img {
              width: 80px;
              height: 80px;
              object-fit: contain;
            }

            .a4-business-info h2 {
              margin: 0;
              font-size: 22px;
              font-weight: 800;
              color: #111;
              letter-spacing: -0.5px;
              line-height: 1.1;
              word-wrap: break-word;
              max-width: 450px;
            }

            .a4-business-info p {
              margin: 2px 0;
              color: #666;
              font-size: 11px;
              font-weight: 500;
            }

            .a4-doc-info {
              text-align: right;
            }

            .a4-doc-type {
              font-size: 36px;
              font-weight: 900;
              color: ${primaryColor};
              margin: 0;
              line-height: 1;
              letter-spacing: -1px;
            }

            .a4-doc-number {
              font-size: 18px;
              font-weight: 700;
              color: #333;
              margin: 5px 0;
            }

            .a4-doc-date {
              font-size: 12px;
              color: #888;
              font-weight: 600;
            }

            .a4-grid {
              display: grid;
              grid-template-columns: 1.5fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }

            .a4-section {
              background: #fcfcfc;
              border: 1px solid #f0f0f0;
              border-radius: 12px;
              padding: 15px;
            }

            .a4-section-label {
              font-size: 9px;
              font-weight: 800;
              color: ${primaryColor};
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 10px;
              display: block;
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
            }

            .a4-client-name {
              font-size: 16px;
              font-weight: 800;
              color: #111;
              margin: 0 0 5px 0;
            }

            .a4-client-detail {
              font-size: 11px;
              color: #555;
              margin: 2px 0;
              font-weight: 500;
            }

            .a4-condition-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 11px;
            }

            .a4-condition-label {
              color: #888;
              font-weight: 600;
            }

            .a4-condition-value {
              color: #111;
              font-weight: 700;
            }

            .a4-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid #eee;
            }

            .a4-table th {
              background: ${primaryColor};
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .a4-table td {
              padding: 12px;
              border-bottom: 1px solid #eee;
              font-size: 12px;
              color: #333;
            }

            .a4-table tr:nth-child(even) {
              background: #f9f9f9;
            }

            .a4-table .col-num { width: 30px; text-align: center; color: #999; font-weight: 700; }
            .a4-table .col-desc { font-weight: 700; }
            .a4-table .col-qty { text-align: center; width: 60px; font-weight: 600; }
            .a4-table .col-price { text-align: right; width: 100px; font-weight: 600; }
            .a4-table .col-total { text-align: right; width: 100px; font-weight: 800; color: #111; }

            .a4-summary-grid {
              display: grid;
              grid-template-columns: 1fr 300px;
              gap: 40px;
            }

            .a4-extra-info h4 {
              font-size: 10px;
              font-weight: 800;
              color: #111;
              text-transform: uppercase;
              margin: 0 0 10px 0;
              letter-spacing: 1px;
            }

            .a4-bank-details {
              font-size: 10px;
              color: #666;
              background: #f8f9fa;
              padding: 12px;
              border-radius: 8px;
              margin-bottom: 15px;
            }

            .a4-bank-row {
              display: flex;
              gap: 10px;
              margin-bottom: 3px;
            }

            .a4-bank-label { font-weight: 700; color: #444; min-width: 60px; }

            .a4-totals-box {
              background: #fff;
            }

            .a4-total-line {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f0f0f0;
              font-size: 13px;
            }

            .a4-total-line.grand-total {
              background: #1a1a1a;
              color: white;
              padding: 15px;
              border-radius: 10px;
              font-size: 20px;
              font-weight: 900;
              margin-top: 10px;
              border-bottom: none;
            }

            .a4-signatures {
              display: flex;
              justify-content: space-around;
              margin-top: 60px;
              margin-bottom: 40px;
            }

            button, .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${isA4 ? `
            <div class="a4-page">
              
              <div class="a4-header">
                <div class="a4-brand">
                  ${settings?.business_logo ? 
                    `<img src="${settings.business_logo}" class="a4-logo-img" />` : 
                    `<div class="a4-logo-box">${settings?.business_name?.charAt(0) || 'M'}</div>`
                  }
                  <div class="a4-business-info">
                    <h2>${settings?.business_name}</h2>
                    <p>${settings?.address}</p>
                    <p>Telf: ${settings?.phone} | Email: ${settings?.email}</p>
                  </div>
                </div>
                <div class="a4-doc-info">
                  <h1 class="a4-doc-type">COTIZACIÓN</h1>
                  <p class="a4-doc-number">N° #C${String(lastQuotationId).padStart(6, '0')}</p>
                  <p class="a4-doc-date">Fecha: ${new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div class="a4-grid">
                <div class="a4-section">
                  <span class="a4-section-label">Información del Cliente</span>
                  <h3 class="a4-client-name">${selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Público General'}</h3>
                  ${selectedCustomer?.dni ? `<p class="a4-client-detail"><strong>DNI/RUC:</strong> ${selectedCustomer.dni}</p>` : ''}
                  ${selectedCustomer?.phone ? `<p class="a4-client-detail"><strong>Teléfono:</strong> ${selectedCustomer.phone}</p>` : ''}
                  ${selectedCustomer?.address ? `<p class="a4-client-detail"><strong>Dirección:</strong> ${selectedCustomer.address}</p>` : ''}
                </div>
                <div class="a4-section">
                  <span class="a4-section-label">Condiciones Comerciales</span>
                  <div class="a4-condition-row">
                    <span class="a4-condition-label">Validez:</span>
                    <span class="a4-condition-value">7 Días Calendario</span>
                  </div>
                  <div class="a4-condition-row">
                    <span class="a4-condition-label">Vencimiento:</span>
                    <span class="a4-condition-value">${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                  </div>
                  <div class="a4-condition-row">
                    <span class="a4-condition-label">Moneda:</span>
                    <span class="a4-condition-value">${settings?.currency === 'S/' ? 'Soles (PEN)' : settings?.currency || 'S/'}</span>
                  </div>
                  <div class="a4-condition-row">
                    <span class="a4-condition-label">Vendedor:</span>
                    <span class="a4-condition-value">${settings?.user_name || 'Admin'}</span>
                  </div>
                </div>
              </div>

              <table class="a4-table">
                <thead>
                  <tr>
                    <th class="col-num">N°</th>
                    <th>Descripción del Producto / Servicio</th>
                    <th class="col-qty">Cant.</th>
                    <th class="col-price">P. Unit</th>
                    <th class="col-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${cart.map((item, index) => `
                    <tr>
                      <td class="col-num">${index + 1}</td>
                      <td class="col-desc">
                        ${item.name}
                        <div style="font-size: 9px; color: #888; font-weight: 500; margin-top: 2px;">SKU: ${item.code}</div>
                      </td>
                      <td class="col-qty">${item.quantity}</td>
                      <td class="col-price">${formatCurrency(item.sale_price)}</td>
                      <td class="col-total">${formatCurrency(item.quantity * item.sale_price)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="a4-summary-grid">
                <div class="a4-extra-info">
                  <h4>Cuentas Bancarias</h4>
                  <div class="a4-bank-details">
                    ${settings?.bank_bcp ? `<div class="a4-bank-row"><span class="a4-bank-label">BCP:</span> ${settings.bank_bcp}</div>` : ''}
                    ${settings?.bank_cci ? `<div class="a4-bank-row"><span class="a4-bank-label">CCI:</span> ${settings.bank_cci}</div>` : ''}
                    ${settings?.bank_yape_plin ? `<div class="a4-bank-row"><span class="a4-bank-label">Yape/Plin:</span> ${settings.bank_yape_plin}</div>` : ''}
                    ${(!settings?.bank_bcp && !settings?.bank_cci && !settings?.bank_yape_plin) ? '<div style="font-style: italic; opacity: 0.5;">No se han configurado cuentas bancarias.</div>' : ''}
                  </div>
                  
                  <h4>Términos y Condiciones</h4>
                  <p style="font-size: 10px; color: #777; margin: 0;">
                    • Precios sujetos a stock al momento de la compra.<br>
                    • Todo pedido requiere confirmación de pago.<br>
                    • Garantía directa con el fabricante.
                  </p>
                </div>
                <div class="a4-totals-box">
                  <div class="a4-total-line">
                    <span style="font-weight: 600; color: #666;">Subtotal</span>
                    <span style="font-weight: 700;">${formatCurrency(subtotal)}</span>
                  </div>
                  <div class="a4-total-line">
                    <span style="font-weight: 600; color: #666;">IGV (0%)</span>
                    <span style="font-weight: 700;">${formatCurrency(0)}</span>
                  </div>
                  <div class="a4-total-line grand-total">
                    <span style="font-size: 12px; opacity: 0.8;">TOTAL NETO</span>
                    <span>${formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <div class="a4-signatures">
              </div>
            </div>
          ` : printContent.innerHTML}
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
    if (!isQuotation) {
      setCart([]);
      setPayments([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
    }
    setShowTicket(false);
    setReceivedAmount('');
    setLastSaleId(null);
    setLastQuotationId(null);
    setIsQuotation(false);
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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCart([])}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
              title="Vaciar Carrito"
            >
              <Trash2 size={16} />
            </button>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} items
            </span>
          </div>
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
                "relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden",
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
              
              <div className="p-6 overflow-y-auto max-h-[85vh]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Summary & Customer */}
                  <div className="space-y-6">
                    <div className={cn(
                      "text-center p-4 rounded-2xl border shadow-sm",
                      settings?.theme_mode === 'dark' ? "bg-primary/10 border-primary/20" : "bg-green-50 border-green-100"
                    )}>
                      <p className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        settings?.theme_mode === 'dark' ? "text-primary" : "text-green-600"
                      )}>Total a Pagar</p>
                      <h2 className={cn(
                        "text-3xl font-black mt-1",
                        settings?.theme_mode === 'dark' ? "text-white" : "text-green-700"
                      )}>{formatCurrency(total)}</h2>
                    </div>

                    <div className={cn(
                      "p-4 rounded-2xl border space-y-3",
                      settings?.theme_mode === 'dark' ? "bg-gray-800/50 border-gray-700" : "bg-gray-50/50 border-gray-100"
                    )}>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Seleccionar Cliente por DNI</label>
                        <button 
                          onClick={() => {
                            const nextState = !isAddingCustomer;
                            setIsAddingCustomer(nextState);
                            if (nextState) {
                              setNewCustomer({ first_name: '', last_name: '', dni: customerSearch, phone: '' });
                            }
                          }}
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
                            settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                          )}
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <input 
                              type="text" 
                              placeholder="DNI" 
                              className={cn(
                                "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                                settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                              )}
                              value={newCustomer.dni}
                              onChange={(e) => setNewCustomer({...newCustomer, dni: e.target.value})}
                            />
                            <input 
                              type="text" 
                              placeholder="Teléfono" 
                              className={cn(
                                "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary",
                                settings?.theme_mode === 'dark' ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                              )}
                              value={newCustomer.phone}
                              onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                            />
                          </div>
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
                          <button 
                            onClick={handleCreateCustomer}
                            className="w-full py-2 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-colors"
                          >
                            Guardar Cliente
                          </button>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                              type="text"
                              placeholder="Ingrese DNI para buscar..."
                              className={cn(
                                "w-full pl-9 pr-4 py-3 rounded-xl border transition-all text-sm font-bold",
                                settings?.theme_mode === 'dark' ? "bg-gray-900 border-transparent focus:border-primary text-white" : "bg-white border-gray-200 focus:border-primary text-gray-900"
                              )}
                              value={customerSearch}
                              onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setShowCustomerList(true);
                                const match = customers.find(c => c.dni === e.target.value);
                                if (match) {
                                  setSelectedCustomer(match);
                                  setShowCustomerList(false);
                                }
                              }}
                              onFocus={() => setShowCustomerList(true)}
                            />

                            <AnimatePresence>
                              {showCustomerList && customerSearch && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className={cn(
                                    "absolute z-50 w-full mt-1 border rounded-xl shadow-xl max-h-48 overflow-y-auto",
                                    settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                                  )}
                                >
                                  {customers
                                    .filter(c => 
                                      (c.dni && c.dni.includes(customerSearch)) ||
                                      `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase())
                                    )
                                    .map(c => (
                                      <div 
                                        key={c.id}
                                        className={cn(
                                          "px-4 py-3 cursor-pointer text-sm font-medium transition-colors flex items-center justify-between border-b last:border-0",
                                          settings?.theme_mode === 'dark' ? "hover:bg-gray-700 text-gray-300 border-gray-700" : "hover:bg-green-50 text-gray-700 border-gray-50"
                                        )}
                                        onClick={() => {
                                          setSelectedCustomer(c);
                                          setShowCustomerList(false);
                                          setCustomerSearch(c.dni || '');
                                        }}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-bold">{c.dni || 'S/DNI'}</span>
                                          <span className="text-xs text-gray-500">{c.first_name} {c.last_name}</span>
                                        </div>
                                        {selectedCustomer?.id === c.id && <Check size={14} className="text-primary" />}
                                      </div>
                                    ))}
                                  
                                  {customers.filter(c => (c.dni && c.dni.includes(customerSearch)) || `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                    <div className="p-4 text-center">
                                      <p className="text-xs text-gray-500 mb-2">No se encontró el cliente</p>
                                      <button 
                                        onClick={() => {
                                          setIsAddingCustomer(true);
                                          setNewCustomer({ ...newCustomer, dni: customerSearch });
                                        }}
                                        className="text-xs font-bold text-primary hover:underline"
                                      >
                                        + Crear nuevo cliente con DNI: {customerSearch}
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {selectedCustomer && (
                            <div className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border animate-in fade-in slide-in-from-top-1",
                              settings?.theme_mode === 'dark' ? "bg-primary/10 border-primary/20" : "bg-green-50 border-green-100"
                            )}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                  <User size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">DNI: {selectedCustomer.dni}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  setCustomerSearch('');
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Payments */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Métodos de Pago</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'cash', label: 'Efectivo', icon: Banknote, color: 'text-green-500' },
                          { id: 'card', label: 'Tarjeta', icon: CreditCard, color: 'text-blue-500' },
                          { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft, color: 'text-purple-500' },
                          { id: 'yape_plin', label: 'Yape/Plin', icon: Ticket, color: 'text-pink-500' },
                        ].map(method => (
                          <button
                            key={method.id}
                            onClick={() => {
                              const amount = pendingAmount;
                              if (amount <= 0) return;
                              setPayments([...payments, { method: method.id, amount }]);
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]",
                              settings?.theme_mode === 'dark'
                                ? "border-gray-800 hover:border-primary/50 text-gray-300 bg-gray-800/50"
                                : "border-gray-100 hover:border-primary/30 text-gray-700 bg-gray-50"
                            )}
                          >
                            <method.icon size={18} className={method.color} />
                            <span className="text-[10px] font-bold">{method.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {payments.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Desglose de Pago</label>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                          {payments.map((p, idx) => (
                            <div key={idx} className={cn(
                              "flex items-center justify-between p-2 rounded-xl border shadow-sm",
                              settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                            )}>
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                  {p.method === 'cash' ? <Banknote size={12} /> : p.method === 'card' ? <CreditCard size={12} /> : p.method === 'transfer' ? <ArrowRightLeft size={12} /> : <Ticket size={12} />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-gray-400 uppercase leading-none mb-0.5">{p.method.replace('_', '/')}</span>
                                  <input 
                                    type="number"
                                    className={cn(
                                      "w-24 px-0 py-0 text-sm font-black bg-transparent border-none focus:ring-0",
                                      settings?.theme_mode === 'dark' ? "text-white" : "text-gray-900"
                                    )}
                                    value={p.amount}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const newPayments = [...payments];
                                      newPayments[idx].amount = val;
                                      setPayments(newPayments);
                                    }}
                                  />
                                </div>
                              </div>
                              <button 
                                onClick={() => setPayments(payments.filter((_, i) => i !== idx))}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className={cn(
                        "p-3 rounded-2xl border shadow-sm",
                        settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                      )}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Pendiente</p>
                        <p className={cn(
                          "text-lg font-black mt-0.5",
                          pendingAmount > 0 ? "text-red-500" : "text-green-500"
                        )}>{formatCurrency(pendingAmount)}</p>
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl border shadow-sm",
                        settings?.theme_mode === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                      )}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Vuelto</p>
                        <p className="text-lg font-black text-blue-500 mt-0.5">{formatCurrency(change)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleQuotation}
                        disabled={cart.length === 0}
                        className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black py-3 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm mt-2"
                      >
                        Crear Cotización
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={pendingAmount > 0 || cart.length === 0}
                        className="w-full bg-primary text-white font-black py-3 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all text-sm mt-2"
                      >
                        Confirmar Venta
                      </button>
                    </div>
                  </div>
                </div>
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
                  <h3 className="text-xl font-black text-gray-900 uppercase break-words leading-tight">{settings?.business_name}</h3>
                  <p className="text-xs text-gray-500 font-medium">{settings?.address}</p>
                  <p className="text-xs text-gray-500 font-medium">Telf: {settings?.phone}</p>
                </div>

                <div className="border-y border-dashed border-gray-200 py-4 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span>{isQuotation ? 'Cotización' : 'Venta'}: #{isQuotation ? 'C' : 'V'}{String(isQuotation ? lastQuotationId : lastSaleId).padStart(6, '0')}</span>
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
                    <span className="font-black text-gray-900">{isQuotation ? 'TOTAL COTIZACIÓN' : 'TOTAL'}</span>
                    <span className="font-black text-green-600">{formatCurrency(total)}</span>
                  </div>
                  {!isQuotation && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Métodos de Pago:</p>
                      {payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] font-bold text-gray-600">
                          <span className="uppercase">{p.method.replace('_', '/')}</span>
                          <span>{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                      {change > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-blue-600">
                          <span>VUELTO</span>
                          <span>{formatCurrency(change)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center space-y-4 pt-4 no-print">
                  <p className="text-xs font-bold text-gray-500 italic">"{isQuotation ? 'Esta es una cotización informativa válida por 7 días.' : settings?.ticket_message}"</p>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handlePrint}
                      className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                    >
                      <Ticket size={18} />
                      Imprimir {isQuotation ? 'Cotización' : 'Ticket'}
                    </button>
                    <button 
                      onClick={resetSale}
                      className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors"
                    >
                      {isQuotation ? 'Continuar Venta' : 'Nueva Venta'}
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

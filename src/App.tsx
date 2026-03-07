import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tags, 
  Truck, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  Store,
  ShieldCheck,
  Key,
  Clock,
  AlertCircle,
  Play,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { AppSettings } from './types';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Categories from './components/Categories';
import Suppliers from './components/Suppliers';
import Customers from './components/Customers';
import Reports from './components/Reports';
import Configuration from './components/Configuration';
import { useDataSync } from './hooks/useDataSync';

type Section = 'dashboard' | 'pos' | 'inventory' | 'categories' | 'suppliers' | 'customers' | 'reports' | 'settings';

function ActivationScreen({ onActivate, onStartDemo, settings, isDemoExpired }: { onActivate: (code: string) => void, onStartDemo: () => void, settings: AppSettings | null, isDemoExpired: boolean }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        onActivate(code);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-green-200/50">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-black text-[#1F2937]">Activación del Sistema</h2>
          <p className="text-gray-500 font-medium px-4">
            Bienvenido a <span className="text-green-600 font-bold">{settings?.business_name || 'Sistem Pos Basic'}</span>. Por favor, activa tu licencia para continuar.
          </p>
        </div>

        <form onSubmit={handleActivate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CLAVE DE PRODUCTO</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input 
                type="text"
                placeholder="XXXX - XXXX - XXXX - XXXX"
                className="w-full pl-12 pr-4 py-4 bg-[#F9FAFB] border-2 border-transparent rounded-2xl focus:border-green-500 focus:bg-white transition-all text-center font-mono tracking-widest uppercase placeholder:text-gray-300"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
          </div>

          <button 
            type="submit"
            className="w-full bg-green-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-200/50 hover:bg-green-600 transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} />
            ACTIVAR AHORA
          </button>
        </form>

        {!isDemoExpired && (
          <>
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <span className="relative px-4 bg-white text-[10px] font-black text-gray-300 uppercase tracking-widest">O TAMBIÉN</span>
            </div>

            <button 
              onClick={onStartDemo}
              className="w-full py-4 border-2 border-gray-100 rounded-2xl font-black text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Play size={20} className="fill-current" />
              INICIAR MODO DEMO
            </button>
          </>
        )}

        <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#92400E]">
            <AlertCircle size={16} />
            <span className="text-[10px] font-black uppercase tracking-wider">LIMITACIONES DEL MODO DEMO:</span>
          </div>
          <ul className="text-[10px] text-[#92400E] font-bold space-y-1 list-none opacity-80">
            <li>• Límite de 20 comprobantes de pago diarios.</li>
            <li>• El contador se reinicia cada 24 horas.</li>
            <li>• Disponible únicamente por 1 minuto desde el primer uso.</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isDemoStarted, setIsDemoStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useDataSync(fetchSettings);

  useEffect(() => {
    if (settings) {
      document.documentElement.classList.remove('dark');
      if (settings.primary_color) {
        document.documentElement.style.setProperty('--primary-color', settings.primary_color);
      }
    }
  }, [settings]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'categories', label: 'Categorías', icon: Tags },
    { id: 'suppliers', label: 'Proveedores', icon: Truck },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POS />;
      case 'inventory': return <Inventory />;
      case 'categories': return <Categories />;
      case 'suppliers': return <Suppliers />;
      case 'customers': return <Customers />;
      case 'reports': return <Reports />;
      case 'settings': return <Configuration />;
      default: return <Dashboard />;
    }
  };

  const getDemoMinutesLeft = () => {
    if (!settings?.installation_date) return 0;
    const installDate = new Date(settings.installation_date);
    const diffTime = currentTime.getTime() - installDate.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffSeconds = Math.floor((diffTime / 1000) % 60);
    const totalSecondsLeft = Math.max(0, 60 - (diffMinutes * 60 + diffSeconds));
    return totalSecondsLeft;
  };

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isDemoExpired = settings?.activation_status === 'demo' && getDemoMinutesLeft() <= 0;
  const isActivated = settings?.activation_status === 'activated';
  const showActivation = !isActivated && (!isDemoStarted || isDemoExpired);

  const handleStartDemo = async () => {
    try {
      // Reset installation date to now for testing purposes
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installation_date: new Date().toISOString() })
      });
      await fetchSettings();
      setIsDemoStarted(true);
    } catch (err) {
      console.error('Error starting demo:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showActivation) {
    return (
      <ActivationScreen 
        settings={settings}
        isDemoExpired={isDemoExpired}
        onActivate={() => fetchSettings()}
        onStartDemo={handleStartDemo}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? '280px' : '260px') : '0px',
          x: isMobile && !isSidebarOpen ? -280 : 0
        }}
        className={cn(
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-all duration-300 ease-in-out",
          isMobile ? "fixed inset-y-0 left-0" : "relative"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 overflow-hidden shrink-0">
            {settings?.business_logo ? (
              <img src={settings.business_logo} alt="Logo" className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
            ) : (
              <Store size={24} />
            )}
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-xl tracking-tight text-gray-900 dark:text-white truncate"
            >
              {settings?.business_name || 'Sistem Pos Basic'}
            </motion.span>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 overflow-y-auto space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id as Section);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeSection === item.id 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors",
                activeSection === item.id ? "text-white" : "text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
              )} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              {isSidebarOpen && activeSection === item.id && (
                <ChevronRight size={16} className="ml-auto opacity-70" />
              )}
            </button>
          ))}
        </nav>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
            >
              {isSidebarOpen && !isMobile ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">
              {menuItems.find(m => m.id === activeSection)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {!isActivated && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                <Clock size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-700">
                  Demo: {formatTimeLeft(getDemoMinutesLeft())} restantes
                </span>
              </div>
            )}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{settings?.user_name || 'Admin Usuario'}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{settings?.user_role || 'Administrador'}</span>
                {!isActivated && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[8px] font-black uppercase rounded">Demo</span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full border-2 border-white shadow-sm overflow-hidden">
              <img 
                src={settings?.user_avatar || "https://picsum.photos/seed/admin/100/100"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {renderSection()}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

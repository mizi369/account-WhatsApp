
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings as SettingsIcon, 
  MessageSquare,
  LogOut,
  Menu,
  X,
  Fuel,
  Package,
  BrainCircuit,
  Tag,
  Megaphone,
  Bot,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  Wrench,
  Wallet,
  ShoppingCart,
  Image as ImageIcon,
  MapPin,
  Briefcase,
  DollarSign,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import BookingManager from './components/BookingManager';
import WhatsAppMonitor from './components/WhatsAppMonitor';
import AiAgentManager from './components/AiAgentManager'; 
import PromotionManager from './components/PromotionManager';
import InvoiceQuotationManager from './components/InvoiceQuotationManager';
import Settings from './components/Settings';
import TeamModule from './components/TeamModule';
import Login from './components/Login';
import Catalog from './components/Catalog';
import CustomerManager from './components/CustomerManager';
import Employees from './components/Employees';
import FuelExpenses from './components/FuelExpenses';
import Inventory from './components/Inventory';
import Maintenance from './components/Maintenance';
import TimeSlotManagement from './components/TimeSlotManagement';
import DebitCredit from './components/DebitCredit';
import Payroll from './components/Payroll';
import Sales from './components/Sales';
import { db, TABLES } from './lib/db';
import { socket } from './service/socket';
import { testConnection, auth, onAuthStateChanged, signOut } from './service/firebase';
import { Booking } from './types';

interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  collapsed: boolean;
  badge?: string;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ icon, label, to, collapsed, badge, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const activeClass = isActive 
    ? 'bg-primary/10 text-primary border-r-4 border-primary shadow-[inset_0_0_20px_rgba(211,47,47,0.15)]' 
    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 hover:border-r-4 hover:border-slate-700';

  return (
    <Link to={to} onClick={onClick} className={`relative flex items-center gap-3 px-6 py-3 transition-all duration-300 ${activeClass}`}>
      <div className={`shrink-0 ${isActive ? 'scale-110 text-primary' : 'text-slate-500'}`}>{icon}</div>
      {!collapsed && (
        <div className="flex-1 flex items-center justify-between overflow-hidden">
          <span className={`text-xs tracking-tight truncate ${isActive ? 'font-black uppercase' : 'font-semibold'}`}>{label}</span>
          {badge && <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">{badge}</span>}
        </div>
      )}
    </Link>
  );
};

const getSafeAuth = () => {
    try {
        return localStorage.getItem('mnf_auth') === 'true';
    } catch {
        return false;
    }
};

const getSafeRole = () => {
    try {
        return localStorage.getItem('mnf_role') || 'admin';
    } catch {
        return 'admin';
    }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<string>(getSafeRole);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isBotActive, setIsBotActive] = useState(false);
  const [waStatus, setWaStatus] = useState<string>('OFFLINE');
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [isAiAutoReply, setIsAiAutoReply] = useState(true);
  const [adminName, setAdminName] = useState(() => {
    try {
        return localStorage.getItem('mnf_admin_name') || 'Admin MNF';
    } catch {
        return 'Admin MNF';
    }
  });
  const [adminImage, setAdminImage] = useState(() => {
    try {
        return localStorage.getItem('mnf_admin_image') || '';
    } catch {
        return '';
    }
  });
  const [coLogo, setCoLogo] = useState(() => {
    try {
        return localStorage.getItem('mnf_co_logo') || '';
    } catch {
        return '';
    }
  });
  const [coName, setCoName] = useState(() => {
    try {
        return localStorage.getItem('mnf_co_name') || 'MNF HUB';
    } catch {
        return 'MNF HUB';
    }
  });
  const [sysTime, setSysTime] = useState(new Date().toLocaleTimeString());
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' | 'info' }[]>([]);

  const syncLiveSlotsToAi = async () => {
      try {
          const getAvailabilityForDate = async (dateStr: string) => {
              const bookings = await db.getAll<Booking>(TABLES.BOOKINGS);
              const dateBookings = bookings.filter(b => b.date === dateStr);
              
              const teamsRaw = localStorage.getItem('mnf_teams');
              const teams = teamsRaw ? JSON.parse(teamsRaw) : [];
              const activeTeams = teams.filter((t: any) => t.active);
              
              const slotsRaw = localStorage.getItem('mnf_time_slots');
              const slots = slotsRaw ? JSON.parse(slotsRaw) : [];
              const blockedSlots = await db.getAll<any>(TABLES.BLOCKED_SLOTS);
              const dateBlockedSlots = blockedSlots.filter((b: any) => b.date === dateStr);

              return slots.filter((s: any) => s.active).map((s: any) => {
                  const isBlocked = dateBlockedSlots.some((b: any) => b.timeSlot === s.time);
                  if (isBlocked) return { time: s.time, id: s.id, status: 'BLOCKED', label: '⛔ BLOCKED (ADMIN TUTUP)' };

                  const slotBookings = dateBookings.filter(b => b.timeSlot === s.time);
                  let availableTeamsList: any[] = [];
                  let availableAircondTeamsCount = 0;
                  
                  activeTeams.forEach((team: any) => {
                      const teamIdStr = team.id.toString();
                      const teamBookings = bookings.filter(b => (b.date === dateStr) && (b.team === teamIdStr || b.team === team.name || b.teamId?.toString() === teamIdStr));
                      const teamDailyCount = teamBookings.length;
                      const teamAircondCount = teamBookings.filter(b => b.serviceType && b.serviceType.toLowerCase().includes('pasang')).length;
                      const teamHasSlotBooking = slotBookings.some(b => b.team === teamIdStr || b.team === team.name || b.teamId?.toString() === teamIdStr);
                      
                      const isSlotAllowed = !team.slots || team.slots.length === 0 || team.slots.includes(s.id);

                      if (isSlotAllowed && teamDailyCount < (team.maxJobs || team.maxJobsPerDay || 4) && !teamHasSlotBooking) {
                          availableTeamsList.push({ name: team.name, id: team.id });
                          if (teamAircondCount < (team.maxAircondJobs || 2)) {
                               availableAircondTeamsCount++;
                          }
                      }
                  });

                  const availableTeamsCount = availableTeamsList.length;
                  if (availableTeamsCount === 0) return { time: s.time, id: s.id, status: 'FULL', label: '⛔ PENUH' };
                  
                  const teamsStr = availableTeamsList.map(t => `${t.name} [ID:${t.id}]`).join(', ');
                  const aircondStatus = availableAircondTeamsCount > 0 ? 'BOLEH' : 'PENUH';
                  
                  if (availableTeamsCount === 1) {
                      return { time: s.time, id: s.id, status: 'LIMITED', label: `⚠️ TERHAD (1 KEKOSONGAN: ${teamsStr}) | Pasang Aircond: ${aircondStatus}` };
                  }
                  return { time: s.time, id: s.id, status: 'AVAILABLE', label: `✅ KOSONG (${availableTeamsCount} TEAM: ${teamsStr}) | Pasang Aircond: ${aircondStatus}` };
              });
          };

          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          
          const todayStatus = await getAvailabilityForDate(today);
          const tomorrowStatus = await getAvailabilityForDate(tomorrow);

          const todayStr = `TARIKH HARI INI (${today}):\n${todayStatus.map((s: any) => `${s.time} [SlotID:${s.id}]: ${s.label}`).join('\n')}`;
          const tomorrowStr = `TARIKH ESOK (${tomorrow}):\n${tomorrowStatus.map((s: any) => `${s.time} [SlotID:${s.id}]: ${s.label}`).join('\n')}`;
          
          const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
          
          socket.emit('cmd-update-ai-context', {
              slotAvailability: `${todayStr}\n\n${tomorrowStr}`,
              systemTime: currentTime
          });

      } catch (e) {
          console.error("Error syncing slots:", e);
      }
  };

  const checkStatus = () => {
    setIsBotActive(localStorage.getItem('wa_connected') === 'true');
    setAdminName(localStorage.getItem('mnf_admin_name') || 'Admin MNF');
    setAdminImage(localStorage.getItem('mnf_admin_image') || '');
    setCoLogo(localStorage.getItem('mnf_co_logo') || '');
    setCoName(localStorage.getItem('mnf_co_name') || 'MNF HUB');
  };

  const fetchAdminInfo = () => {
    fetch('/api/admin')
      .then(res => res.json())
      .then(info => {
        if (info && info.name) {
          localStorage.setItem('mnf_admin_name', info.name);
          setAdminName(info.name);
          if (info.image) {
            localStorage.setItem('mnf_admin_image', info.image);
            setAdminImage(info.image);
          }
          if (info.phone) {
            localStorage.setItem('mnf_admin_phone', info.phone);
          }
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('admin-info-updated'));
        }
      })
      .catch(err => console.error('Failed to fetch admin info:', err));
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setIsAuthenticated(true);
            const isSpecial = user.email === 'mnfengineeringservices@gmail.com';
            const savedRole = localStorage.getItem('mnf_role') || (isSpecial ? 'super_admin' : 'admin');
            setRole(savedRole);
            localStorage.setItem('mnf_auth', 'true');
            
            setIsLoading(true);
            await db.init();
            await testConnection();
            setIsLoading(false);
            
            checkStatus();
            await syncLiveSlotsToAi();
            fetchAdminInfo();
        } else {
            if (localStorage.getItem('mnf_auth') === 'true') {
                 setIsAuthenticated(true);
                 setRole(localStorage.getItem('mnf_role') || 'admin');
                 await db.init();
            } else {
                 setIsAuthenticated(false);
            }
            setIsLoading(false);
        }
    });

    const handleResize = () => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 

    const interval = setInterval(() => {
        checkStatus();
        setSysTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    const aiSyncInterval = setInterval(() => {
        void syncLiveSlotsToAi();
    }, 60000);

    const handleStorageChange = () => {
        checkStatus();
        void syncLiveSlotsToAi();
    };
    
    const handleBookingUpdate = () => {
        void syncLiveSlotsToAi();
    };

    const handleStageUpdate = (stage: string) => {
        setWaStatus(stage);
        const isReady = stage === 'READY';
        localStorage.setItem('wa_connected', isReady ? 'true' : 'false');
        setIsBotActive(isReady);
        window.dispatchEvent(new Event('storage'));
    };
    
    const handleAiConfig = (status: boolean) => {
        setIsAiAutoReply(status);
    };

    const handleAdminInfo = (info: any) => {
        if (info.name !== undefined) {
            localStorage.setItem('mnf_admin_name', info.name);
            setAdminName(info.name);
        }
        if (info.image !== undefined) {
            localStorage.setItem('mnf_admin_image', info.image);
            setAdminImage(info.image);
        }
        if (info.phone !== undefined) {
            localStorage.setItem('mnf_admin_phone', info.phone);
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('admin-info-updated'));
    };

    const handleAutoBooking = async (data: any) => {
        // ... (trimmed logic for brevity but keep standard structure)
        const newBooking = { ...data, status: 'Confirmed', id: data.id || `BK-${Date.now()}` };
        const bookingsRaw = localStorage.getItem(TABLES.BOOKINGS);
        const current = bookingsRaw ? JSON.parse(bookingsRaw) : [];
        current.push(newBooking);
        localStorage.setItem(TABLES.BOOKINGS, JSON.stringify(current));
        showToast(`AI Booking: ${newBooking.customerName || 'New User'}`, 'success');
        window.dispatchEvent(new CustomEvent('booking-update'));
        window.dispatchEvent(new Event('storage'));
    };

    const onConnect = () => {
        setIsSocketConnected(true);
        socket.emit('cmd-status-check');
        void syncLiveSlotsToAi();
    };

    const onDisconnect = () => setIsSocketConnected(false);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('booking-update', handleBookingUpdate);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stage-update', handleStageUpdate);
    socket.on('ai-config-update', handleAiConfig);
    socket.on('admin-info', handleAdminInfo); 
    socket.on('ai-booking-confirmed', handleAutoBooking);

    return () => {
        unsubscribeAuth();
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('booking-update', handleBookingUpdate);
        clearInterval(interval);
        clearInterval(aiSyncInterval);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('stage-update', handleStageUpdate);
        socket.off('ai-config-update', handleAiConfig);
        socket.off('admin-info', handleAdminInfo);
        socket.off('ai-booking-confirmed', handleAutoBooking);
    };
  }, []);

  const handleLogin = () => {
      setIsAuthenticated(true);
      setRole(localStorage.getItem('mnf_role') || 'admin');
      localStorage.setItem('mnf_auth', 'true');
  };

  const handleLogout = async () => {
      try {
          await signOut(auth);
      } catch (e) {
          console.error("Logout error:", e);
      }
      setIsAuthenticated(false);
      localStorage.removeItem('mnf_auth');
      localStorage.removeItem('mnf_role');
      localStorage.removeItem('mnf_user_email');
  };

  const handleNavClick = () => {
      if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
              <RefreshCw size={48} className="animate-spin text-cyan-500 mb-6"/>
              <h2 className="text-2xl font-black uppercase tracking-widest">Connecting Neural Core...</h2>
              <p className="text-sm text-slate-400 mt-2 font-mono">Syncing Database & AI Context</p>
          </div>
      );
  }

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex h-screen bg-darker text-slate-100 font-sans overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-900 flex flex-col z-50 ${isSidebarOpen ? 'w-64' : 'w-20'} absolute md:relative h-full shadow-2xl`}>
          <div className={`h-20 flex items-center justify-between border-b border-slate-800 relative ${isSidebarOpen ? 'px-6' : 'px-2'}`}>
             <div className="flex items-center gap-3 w-full justify-center md:justify-start">
                <div className={`w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 shrink-0 overflow-hidden border border-white/10`}>
                   {coLogo ? <img src={coLogo} className="w-full h-full object-cover" alt="Logo" /> : <LayoutDashboard size={20} />}
                </div>
                {isSidebarOpen && (
                  <div className="overflow-hidden">
                    <h1 className="font-black text-base tracking-tighter text-white leading-none whitespace-nowrap uppercase">{coName}</h1>
                    <p className="text-[9px] font-bold text-secondary tracking-[0.2em] uppercase whitespace-nowrap mt-0.5">Neural Engine</p>
                  </div>
                )}
             </div>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute -right-3 top-7 bg-slate-800 text-slate-400 p-1.5 rounded-full border border-slate-700 shadow-md hover:text-white transition-all z-50">
                {isSidebarOpen ? <ChevronLeft size={14}/> : <ChevronRight size={14}/>}
             </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar space-y-1">
             <p className={`px-6 text-[9px] font-black uppercase text-slate-600 tracking-widest mb-2 mt-2 ${!isSidebarOpen && 'hidden'}`}>Utama</p>
             <SidebarLink to="/" onClick={handleNavClick} icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed={!isSidebarOpen} />
             <SidebarLink to="/inventory" onClick={handleNavClick} icon={<Store size={18} />} label="Inventori" collapsed={!isSidebarOpen} />
             <SidebarLink to="/sales" onClick={handleNavClick} icon={<ShoppingCart size={18} />} label="Sales & Service" collapsed={!isSidebarOpen} />
             <SidebarLink to="/bookings" onClick={handleNavClick} icon={<Calendar size={18} />} label="Booking & Job" collapsed={!isSidebarOpen} />
             <SidebarLink to="/invoices" onClick={handleNavClick} icon={<FileText size={18} />} label="Invois & Sebut Harga" collapsed={!isSidebarOpen} />
             <p className={`px-6 text-[9px] font-black uppercase text-slate-600 tracking-widest mb-2 mt-4 ${!isSidebarOpen && 'hidden'}`}>Database</p>
             <SidebarLink to="/customers" onClick={handleNavClick} icon={<Users size={18} />} label="Pelanggan" collapsed={!isSidebarOpen} />
             <SidebarLink to="/employees" onClick={handleNavClick} icon={<Users size={18} />} label="Pekerja" collapsed={!isSidebarOpen} />
             <SidebarLink to="/payroll" onClick={handleNavClick} icon={<Wallet size={18} />} label="Payroll" collapsed={!isSidebarOpen} />
             <SidebarLink to="/prices" onClick={handleNavClick} icon={<Tag size={18} />} label="Katalog Harga" collapsed={!isSidebarOpen} />
             <SidebarLink to="/fuel" onClick={handleNavClick} icon={<Fuel size={18} />} label="Perbelanjaan Minyak" collapsed={!isSidebarOpen} />
             <SidebarLink to="/maintenance" onClick={handleNavClick} icon={<Wrench size={18} />} label="Penyelenggaraan" collapsed={!isSidebarOpen} />
             <SidebarLink to="/debit-credit" onClick={handleNavClick} icon={<DollarSign size={18} />} label="Debit / Credit" collapsed={!isSidebarOpen} />
             <p className={`px-6 text-[9px] font-black uppercase text-slate-600 tracking-widest mb-2 mt-4 ${!isSidebarOpen && 'hidden'}`}>Komunikasi AI</p>
             <SidebarLink to="/whatsapp" onClick={handleNavClick} icon={<MessageSquare size={18} />} label="WhatsApp AI Hub" collapsed={!isSidebarOpen} />
             <SidebarLink to="/promotions" onClick={handleNavClick} icon={<Megaphone size={18} />} label="Iklan & Promosi" collapsed={!isSidebarOpen} />
             <SidebarLink to="/ai-agent" onClick={handleNavClick} icon={<Bot size={18} />} label="AI Auto Reply Agent" badge={isBotActive ? "ON" : "OFF"} collapsed={!isSidebarOpen} />
             <p className={`px-6 text-[9px] font-black uppercase text-slate-600 tracking-widest mb-2 mt-4 ${!isSidebarOpen && 'hidden'}`}>Sistem</p>
             <SidebarLink to="/settings" onClick={handleNavClick} icon={<SettingsIcon size={18} />} label="Tetapan Master" collapsed={!isSidebarOpen} />
          </div>
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
             <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 relative overflow-hidden shrink-0">
                   {adminImage ? <img src={adminImage} className="w-full h-full object-cover" alt="Admin" /> : <span>{adminName.charAt(0)}</span>}
                   <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-700 ${isSocketConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                </div>
                {isSidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate">{adminName}</p>
                        {role === 'super_admin' && <span className="bg-cyan-500 text-white text-[7px] font-black px-1 rounded uppercase tracking-tighter">Super</span>}
                      </div>
                     <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wide">
                        {isSocketConnected ? <Wifi size={8} className="text-emerald-500"/> : <WifiOff size={8} className="text-red-500"/>} 
                        {isSocketConnected ? 'ONLINE' : 'OFFLINE'}
                     </p>
                  </div>
                )}
                {isSidebarOpen && (
                  <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors p-1" title="Log Keluar">
                     <LogOut size={16} />
                  </button>
                )}
             </div>
          </div>
        </div>

        <div className="flex-1 bg-darker relative overflow-hidden flex flex-col h-full w-full">
           <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center z-40 sticky top-0 shadow-md h-12 shrink-0">
               <div className="flex items-center gap-3">
                   <div className="flex items-center gap-2">
                       <div className={`w-2.5 h-2.5 rounded-full ${waStatus === 'READY' || waStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                       <p className="text-[10px] font-black uppercase text-white tracking-widest">WhatsApp Hub {waStatus === 'READY' ? 'ONLINE' : waStatus}</p>
                   </div>
               </div>
               <div className="flex items-center gap-3">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> {sysTime}</p>
               </div>
           </div>

           <div className="flex-1 overflow-auto custom-scrollbar p-2 sm:p-4 md:p-5 lg:p-6 relative">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sales" element={<Sales showToast={showToast} />} />
                <Route path="/bookings" element={<BookingManager showToast={showToast} />} />
                <Route path="/whatsapp" element={<WhatsAppMonitor />} />
                <Route path="/promotions" element={<PromotionManager showToast={showToast} />} />
                <Route path="/ai-agent" element={<AiAgentManager showToast={showToast} />} />
                <Route path="/invoices" element={<InvoiceQuotationManager showToast={showToast} />} />
                <Route path="/customers" element={<CustomerManager showToast={showToast} />} />
                <Route path="/employees" element={<Employees showToast={showToast} />} />
                <Route path="/payroll" element={<Payroll showToast={showToast} />} />
                <Route path="/prices" element={<Catalog showToast={showToast} />} />
                <Route path="/inventory" element={<Inventory showToast={showToast} />} />
                <Route path="/maintenance" element={<Maintenance showToast={showToast} />} />
                <Route path="/fuel" element={<FuelExpenses showToast={showToast} />} />
                <Route path="/team" element={<TeamModule />} />
                <Route path="/debit-credit" element={<DebitCredit showToast={showToast} />} />
                <Route path="/settings" element={<Settings showToast={showToast} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
           </div>

            <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-800 backdrop-blur-md min-w-[280px]"
                        >
                            <p className="text-xs font-bold">{toast.msg}</p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;

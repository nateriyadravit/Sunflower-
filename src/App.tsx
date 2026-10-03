import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  FileSpreadsheet, 
  Library, 
  Package,
  GraduationCap,
  Bell,
  Settings,
  Menu,
  X,
  QrCode,
  LogIn,
  LogOut,
  MapPin,
  Copy,
  Download,
  Phone,
  Mail,
  Save,
  Star,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Toaster, toast } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { collection, addDoc, query, where, getDocs, orderBy, limit, onSnapshot, updateDoc, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firebaseErrors';

// Import components
import { DashboardView } from './components/Dashboard';
import { AdmissionsView } from './components/Admissions';
import { StudentsView } from './components/Students';
import { CalendarView } from './components/Calendar';
import { MarksheetView } from './components/Marksheet';
import { FeesView } from './components/Fees';
import { PortalView } from './components/Portal';
import { LibraryView } from './components/Library';
import { InventoryView } from './components/Inventory';
import { StaffManagement } from './components/StaffManagement';
import { QRCodeModal } from './components/QRCodeModal';

type TabType = 'dashboard' | 'students' | 'admissions' | 'calendar' | 'marks' | 'fees' | 'library' | 'inventory' | 'portal' | 'staff' | 'settings';
type UserRole = 'student' | 'teacher' | 'principal' | 'director' | null;

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sps_theme');
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('sps_user_role');
    return (saved as UserRole) || null;
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const savedRole = localStorage.getItem('sps_user_role');
    if (savedRole === 'student') return 'marks';
    if (savedRole === 'teacher') return 'students';
    return 'dashboard';
  });
  const [showStudentLogin, setShowStudentLogin] = useState(false);
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [studentName, setStudentName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedIDForQR, setSelectedIDForQR] = useState<{name: string, roll: string} | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [schoolContact, setSchoolContact] = useState({ phone: '', email: '' });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  useEffect(() => {
    const fetchSchoolContact = async () => {
      try {
        const docRef = doc(db, 'school_config', 'contact');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSchoolContact(docSnap.data() as { phone: string, email: string });
        }
      } catch (error) {
        console.error("Error fetching school contact:", error);
      }
    };
    fetchSchoolContact();
  }, []);

  useEffect(() => {
    if (!userRole) return;
    const fetchUserRating = async () => {
      const storageKey = `sps_rating_${userRole}_${localStorage.getItem('sps_student_roll') || 'staff'}`;
      const savedLocalRating = localStorage.getItem(storageKey);
      if (savedLocalRating) {
        setUserRating(parseInt(savedLocalRating));
      }
    };
    fetchUserRating();
  }, [userRole]);

  const handleRateApp = async (rating: number) => {
    setUserRating(rating);
    const storageKey = `sps_rating_${userRole}_${localStorage.getItem('sps_student_roll') || 'staff'}`;
    localStorage.setItem(storageKey, rating.toString());

    try {
      await addDoc(collection(db, 'app_ratings'), {
        userId: localStorage.getItem('sps_student_roll') || 'staff_member',
        userRole,
        rating,
        timestamp: serverTimestamp()
      });
      toast.success('Thank you for your feedback!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'app_ratings');
    }
  };

  const handleSaveContact = async () => {
    if (!['principal', 'director'].includes(userRole as string)) return;
    setIsSavingContact(true);
    try {
      await setDoc(doc(db, 'school_config', 'contact'), schoolContact);
      toast.success('School contact updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'school_config/contact');
    } finally {
      setIsSavingContact(false);
    }
  };

  useEffect(() => {
    if (!userRole) return;
    
    const q = query(
      collection(db, 'notifications'), 
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter notifications based on role
      const filtered = data.filter((n: any) => {
        if (userRole === 'student') {
          const roll = localStorage.getItem('sps_student_roll');
          return n.studentRoll === roll;
        }
        return n.roles?.includes(userRole);
      });
      
      setNotifications(filtered);
    });

    return () => unsub();
  }, [userRole]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const appUrl = window.location.origin + window.location.pathname;

  useEffect(() => {
    // If we have a saved role, ensure local session is set (Firebase auth silent remove)
    const savedRole = localStorage.getItem('sps_user_role');
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sps_theme', theme);
  }, [theme]);

  const logActivity = async (role: string, identifier: string, name: string) => {
    try {
      await addDoc(collection(db, 'login_logs'), {
        role,
        identifier,
        name,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'login_logs');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginWithCode(loginCode);
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdentifier || !studentName) {
      toast.error('Please enter both Email/Mobile and Name');
      return;
    }

    const identifier = studentIdentifier.trim();
    const lowerIdentifier = identifier.toLowerCase();

    try {
      // Find student in DB - try multiple potential identifiers
      const path = 'students';
      let snapshot = null;
      
      const searchFields = [
        { field: 'email', value: lowerIdentifier },
        { field: 'email', value: identifier },
        { field: 'studentContact', value: identifier },
        { field: 'mobile', value: identifier },
        { field: 'roll', value: identifier },
        { field: 'roll', value: lowerIdentifier }
      ];

      for (const search of searchFields) {
        if (!search.value) continue;
        const q = query(collection(db, path), where(search.field, '==', search.value));
        const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, path));
        if (snap && !snap.empty) {
          snapshot = snap;
          break;
        }
      }
      
      if (!snapshot || snapshot.empty) {
        toast.error('Student not found. Please check your Email, Mobile, or Roll No.');
        return;
      }

      const studentData = snapshot.docs[0].data();
      if (studentData.name.toLowerCase() !== studentName.trim().toLowerCase()) {
        toast.error('Name mismatch for this account');
        return;
      }

      // Success
      setUserRole('student');
      setActiveTab('marks');
      localStorage.setItem('sps_user_role', 'student');
      localStorage.setItem('sps_student_email', studentData.email || identifier);
      localStorage.setItem('sps_student_name', studentData.name);
      localStorage.setItem('sps_student_roll', studentData.roll);
      localStorage.setItem('sps_student_class', studentData.class || 'N/A');
      
      await logActivity('student', identifier, studentData.name);
      toast.success(`Welcome, ${studentData.name}`);
    } catch (error) {
      toast.error('Login failed');
    }
  };

  const loginWithCode = async (codeValue: string) => {
    const code = codeValue.toUpperCase();
    let role: UserRole = null;
    let tab: TabType = 'dashboard';

    if (code === 'DIRECTOR2026') role = 'director';
    else if (code === 'PRINCIPAL2026') role = 'principal';
    else if (code === 'TEACHER2026') { role = 'teacher'; tab = 'students'; }
    else if (code === 'STUDENT2026') { role = 'student'; tab = 'marks'; }

    if (role) {
      setUserRole(role);
      setActiveTab(tab);
      localStorage.setItem('sps_user_role', role);
      await logActivity(role, code, role.charAt(0).toUpperCase() + role.slice(1));
      toast.success(`Welcome, ${role}`);
    } else {
      toast.error('Invalid Login Code');
    }
    setLoginCode('');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['principal', 'director'] },
    { id: 'admissions', label: 'Admissions', icon: GraduationCap, roles: ['principal', 'director'] },
    { id: 'students', label: 'Students', icon: Users, roles: ['teacher', 'principal', 'director'] },
    { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ['student', 'teacher', 'principal', 'director'] },
    { id: 'marks', label: 'Exam Results', icon: FileSpreadsheet, roles: ['student', 'teacher', 'principal', 'director'] },
    { id: 'fees', label: 'Fees Mgmt', icon: CreditCard, roles: ['student', 'principal', 'director'] },
    { id: 'portal', label: 'Parent Portal', icon: MessageSquare, roles: ['student', 'teacher', 'principal', 'director'] },
    { id: 'library', label: 'Library', icon: Library, roles: ['student', 'teacher', 'principal', 'director'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['teacher', 'principal', 'director'] },
    { id: 'staff', label: 'Staff members', icon: Users, roles: ['principal', 'director'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['student', 'teacher', 'principal', 'director'] },
  ].filter(item => userRole && item.roles.includes(userRole));

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="font-bold text-sm">📲 App Kaise Install Karein?</p>
          <p className="text-xs opacity-70">1. Chrome Menu (3 dots) kholein</p>
          <p className="text-xs opacity-70">2. 'Install App' ya 'Add to Home Screen' click karein</p>
          <p className="text-xs opacity-70">Ye app automatic update hoti rahegi!</p>
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="text-[10px] bg-slate-900 text-white py-1 rounded"
          >
            Got it
          </button>
        </div>
      ), { duration: 6000 });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row h-screen overflow-hidden">
      {!userRole ? (
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -ml-48 -mb-48"></div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] w-full max-sm:max-w-xs max-w-sm shadow-2xl relative z-10"
          >
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-xl mb-4 shadow-yellow-400/20">
                <GraduationCap className="text-slate-900 w-10 h-10" />
              </div>
              <h1 className="text-white text-xl font-black uppercase text-center tracking-tight">Sunflower Public</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Academy Portal • 2026</p>
            </div>

            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/5">
              <button 
                onClick={() => setShowStudentLogin(false)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  !showStudentLogin ? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20" : "text-slate-400 hover:text-white"
                )}
              >
                Staff Access
              </button>
              <button 
                onClick={() => setShowStudentLogin(true)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  showStudentLogin ? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20" : "text-slate-400 hover:text-white"
                )}
              >
                Student Portal
              </button>
            </div>

            {!showStudentLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Staff Access Code</label>
                  <input 
                    type="password" 
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-mono focus:ring-2 focus:ring-yellow-400/50 transition-all outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black py-4 rounded-2xl transition-all shadow-lg shadow-yellow-400/20 active:scale-95"
                >
                  LOGIN AS STAFF
                </button>
              </form>
            ) : (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Email / Mobile Number</label>
                    <input 
                      type="text" 
                      value={studentIdentifier}
                      onChange={(e) => setStudentIdentifier(e.target.value)}
                      placeholder="Email or Mobile..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-medium focus:ring-2 focus:ring-yellow-400/50 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-medium focus:ring-2 focus:ring-yellow-400/50 transition-all outline-none"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black py-4 rounded-2xl transition-all shadow-lg shadow-yellow-400/20 active:scale-95"
                >
                  LOGIN AS STUDENT
                </button>
              </form>
            )}

            {(schoolContact.phone || schoolContact.email) && (
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center gap-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Help & Support</p>
                <div className="flex flex-col gap-2 w-full">
                  {schoolContact.phone && (
                    <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
                      <Phone size={12} className="text-yellow-400" />
                      {schoolContact.phone}
                    </div>
                  )}
                  {schoolContact.email && (
                    <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
                      <Mail size={12} className="text-yellow-400" />
                      {schoolContact.email}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        <>
          {/* Desktop Sidebar */}
          <motion.aside 
            initial={false}
            animate={{ width: isSidebarOpen ? 260 : 0 }}
            className={cn(
              "hidden md:flex bg-slate-900 text-white flex-shrink-0 flex-col transition-all duration-300 ease-in-out border-r border-slate-800",
              !isSidebarOpen && "md:w-0 overflow-hidden"
            )}
          >
            <div className="p-4 flex items-center justify-between h-16 border-b border-slate-800">
              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center shrink-0">
                  <GraduationCap className="text-slate-900 w-6 h-6" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-sm tracking-tight text-white uppercase italic">S.P.S.</span>
                  <span className="font-medium text-[8px] text-slate-400 uppercase tracking-widest">Bhopal</span>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 py-6 overflow-y-auto px-3 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative text-left",
                    activeTab === item.id 
                      ? "bg-yellow-400 text-slate-900 font-bold" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon size={20} className="shrink-0" />
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </nav>
          </motion.aside>

          {/* Mobile Bottom Nav */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-[60] pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-around h-16 px-2">
              {menuItems.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 min-w-0",
                    activeTab === item.id ? "text-slate-900" : "text-slate-400"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all",
                    activeTab === item.id ? "bg-yellow-400 scale-110" : "bg-transparent"
                  )}>
                    <item.icon size={18} />
                  </div>
                  <span className="text-[9px] font-bold uppercase truncate w-full text-center tracking-tighter">
                    {item.label.split(' ')[0]}
                  </span>
                </button>
              ))}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex flex-col items-center gap-1 p-2 text-slate-400 flex-1 min-w-0"
              >
                <div className="p-1.5 rounded-lg">
                  <Menu size={18} />
                </div>
                <span className="text-[9px] font-bold uppercase truncate w-full text-center tracking-tighter">Menu</span>
              </button>
            </div>
          </div>

          {/* Mobile Side Drawer Overlay */}
          <AnimatePresence>
            {isSidebarOpen && (
              <div className="md:hidden">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70]"
                  onClick={() => setIsSidebarOpen(false)}
                />
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 left-0 bottom-0 w-[280px] bg-slate-900 z-[80] shadow-2xl flex flex-col p-6"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                        <GraduationCap className="text-slate-900" />
                      </div>
                      <span className="text-white font-black italic">SUNFLOWER</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-white p-2 hover:bg-white/10 rounded-full transition-all">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as TabType);
                          setIsSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all text-left",
                          activeTab === item.id ? "bg-yellow-400 text-slate-900 font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <item.icon size={22} className={activeTab === item.id ? "text-slate-900" : "text-slate-400"} />
                        <span className="text-sm uppercase font-bold tracking-wide">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 md:h-screen h-[calc(100vh-64px)] overflow-hidden">
            <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-40">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="hidden md:block lg:hidden p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <Menu size={20} />
                </button>
                <h1 className="text-base md:text-lg font-black text-slate-900 dark:text-emerald-50 tracking-tight truncate max-w-[200px]">
                  {activeTab.replace('-', ' ')}
                </h1>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4">
                {userRole === 'student' && (
                  <button 
                    onClick={() => setSelectedIDForQR({ name: 'Student Portal User', roll: '2026-X01' })}
                    className="flex items-center gap-2 px-2 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg text-[9px] font-bold border border-yellow-100 dark:border-yellow-900/30 uppercase"
                  >
                    <QrCode size={14} /> My ID
                  </button>
                )}

                <button 
                  onClick={() => setIsQRModalOpen(true)}
                  className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-lg"
                  title="Share App"
                >
                  <QrCode size={18} />
                </button>
                
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-lg relative"
                >
                  <Bell size={18} />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setShowNotifications(false)}></div>
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-16 w-80 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl z-[101] overflow-hidden"
                      >
                        <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Notifications</h3>
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase transition-colors"
                          >
                            Close
                          </button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-10 text-center">
                              <Bell className="mx-auto text-slate-100 dark:text-slate-800 mb-2" size={32} />
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No new notifications</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                              {notifications.map((notif) => (
                                <div 
                                  key={notif.id} 
                                  onClick={() => {
                                    markNotificationAsRead(notif.id);
                                    if (notif.actionLink) {
                                      setActiveTab(notif.actionLink);
                                      setShowNotifications(false);
                                    }
                                  }}
                                  className={cn(
                                    "p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors relative",
                                    !notif.read && "bg-blue-50/30 dark:bg-blue-400/5"
                                  )}
                                >
                                  {!notif.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                                  <div className="pl-2">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{notif.title}</h4>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2">{notif.message}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">
                                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {notif.type}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/30 text-center border-t border-slate-50 dark:border-slate-800">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Sunflower Academy 2026</p>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <div className="hidden md:flex items-center gap-2 ml-2 pl-4 border-l border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs uppercase">
                    {userRole?.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-900 dark:text-slate-100 uppercase -mb-0.5">{userRole}</span>
                    <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">ACTIVE NOW</span>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 dark:bg-slate-950/20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="w-full max-w-7xl mx-auto"
                >
                  {activeTab === 'dashboard' && <DashboardView schoolContact={schoolContact} />}
                  {activeTab === 'admissions' && <AdmissionsView />}
                  {activeTab === 'students' && <StudentsView />}
                  {activeTab === 'calendar' && <CalendarView />}
                  {activeTab === 'marks' && <MarksheetView role={userRole} />}
                  {activeTab === 'fees' && <FeesView studentMode={userRole === 'student'} />}
                  {activeTab === 'portal' && <PortalView />}
                  {activeTab === 'library' && <LibraryView />}
                  {activeTab === 'inventory' && <InventoryView />}
                  {activeTab === 'staff' && <StaffManagement onBack={() => setActiveTab('dashboard')} />}
                  {activeTab === 'settings' && (
                    <div className="max-w-4xl mx-auto space-y-6 text-left pb-20 md:pb-0">
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 shadow-sm">
                        {/* Prominent Operational Status Badge */}
                        <div className="mb-6 flex items-center justify-between p-1 bg-green-500/5 dark:bg-green-500/10 rounded-[28px] border border-green-500/20">
                          <div className="flex items-center gap-3 px-6 py-3">
                            <div className="relative">
                              <div className="w-4 h-4 bg-green-500 rounded-full animate-ping absolute opacity-25" />
                              <div className="w-4 h-4 bg-green-500 rounded-full relative shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                            </div>
                            <div>
                              <h3 className="text-[11px] font-black text-green-600 dark:text-green-400 uppercase tracking-[0.3em] leading-none mb-1">System Operational</h3>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Security Protocol Active • Cloud Online</p>
                            </div>
                          </div>
                          <div className="hidden md:flex items-center gap-2 px-6 border-l border-green-500/10">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">High Availability: 99.9%</span>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-6 mb-10 pb-10 border-b border-slate-50 dark:border-slate-800">
                          <div className="w-24 h-24 bg-slate-900 dark:bg-slate-800 rounded-[32px] flex items-center justify-center text-white font-black text-4xl shadow-2xl relative group">
                            {userRole?.charAt(0).toUpperCase()}
                            <div className="absolute inset-0 bg-yellow-400 opacity-0 group-hover:opacity-10 rounded-[32px] transition-opacity" />
                          </div>
                          <div className="text-center md:text-left flex-1">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                              {userRole === 'student' ? (localStorage.getItem('sps_student_name') || 'Student User') : (userRole?.toUpperCase() + ' DASHBOARD')}
                            </h2>
                            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-[0.2em] mt-1">{userRole} Account • Session 2026</p>
                            {userRole === 'student' && (
                              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Roll Number</p>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">#{localStorage.getItem('sps_student_roll')}</p>
                                </div>
                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Class</p>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">Grade {localStorage.getItem('sps_student_class')}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-4 min-w-[280px]">
                            <button 
                               onClick={() => {
                                setUserRole(null);
                                localStorage.clear();
                                toast.success('Session cleared');
                              }}
                              className="px-12 py-8 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-3 border-4 border-white/20 dark:border-white/10"
                            >
                              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <LogOut size={28} />
                              </div>
                              Logout Account
                            </button>
                            <div className="flex flex-col gap-1.5 px-2">
                              <div className="flex items-center gap-1 justify-center md:justify-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mr-2">Rate App:</span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <button
                                      key={i}
                                      onClick={() => handleRateApp(i)}
                                      className="transition-all hover:scale-125 active:scale-95"
                                    >
                                      <Star 
                                        size={14} 
                                        className={cn(
                                          "transition-colors",
                                          userRating && i <= userRating 
                                            ? "fill-yellow-400 text-yellow-400" 
                                            : "text-slate-200 dark:text-slate-700 hover:text-yellow-200"
                                        )} 
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                              <LayoutDashboard size={14} /> Preferences
                            </h3>
                            
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-slate-400">
                                    <Bell size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">Visual Theme</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Toggle Interface Style</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    theme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900 border border-slate-200"
                                  )}
                                >
                                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                </button>
                              </div>

                              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 opacity-60">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-slate-400">
                                    <MessageSquare size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">Language</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Regional Settings</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-400">English (IN)</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                              <X size={14} /> Security & System
                            </h3>
                            
                            <div className="space-y-4">
                              <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4 mb-4">
                                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-red-500">
                                    <LogOut size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">Session Data</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Account Persistence</p>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                                  Logged in as <span className="font-bold text-slate-900 dark:text-white">{userRole}</span>. Some administrative actions require a re-audit of the login token.
                                </p>
                                <button className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-200 dark:shadow-none">
                                  End All Sessions
                                </button>
                              </div>

                              <div className="p-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl shadow-xl">
                                <div className="flex items-center gap-3 mb-2">
                                  <Package size={16} className="text-yellow-400 dark:text-blue-600" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">App Information</span>
                                </div>
                                <p className="text-[10px] font-medium opacity-60">Smart Pupil Management System v2.6.1-Bhopal</p>
                                <p className="text-[10px] font-medium opacity-60 mt-1">Last Update: May 2026 • Secure Cloud Integration</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Institutional Contact Section - Only for Principal/Director to Edit */}
                        {['principal', 'director'].includes(userRole as string) && (
                          <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                              <Phone size={14} /> Institution Contact Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Mobile Number</label>
                                <div className="relative">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Phone size={16} />
                                  </div>
                                  <input 
                                    type="text" 
                                    value={schoolContact.phone}
                                    onChange={(e) => setSchoolContact({ ...schoolContact, phone: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-900 dark:text-white focus:border-yellow-400 transition-all outline-none"
                                    placeholder="+91 XXXXX XXXXX"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Email Address</label>
                                <div className="relative">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Mail size={16} />
                                  </div>
                                  <input 
                                    type="email" 
                                    value={schoolContact.email}
                                    onChange={(e) => setSchoolContact({ ...schoolContact, email: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-900 dark:text-white focus:border-yellow-400 transition-all outline-none"
                                    placeholder="contact@school.com"
                                  />
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={handleSaveContact}
                              disabled={isSavingContact}
                              className="w-full py-4 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                            >
                              {isSavingContact ? (
                                <div className="w-5 h-5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Save size={18} />
                                  Save Institution Details
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Share Portal QR Code Section */}
                        <div className="mt-8 p-8 bg-slate-50 dark:bg-slate-800/30 rounded-[32px] border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Share2 size={80} />
                          </div>
                          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                            <div className="p-4 bg-white dark:bg-white rounded-3xl shadow-2xl shadow-slate-200 dark:shadow-none transition-transform hover:rotate-3">
                              <QRCode 
                                value={window.location.origin}
                                size={140}
                                level="H"
                                includeMargin={false}
                              />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Share Portal Access</h3>
                              <p className="text-xs text-slate-500 font-bold mb-6 max-w-sm">Scan this code with any mobile device to instantly open the Sunflower Public Academy portal. Compatible with both Desktop & Mobile.</p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin);
                                    toast.success('Link copied to clipboard');
                                  }}
                                  className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                                >
                                  <Copy size={14} />
                                  Copy Portal Link
                                </button>
                                <button 
                                  onClick={() => setShowQR(true)}
                                  className="flex-1 bg-yellow-400 text-slate-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all active:scale-95 shadow-lg shadow-yellow-400/20"
                                >
                                  <MapPin size={14} />
                                  Full Screen QR
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* View Only for Students/Teachers */}
                        {['student', 'teacher'].includes(userRole as string) && (
                          <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6">
                              <Phone size={14} /> School Contact Info
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-blue-500">
                                  <Phone size={18} />
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Call Us</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">{schoolContact.phone || 'Not Configured'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-green-500">
                                  <Mail size={18} />
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email Support</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">{schoolContact.email || 'Not Configured'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-blue-600 rounded-[32px] p-8 text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="text-center md:text-left">
                            <h3 className="text-xl font-black italic uppercase tracking-tight">Need Assistance?</h3>
                            <p className="text-sm font-medium text-blue-100 mt-1">Our administrative helpdesk is available for account recovery.</p>
                          </div>
                          <button className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                            Open Support Ticket
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </>
      )}

      <QRCodeModal 
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        value={appUrl}
        title="Sunflower School"
        description="Share this link to access the school portal."
      />
      
    {/* Full Screen QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-md"
            onClick={() => setShowQR(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 rounded-[64px] shadow-2xl relative z-10 flex flex-col items-center"
          >
            <button 
              onClick={() => setShowQR(false)}
              className="absolute top-8 right-8 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-200 transition-all"
            >
              <X size={24} />
            </button>
            <div className="mb-8 text-center text-slate-900">
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Sunflower Portal</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Scan for Instant Access</p>
            </div>
            <div className="p-4 bg-white rounded-3xl border-8 border-slate-50">
              <QRCode 
                value={window.location.origin}
                size={window.innerWidth < 768 ? 200 : 320}
                level="H"
              />
            </div>
          </motion.div>
        </div>
      )}

      {selectedIDForQR && (
        <QRCodeModal
          isOpen={!!selectedIDForQR}
          onClose={() => setSelectedIDForQR(null)}
          value={`STUDENT_ID:${selectedIDForQR.roll}`}
          title={`Digital ID: ${selectedIDForQR.name}`}
          description={`Roll No: ${selectedIDForQR.roll}`}
        />
      )}
      
      <Toaster 
        position={!userRole ? "top-center" : "bottom-right"} 
        toastOptions={{
          className: cn(
            "text-xs font-bold rounded-xl border transition-all",
            theme === 'dark' 
              ? "bg-slate-900 text-white border-slate-800 shadow-2xl" 
              : "bg-white text-slate-900 border-slate-100 shadow-xl"
          ),
          duration: 3000,
        }}
      />
      <AnimatePresence>
        {activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-24 right-6 z-50 md:bottom-8"
          >
            <button 
              onClick={handleInstallClick}
              className="w-12 h-12 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
            >
              <Download size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

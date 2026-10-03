import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Plus, 
  CreditCard, 
  ChevronRight, 
  Download, 
  CheckCircle2, 
  X, 
  Wallet, 
  ShieldCheck, 
  ArrowRight, 
  QrCode,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers,
  AlertCircle,
  Sparkles,
  Percent,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { doc, onSnapshot, updateDoc, setDoc, query, collection, orderBy, addDoc, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

interface FeesProps {
  studentMode?: boolean;
}

interface GatewayProps {
  showGateway: boolean;
  setShowGateway: (val: boolean) => void;
  paymentStep: 'method' | 'processing' | 'success';
  setPaymentStep: (val: any) => void;
  selectedMethod: 'upi' | 'card' | 'nb' | null;
  setSelectedMethod: (val: any) => void;
  studentBalance: string;
  schoolUPI: string;
  processPayment: () => Promise<void>;
}

const formatCurrency = (val: number) => {
  return '₹' + Math.round(val).toLocaleString('en-IN');
};

const formatShortCurrency = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
  return `₹${val}`;
};

// Recharts Custom Tooltip for Class Fee Comparison
const ClassFeeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    const collected = data?.collected ?? 0;
    const pending = data?.pending ?? 0;
    const total = data?.total ?? (collected + pending);
    const rate = data?.rate ?? (total > 0 ? Math.round((collected / total) * 100) : 0);

    return (
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[220px] text-left z-50">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
          <p className="font-black text-slate-900 dark:text-white text-sm">{label}</p>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            {rate}% Collected
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block shadow-xs"></span>
              Collected Fees:
            </span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(collected)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block shadow-xs"></span>
              Pending Dues:
            </span>
            <span className="font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(pending)}
            </span>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 flex items-center justify-between font-bold">
            <span className="text-slate-400">Total Class Billing:</span>
            <span className="text-slate-900 dark:text-white">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Recharts Custom Tooltip for Collection Rate
const RateTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[180px] text-left z-50">
        <p className="font-black text-slate-900 dark:text-white mb-1.5">{label}</p>
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
          <span className="text-slate-500 dark:text-slate-400">Recovery Rate:</span>
          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{data?.rate}%</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span>Pending Balance:</span>
          <span className="font-bold text-rose-500">{formatCurrency(data?.pending || 0)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const PaymentGateway = ({ 
  showGateway, 
  setShowGateway, 
  paymentStep, 
  setPaymentStep, 
  selectedMethod, 
  setSelectedMethod, 
  studentBalance, 
  schoolUPI,
  processPayment 
}: GatewayProps) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
    >
      <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center">
        <div>
          <h3 className="font-black italic text-lg uppercase tracking-tight text-left">Payment Gateway</h3>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-left">Secure Checkout</p>
        </div>
        <button onClick={() => setShowGateway(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-8">
        {paymentStep === 'method' && (
          <div className="space-y-6">
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Amount to Pay</p>
              <h4 className="text-4xl font-black italic text-slate-900 dark:text-white">₹{studentBalance}</h4>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1 text-left">Select Method</p>
              
              {selectedMethod === 'upi' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border-2 border-yellow-400 flex flex-col items-center"
                >
                  <div className="bg-white p-4 rounded-2xl mb-4 shadow-sm">
                    <QRCodeSVG 
                      value={`upi://pay?pa=${schoolUPI || 'school.fees@vpa'}&pn=SchoolFees&am=${studentBalance.replace(/,/g, '')}&cu=INR`} 
                      size={180}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Scan & Pay securely via any UPI App</p>
                  <button 
                    onClick={() => setSelectedMethod(null)}
                    className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase"
                  >
                    Change Method
                  </button>
                </motion.div>
              ) : (
                <>
                  <button 
                    onClick={() => setSelectedMethod('upi')}
                    className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Wallet size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 dark:text-white">UPI Payment</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">PhonePe, GPay, Paytm</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setSelectedMethod('card')}
                    className={cn(
                      "w-full p-4 rounded-2xl border flex items-center justify-between transition-all group",
                      selectedMethod === 'card' ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-400/5" : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CreditCard size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 dark:text-white">Card Payment</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Visa, Mastery, Rupay</p>
                      </div>
                    </div>
                    {selectedMethod === 'card' && <CheckCircle2 className="text-yellow-500" size={20} />}
                  </button>
                </>
              )}
            </div>

            <button 
              onClick={processPayment}
              disabled={!selectedMethod}
              className="w-full py-4 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 group transition-all"
            >
              PROCEED TO PAY
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
              <ShieldCheck size={14} />
              <span className="text-[9px] font-bold uppercase tracking-widest">PCI-DSS Compliant • 256-bit SSL</span>
            </div>
          </div>
        )}

        {paymentStep === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 border-4 border-slate-100 dark:border-slate-800 border-t-yellow-400 rounded-full animate-spin"></div>
            <div>
              <h4 className="font-black italic text-xl uppercase tracking-widest dark:text-white">Processing...</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Communicating with your bank securely.</p>
            </div>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 bg-green-100 dark:bg-green-900/20 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <div>
              <h4 className="font-black italic text-2xl uppercase text-slate-900 dark:text-white">Paid Successfully!</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Your term 2 fees have been updated.</p>
            </div>
            <button 
              onClick={() => {
                setShowGateway(false);
                setPaymentStep('method');
                setSelectedMethod(null);
              }}
              className="w-full py-4 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black rounded-2xl"
            >
              CLOSE & VIEW RECEIPT
            </button>
          </div>
        )}
      </div>
    </motion.div>
  </div>
);

export function FeesView({ studentMode }: FeesProps) {
  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const canEdit = userRole === 'director';
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCollection: '24,52,400', schoolUPI: 'school.fees@vpa' });
  const [studentBalance, setStudentBalance] = useState('4,500');
  const [activeAdminTab, setActiveAdminTab] = useState<'transactions' | 'dues'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [feeChartMode, setFeeChartMode] = useState<'grouped' | 'stacked' | 'rate'>('grouped');
  
  // Payment Gateway States
  const [showGateway, setShowGateway] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing' | 'success'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'nb' | null>(null);

  const studentRoll = localStorage.getItem('sps_student_roll') || '101';
  const studentName = localStorage.getItem('sps_student_name') || 'Student';
  const studentClass = localStorage.getItem('sps_student_class') || '10';
  const studentEmail = localStorage.getItem('sps_student_email') || '';

  const [studentTransactions, setStudentTransactions] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'fees'), (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as any);
      } else {
        setDoc(doc(db, 'settings', 'fees'), { totalCollection: '24,52,400', schoolUPI: 'school.fees@vpa' });
      }
    });

    // Make balance student-specific
    const unsubBalance = onSnapshot(doc(db, 'settings', `balance_${studentRoll}`), (docSnap) => {
      if (docSnap.exists()) {
        setStudentBalance(docSnap.data()?.balance || '4,500');
      } else {
        const initialBalance = (parseInt(studentRoll) % 2 === 0) ? '4,500' : '0';
        setDoc(doc(db, 'settings', `balance_${studentRoll}`), { balance: initialBalance });
        setStudentBalance(initialBalance);
      }
    });

    // Fetch transactions
    let unsubT: () => void;
    if (studentMode) {
      const q = query(
        collection(db, 'transactions'), 
        where('roll', '==', studentRoll),
        orderBy('timestamp', 'desc')
      );
      unsubT = onSnapshot(q, (snapshot) => {
        setStudentTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    } else {
      const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
      unsubT = onSnapshot(q, (snapshot) => {
        const txs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTransactions(txs);
      });
    }

    const unsubDues = onSnapshot(collection(db, 'students'), (snapshot) => {
      const allStudents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      const duesList = allStudents.map(s => ({
        ...s,
        dueAmount: s.roll.length % 2 === 0 ? '4,500' : '0',
        lastReminder: '2 days ago'
      })).filter(s => s.dueAmount !== '0');
      
      setDues(duesList);
      setLoading(false);
    });

    return () => {
      unsub();
      unsubBalance();
      if (unsubT) unsubT();
      unsubDues();
    };
  }, [studentMode, studentRoll]);

  // Dynamic class-wise fees calculation using real transactions & dues merged with baselines
  const classFeeData = useMemo(() => {
    const baseData: Record<string, { className: string; shortClass: string; collected: number; pending: number; count: number }> = {
      'Class 1': { className: 'Class 1', shortClass: 'Cl 1', collected: 210000, pending: 45000, count: 28 },
      'Class 2': { className: 'Class 2', shortClass: 'Cl 2', collected: 235000, pending: 38000, count: 30 },
      'Class 3': { className: 'Class 3', shortClass: 'Cl 3', collected: 195000, pending: 52000, count: 26 },
      'Class 4': { className: 'Class 4', shortClass: 'Cl 4', collected: 250000, pending: 40000, count: 32 },
      'Class 5': { className: 'Class 5', shortClass: 'Cl 5', collected: 280000, pending: 65000, count: 35 },
      'Class 6': { className: 'Class 6', shortClass: 'Cl 6', collected: 240000, pending: 72000, count: 34 },
      'Class 7': { className: 'Class 7', shortClass: 'Cl 7', collected: 265000, pending: 58000, count: 33 },
      'Class 8': { className: 'Class 8', shortClass: 'Cl 8', collected: 310000, pending: 48000, count: 36 },
      'Class 9': { className: 'Class 9', shortClass: 'Cl 9', collected: 290000, pending: 85000, count: 38 },
      'Class 10': { className: 'Class 10', shortClass: 'Cl 10', collected: 345000, pending: 95000, count: 42 }
    };

    // Fold in real transactions
    transactions.forEach(tx => {
      const raw = (tx.class || '').toString();
      const num = raw.replace(/[^0-9]/g, '');
      const key = num ? `Class ${num}` : 'Class 10';
      const amountNum = parseInt((tx.amount || '0').replace(/[^0-9]/g, '')) || 0;
      if (baseData[key] && amountNum > 0) {
        baseData[key].collected += amountNum;
      }
    });

    // Fold in real dues
    dues.forEach(d => {
      const raw = (d.class || '').toString();
      const num = raw.replace(/[^0-9]/g, '');
      const key = num ? `Class ${num}` : 'Class 10';
      const dueNum = parseInt((d.dueAmount || '0').replace(/[^0-9]/g, '')) || 0;
      if (baseData[key] && dueNum > 0) {
        baseData[key].pending += dueNum;
      }
    });

    return Object.values(baseData).map(item => {
      const total = item.collected + item.pending;
      const rate = total > 0 ? Math.round((item.collected / total) * 100) : 0;
      return {
        ...item,
        total,
        rate
      };
    });
  }, [transactions, dues]);

  // Aggregate totals
  const totalCollected = useMemo(() => {
    return classFeeData.reduce((sum, c) => sum + c.collected, 0);
  }, [classFeeData]);

  const totalPending = useMemo(() => {
    return classFeeData.reduce((sum, c) => sum + c.pending, 0);
  }, [classFeeData]);

  const totalBilled = totalCollected + totalPending;
  const overallRecoveryRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const highestPendingClass = useMemo(() => {
    return [...classFeeData].sort((a, b) => b.pending - a.pending)[0] || classFeeData[0];
  }, [classFeeData]);

  const bestRecoveryClass = useMemo(() => {
    return [...classFeeData].sort((a, b) => b.rate - a.rate)[0] || classFeeData[0];
  }, [classFeeData]);

  const handleUpdateStats = async (key: string, val: string) => {
    try {
      await updateDoc(doc(db, 'settings', 'fees'), {
        [key]: val
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const processPayment = async () => {
    if (!selectedMethod) return;
    setPaymentStep('processing');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await addDoc(collection(db, 'transactions'), {
        student: studentName,
        class: studentClass,
        roll: studentRoll,
        email: studentEmail,
        amount: studentBalance,
        method: selectedMethod.toUpperCase(),
        timestamp: Timestamp.now(),
        date: 'Just now'
      });
      
      await updateDoc(doc(db, 'settings', `balance_${studentRoll}`), {
        balance: '0'
      });
      
      setPaymentStep('success');
      toast.success('Payment Successful!');
    } catch (error) {
      toast.error('Payment failed. Please try again.');
      setPaymentStep('method');
    }
  };

  if (studentMode) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {showGateway && (
          <PaymentGateway 
            showGateway={showGateway}
            setShowGateway={setShowGateway}
            paymentStep={paymentStep}
            setPaymentStep={setPaymentStep}
            selectedMethod={selectedMethod}
            setSelectedMethod={setSelectedMethod}
            studentBalance={studentBalance}
            schoolUPI={stats.schoolUPI}
            processPayment={processPayment}
          />
        )}
        
        <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-3xl text-white relative overflow-hidden shadow-2xl border border-white/5 dark:border-slate-800">
          <div className="relative z-10 flex justify-between items-start">
            <div className="text-left">
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Current Balance Due</p>
              <div className="flex items-center gap-2">
                <h2 className="text-4xl font-black italic">₹{studentBalance}</h2>
                {canEdit && (
                  <button 
                    onClick={() => {
                      const newBal = window.prompt('Update Demo Balance:', studentBalance);
                      if (newBal) {
                        setDoc(doc(db, 'settings', 'student_demo_balance'), { balance: newBal });
                        toast.success('Balance updated for all users');
                      }
                    }}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"
                  >
                    Edit
                  </button>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">Roll No: #SV-2026-{studentRoll} • {studentClass} Fees</p>
            </div>
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-400/20">
              <CreditCard size={24} />
            </div>
          </div>
          
          <div className="mt-8 relative z-10 flex gap-3">
            <button 
              disabled={studentBalance === '0'}
              onClick={() => setShowGateway(true)}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:grayscale"
            >
              {studentBalance === '0' ? 'ALREADY PAID' : 'PAY NOW'}
            </button>
            <button 
              onClick={() => {
                setSelectedMethod('upi');
                setShowGateway(true);
              }}
              className="px-4 bg-slate-800 dark:bg-slate-950 text-white rounded-xl border border-slate-700 dark:border-slate-800 hover:bg-slate-700 dark:hover:border-slate-900 transition-all flex items-center justify-center gap-2 group"
              title="Show Payment QR"
            >
              <QrCode size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">QR Code</span>
            </button>
            <button 
              onClick={() => toast.success('Downloading Fee Receipt...')}
              className="px-4 bg-slate-800 dark:bg-slate-900 text-white rounded-xl border border-slate-700 dark:border-slate-800 hover:bg-slate-700 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
              title="Download Last Receipt"
            >
              <Download size={18} />
            </button>
          </div>
          
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16 blur-2xl"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Scholarship</p>
            <h4 className="text-xl font-black italic text-slate-900 dark:text-white">15% OFF</h4>
            <p className="text-[10px] text-green-500 font-bold uppercase mt-1">Academic Merit</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Next Due Date</p>
            <h4 className="text-xl font-black italic text-slate-900 dark:text-white">MAY 15</h4>
            <p className="text-[10px] text-red-500 font-bold uppercase mt-1">14 Days Left</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden text-left">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Fee Breakdown</h4>
            <span className="text-[10px] font-bold text-slate-400">TERM 2</span>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Tuition Fee', amount: '3,200' },
              { label: 'Transport Fee', amount: '800' },
              { label: 'Library & Labs', amount: '500' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">₹{item.amount}</span>
              </div>
            ))}
            <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <span className="text-sm font-black text-slate-900 dark:text-white italic uppercase">Total Payable</span>
              <span className="text-lg font-black text-slate-900 dark:text-white italic">₹4,500</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden text-left">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Recent Activity</h4>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {studentTransactions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No payment history found</div>
            ) : (
              studentTransactions.map((tx, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="text-left">
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm">Fee Payment</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                        {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleDateString() : tx.date} • {tx.method}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-black text-slate-900 dark:text-white italic">₹{tx.amount}</p>
                    <p className="text-[10px] text-green-500 dark:text-green-400 font-bold uppercase tracking-widest">SUCCESS</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredTransactions = transactions.filter(tx => {
    const searchLow = searchTerm.toLowerCase();
    const matchesSearch = tx.student.toLowerCase().includes(searchLow) || 
                         tx.class.toLowerCase().includes(searchLow) ||
                         (tx.email && tx.email.toLowerCase().includes(searchLow)) ||
                         (tx.roll && tx.roll.toString().includes(searchLow));
    const matchesMethod = methodFilter === 'all' || tx.method.toLowerCase().includes(methodFilter.toLowerCase());
    const matchesClass = classFilter === 'all' || tx.class.includes(classFilter);
    return matchesSearch && matchesMethod && matchesClass;
  });

  const filteredDues = dues.filter(due => {
    const searchLow = searchTerm.toLowerCase();
    const matchesSearch = due.name.toLowerCase().includes(searchLow) || 
           due.class.toLowerCase().includes(searchLow) ||
           (due.email && due.email.toLowerCase().includes(searchLow)) ||
           due.roll.toString().includes(searchLow);
    const matchesClass = classFilter === 'all' || due.class.includes(classFilter);
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-8">
      {/* 4 Summary Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {/* Card 1: Total Fees Collected */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-900/10 dark:shadow-none border border-white/5 dark:border-slate-800 flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Total Fees Collected
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center gap-1">
                  <TrendingUp size={11} /> +14.2%
                </span>
                {canEdit && (
                  <button 
                    onClick={() => {
                      if (isEditing) toast.success('Fees setting saved');
                      setIsEditing(!isEditing);
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase transition-all",
                      isEditing ? "bg-green-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {isEditing ? 'Done' : 'Edit'}
                  </button>
                )}
              </div>
            </div>

            <div className="my-2">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold text-slate-400">₹</span>
                    <input 
                      type="text" 
                      defaultValue={stats.totalCollection} 
                      onBlur={(e) => handleUpdateStats('totalCollection', e.target.value)}
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xl font-black text-white w-full outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="School UPI: school@vpa"
                    defaultValue={stats.schoolUPI} 
                    onBlur={(e) => handleUpdateStats('schoolUPI', e.target.value)}
                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-[11px] text-white w-full outline-none"
                  />
                </div>
              ) : (
                <h3 className="text-3xl font-black italic tracking-tight text-white">
                  {formatCurrency(totalCollected)}
                </h3>
              )}
            </div>

            <div className="mt-3 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${overallRecoveryRate}%` }}
                className="h-full bg-emerald-400"
              />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              {overallRecoveryRate}% of {formatCurrency(totalBilled)} Target
            </p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        {/* Card 2: Total Pending Fees */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Total Pending Fees
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-black flex items-center gap-1">
                <AlertCircle size={11} /> Due
              </span>
            </div>
            <h3 className="text-3xl font-black italic tracking-tight text-rose-600 dark:text-rose-400 my-2">
              {formatCurrency(totalPending)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Outstanding across all <span className="font-bold text-slate-800 dark:text-slate-200">{dues.length} registered accounts</span>.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Uncollected Ratio:</span>
            <span className="font-black text-rose-600 dark:text-rose-400">{100 - overallRecoveryRate}%</span>
          </div>
        </div>

        {/* Card 3: Collection Efficiency Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Recovery Rate
              </span>
              <span className="p-1.5 rounded-xl bg-yellow-400/20 text-yellow-600 dark:text-yellow-400">
                <Percent size={14} />
              </span>
            </div>
            <h3 className="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white my-2">
              {overallRecoveryRate}%
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Top recovery in <span className="font-bold text-slate-900 dark:text-white">{bestRecoveryClass.className}</span> ({bestRecoveryClass.rate}% paid).
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Benchmark Status:</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">On Track (&gt;80%)</span>
          </div>
        </div>

        {/* Card 4: Class with Highest Pending */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Highest Dues Class
              </span>
              <span className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <Bell size={14} />
              </span>
            </div>
            <h3 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white my-2">
              {highestPendingClass.className}
            </h3>
            <p className="text-xs text-rose-500 font-bold">
              {formatCurrency(highestPendingClass.pending)} pending balance
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button 
              onClick={() => {
                setClassFilter(highestPendingClass.className.replace('Class ', ''));
                setActiveAdminTab('dues');
                toast.success(`Filtered dues for ${highestPendingClass.className}`);
              }}
              className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-yellow-400 hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors text-slate-700 dark:text-slate-300"
            >
              View Class Dues &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Visualization Card: Total Pending vs Collected Fees Per Class */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-sm text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-xl">
                <BarChart3 size={18} />
              </span>
              <h3 className="font-black text-slate-900 dark:text-white text-base md:text-lg tracking-tight">
                Class-Wise Fee Collection vs. Pending Dues
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Comparing collected fees against outstanding dues for each academic class (Class 1 to Class 10).
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setFeeChartMode('grouped')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                feeChartMode === 'grouped'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <BarChart3 size={14} /> Side-by-Side
            </button>
            <button
              onClick={() => setFeeChartMode('stacked')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                feeChartMode === 'stacked'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Layers size={14} /> Stacked
            </button>
            <button
              onClick={() => setFeeChartMode('rate')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                feeChartMode === 'rate'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Percent size={14} /> Recovery %
            </button>
          </div>
        </div>

        {/* Legend and Active Highlights */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span> Collected Fees (₹)
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block"></span> Pending Fees (₹)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <span>Overall Collection:</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCollected)}</span>
            <span>•</span>
            <span>Total Pending:</span>
            <span className="font-black text-rose-600 dark:text-rose-400">{formatCurrency(totalPending)}</span>
          </div>
        </div>

        {/* Chart View */}
        <div className="w-full h-[320px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {feeChartMode === 'rate' ? (
              <LineChart data={classFeeData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" opacity={0.6} />
                <XAxis 
                  dataKey="shortClass" 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                  axisLine={{ stroke: '#cbd5e1' }} 
                  tickLine={false} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  unit="%" 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#cbd5e1' }} 
                  tickLine={false} 
                />
                <Tooltip content={<RateTooltip />} />
                <ReferenceLine y={80} stroke="#ca8a04" strokeDasharray="4 4" label={{ value: '80% Benchmark', fill: '#ca8a04', fontSize: 10, position: 'top' }} />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  name="Recovery Rate %" 
                  stroke="#10b981" 
                  strokeWidth={3.5}
                  dot={{ r: 5, strokeWidth: 2, fill: '#d1fae5', stroke: '#059669' }}
                  activeDot={{ r: 8, strokeWidth: 3, fill: '#10b981', stroke: '#ffffff' }}
                />
              </LineChart>
            ) : (
              <BarChart 
                data={classFeeData} 
                margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                barGap={feeChartMode === 'grouped' ? 6 : 0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" opacity={0.6} />
                <XAxis 
                  dataKey="shortClass" 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                  axisLine={{ stroke: '#cbd5e1' }} 
                  tickLine={false} 
                />
                <YAxis 
                  tickFormatter={formatShortCurrency} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={{ stroke: '#cbd5e1' }} 
                  tickLine={false} 
                />
                <Tooltip content={<ClassFeeTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                <Bar 
                  dataKey="collected" 
                  name="Collected Fees" 
                  stackId={feeChartMode === 'stacked' ? 'feeStack' : undefined} 
                  fill="#10b981" 
                  radius={feeChartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]} 
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="pending" 
                  name="Pending Fees" 
                  stackId={feeChartMode === 'stacked' ? 'feeStack' : undefined} 
                  fill="#ef4444" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={40}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Quick Click-to-Filter Class Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter size={12} /> Click a class to filter transactions & dues below:
            </span>
            {classFilter !== 'all' && (
              <button
                onClick={() => setClassFilter('all')}
                className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 hover:underline"
              >
                Clear filter (Showing all)
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {classFeeData.map((item) => {
              const classNum = item.className.replace('Class ', '');
              const isSelected = classFilter === classNum;
              return (
                <button
                  key={item.className}
                  onClick={() => setClassFilter(isSelected ? 'all' : classNum)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                    isSelected 
                      ? "bg-slate-900 text-white dark:bg-yellow-400 dark:text-slate-900 border-slate-900 dark:border-yellow-400 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{item.className}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-mono",
                    item.pending > 60000 
                      ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                      : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                  )}>
                    {formatShortCurrency(item.pending)} due
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Transactions & Outstanding Dues Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden text-left">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveAdminTab('transactions')}
              className={cn(
                "font-black uppercase text-[10px] tracking-widest transition-all relative pb-2",
                activeAdminTab === 'transactions' ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              )}
            >
              Recent Transactions ({filteredTransactions.length})
              {activeAdminTab === 'transactions' && <motion.div layoutId="feeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400" />}
            </button>
            <button 
              onClick={() => setActiveAdminTab('dues')}
              className={cn(
                "font-black uppercase text-[10px] tracking-widest transition-all relative pb-2",
                activeAdminTab === 'dues' ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              )}
            >
              Outstanding Dues ({filteredDues.length})
              {activeAdminTab === 'dues' && <motion.div layoutId="feeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400" />}
            </button>
          </div>
          
          <div className="flex flex-1 md:max-w-md gap-2">
            <div className="relative flex-1">
              <input 
                type="text"
                placeholder={`Search ${activeAdminTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400/20 transition-all dark:text-white"
              />
            </div>
            {activeAdminTab === 'transactions' && (
              <select 
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold uppercase py-2 px-3 outline-none focus:ring-2 focus:ring-yellow-400/20 dark:text-white"
              >
                <option value="all">All Methods</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank</option>
                <option value="Cash">Cash</option>
                <option value="CARD">Card</option>
              </select>
            )}
            <select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold uppercase py-2 px-3 outline-none focus:ring-2 focus:ring-yellow-400/20 dark:text-white"
            >
              <option value="all">All Classes</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                <option key={c} value={c.toString()}>Class {c}</option>
              ))}
            </select>
            <button 
              onClick={() => toast.success('Payment recorded manually')}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800"
              title="Add Manual Payment"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800 min-h-[400px]">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="px-8 py-6 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
                  <div className="space-y-2 text-left">
                    <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-40 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded ml-auto"></div>
                  <div className="h-3 w-16 bg-slate-50 dark:bg-slate-800/50 rounded ml-auto"></div>
                </div>
              </div>
            ))
          ) : activeAdminTab === 'transactions' ? (
            filteredTransactions.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredTransactions.map((tx, i) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    key={tx.id || i} 
                    className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-yellow-400 group-hover:text-slate-900 transition-all font-black text-xs border border-white/5 dark:border-slate-700">
                        {tx.student.split(' ').map((n: any) => n[0]).join('')}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white">{tx.student}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-none">Class {tx.class} • {tx.method}</p>
                          {tx.email && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium lowercase tracking-tight leading-none">{tx.email}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="font-mono font-black text-slate-900 dark:text-white italic text-lg">₹{tx.amount}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{tx.date}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.success(`Exporting receipt for ${tx.student}`);
                        }}
                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-yellow-400 transition-colors"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                <p className="font-bold uppercase tracking-widest text-xs">No transactions match your criteria</p>
              </div>
            )
          ) : (
            filteredDues.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredDues.map((due, i) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={due.id || i} 
                    className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center font-black text-xs">
                        {due.name.split(' ').map((n: any) => n[0]).join('')}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white">{due.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-none">Roll {due.roll} • Class {due.class}</p>
                          {due.email && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium lowercase tracking-tight leading-none">{due.email}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-mono font-black text-red-600 dark:text-red-400 italic text-lg">₹{due.dueAmount}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Reminder: {due.lastReminder}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.success(`Payment Reminder sent to ${due.name}`);
                        }}
                        className="p-3.5 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all shadow-md shadow-slate-200 dark:shadow-none"
                        title="Send SMS/WhatsApp Reminder"
                      >
                        <Bell size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                <CheckCircle2 size={48} className="text-slate-100 dark:text-slate-800 mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs dark:text-slate-500">All Dues Cleared for this Section!</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

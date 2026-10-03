import React, { useState, useEffect } from 'react';
import { Bell, Plus, CreditCard, ChevronRight, Download, CheckCircle2, X, Wallet, ShieldCheck, ArrowRight, QrCode } from 'lucide-react';
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
    let unsubT;
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
      unsubT();
      unsubDues();
    };
  }, []);

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
            
            {studentTransactions.length === 0 && (
              <>
                <div className="p-6 flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="text-left">
                      <h5 className="font-bold text-slate-500 text-sm">Example Record</h5>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Jan 15, 2026 • BANK</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-black text-slate-500 italic">₹12,000</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PAID</p>
                  </div>
                </div>
              </>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-900/10 dark:shadow-none col-span-1 md:col-span-2 text-left border border-white/5 dark:border-slate-800">
          <div className="relative z-10 text-left h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  {classFilter === 'all' ? 'Total Collection This Month' : `Total for Section ${classFilter}`}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md text-[10px] font-bold">+12.5%</div>
                  {canEdit && (
                    <button 
                      onClick={() => {
                        if (isEditing) toast.success('Fees updated successfully');
                        setIsEditing(!isEditing);
                      }}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all",
                        isEditing ? "bg-green-500 text-white" : "bg-white/10 dark:bg-white/5 text-white hover:bg-white/20 dark:hover:bg-white/10"
                      )}
                    >
                      {isEditing ? 'Save' : 'Modify'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-500 dark:text-slate-400 text-2xl font-bold">₹</span>
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 text-2xl font-bold">₹</span>
                      <input 
                        type="text" 
                        defaultValue={stats.totalCollection} 
                        onBlur={(e) => handleUpdateStats('totalCollection', e.target.value)}
                        className="bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded px-2 w-48 text-3xl font-black italic outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Set School UPI ID</label>
                      <input 
                        type="text" 
                        placeholder="e.g. school@vpa"
                        defaultValue={stats.schoolUPI} 
                        onBlur={(e) => handleUpdateStats('schoolUPI', e.target.value)}
                        className="bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded px-2 py-1 w-64 text-sm font-bold outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                ) : (
                  <h2 className="text-4xl font-black italic">
                    {classFilter === 'all' 
                      ? stats.totalCollection 
                      : filteredTransactions.reduce((acc, tx) => acc + parseInt(tx.amount.replace(/,/g, '') || '0'), 0).toLocaleString()}
                  </h2>
                )}
              </div>
              <div className="mt-4 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  className="h-full bg-yellow-400"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Target: ₹32,00,000 (75%)</p>
            </div>
            
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => toast.success('Report generation started...')}
                className="px-6 py-2 bg-yellow-400 text-slate-900 font-black rounded-xl text-xs hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-400/10 uppercase tracking-widest"
              >
                Download Report
              </button>
              <button 
                onClick={() => toast.success('Payment reminders sent to 124 parents')}
                className="px-6 py-2 bg-slate-800 dark:bg-slate-900 text-white font-black rounded-xl text-xs hover:bg-slate-700 dark:hover:bg-slate-800 transition-all border border-slate-700 dark:border-slate-800 uppercase tracking-widest"
              >
                Reminders
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <Bell className={cn(dues.length > 0 && "animate-bounce")} size={32} />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-widest">Pending Dues</h4>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 italic">{dues.length}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-tighter">Outstanding Accounts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
            <CreditCard size={32} />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-widest">Daily Average</h4>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 italic">₹81k</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-tighter">+4% from last week</p>
        </div>
      </div>

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
              Recent Transactions
              {activeAdminTab === 'transactions' && <motion.div layoutId="feeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400" />}
            </button>
            <button 
              onClick={() => setActiveAdminTab('dues')}
              className={cn(
                "font-black uppercase text-[10px] tracking-widest transition-all relative pb-2",
                activeAdminTab === 'dues' ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              )}
            >
              Outstanding Dues
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
              </select>
            )}
            <select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold uppercase py-2 px-3 outline-none focus:ring-2 focus:ring-yellow-400/20 dark:text-white"
            >
              <option value="all">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
            <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800"><Plus size={18} /></button>
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
                    transition={{ delay: i * 0.05 }}
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
                      <button className="p-2 text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-yellow-400 transition-colors">
                        <Download size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                <p className="font-bold uppercase tracking-widest text-xs">No transactions found</p>
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
                            toast.success(`Reminder sent to ${due.name}`);
                          }}
                          className="p-4 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                          title="Send SMS Reminder"
                        >
                          <Bell size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                }
              </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                  <CheckCircle2 size={48} className="text-slate-100 dark:text-slate-800 mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs dark:text-slate-500">All Dues Cleared!</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
}

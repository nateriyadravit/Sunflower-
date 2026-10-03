import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Bell, CreditCard, ChevronRight, CheckCircle2, Wallet, X, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

interface Message {
  id?: string;
  text: string;
  role: string;
  timestamp: string;
}

export function PortalView() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [studentBalance, setStudentBalance] = useState('0');
  const [schoolUPI, setSchoolUPI] = useState('school.fees@vpa');
  const [showQR, setShowQR] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const studentRoll = localStorage.getItem('sps_student_roll');
  const studentName = localStorage.getItem('sps_student_name') || 'Student';
  const studentClass = localStorage.getItem('sps_student_class') || 'N/A';
  const studentEmail = localStorage.getItem('sps_student_email') || '';

  useEffect(() => {
    const q = query(collection(db, 'portal_messages'), orderBy('timestamp', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs.reverse());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userRole === 'student' && studentRoll) {
      const unsubBalance = onSnapshot(doc(db, 'settings', `balance_${studentRoll}`), (docSnap) => {
        if (docSnap.exists()) {
          setStudentBalance(docSnap.data()?.balance || '0');
        }
      });
      
      const unsubSettings = onSnapshot(doc(db, 'settings', 'fees'), (docSnap) => {
        if (docSnap.exists()) {
          setSchoolUPI(docSnap.data()?.schoolUPI || 'school.fees@vpa');
        }
      });

      return () => {
        unsubBalance();
        unsubSettings();
      };
    }
  }, [userRole, studentRoll]);

  const canSendMessages = ['director', 'principal', 'teacher'].includes(userRole);

  const handleSend = async () => {
    if (!message.trim() || !canSendMessages) return;
    try {
      await addDoc(collection(db, 'portal_messages'), {
        text: message,
        role: userRole,
        timestamp: new Date().toISOString()
      });
      setMessage('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const processPayment = async () => {
    if (!studentRoll) return;
    setIsPaying(true);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await addDoc(collection(db, 'transactions'), {
        student: studentName,
        class: studentClass,
        roll: studentRoll,
        email: studentEmail,
        amount: studentBalance,
        method: 'UPI-PORTAL',
        timestamp: Timestamp.now(),
        status: 'Success'
      });
      
      await updateDoc(doc(db, 'settings', `balance_${studentRoll}`), {
        balance: '0'
      });
      
      toast.success('Payment Successful!');
      setShowQR(false);
      setStudentBalance('0');
    } catch (error) {
      toast.error('Payment Failed');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 flex flex-col h-[calc(100vh-12rem)] md:h-auto">
      {/* Fee Reminder Card for Students */}
      {userRole === 'student' && studentBalance !== '0' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group"
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                <h3 className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em]">Pending Fee Reminder</h3>
              </div>
              <h2 className="text-2xl font-black text-white italic">₹{studentBalance} <span className="text-slate-500 text-xs not-italic font-bold uppercase tracking-widest ml-1">Outstanding</span></h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70">Roll #SV-2026-{studentRoll} • Term 2 Academic Fees</p>
            </div>
            <button 
              onClick={() => setShowQR(true)}
              className="px-6 py-3 bg-yellow-400 text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20 hover:bg-yellow-300 transition-all active:scale-95 group/btn"
            >
              <span>Pay with QR</span>
              <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none group-hover:bg-yellow-400/10 transition-all"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/5 rounded-full -ml-12 -mb-12 blur-2xl pointer-events-none"></div>
        </motion.div>
      )}

      {/* QR Code Payment Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-400/20">
                  <CreditCard size={32} className="text-slate-900" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Instant Pay</h3>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Amount: ₹{studentBalance}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl mb-6 flex flex-col items-center">
                <div className="bg-white p-4 rounded-[2rem] shadow-sm mb-4">
                  <QRCodeSVG 
                    value={`upi://pay?pa=${schoolUPI}&pn=SunflowerSchool&am=${studentBalance.replace(/,/g, '')}&cu=INR`} 
                    size={200}
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Scan with any UPI App</p>
                <div className="flex gap-2 mt-4">
                  <div className="w-6 h-6 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="w-4 h-4" />
                  </div>
                  <div className="w-6 h-6 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" className="w-4 h-4" />
                  </div>
                   <div className="w-6 h-6 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                    <img src="https://brandgeek.io/wp-content/uploads/2023/11/PhonePe-Logo.png" alt="PhonePe" className="w-4 h-4 object-contain" />
                  </div>
                </div>
              </div>

              <button 
                onClick={processPayment}
                disabled={isPaying}
                className="w-full py-4 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-slate-200 dark:shadow-yellow-400/10 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPaying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </button>
              
              <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-6 italic">Secure 256-bit SSL Encrypted Transaction</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col flex-1 overflow-hidden relative">
        <div className="flex items-center gap-4 mb-6 md:mb-8 shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 dark:bg-yellow-400 rounded-2xl flex items-center justify-center text-white dark:text-slate-900 font-black">SP</div>
          <div>
            <h2 className="text-lg md:text-xl font-bold leading-none text-slate-900 dark:text-white">Parent-Staff Link</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Real-time Encrypted updates</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">Admin Notice</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">Today</span>
              </div>
              <p className="text-sm font-medium italic opacity-60 text-slate-600 dark:text-slate-400">"Welcome to the Sunflower School secure portal. Updates will appear here automatically across all devices."</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn(
              "p-4 rounded-2xl border transition-all",
              msg.role === userRole 
                ? "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 ml-8" 
                : "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 mr-8"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-widest",
                  msg.role === 'principal' || msg.role === 'director' ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"
                )}>{msg.role}</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono italic">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">{msg.text}</p>
            </div>
          ))}
        </div>

        {canSendMessages ? (
          <div className="shrink-0 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium text-sm text-slate-900 dark:text-white" 
                placeholder="Ask management a question..." 
              />
              <button 
                onClick={handleSend}
                className="px-6 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-bold rounded-xl transition-all hover:bg-slate-800 dark:hover:bg-yellow-500 active:scale-95 flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-none"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">
                Messaging is restricted to Management and Teachers
              </p>
            </div>
          </div>
        )}
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
}

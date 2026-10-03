import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  GraduationCap, 
  CreditCard, 
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, onSnapshot, query, collection, where, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { Student } from './Students';

interface MarkRecord {
  subject: string;
  obtained: number;
  total: number;
  grade: string;
  remarks: string;
}

interface StudentResult {
  name: string;
  class: string;
  roll: string;
  marks: MarkRecord[];
}

interface StudentProfileProps {
  student: Student;
  onBack: () => void;
  onDelete?: (id: string, name: string) => void;
}

export function StudentProfile({ student, onBack, onDelete }: StudentProfileProps) {
  const [marks, setMarks] = useState<StudentResult | null>(null);
  const [loadingMarks, setLoadingMarks] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'marks' | 'fees'>('overview');
  const [studentBalance, setStudentBalance] = useState('0');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [newBalanceSetting, setNewBalanceSetting] = useState('');
  
  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const isAdmin = userRole === 'principal' || userRole === 'director' || userRole === 'teacher';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'marks', `STUDENT_${student.roll}`), (docSnap) => {
      if (docSnap.exists()) {
        setMarks(docSnap.data() as StudentResult);
      } else {
        // Fallback or handle missing marks
        setMarks(null);
      }
      setLoadingMarks(false);
    });
    return () => unsub();
  }, [student.roll]);

  useEffect(() => {
    const unsubBalance = onSnapshot(doc(db, 'settings', `balance_${student.roll}`), (docSnap) => {
      if (docSnap.exists()) {
        setStudentBalance(docSnap.data()?.balance || '0');
      } else {
        setStudentBalance('0');
      }
    });
    return () => unsubBalance();
  }, [student.roll]);

  const [studentTransactions, setStudentTransactions] = useState<any[]>([]);
  const [loadingFees, setLoadingFees] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('roll', '==', student.roll)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudentTransactions(txs);
      setLoadingFees(false);
    });
    return () => unsub();
  }, [student.roll]);

  const handleUpdateBalance = async () => {
    if (!newBalanceSetting) return;
    try {
      await setDoc(doc(db, 'settings', `balance_${student.roll}`), { 
        balance: newBalanceSetting 
      });
      toast.success(`Fee due set for ${student.name}`);
      setIsUpdatingBalance(false);
      setNewBalanceSetting('');
    } catch (error) {
      toast.error('Failed to update balance');
    }
  };

  // Derived fee data based on student roll for uniqueness if no transactions exist
  const getMockFees = () => {
    const rollNum = parseInt(student.roll) || 0;
    const isEven = rollNum % 2 === 0;
    return [
      { 
        title: 'Term 1 Tuition Fee', 
        amount: isEven ? '12,000' : '10,500', 
        status: 'Paid', 
        date: isEven ? 'Jan 15, 2026' : 'Jan 10, 2026' 
      },
      { 
        title: 'Annual Transport Charge', 
        amount: isEven ? '8,500' : '6,000', 
        status: 'Paid', 
        date: isEven ? 'Feb 02, 2026' : 'Feb 05, 2026' 
      },
      { 
        title: 'Term 2 Tuition Fee', 
        amount: isEven ? '12,000' : '10,500', 
        status: isEven ? 'Pending' : 'Paid', 
        date: isEven ? '-' : 'April 20, 2026' 
      },
    ];
  };

  const fees = studentTransactions.length > 0 
    ? studentTransactions.map(tx => ({
        title: `Fee Payment - ${tx.method}`,
        amount: tx.amount,
        status: 'Paid',
        date: tx.date || (tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleDateString() : 'Recent')
      }))
    : getMockFees();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 text-left"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Student Profile</h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Roll #SV-2026-{student.roll}</p>
          </div>
        </div>

        {isAdmin && student.id && onDelete && (
          <button 
            onClick={() => onDelete(student.id!, student.name)}
            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2 group"
          >
            <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Delete Student</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Core Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center">
            <div className="w-32 h-32 rounded-3xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white text-4xl font-black shadow-2xl relative overflow-hidden mb-6 border-4 border-white dark:border-slate-800">
              {student.photo ? (
                <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                student.name.charAt(0)
              )}
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase text-center">{student.name}</h3>
            <div className={cn(
              "mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              student.status === 'Active' ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            )}>
              {student.status} Student
            </div>

            <div className="w-full mt-8 space-y-4 border-t border-slate-50 dark:border-slate-800 pt-8">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <GraduationCap size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Class</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Class {student.class}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Student Mobile</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">+91 {student.studentContact || student.mobile}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Guardian Mobile</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">+91 {student.mobile}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Address</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{student.address || 'Address not listed'}</p>
                </div>
              </div>
               <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Enrolled Date</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'August 14, 2025'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Tabs/Detailed Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="flex border-b border-slate-100 dark:border-slate-800">
              {(['overview', 'marks', 'fees'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                    activeTab === tab ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="profileTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8 flex-1">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Attendance</h4>
                      <CheckCircle2 className="text-green-500" size={18} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black italic dark:text-white">94%</span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Present</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Academic Performance</h4>
                      <GraduationCap className="text-blue-500" size={18} />
                    </div>
                    {marks ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black italic dark:text-white">
                          {Math.round((marks.marks.reduce((s, m) => s + m.obtained, 0) / marks.marks.reduce((s, m) => s + m.total, 0)) * 100)}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Aggregate</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500">No marks recorded yet</p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mt-4">Recent Notes</h4>
                    <div className="space-y-3">
                      {[
                        { text: 'Participated in Inter-school science quiz.', date: '3 days ago' },
                        { text: 'Needs to improve focus on English spelling.', date: '1 week ago' },
                      ].map((note, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100/50 dark:border-yellow-900/30">
                          <AlertCircle size={14} className="text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{note.text}</p>
                            <p className="text-[9px] font-bold text-yellow-700/60 dark:text-yellow-500/60 uppercase mt-1">{note.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'marks' && (
                <div className="space-y-6">
                  {loadingMarks ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-800">
                          <div className="h-4 w-32 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                          <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
                          <div className="h-6 w-8 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : marks ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3">Marks</th>
                            <th className="px-4 py-3">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {marks.marks.map((m, i) => (
                            <tr key={i}>
                              <td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">{m.subject}</td>
                              <td className="px-4 py-4">
                                <span className="font-black text-slate-900 dark:text-white">{m.obtained}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-1">/ {m.total}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold flex items-center justify-center w-8",
                                  m.obtained >= 80 ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : m.obtained >= 60 ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                                )}>
                                  {m.grade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <XCircle size={32} className="text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-400 dark:text-slate-500 font-bold">No academic data found for roll {student.roll}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'fees' && (
                <div className="space-y-6">
                  {isAdmin && (
                    <div className="p-6 bg-slate-900 dark:bg-yellow-400 rounded-3xl text-white dark:text-slate-900 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Currently Due Amount</p>
                          <h4 className="text-3xl font-black italic mt-1">₹{studentBalance}</h4>
                        </div>
                        <button 
                          onClick={() => setIsUpdatingBalance(true)}
                          className="px-4 py-2 bg-white/20 dark:bg-black/10 hover:bg-white/30 dark:hover:bg-black/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Update Due
                        </button>
                      </div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-8 w-24 h-24 bg-white/10 dark:bg-black/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                    </div>
                  )}

                  <AnimatePresence>
                    {isUpdatingBalance && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden"
                      >
                        <h5 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Set New Fee Due Amount</h5>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                            <input 
                              type="text" 
                              value={newBalanceSetting}
                              onChange={(e) => setNewBalanceSetting(e.target.value)}
                              placeholder="e.g. 5,000"
                              className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold dark:text-white"
                            />
                          </div>
                          <button 
                            onClick={handleUpdateBalance}
                            className="px-6 bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-lg shadow-yellow-400/20"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setIsUpdatingBalance(false)}
                            className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment History</h5>
                    {fees.map((fee, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                      <div className="flex items-center gap-4 text-left">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          fee.status === 'Paid' ? "bg-green-100 dark:bg-green-900/20 text-green-500 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400"
                        )}>
                          {fee.status === 'Paid' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 dark:text-white text-sm">{fee.title}</h5>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                            {fee.status === 'Paid' ? `Paid on ${fee.date}` : `Outstanding Due`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 dark:text-white text-lg italic">₹{fee.amount}</p>
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          fee.status === 'Paid' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>{fee.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);
}

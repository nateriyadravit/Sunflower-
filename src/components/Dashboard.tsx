import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Library, 
  Plus,
  Phone,
  Mail,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, doc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StaffManagement } from './StaffManagement';

import { toast } from 'react-hot-toast';

export function DashboardView({ schoolContact }: { schoolContact: { phone: string, email: string } }) {
  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const [studentCount, setStudentCount] = useState(0);
  const [bookCount, setBookCount] = useState(0);
  const [admissionCount, setAdmissionCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [view, setView] = useState<'stats' | 'staff'>('stats');

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudentCount(snap.size);
    });
    const unsubLibrary = onSnapshot(collection(db, 'library'), (snap) => {
      setBookCount(snap.size);
    });
    const unsubAdmissions = onSnapshot(collection(db, 'admissions'), (snap) => {
      setAdmissionCount(snap.size);
    });
    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      const evs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(evs);
    });
    const unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
      setStaffCount(snap.size || 86);
    });

    const unsubLogs = onSnapshot(
      query(collection(db, 'login_logs'), orderBy('timestamp', 'desc'), limit(10)),
      (snap) => {
        setLoginLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    
    return () => {
      unsubStudents();
      unsubLibrary();
      unsubAdmissions();
      unsubEvents();
      unsubStaff();
      unsubLogs();
    };
  }, []);

  const stats = [
    { label: 'Total Students', value: studentCount || '...', change: 'Live', icon: Users, color: 'bg-blue-500' },
    { 
      label: 'Total Staff', 
      value: staffCount || '...', 
      change: (userRole === 'principal' || userRole === 'director') ? 'Manage' : 'Live', 
      icon: GraduationCap, 
      color: 'bg-green-500',
      onClick: (userRole === 'principal' || userRole === 'director') ? () => setView('staff') : undefined
    },
    { label: 'Admissions Open', value: admissionCount || '...', change: 'Live', icon: Plus, color: 'bg-yellow-500' },
    { label: 'Library Titles', value: bookCount || '...', change: 'Live', icon: Library, color: 'bg-purple-500' },
  ];

  const recentEvents = events.length > 0 ? events.slice(0, 3) : [
    { title: 'Science Exhibition', date: '2026-05-15', type: 'Event' },
    { title: 'PTA Meeting', date: '2026-05-10', type: 'Meeting' },
    { title: 'Mid-term Exams Start', date: '2026-05-22', type: 'Exam' },
  ];

  return (
    <AnimatePresence mode="wait">
      {view === 'staff' ? (
        <motion.div
          key="staff"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <StaffManagement onBack={() => setView('stats')} />
        </motion.div>
      ) : (
        <motion.div 
          key="stats"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div 
                key={stat.label} 
                onClick={stat.onClick}
                className={cn(
                  "bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all text-left",
                  stat.onClick ? "cursor-pointer hover:shadow-md hover:border-yellow-200 dark:hover:border-yellow-900/50" : "hover:shadow-soft"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-3 rounded-xl text-white", stat.color)}>
                    <stat.icon size={24} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest",
                    stat.onClick ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                  )}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {stat.value === '...' ? (
                    <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-1"></div>
                  ) : (
                    stat.value
                  )}
                </h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {(userRole === 'principal' || userRole === 'director') && (
                <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-200 dark:shadow-none">
                  <div className="text-left">
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Staff Administration</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Manage Teachers, Admins & Support Staff</p>
                  </div>
                  <button 
                    onClick={() => setView('staff')}
                    className="bg-yellow-400 text-slate-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-500 transition-all flex items-center gap-3 shrink-0 active:scale-95"
                  >
                    <Users size={18} />
                    Manage Staff Members
                  </button>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                <h4 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center justify-between">
                  Attendance Overview
                  <select className="text-xs font-medium border-0 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 rounded-lg px-2 py-1 cursor-pointer outline-none">
                    <option>Last 7 Days</option>
                    <option>This Month</option>
                  </select>
                </h4>
                <div className="h-64 flex items-end justify-between gap-2 px-2">
                  {[65, 82, 75, 90, 88, 92, 85].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        className="w-full max-w-[40px] bg-yellow-400/20 hover:bg-yellow-400 rounded-t-lg transition-colors cursor-pointer group relative"
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {height}% Attendance
                        </div>
                      </motion.div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Day {i+1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {(userRole === 'principal' || userRole === 'director') && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Recent Login Activity</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time Session Monitoring</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {loginLogs.length === 0 ? (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
                            <div className="space-y-1">
                              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                              <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-2 w-12 bg-slate-100 dark:bg-slate-800 rounded ml-auto"></div>
                            <div className="h-2 w-8 bg-slate-100 dark:bg-slate-800 rounded ml-auto"></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      loginLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] text-white",
                              log.role === 'student' ? "bg-blue-500" : "bg-yellow-400 text-slate-900"
                            )}>
                              {log.role?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{log.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{log.identifier}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-900 dark:text-slate-200 uppercase">{log.role}</p>
                            <p className="text-[9px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">Recent School Events</h4>
              <div className="space-y-4">
                {recentEvents.map((event, i) => (
                  <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">May</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">{10 + i * 2}</span>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">{event.title}</h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{event.type} • {event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                View All Events
              </button>
            </div>

            {/* School Assistance / Contact Card for Students */}
            {userRole === 'student' && (schoolContact.phone || schoolContact.email) && (
              <div className="bg-yellow-400 dark:bg-yellow-500 rounded-2xl p-6 shadow-lg shadow-yellow-100 dark:shadow-none text-left mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-slate-900">
                    <Info size={18} />
                  </div>
                  <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">School Assistance</h4>
                </div>
                <p className="text-slate-900 text-xs font-bold leading-relaxed mb-6 opacity-90">
                  Having trouble with your portal? Contact the administration desk during school hours.
                </p>
                <div className="space-y-3">
                  {schoolContact.phone && (
                    <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/20">
                      <Phone size={14} className="text-slate-900" />
                      <span className="text-sm font-black text-slate-900 italic">{schoolContact.phone}</span>
                    </div>
                  )}
                  {schoolContact.email && (
                    <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/20">
                      <Mail size={14} className="text-slate-900" />
                      <span className="text-sm font-black text-slate-900 break-all">{schoolContact.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

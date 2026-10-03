import React, { useState, useEffect } from 'react';
import { GraduationCap, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

interface Application {
  id?: string;
  studentName: string;
  dob: string;
  class: string;
  mobile: string;
  address: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export function AdmissionsView() {
  const [formData, setFormData] = useState({
    studentName: '',
    dob: '',
    class: '',
    mobile: '',
    address: ''
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const isAdmin = userRole === 'principal' || userRole === 'director';

  useEffect(() => {
    const q = query(collection(db, 'admissions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Application[];
      setApplications(apps);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName || !formData.mobile) {
      toast.error('Name and Mobile are required');
      return;
    }

    try {
      await addDoc(collection(db, 'admissions'), {
        ...formData,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      setFormData({
        studentName: '',
        dob: '',
        class: '',
        mobile: '',
        address: ''
      });
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit application');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Form Section */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">New Admission Application</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Register for academic session 2026-27.</p>
        </header>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Student Full Name</label>
              <input 
                type="text" 
                value={formData.studentName}
                onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium dark:text-white" 
                placeholder="E.g. Aryan Singh" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
              <input 
                type="date" 
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium dark:text-white" 
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Applying for Class</label>
              <select 
                value={formData.class}
                onChange={(e) => setFormData({...formData, class: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium appearance-none dark:text-white"
              >
                <option value="" className="dark:bg-slate-900 text-slate-400">Select Class</option>
                {['KG 1', 'KG 2', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'].map(c => (
                  <option key={c} value={c} className="dark:bg-slate-900 text-slate-900 dark:text-white">{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Guardian Mobile</label>
              <input 
                type="tel" 
                value={formData.mobile}
                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium dark:text-white" 
                placeholder="+91 XXXXX XXXXX" 
              />
            </div>
          </div>
          
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Residential Address</label>
            <textarea 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all font-medium min-h-[100px] dark:text-white" 
              placeholder="Full address for school transport verification..."
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-end gap-4">
            <button 
              type="button" 
              onClick={() => toast('Saved to local storage draft')}
              className="px-6 py-3 rounded-xl text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Save Draft
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 rounded-xl bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all shadow-lg shadow-slate-900/10"
            >
              Submit Now
            </button>
          </div>
        </form>
      </div>

      {/* Applications List (Real-time sync) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden text-left">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Recent Applications</h3>
          <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase italic">Live Sync</div>
        </div>
        
        {loading ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                  <div className="space-y-2 text-left">
                    <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-48 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                  </div>
                </div>
                <div className="h-10 w-24 bg-slate-50 dark:bg-slate-800/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">No applications found.</div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {applications.slice(0, 10).map((app) => (
              <div key={app.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center text-yellow-400 font-black text-xs">
                    {app.studentName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{app.studentName}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">Applied for {app.class} • {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Mobile</p>
                    <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">{app.mobile}</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-lg flex items-center gap-2 border",
                    app.status === 'Pending' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 border-orange-100 dark:border-orange-900/50" :
                    app.status === 'Approved' ? "bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400 border-green-100 dark:border-green-900/50" : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-100 dark:border-red-900/50"
                  )}>
                    {app.status === 'Pending' && <Clock size={14} />}
                    {app.status === 'Approved' && <CheckCircle2 size={14} />}
                    <span className="text-[10px] font-black uppercase italic tracking-widest">{app.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

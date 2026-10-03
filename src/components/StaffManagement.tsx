import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  Shield,
  ArrowLeft,
  X,
  Calendar as CalendarIcon,
  MapPin,
  Award,
  BookOpen,
  Briefcase,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

interface StaffMember {
  id?: string;
  name: string;
  role: string;
  email: string;
  mobile: string;
  status: 'Active' | 'Inactive';
}

interface StaffManagementProps {
  onBack: () => void;
}

export function StaffManagement({ onBack }: StaffManagementProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    mobile: ''
  });

  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'staff'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StaffMember[];
      setStaff(data);
      setLoading(false);
    });

    const qEvents = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
    });

    return () => {
      unsub();
      unsubEvents();
    };
  }, []);

  const STAFF_ROLES = [
    'Teacher',
    'Administrator',
    'Accountant',
    'Support Staff',
    'Principal',
    'Director',
    'Librarian',
    'Lab Assistant',
    'Coordinator'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const mobileRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!mobileRegex.test(formData.mobile)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      if (editingStaff) {
        await updateDoc(doc(db, 'staff', editingStaff.id!), {
          ...formData,
          status: 'Active'
        });
        toast.success('Staff updated successfully');
      } else {
        await addDoc(collection(db, 'staff'), {
          ...formData,
          status: 'Active'
        });
        toast.success('Staff added successfully');
      }
      setIsModalOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', role: '', email: '', mobile: '' });
    } catch (error) {
      toast.error('Failed to save staff member');
    }
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      role: member.role,
      email: member.email,
      mobile: member.mobile
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteDoc(doc(db, 'staff', id));
        toast.success('Staff member removed');
      } catch (error) {
        toast.error('Failed to delete staff member');
      }
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedStaff) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 text-left pb-10"
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedStaff(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Staff Member Profile</h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Detail View</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 bg-slate-900 dark:bg-slate-800 rounded-[40px] flex items-center justify-center text-white font-black text-4xl mb-6 shadow-2xl shadow-slate-200 dark:shadow-none">
                  {selectedStaff.name.charAt(0)}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{selectedStaff.name}</h3>
                <p className="text-xs font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-[0.2em] mt-1">{selectedStaff.role}</p>
                <div className="mt-4 px-4 py-1.5 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {selectedStaff.status || 'Active'}
                </div>
              </div>

              <div className="mt-10 space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-4 group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="p-2 bg-white dark:bg-slate-700 rounded-xl text-blue-500">
                    <Mail size={18} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Email Address</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedStaff.email}</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="p-2 bg-white dark:bg-slate-700 rounded-xl text-green-500">
                    <Phone size={18} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Mobile Number</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedStaff.mobile}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => handleEdit(selectedStaff)}
                  className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => {
                    handleDelete(selectedStaff.id!);
                    setSelectedStaff(null);
                  }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all border border-red-100 dark:border-red-900/30"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[32px] p-8 text-white">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-slate-400 flex items-center gap-2">
                <Award size={14} /> Quick Stats
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                  <p className="text-2xl font-black italic">100%</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Attendance</p>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                  <p className="text-2xl font-black italic">24</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Tasks Done</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm h-full">
              <div className="space-y-10">
                <section>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-slate-400 flex items-center gap-2">
                    <Briefcase size={14} /> Employment Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{selectedStaff.role.includes('Teacher') ? 'Academic' : 'Administration'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee ID</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase">EMP-{selectedStaff.id?.slice(0, 5).toUpperCase()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest Date of Joining">Date of Joining</p>
                      <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white uppercase">
                        <CalendarIcon size={14} className="text-slate-400" />
                        <span>Generic Date 2024</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report To</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase">School Principal</p>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <section>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-slate-400 flex items-center gap-2">
                    <BookOpen size={14} /> Professional Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                    {selectedStaff.name} is a dedicated {selectedStaff.role} contributing to the excellence of Smart Pupil System. With a focus on organizational efficiency and pedagogical support, they play a vital role in our academic community.
                  </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                  <div className="p-6 rounded-3xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-center">
                    <p className="text-2xl font-black text-blue-600 italic">05+</p>
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Years Exp.</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 text-center">
                    <p className="text-2xl font-black text-purple-600 italic">4.9</p>
                    <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Rating</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 text-center">
                    <p className="text-2xl font-black text-yellow-600 italic">Active</p>
                    <p className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">Status</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <section>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-slate-400 flex items-center gap-2">
                    <CalendarIcon size={14} /> Assigned Events from Calendar
                  </h4>
                  <div className="space-y-4">
                    {events.filter(e => e.staffId === selectedStaff.id).length > 0 ? (
                      events.filter(e => e.staffId === selectedStaff.id).map(event => (
                        <div key={event.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[28px] border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-yellow-400/50 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                              event.type === 'Holiday' ? 'bg-slate-900 dark:bg-slate-700' :
                              event.type === 'Exam' ? 'bg-red-500' :
                              event.type === 'Meeting' ? 'bg-blue-500' : 'bg-yellow-400 text-slate-900'
                            )}>
                              <CalendarIcon size={20} />
                            </div>
                            <div>
                                <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{event.title}</h5>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                                        <Clock size={10} /> {event.date} {event.time && `- ${event.time}`}
                                    </span>
                                    {event.location && (
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                                            <MapPin size={10} /> {event.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-white dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-800">
                            {event.type}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No events assigned to this member</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Staff Management</h2>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Directory & Administration</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-yellow-400 transition-all font-medium text-slate-900 dark:text-white"
          />
        </div>
        <button 
          onClick={() => {
            setEditingStaff(null);
            setFormData({ name: '', role: '', email: '', mobile: '' });
            setIsModalOpen(true);
          }}
          className="bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all shadow-xl shadow-slate-200 dark:shadow-none"
        >
          <Plus size={18} />
          Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-1/2 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="h-3 w-full bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                  <div className="h-3 w-3/4 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                  <div className="h-3 w-1/2 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                </div>
              </div>
            ))}
          </>
        ) : filteredStaff.length > 0 ? (
          filteredStaff.map((member) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={member.id}
              onClick={() => setSelectedStaff(member)}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-shadow relative group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-white font-black text-lg group-hover:scale-110 transition-transform">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">{member.name}</h3>
                    <p className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">{member.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(member);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(member.id!);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <Mail size={14} />
                  <span className="text-xs font-medium">{member.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <Phone size={14} />
                  <span className="text-xs font-medium">{member.mobile}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield size={14} className="text-green-500 dark:text-green-400" />
                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Active Member</span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Users size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">No staff members found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8 bg-slate-900 dark:bg-slate-800 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tight">
                    {editingStaff ? 'Edit Staff' : 'Add Staff'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Staff Directory Entry</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white"
                    placeholder="e.g. Dr. Rajesh Kumar"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Role / Designation</label>
                  <select 
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="" disabled className="dark:bg-slate-900">Select a role...</option>
                    {STAFF_ROLES.map(role => (
                      <option key={role} value={role} className="dark:bg-slate-900">{role}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Mobile</label>
                    <input 
                      required
                      type="tel" 
                      pattern="[0-9]{10}"
                      title="10-digit mobile number"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white text-sm"
                      placeholder="9876543210"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Email</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white text-sm"
                      placeholder="name@school.com"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black py-5 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none mt-4 hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all uppercase tracking-widest text-xs"
                >
                  {editingStaff ? 'UPDATE MEMBER' : 'REGISTER MEMBER'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

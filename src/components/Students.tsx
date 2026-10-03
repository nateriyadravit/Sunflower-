import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, QrCode, Trash2, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { QRCodeModal } from './QRCodeModal';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudentProfile } from './StudentProfile';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Database error: ${errInfo.error}`);
}

export interface Student {
  id?: string;
  name: string;
  roll: string;
  email: string;
  class: string;
  mobile: string;
  studentContact: string;
  address?: string;
  status: string;
  photo?: string;
  createdAt?: string;
}

export function StudentsView() {
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<'list' | 'profile'>('list');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const canEdit = userRole === 'principal' || userRole === 'director' || userRole === 'teacher';

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('roll', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [newStudent, setNewStudent] = useState({ name: '', roll: '', class: '', mobile: '', studentContact: '', email: '', photo: '', address: '' });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200000) { // 200KB limit for Firestore base64 storage
        toast.error('Image is too large. Please select a smaller photo (under 200KB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStudent(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.roll) {
      toast.error('Name and Roll No are required');
      return;
    }

    try {
      await addDoc(collection(db, 'students'), {
        ...newStudent,
        email: newStudent.email.trim().toLowerCase(),
        status: 'Active',
        createdAt: new Date().toISOString()
      });
      setNewStudent({ name: '', roll: '', class: '', mobile: '', studentContact: '', email: '', photo: '', address: '' });
      setIsAddModalOpen(false);
      toast.success('Student added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'students');
    }
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'students', studentToDelete.id));
      toast.success('Student deleted');
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteRequest = (id: string, name: string) => {
    setStudentToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const handleToggleStatus = async (student: Student) => {
    if (!student.id) return;
    try {
      const newStatus = student.status === 'Active' ? 'Inactive' : 'Active';
      const studentRef = doc(db, 'students', student.id);
      await setDoc(studentRef, { status: newStatus }, { merge: true });
      toast.success(`${student.name} is now ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${student.id}`);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.id) return;
    if (!editingStudent.name || !editingStudent.roll) {
      toast.error('Name and Roll No are required');
      return;
    }

    try {
      const { id, ...data } = editingStudent;
      if (data.email) data.email = data.email.trim().toLowerCase();
      await setDoc(doc(db, 'students', id), data, { merge: true });
      setIsEditModalOpen(false);
      setEditingStudent(null);
      toast.success('Student record updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${editingStudent.id}`);
    }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setIsEditModalOpen(true);
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setView('profile');
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.roll.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {view === 'profile' && selectedStudent ? (
        <motion.div 
          key="profile"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <StudentProfile 
            student={selectedStudent} 
            onBack={() => {
              setView('list');
              setSelectedStudent(null);
            }} 
            onDelete={(id, name) => {
              setView('list'); // Go back to list before showing delete modal for better UX
              handleDeleteRequest(id, name);
            }}
          />
        </motion.div>
      ) : (
        <motion.div 
          key="list"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden text-left relative"
        >
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Student Directory</h2>
          <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">2026 Batch</div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white dark:bg-slate-900 dark:text-white"
          >
            <option value="All">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
          <input 
            type="text" 
            placeholder="Search students..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium bg-white dark:bg-slate-900 dark:text-white" 
          />
          {canEdit && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="p-2 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all shadow-md flex items-center gap-2 px-4"
            >
              <Plus size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Add Student</span>
            </button>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Add New Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden">
                    {newStudent.photo ? (
                      <img src={newStudent.photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Plus className="text-slate-300 dark:text-slate-600" size={24} />
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Photo</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {newStudent.photo && (
                    <button 
                      type="button"
                      onClick={() => setNewStudent(prev => ({ ...prev, photo: '' }))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                  placeholder="Enter name..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Roll No</label>
                  <input 
                    type="text" 
                    value={newStudent.roll}
                    onChange={(e) => setNewStudent({...newStudent, roll: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                    placeholder="e.g. 103"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Class</label>
                  <input 
                    type="text" 
                    value={newStudent.class}
                    onChange={(e) => setNewStudent({...newStudent, class: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                    placeholder="e.g. 6-A"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email ID</label>
                <input 
                  type="email" 
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                  placeholder="student@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Student Contact</label>
                  <input 
                    type="text" 
                    value={newStudent.studentContact}
                    onChange={(e) => setNewStudent({...newStudent, studentContact: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                    placeholder="Student No."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Parent Mobile</label>
                  <input 
                    type="text" 
                    value={newStudent.mobile}
                    onChange={(e) => setNewStudent({...newStudent, mobile: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                    placeholder="Parent No."
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Address</label>
                <textarea 
                  value={newStudent.address}
                  onChange={(e) => setNewStudent({...newStudent, address: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white text-sm"
                  placeholder="Street, City, pincode..."
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-yellow-400 text-slate-900 font-bold rounded-xl shadow-lg shadow-yellow-400/20"
                >
                  Save Student
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Edit Student Record</h3>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden">
                    {editingStudent.photo ? (
                      <img src={editingStudent.photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Plus className="text-slate-300 dark:text-slate-600" size={24} />
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Photo</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 200000) {
                          toast.error('Image is too large (max 200KB)');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingStudent({...editingStudent, photo: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Roll No</label>
                  <input 
                    type="text" 
                    value={editingStudent.roll}
                    onChange={(e) => setEditingStudent({...editingStudent, roll: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Class</label>
                  <input 
                    type="text" 
                    value={editingStudent.class}
                    onChange={(e) => setEditingStudent({...editingStudent, class: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email ID</label>
                <input 
                  type="email" 
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Student Contact</label>
                  <input 
                    type="text" 
                    value={editingStudent.studentContact}
                    onChange={(e) => setEditingStudent({...editingStudent, studentContact: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Parent Mobile</label>
                  <input 
                    type="text" 
                    value={editingStudent.mobile}
                    onChange={(e) => setEditingStudent({...editingStudent, mobile: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Address</label>
                <textarea 
                  value={editingStudent.address}
                  onChange={(e) => setEditingStudent({...editingStudent, address: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white text-sm"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-bold rounded-xl shadow-lg"
                >
                  Update Info
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {isDeleteModalOpen && studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center border border-slate-100 dark:border-slate-800"
          >
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{studentToDelete.name}</span>?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setStudentToDelete(null);
                }}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : 'Confirm Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {loading ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-6 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full shrink-0"></div>
                <div className="space-y-2 text-left">
                  <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
                  <div className="h-3 w-20 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                </div>
              </div>
              <div className="hidden md:flex gap-12">
                <div className="h-4 w-16 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                <div className="h-4 w-24 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                <div className="h-4 w-16 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
              </div>
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <th className="px-6 py-4">Roll No</th>
              <th className="px-6 py-4">Student Name</th>
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Parent Mobile</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.map((student) => (
              <tr 
                key={student.id} 
                onClick={() => handleStudentClick(student)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group cursor-pointer active:scale-[0.99]"
              >
                <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">#{student.roll}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                      {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover shrink-0" />
                      ) : (
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                          {student.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">{student.name}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentForQR(student);
                          }}
                          className="p-1 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                          <QrCode size={12} />
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Click to view profile</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">{student.class}</td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{student.mobile}</td>
                <td className="px-6 py-4">
                  <button 
                    disabled={!canEdit}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canEdit) handleToggleStatus(student);
                    }}
                    className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                      student.status === 'Active' ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
                      canEdit && "hover:bg-yellow-400 dark:hover:bg-yellow-400 hover:text-slate-900 dark:hover:text-slate-900 cursor-pointer"
                    )}
                  >
                    {student.status}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentForQR(student);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                      title="Student QR ID"
                    >
                      <QrCode size={18} />
                    </button>
                    {canEdit && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(student);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                          title="Edit Student"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (student.id) handleDeleteRequest(student.id, student.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {filteredStudents.map((student) => (
          <div 
            key={student.id}
            className="p-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors flex items-center gap-4"
            onClick={() => handleStudentClick(student)}
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-bold shrink-0 shadow-lg overflow-hidden border border-slate-100 dark:border-slate-700">
              {student.photo ? (
                <img src={student.photo} alt={student.name} className="w-full h-full object-cover shrink-0" />
              ) : (
                student.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
               <div className="flex items-center gap-2 mb-0.5">
                <span className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase truncate">{student.name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudentForQR(student);
                  }}
                  className="p-1 text-slate-400 dark:text-slate-500"
                >
                  <QrCode size={14} />
                </button>
                <span className="ml-auto text-[10px] font-mono text-slate-400 dark:text-slate-500">#{student.roll}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Class {student.class}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                <button 
                  disabled={!canEdit}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canEdit) handleToggleStatus(student);
                  }}
                  className={cn(
                    "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded transition-all",
                    student.status === 'Active' ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-red-600 bg-red-50 dark:bg-red-900/20",
                    canEdit && "hover:bg-yellow-400 dark:hover:bg-yellow-400 hover:text-slate-900 dark:hover:text-slate-900"
                  )}
                >
                  {student.status}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStudentForQR(student);
                }}
                className="p-2 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <QrCode size={18} />
              </button>
              {canEdit && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(student);
                    }}
                    className="p-2 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (student.id) handleDeleteRequest(student.id, student.name);
                    }}
                    className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )}


      {selectedStudentForQR && (
        <QRCodeModal
          isOpen={!!selectedStudentForQR}
          onClose={() => setSelectedStudentForQR(null)}
          value={JSON.stringify({
            id: selectedStudentForQR.id,
            name: selectedStudentForQR.name,
            roll: selectedStudentForQR.roll,
            class: selectedStudentForQR.class,
            verified: true,
            timestamp: new Date().toISOString()
          })}
          title={`Digital ID: ${selectedStudentForQR.name}`}
          description={`Scan to verify student ${selectedStudentForQR.name} (Roll: ${selectedStudentForQR.roll}, Class: ${selectedStudentForQR.class}). This QR can be used for automated attendance and campus entry.`}
        />
      )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

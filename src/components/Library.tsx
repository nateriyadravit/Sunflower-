import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Trash2, Filter, X, Check, Book as BookIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, setDoc, addDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';
import { motion, AnimatePresence } from 'motion/react';

interface Book {
  id?: string;
  title: string;
  author: string;
  isbn: string;
  status: 'Available' | 'Borrowed' | 'Reserved';
  category: string;
  color: string;
  description?: string;
}

const CATEGORIES = ['All', 'Science', 'Mathematics', 'Literature', 'History', 'Technology', 'Self-Help', 'Fiction'];
const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-rose-500', 
  'bg-amber-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'
];

export function LibraryView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const isAdmin = userRole === 'principal' || userRole === 'director' || userRole === 'teacher';
  const canManageCatalog = false; // Hidden for all per latest request
  const [isEditing, setIsEditing] = useState(false);

  // New book form state
  const [newBook, setNewBook] = useState<Omit<Book, 'id'>>({
    title: '',
    author: '',
    isbn: '',
    status: 'Available',
    category: 'Science',
    color: 'bg-blue-500',
    description: ''
  });

  const [viewMode, setViewMode] = useState<'catalog' | 'requests'>('catalog');
  const [requests, setRequests] = useState<any[]>([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState<Book | null>(null);
  const [studentSearchForIssue, setStudentSearchForIssue] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);

  const handleSearchStudent = async () => {
    if (!studentSearchForIssue) return;
    setIsSearchingStudent(true);
    setFoundStudent(null);
    try {
      const q = query(collection(db, 'students'), where('roll', '==', studentSearchForIssue));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setFoundStudent({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        toast.error('Student not found with this Roll No.');
      }
    } catch (error) {
      toast.error('Error searching student');
    } finally {
      setIsSearchingStudent(false);
    }
  };

  const handleDirectIssue = async () => {
    if (!selectedBookForIssue || !foundStudent || !selectedBookForIssue.id) return;
    
    try {
      // 1. Create a record in library_requests (auto-approved)
      await addDoc(collection(db, 'library_requests'), {
        bookId: selectedBookForIssue.id,
        bookTitle: selectedBookForIssue.title,
        studentName: foundStudent.name,
        studentRoll: foundStudent.roll,
        status: 'Issued',
        timestamp: new Date().toISOString(),
        issuedBy: userRole
      });

      // 2. Update book status
      await updateDoc(doc(db, 'library', selectedBookForIssue.id), {
        status: 'Borrowed'
      });

      // 3. Notify student
      await addDoc(collection(db, 'notifications'), {
        type: 'Success',
        title: 'Book Issued (Direct)',
        message: `Admin has issued "${selectedBookForIssue.title}" to you. Please collect it.`,
        studentRoll: foundStudent.roll,
        read: false,
        timestamp: new Date().toISOString()
      });

      toast.success(`Book issued to ${foundStudent.name}`);
      setShowIssueModal(false);
      setSelectedBookForIssue(null);
      setFoundStudent(null);
      setStudentSearchForIssue('');
    } catch (error) {
      toast.error('Failed to issue book');
    }
  };

  const studentName = localStorage.getItem('sps_student_name') || 'Student';
  const studentRoll = localStorage.getItem('sps_student_roll') || '';

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'library_requests'), orderBy('timestamp', 'desc'));
    } else {
      q = query(collection(db, 'library_requests'), where('studentRoll', '==', studentRoll), orderBy('timestamp', 'desc'));
    }
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [isAdmin, studentRoll]);

  const handleApproveRequest = async (request: any) => {
    try {
      // 1. Mark request as approved
      await updateDoc(doc(db, 'library_requests', request.id), {
        status: 'Issued'
      });
      // 2. Update book status to Borrowed
      await updateDoc(doc(db, 'library', request.bookId), {
        status: 'Borrowed'
      });
      // 3. Notify student
      await addDoc(collection(db, 'notifications'), {
        type: 'Success',
        title: 'Book Issued!',
        message: `Your request for "${request.bookTitle}" has been approved. Please collect it from the library.`,
        studentRoll: request.studentRoll,
        read: false,
        timestamp: new Date().toISOString()
      });
      toast.success('Book issued successfully');
    } catch (error) {
      toast.error('Failed to issue book');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, 'library_requests', id), {
        status: 'Rejected'
      });
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'library'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && books.length === 0) {
        const initialBooks: Omit<Book, 'id'>[] = [
          { title: 'The Quantum World', author: 'Dr. Alice Weaver', isbn: '978-0123456789', status: 'Available', category: 'Science', color: 'bg-blue-500', description: 'An introduction to quantum mechanics for students.' },
          { title: 'Advanced Calculus', author: 'Robert Miller', isbn: '978-1234567890', status: 'Available', category: 'Mathematics', color: 'bg-purple-500', description: 'Comprehensive guide to multi-variable calculus.' },
          { title: 'The Renaissance Era', author: 'Jane History', isbn: '978-2345678901', status: 'Borrowed', category: 'History', color: 'bg-amber-500', description: 'Exploring the cultural rebirth of Europe.' },
          { title: 'Python for Beginners', author: 'Code Academy', isbn: '978-3456789012', status: 'Available', category: 'Technology', color: 'bg-emerald-500', description: 'Start your coding journey with Python.' },
          { title: 'Classic Short Stories', author: 'Various Authors', isbn: '978-4567890123', status: 'Available', category: 'Literature', color: 'bg-rose-500', description: 'A collection of the world\'s finest short fiction.' },
          { title: 'Master Your Mind', author: 'Steve Focus', isbn: '978-5678901234', status: 'Reserved', category: 'Self-Help', color: 'bg-indigo-500', description: 'Psychology of high performance and focus.' },
          { title: 'Chemistry Lab Guide', author: 'Lab Pros', isbn: '978-6789012345', status: 'Available', category: 'Science', color: 'bg-cyan-500', description: 'Essential safety and procedures for the chemistry lab.' },
          { title: 'Artificial Intelligence', author: 'Future Tech', isbn: '978-7890123456', status: 'Available', category: 'Technology', color: 'bg-orange-500', description: 'The fundamentals of machine learning and neural networks.' },
          { title: 'World Geography', author: 'Eco Explore', isbn: '978-8901234567', status: 'Available', category: 'Science', color: 'bg-emerald-600', description: 'Discovering the diverse landscapes of our planet.' },
          { title: 'Algebra Dynamics', author: 'Math Team', isbn: '978-9012345678', status: 'Available', category: 'Mathematics', color: 'bg-slate-700', description: 'Linear equations and group theory basics.' },
          { title: 'Modern Literature', author: 'LIT Society', isbn: '978-0128765432', status: 'Available', category: 'Literature', color: 'bg-pink-500', description: 'Post-modern analysis of 21st century prose.' },
        ];
        
        for (const book of initialBooks) {
          await addDoc(collection(db, 'library'), book);
        }
      } else {
        const libraryData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Book[];
        setBooks(libraryData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateBook = async (id: string, field: string, value: string) => {
    try {
      await updateDoc(doc(db, 'library', id), {
        [field]: value
      });
    } catch (error) {
      toast.error('Failed to update book');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this book?')) return;
    try {
      await deleteDoc(doc(db, 'library', id));
      toast.success('Book removed from catalog');
    } catch (error) {
      toast.error('Failed to delete book');
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) return;
    
    try {
      await addDoc(collection(db, 'library'), newBook);
      toast.success('Book added to library!');
      setShowAddModal(false);
      setNewBook({
        title: '',
        author: '',
        isbn: '',
        status: 'Available',
        category: 'Science',
        color: 'bg-blue-500',
        description: ''
      });
    } catch (error) {
      toast.error('Failed to add book');
    }
  };

  const handleRequestBook = async (book: Book) => {
    if (!book.id || !studentRoll) return;
    
    try {
      // Create request document
      await addDoc(collection(db, 'library_requests'), {
        bookId: book.id,
        bookTitle: book.title,
        studentName,
        studentRoll,
        status: 'Pending',
        timestamp: new Date().toISOString()
      });

      // Create notification for admins
      await addDoc(collection(db, 'notifications'), {
        type: 'Library Request',
        title: 'New Book Request',
        message: `${studentName} (Roll: ${studentRoll}) requested "${book.title}"`,
        roles: ['principal', 'director', 'teacher'],
        read: false,
        timestamp: new Date().toISOString(),
        actionLink: 'library'
      });

      toast.success(`Issuing Request Sent for "${book.title}"`);
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.isbn.includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && books.length === 0) {
    return (
      <div className="space-y-8 animate-pulse p-4">
        <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-left">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">Digital Library</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{books.length} Books in Collection</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 mr-2">
                <button 
                  onClick={() => setViewMode('catalog')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'catalog' ? "bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 shadow-lg" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Catalog
                </button>
                <button 
                  onClick={() => setViewMode('requests')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    viewMode === 'requests' ? "bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 shadow-lg" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {isAdmin ? 'Requests' : 'My Requests'}
                  {requests.filter(r => r.status === 'Pending').length > 0 && (
                    <span className="w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full animate-bounce">
                      {requests.filter(r => r.status === 'Pending').length}
                    </span>
                  )}
                </button>
              </div>
              {canManageCatalog && (
                <>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      isEditing ? "bg-green-500 text-white border-green-400" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {isEditing ? 'Lock Catalog' : 'Manage Books'}
                  </button>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 dark:shadow-yellow-400/10"
                  >
                    <Plus size={14} strokeWidth={3} />
                    Add New
                  </button>
                </>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Books</p>
                <h4 className="text-2xl font-black italic text-slate-900 dark:text-white">{books.length}</h4>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Borrowed</p>
                <h4 className="text-2xl font-black italic text-slate-900 dark:text-white">
                  {books.filter(b => b.status === 'Borrowed').length}
                </h4>
                <p className="text-[9px] text-yellow-500 font-bold uppercase mt-1">Out of Library</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available</p>
                <h4 className="text-2xl font-black italic text-green-500">
                  {books.filter(b => b.status === 'Available').length}
                </h4>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Requests</p>
                <h4 className="text-2xl font-black italic text-red-500">
                  {requests.filter(r => r.status === 'Pending').length}
                </h4>
              </div>
            </div>
          )}
      </div>

      {viewMode === 'catalog' ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 px-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm focus:ring-2 focus:ring-yellow-400 outline-none transition-all font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shrink-0",
                    selectedCategory === cat 
                      ? "bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 border-slate-900 dark:border-yellow-400 shadow-lg" 
                      : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left px-4 pb-12">
            <AnimatePresence mode="popLayout">
              {filteredBooks.map((book) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={book.id} 
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative"
                >
                  {isEditing && (
                    <button 
                      onClick={() => book.id && handleDeleteBook(book.id)}
                      className="absolute top-6 right-6 z-20 w-10 h-10 bg-red-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg"
                      title="Delete Book"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl opacity-5 dark:opacity-20 transition-all group-hover:scale-150", book.color)}></div>
                  
                  <div className="flex gap-6 relative z-10">
                    <div className={cn(
                      "w-28 h-36 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-2xl group-hover:-translate-y-2 transition-transform relative p-4 text-center",
                      book.color
                    )}>
                      <BookIcon size={32} className="mb-2 opacity-50" />
                      <p className="text-[9px] font-black uppercase tracking-widest line-clamp-2 leading-tight">{book.title}</p>
                    </div>
                    
                    <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500">{book.category}</span>
                          <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate">{book.isbn}</span>
                        </div>
                        
                        {isEditing ? (
                          <input 
                            type="text" 
                            defaultValue={book.title} 
                            onBlur={(e) => book.id && handleUpdateBook(book.id, 'title', e.target.value)}
                            className="w-full text-lg font-black text-slate-900 dark:text-white leading-tight bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-2 outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                        ) : (
                          <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight italic uppercase tracking-tighter truncate group-hover:text-yellow-500 transition-colors">{book.title}</h4>
                        )}

                        {isEditing ? (
                          <input 
                            type="text" 
                            defaultValue={book.author} 
                            onBlur={(e) => book.id && handleUpdateBook(book.id, 'author', e.target.value)}
                            className="w-full text-[10px] text-slate-500 dark:text-slate-400 font-black bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                        ) : (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest opacity-60">By {book.author}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-4">
                        <span className={cn(
                          "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm",
                          book.status === 'Available' ? "bg-green-500 text-white" : 
                          book.status === 'Borrowed' ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" :
                          "bg-yellow-400 text-slate-900 shadow-yellow-400/20"
                        )}>{book.status}</span>
                        {isEditing && (
                          <select 
                            defaultValue={book.status}
                            onChange={(e) => book.id && handleUpdateBook(book.id, 'status', e.target.value)}
                            className="bg-transparent text-[9px] font-black uppercase text-slate-400 outline-none cursor-pointer hover:text-slate-900 dark:hover:text-white"
                          >
                            <option value="Available">Available</option>
                            <option value="Borrowed">Borrowed</option>
                            <option value="Reserved">Reserved</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate flex-1">{book.description || 'No description available for this catalog entry.'}</p>
                    <div className="flex gap-2">
                      {isAdmin && book.status === 'Available' && (
                        <button 
                          onClick={() => {
                            setSelectedBookForIssue(book);
                            setShowIssueModal(true);
                          }}
                          className="px-4 py-2.5 bg-yellow-400 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                          Issue Book
                        </button>
                      )}
                      {!isAdmin && (
                        <button 
                          onClick={() => handleRequestBook(book)}
                          disabled={book.status !== 'Available'}
                          className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-lg shadow-slate-900/10"
                        >
                          Request
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="px-4 space-y-4 pb-12">
          {requests.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
              <BookIcon className="mx-auto text-slate-200 dark:text-slate-800 mb-4" size={64} />
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">No Active Requests</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">When students request books, they will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {requests.map((request) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={request.id}
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-5 text-left">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                          request.status === 'Pending' ? "bg-yellow-100 text-yellow-700" :
                          request.status === 'Issued' ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {request.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">#{request.id?.slice(-6).toUpperCase()}</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight italic uppercase">{request.bookTitle}</h4>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Requested by {request.studentName} (Roll: {request.studentRoll})</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    {request.status === 'Pending' ? (
                      <>
                        <button 
                          onClick={() => handleRejectRequest(request.id)}
                          className="px-6 py-3 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:border-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Decline
                        </button>
                        <button 
                          onClick={() => handleApproveRequest(request)}
                          className="px-8 py-3 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-yellow-400/10 active:scale-95 transition-all"
                        >
                          Issue Book
                        </button>
                      </>
                    ) : (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">
                        Processed on {new Date(request.timestamp).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Direct Issue Modal */}
      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 w-full max-w-md shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => {
                  setShowIssueModal(false);
                  setFoundStudent(null);
                  setStudentSearchForIssue('');
                }}
                className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all"
              >
                <X size={24} />
              </button>

              <div className="text-left mb-8">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Direct Issue</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Book: {selectedBookForIssue?.title}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Roll Number</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter Student Roll..."
                      value={studentSearchForIssue}
                      onChange={(e) => setStudentSearchForIssue(e.target.value)}
                      className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <button 
                      onClick={handleSearchStudent}
                      disabled={isSearchingStudent}
                      className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-yellow-400 hover:text-slate-900 transition-all"
                    >
                      {isSearchingStudent ? '...' : <Search size={18} />}
                    </button>
                  </div>
                </div>

                {foundStudent && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-green-50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-900/20 text-left"
                  >
                    <p className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">Confirm Student</p>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">{foundStudent.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Class: {foundStudent.class} • Roll: {foundStudent.roll}</p>
                  </motion.div>
                )}

                <button 
                  onClick={handleDirectIssue}
                  disabled={!foundStudent}
                  className="w-full py-5 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black uppercase tracking-[0.2em] rounded-3xl shadow-xl active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Confirm Issuance
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Book Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 w-full max-w-xl shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>

              <div className="mb-10 text-left">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Add to Catalog</h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Register a new asset in the digital library</p>
              </div>

              <form onSubmit={handleAddBook} className="space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Book Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. The Art of War"
                      value={newBook.title}
                      onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 placeholder:opacity-30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Author Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Sun Tzu"
                      value={newBook.author}
                      onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 placeholder:opacity-30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">ISBN / ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 978-XXXXX"
                      value={newBook.isbn}
                      onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Category</label>
                    <select 
                      value={newBook.category}
                      onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Asset Description</label>
                  <textarea 
                    value={newBook.description}
                    onChange={(e) => setNewBook({...newBook, description: e.target.value})}
                    placeholder="Short summary of the book content..."
                    rows={2}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 resize-none placeholder:opacity-30"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Cover Theme</label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map(color => (
                      <button 
                        key={color}
                        type="button"
                        onClick={() => setNewBook({...newBook, color})}
                        className={cn(
                          "w-10 h-10 rounded-2xl transition-all shadow-xl",
                          color,
                          newBook.color === color ? "ring-4 ring-yellow-400 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 scale-110" : "opacity-40 hover:opacity-100"
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full py-5 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black uppercase tracking-[0.2em] rounded-3xl shadow-2xl shadow-slate-300 dark:shadow-yellow-400/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Check size={20} />
                    Register Book Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

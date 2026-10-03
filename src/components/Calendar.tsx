import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  MapPin, 
  Trash2, 
  Calendar as CalendarIcon,
  ChevronDown,
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO,
  setYear as setDateYear,
  setMonth as setDateMonth
} from 'date-fns';

interface Event {
  id?: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  type: 'Holiday' | 'Event' | 'Exam' | 'Meeting';
  color?: string;
  staffId?: string;
  staffName?: string;
}

interface StaffShortcut {
  id: string;
  name: string;
  role: string;
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [staff, setStaff] = useState<StaffShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time: '',
    location: '',
    type: 'Event' as Event['type'],
    color: 'bg-yellow-400',
    staffId: ''
  });

  const userRole = localStorage.getItem('sps_user_role') || 'student';
  const canEdit = userRole === 'principal' || userRole === 'director';

  useEffect(() => {
    const qEvents = query(
      collection(db, 'events'), 
      orderBy('date', 'asc')
    );
    
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const eventData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(eventData);
    });

    const qStaff = query(collection(db, 'staff'), orderBy('name', 'asc'));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        role: doc.data().role
      })) as StaffShortcut[];
      setStaff(staffData);
      setLoading(false);
    });

    return () => {
      unsubEvents();
      unsubStaff();
    };
  }, []);

  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedDay) return;

    try {
      const selectedStaffMember = staff.find(s => s.id === formData.staffId);
      
      const eventPayload = {
        ...formData,
        staffName: selectedStaffMember?.name || '',
        date: format(selectedDay, 'yyyy-MM-dd'),
        updatedAt: serverTimestamp()
      };

      if (selectedEvent?.id) {
        await updateDoc(doc(db, 'events', selectedEvent.id), eventPayload);
        toast.success('Event updated');
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventPayload,
          createdAt: serverTimestamp()
        });
        toast.success('Event added to calendar');
      }
      setIsModalOpen(false);
      setSelectedEvent(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!canEdit || !window.confirm('Delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event deleted');
      setIsEventDetailOpen(false);
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      time: '',
      location: '',
      type: 'Event',
      color: 'bg-yellow-400',
      staffId: ''
    });
  };

  const renderHeader = () => (
    <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div className="text-left">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
            {format(currentDate, 'MMMM')}
          </h2>
          <div className="relative">
            <button 
              onClick={() => setShowYearPicker(!showYearPicker)}
              className="text-3xl font-black text-yellow-500 uppercase italic tracking-tight flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              {format(currentDate, 'yyyy')}
              <ChevronDown size={24} />
            </button>
            <AnimatePresence>
              {showYearPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl p-4 z-50 grid grid-cols-3 gap-2 min-w-[240px]"
                >
                  {Array.from({ length: 9 }).map((_, i) => {
                    const year = new Date().getFullYear() - 4 + i;
                    return (
                      <button 
                        key={year}
                        onClick={() => {
                          setCurrentDate(setDateYear(currentDate, year));
                          setShowYearPicker(false);
                        }}
                        className={cn(
                          "py-2 px-3 rounded-xl font-bold transition-all",
                          year === currentDate.getFullYear() 
                            ? "bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900" 
                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        {year}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
          {events.length} Upcoming entries in directory
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all text-slate-600 dark:text-slate-400">
            <ChevronLeft size={20} />
          </button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg transition-all text-slate-600 dark:text-slate-400">
            <ChevronRight size={20} />
          </button>
        </div>
        <button 
          onClick={handleToday}
          className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white transition-all"
        >
          Today
        </button>
        {canEdit && (
          <button 
            onClick={() => {
              setSelectedDay(new Date());
              setSelectedEvent(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="px-6 py-2.5 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all shadow-xl shadow-slate-200 dark:shadow-none"
          >
            <Plus size={16} /> Add Event
          </button>
        )}
      </div>
    </header>
  );

  const renderDays = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none">
        {allDays.map((d, i) => {
          const dateStr = format(d, 'yyyy-MM-dd');
          const dayEvents = events.filter(e => e.date === dateStr);
          const isToday = isSameDay(d, new Date());
          const isCurrentMonth = isSameMonth(d, monthStart);

          return (
            <div 
              key={i} 
              onClick={() => {
                setSelectedDay(d);
                if (canEdit && !dayEvents.length) {
                  setSelectedEvent(null);
                  resetForm();
                  setIsModalOpen(true);
                }
              }}
              className={cn(
                "bg-white dark:bg-slate-900 p-4 min-h-[140px] transition-all cursor-pointer group flex flex-col gap-2 relative",
                !isCurrentMonth && "opacity-30",
                isToday && "bg-yellow-50/30 dark:bg-yellow-400/5",
                "hover:z-10 hover:shadow-xl dark:hover:bg-slate-800/50 hover:scale-[1.02]"
              )}
            >
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-lg font-black italic",
                  isToday ? "text-yellow-500" : "text-slate-900 dark:text-white",
                  !isCurrentMonth && "text-slate-300 dark:text-slate-700"
                )}>{format(d, 'd')}</span>
                {isToday && (
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                )}
              </div>
              
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[80px] scrollbar-hide">
                {dayEvents.map((ev, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(ev);
                      setIsEventDetailOpen(true);
                    }}
                    className={cn(
                      "p-1.5 px-2 text-[9px] font-black uppercase rounded-lg truncate leading-tight shadow-sm border border-black/5 hover:brightness-95 transition-all text-left",
                      ev.type === 'Holiday' ? 'bg-slate-900 dark:bg-slate-800 text-white' : 
                      ev.type === 'Exam' ? 'bg-red-500 text-white' :
                      ev.type === 'Meeting' ? 'bg-blue-500 text-white' :
                      'bg-yellow-400 text-slate-900'
                    )}
                  >
                    {ev.title}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm p-6 md:p-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 dark:bg-slate-800 rounded-full -z-0 opacity-50" />
        
        <div className="relative z-10">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[32px] text-white">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Notice Board</h4>
          <p className="text-xl font-bold italic">Upcoming Academic Review</p>
          <div className="flex items-center gap-2 mt-4 text-yellow-400 text-xs font-bold uppercase">
            <Clock size={14} />
            <span>Check Calendar for details</span>
          </div>
        </div>
        <div className="bg-yellow-400 p-8 rounded-[32px] text-slate-900">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2">School Motto</h4>
          <p className="text-xl font-bold italic">Excellence in Education</p>
          <div className="flex items-center gap-2 mt-4 text-slate-700 text-xs font-bold uppercase">
            <CalendarIcon size={14} />
            <span>Academic Year 2026-27</span>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Total Monthly Events</h4>
          <p className="text-6xl font-black italic text-slate-900 dark:text-white">
            {events.filter(e => e.date.startsWith(format(currentDate, 'yyyy-MM'))).length}
          </p>
          <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase mt-2">Active in directory</p>
        </div>
      </div>

      {/* Add / Edit Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tight">
                    {selectedEvent ? 'Adjust Event' : 'New Directory Entry'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Scheduling for: {selectedDay ? format(selectedDay, 'MMMM do, yyyy') : ''}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="p-8 space-y-5 text-left bg-white dark:bg-slate-900">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Event Title</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white"
                    placeholder="e.g. Annual Sports Meet"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Category</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Event['type'] })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
                    >
                      <option value="Event">General Event</option>
                      <option value="Holiday">Official Holiday</option>
                      <option value="Exam">Examination</option>
                      <option value="Meeting">Staff Meeting</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Time (Optional)</label>
                    <input 
                      type="time" 
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Location / Venue</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white"
                      placeholder="e.g. School Auditorium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Assigned Staff (Optional)</label>
                  <select 
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">No Staff Assigned</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Brief Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-yellow-400 transition-all font-bold text-slate-900 dark:text-white h-24 resize-none"
                    placeholder="Details about the event..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 font-black py-5 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none mt-4 hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all uppercase tracking-widest text-xs"
                >
                  {selectedEvent ? 'UPDATE DIRECTORY' : 'PUBLISH TO CALENDAR'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Details View Modal */}
      <AnimatePresence>
        {isEventDetailOpen && selectedEvent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden text-left border border-slate-100 dark:border-slate-800"
            >
              <div className={cn(
                "p-10 text-white relative",
                selectedEvent.type === 'Holiday' ? 'bg-slate-900 dark:bg-slate-950' : 
                selectedEvent.type === 'Exam' ? 'bg-red-500' :
                selectedEvent.type === 'Meeting' ? 'bg-blue-500' :
                'bg-yellow-400 text-slate-900'
              )}>
                <button 
                  onClick={() => setIsEventDetailOpen(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-black/10 rounded-xl transition-colors text-white"
                >
                  <X size={20} />
                </button>
                <div className="bg-white/20 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                  {selectedEvent.type}
                </div>
                <h3 className="text-3xl font-black italic uppercase leading-none">{selectedEvent.title}</h3>
                <p className={cn("text-xs font-bold uppercase mt-4", selectedEvent.type === 'Event' ? 'text-slate-600' : 'text-white/70')}>
                  {format(parseISO(selectedEvent.date), 'EEEE, MMMM do')}
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  {selectedEvent.time && (
                    <div className="flex items-center gap-4 text-slate-500">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center dark:text-slate-400">
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Scheduled Time</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedEvent.time}</p>
                      </div>
                    </div>
                  )}
                  {selectedEvent.location && (
                    <div className="flex items-center gap-4 text-slate-500">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center dark:text-slate-400">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Venue / Location</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}
                  {selectedEvent.staffName && (
                    <div className="flex items-center gap-4 text-slate-500">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center dark:text-slate-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Assigned Staff</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedEvent.staffName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">Description</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {canEdit && (
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => {
                        setIsEventDetailOpen(false);
                        setFormData({
                          title: selectedEvent.title,
                          description: selectedEvent.description || '',
                          time: selectedEvent.time || '',
                          location: selectedEvent.location || '',
                          type: selectedEvent.type,
                          color: selectedEvent.color || 'bg-yellow-400',
                          staffId: selectedEvent.staffId || ''
                        });
                        setSelectedDay(parseISO(selectedEvent.date));
                        setIsModalOpen(true);
                      }}
                      className="flex-1 py-4 bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-yellow-500 transition-all shadow-xl dark:shadow-none"
                    >
                      EDIT EVENT
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(selectedEvent.id!)}
                      className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all shadow-sm"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

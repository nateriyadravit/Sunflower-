import React, { useState, useEffect } from 'react';
import { GraduationCap, FileSpreadsheet, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { doc, onSnapshot, setDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';

interface MarkRecord {
  subject: string;
  theoryMarks: number;
  projectMarks: number;
  obtained: number;
  total: number;
  grade: string;
}

interface StudentResult {
  name: string;
  class: string;
  roll: string;
  marks: MarkRecord[];
  teacherRemarks?: string;
  promotionStatus?: string;
  attendance?: string;
}

interface MarksheetProps {
  role: 'student' | 'teacher' | 'principal' | 'director' | null;
}

export function MarksheetView({ role }: MarksheetProps) {
  const [rollNo, setRollNo] = useState(() => {
    return localStorage.getItem('sps_student_roll') || '';
  });
  const [showResult, setShowResult] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (role === 'teacher' || role === 'principal' || role === 'director') {
      const q = query(collection(db, 'students'), orderBy('name', 'asc'));
      getDocs(q).then(snap => {
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }).catch(e => handleFirestoreError(e, OperationType.LIST, 'students'));
    }
  }, [role]);

  useEffect(() => {
    if ((role !== 'student' || showResult) && (rollNo || role !== 'student')) {
      const currentRoll = rollNo || '101';
      setLoading(true);
      const unsub = onSnapshot(doc(db, 'marks', `STUDENT_${currentRoll}`), (docSnap) => {
        if (docSnap.exists()) {
          setResult(docSnap.data() as StudentResult);
        } else {
          // Auto-generate unique marksheet for every student roll
          const studentName = role === 'student' ? (localStorage.getItem('sps_student_name') || 'Student') : (students.find(s => s.roll === currentRoll)?.name || 'Kabir Verma');
          const rollNum = parseInt(currentRoll) || 0;
          const isEven = rollNum % 2 === 0;
          
          const initialData: StudentResult = {
            name: studentName,
            class: `Class ${role === 'student' ? (localStorage.getItem('sps_student_class') || '6') : (students.find(s => s.roll === currentRoll)?.class || '6')} - A`,
            roll: currentRoll,
            teacherRemarks: isEven ? 'Excellent progress, keep it up!' : 'Hardworking student. Needs more practice in math.',
            promotionStatus: 'Promoted to Next Class',
            attendance: `${180 + (rollNum % 20)}/210`,
            marks: [
              { subject: 'Mathematics', theoryMarks: 50 + (rollNum % 40), projectMarks: 20, obtained: 70 + (rollNum % 40), total: 100, grade: calculateGrade(70 + (rollNum % 40)) },
              { subject: 'Science', theoryMarks: 60 + (rollNum % 30), projectMarks: 20, obtained: 80 + (rollNum % 30), total: 100, grade: calculateGrade(80 + (rollNum % 30)) },
              { subject: 'English', theoryMarks: 55 + (rollNum % 35), projectMarks: 20, obtained: 75 + (rollNum % 35), total: 100, grade: calculateGrade(75 + (rollNum % 35)) },
              { subject: 'Social Studies', theoryMarks: 45 + (rollNum % 45), projectMarks: 20, obtained: 65 + (rollNum % 45), total: 100, grade: calculateGrade(65 + (rollNum % 45)) },
              { subject: 'Hindi', theoryMarks: 52 + (rollNum % 38), projectMarks: 20, obtained: 72 + (rollNum % 38), total: 100, grade: calculateGrade(72 + (rollNum % 38)) },
            ]
          };
          setDoc(doc(db, 'marks', `STUDENT_${currentRoll}`), initialData);
          setResult(initialData);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `marks/STUDENT_${currentRoll}`);
      });
      return () => unsub();
    }
  }, [showResult, rollNo, role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNo.trim()) return;
    setShowResult(true);
  };

  const calculateGrade = (total: number) => {
    if (total >= 90) return 'A+';
    if (total >= 80) return 'A';
    if (total >= 70) return 'B+';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C+';
    if (total >= 40) return 'C';
    return 'D';
  };

  const handleUpdateTheoryMark = async (index: number, val: number) => {
    if (!result) return;
    const newMarks = [...result.marks];
    newMarks[index].theoryMarks = val;
    newMarks[index].obtained = val + (newMarks[index].projectMarks || 0);
    newMarks[index].grade = calculateGrade(newMarks[index].obtained);
    await updateDoc(doc(db, 'marks', `STUDENT_${result.roll}`), { marks: newMarks });
  };

  const handleUpdateProjectMark = async (index: number, val: number) => {
    if (!result) return;
    const newMarks = [...result.marks];
    newMarks[index].projectMarks = val;
    newMarks[index].obtained = val + (newMarks[index].theoryMarks || 0);
    newMarks[index].grade = calculateGrade(newMarks[index].obtained);
    await updateDoc(doc(db, 'marks', `STUDENT_${result.roll}`), { marks: newMarks });
  };

  const handleUpdateObtainedMark = async (index: number, val: number) => {
    if (!result) return;
    const newMarks = [...result.marks];
    newMarks[index].obtained = val;
    newMarks[index].grade = calculateGrade(val);
    await updateDoc(doc(db, 'marks', `STUDENT_${result.roll}`), { marks: newMarks });
  };

  const handleUpdateInfo = async (field: keyof StudentResult, val: string) => {
    if (!result) return;
    await updateDoc(doc(db, 'marks', `STUDENT_${result.roll}`), { [field]: val });
  };

  const totalObtained = result?.marks.reduce((sum, m) => sum + m.obtained, 0) || 0;
  const totalMax = result?.marks.reduce((sum, m) => sum + m.total, 0) || 100;
  const percentage = Math.round((totalObtained / totalMax) * 100);

  if (role === 'teacher' || role === 'principal' || role === 'director') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-[10px] tracking-widest">Select Student</h4>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text"
                placeholder="Search name/roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
              />
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
              {students
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.roll.includes(searchQuery))
                .map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setRollNo(s.roll);
                    setShowResult(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    rollNo === s.roll ? "bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900 shadow-lg" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{s.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{s.name}</p>
                    <p className="text-[9px] opacity-60">Roll: {s.roll} • Class {s.class}</p>
                    {s.email && <p className="text-[8px] opacity-40 truncate lowercase">{s.email}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-3">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
                  <div className="space-y-2">
                    <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-32 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                  </div>
                </div>
                <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-24 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
                ))}
              </div>
            </div>
          ) : result ? (
             <div className="space-y-6 text-left">
               <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none">
                 <header className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
                   <div className="flex gap-4">
                     <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center">
                       <GraduationCap className="w-10 h-10 text-slate-900" />
                     </div>
                     <div className="text-left">
                       <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Progress Report</h2>
                       <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold tracking-tight">Sunflower Public School • Term 1</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (isEditing) toast.success('Marks state locked');
                          setIsEditing(!isEditing);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                          isEditing ? "bg-green-500 text-white" : "bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-900"
                        )}
                      >
                        {isEditing ? <CheckCircle2 size={16} /> : <FileSpreadsheet size={16} />}
                        {isEditing ? 'Save Changes' : 'Modify Marks'}
                      </button>
                      <button 
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 print:hidden"
                      >
                        <FileSpreadsheet size={16} /> Export
                      </button>
                    </div>
                  </header>
          
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-12 text-left">
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Student Name</p>
                       {isEditing ? (
                         <input 
                           type="text" 
                           defaultValue={result.name} 
                           onBlur={(e) => handleUpdateInfo('name', e.target.value)}
                           className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold text-slate-900 dark:text-white"
                         />
                       ) : (
                         <p className="font-bold text-slate-900 dark:text-white">{result.name}</p>
                       )}
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Class & Section</p>
                       {isEditing ? (
                         <input 
                           type="text" 
                           defaultValue={result.class} 
                           onBlur={(e) => handleUpdateInfo('class', e.target.value)}
                           className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold text-slate-900 dark:text-white"
                         />
                       ) : (
                         <p className="font-bold text-slate-900 dark:text-white">{result.class}</p>
                       )}
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Roll Number</p>
                       <p className="font-mono text-slate-900 dark:text-slate-100">#SV-2026-{result.roll}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Attendance</p>
                       {isEditing ? (
                         <input 
                           type="text" 
                           defaultValue={result.attendance} 
                           onBlur={(e) => handleUpdateInfo('attendance', e.target.value)}
                           className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold text-slate-900 dark:text-white"
                         />
                       ) : (
                         <p className="font-bold text-slate-900 dark:text-white">{result.attendance || 'N/A'}</p>
                       )}
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                       <p className={cn(
                          "font-bold px-2 py-0.5 rounded text-sm inline-block",
                          percentage >= 40 ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                       )}>
                         {percentage >= 40 ? 'Pass' : 'Fail'}
                       </p>
                     </div>
                   </div>
           
                   <table className="w-full text-left mb-8">
                     <thead>
                       <tr className="border-b-2 border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider text-slate-400">
                         <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Subject</th>
                         <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Theory</th>
                         <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Project</th>
                         <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Obtained</th>
                         <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Total</th>
                         <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Grade</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {result.marks.map((row, i) => (
                         <tr key={i}>
                           <td className="py-4 font-medium text-slate-700 dark:text-slate-300">{row.subject}</td>
                           <td className="py-4">
                             {isEditing ? (
                               <input 
                                 type="number" 
                                 defaultValue={row.theoryMarks} 
                                 onBlur={(e) => handleUpdateTheoryMark(i, parseInt(e.target.value) || 0)}
                                 className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold text-slate-900 dark:text-white"
                               />
                             ) : (
                               <span className="font-bold text-slate-900 dark:text-white">{row.theoryMarks}</span>
                             )}
                           </td>
                           <td className="py-4">
                             {isEditing ? (
                               <input 
                                 type="number" 
                                 defaultValue={row.projectMarks} 
                                 onBlur={(e) => handleUpdateProjectMark(i, parseInt(e.target.value) || 0)}
                                 className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold text-slate-900 dark:text-white"
                               />
                             ) : (
                               <span className="font-bold text-slate-900 dark:text-white">{row.projectMarks}</span>
                             )}
                           </td>
                           <td className="py-4 text-slate-900 dark:text-white font-black">
                             {isEditing ? (
                               <input 
                                 type="number" 
                                 defaultValue={row.obtained} 
                                 onBlur={(e) => handleUpdateObtainedMark(i, parseInt(e.target.value) || 0)}
                                 className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold text-slate-900 dark:text-white"
                               />
                             ) : (
                               row.obtained
                             )}
                           </td>
                           <td className="py-4 text-slate-500 dark:text-slate-400 font-medium">{row.total}</td>
                           <td className="py-4">
                             <span className={cn(
                               "px-2 py-1 rounded text-xs font-bold",
                               row.obtained >= 80 ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : row.obtained >= 60 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                             )}>{row.grade}</span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot>
                       <tr className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                         <td className="py-4 px-4 font-bold text-slate-900 dark:text-white uppercase text-[10px]">Total Marks</td>
                         <td colSpan={2} className="py-4 font-bold text-xl text-slate-900 dark:text-white text-center">Grand Total</td>
                         <td className="py-4 font-bold text-xl text-slate-900 dark:text-white">{totalObtained}</td>
                         <td className="py-4 font-bold text-slate-500 dark:text-slate-400">{totalMax}</td>
                         <td className="py-4 text-right px-4">
                           <span className="text-xl font-black text-slate-900 dark:text-white">{percentage}% Aggregate</span>
                         </td>
                       </tr>
                     </tfoot>
                   </table>

                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Teacher Remarks</label>
                        {isEditing ? (
                          <textarea 
                            defaultValue={result.teacherRemarks}
                            onBlur={(e) => handleUpdateInfo('teacherRemarks', e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                            rows={3}
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic">"{result.teacherRemarks || 'No remarks provided.'}"</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Promotion Status</label>
                        {isEditing ? (
                          <select 
                            defaultValue={result.promotionStatus}
                            onChange={(e) => handleUpdateInfo('promotionStatus', e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-yellow-400 font-bold dark:text-white"
                          >
                            <option value="">Under Review</option>
                            <option value="Promoted to Next Class">Promoted to Next Class</option>
                            <option value="Promoted with Grace">Promoted with Grace</option>
                            <option value="Detained in Same Class">Detained in Same Class</option>
                            <option value="Fail">Fail</option>
                          </select>
                        ) : (
                          <p className={cn(
                            "text-lg font-black",
                            result.promotionStatus?.includes('Promoted') ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>{result.promotionStatus || 'Under Review'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8 pt-12 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-center">
                      {isEditing ? (
                         <div className="space-y-1">
                           <input 
                             type="text" 
                             placeholder="Teacher Name"
                             className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 text-center text-[10px] font-bold text-slate-900 dark:text-white outline-none"
                           />
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Class Teacher</p>
                         </div>
                      ) : (
                        <>
                          <div className="h-px bg-slate-200 dark:bg-slate-800 w-32 mx-auto mb-2"></div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Class Teacher</p>
                        </>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="flex flex-col items-center">
                        <div className="h-10 flex items-center justify-center italic text-slate-400 dark:text-slate-600 text-[10px]">
                          {/* Sign Placeholder */}
                          <p className="font-serif tracking-widest opacity-40">Chandan Marks</p>
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 w-32 mx-auto mb-2"></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Headmaster Sign</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="h-px bg-slate-200 dark:bg-slate-800 w-32 mx-auto mb-2"></div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Parent Sign</p>
                    </div>
                  </div>
               </div>
             </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mb-4">
                <Search size={32} />
              </div>
              <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-xs">Select a student to view or generate marksheet</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading && !result) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto text-left animate-pulse">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
              <div className="space-y-2">
                <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-32 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
              </div>
            </div>
            <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-24 bg-slate-50 dark:bg-slate-800/50 rounded"></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return <div className="p-12 text-center text-red-400 font-bold italic uppercase tracking-widest bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md mx-auto mt-12">Result Not Published Yet</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-left">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none">
        <header className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-slate-900" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Progress Report</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold tracking-tight">Sunflower Public School • Term 1</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 print:hidden"
            >
              <FileSpreadsheet size={16} /> Export
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-12 text-left">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Student Name</p>
            <p className="font-bold text-slate-900 dark:text-white">{result.name}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Class & Section</p>
            <p className="font-bold text-slate-900 dark:text-white">{result.class}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Roll Number</p>
            <p className="font-mono text-slate-900 dark:text-slate-100">#SV-2026-{result.roll}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Attendance</p>
            <p className="font-bold text-slate-900 dark:text-white">{result.attendance || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Result Status</p>
            <p className={cn(
               "font-bold px-2 py-0.5 rounded text-sm inline-block",
               percentage >= 40 ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
            )}>
              {percentage >= 40 ? 'Pass' : 'Fail'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left mb-8">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider text-slate-400">
                <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Subject</th>
                <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Theory</th>
                <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Project</th>
                <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Obtained</th>
                <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Total</th>
                <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.marks.map((row, i) => (
                <tr key={i}>
                  <td className="py-4 font-medium text-slate-700 dark:text-slate-300">{row.subject}</td>
                  <td className="py-4">
                    <span className="font-bold text-slate-900 dark:text-white">{row.theoryMarks}</span>
                  </td>
                  <td className="py-4 text-slate-900 dark:text-white font-bold">{row.projectMarks}</td>
                  <td className="py-4 text-slate-900 dark:text-white font-black">{row.obtained}</td>
                  <td className="py-4 text-slate-500 dark:text-slate-400 font-medium">{row.total}</td>
                  <td className="py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold",
                      row.obtained >= 80 ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : row.obtained >= 60 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                    )}>{row.grade}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <td className="py-4 px-4 font-bold text-slate-900 dark:text-white uppercase text-[10px]">Total Marks</td>
                <td colSpan={2} className="py-4 font-bold text-xl text-slate-900 dark:text-white text-center">Grand Total</td>
                <td className="py-4 font-bold text-xl text-slate-900 dark:text-white">{totalObtained}</td>
                <td className="py-4 font-bold text-slate-500 dark:text-slate-400">{totalMax}</td>
                <td className="py-4 text-right px-4">
                  <span className="text-xl font-black text-slate-900 dark:text-white">{percentage}% Aggregate</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Teacher Remarks</label>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic">"{result.teacherRemarks || 'No remarks provided.'}"</p>
            </div>
          </div>
          <div className="space-y-4">
             <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Promotion Status</label>
              <p className="text-lg font-black text-slate-900 dark:text-white">{result.promotionStatus || 'Under Review'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-12 border-t border-slate-100 dark:border-slate-800">
          <div className="text-center">
            <div className="h-px bg-slate-200 dark:bg-slate-800 w-32 mx-auto mb-2"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Class Teacher</p>
          </div>
          <div className="text-center">
            <div className="h-px bg-slate-200 dark:bg-slate-800 w-32 mx-auto mb-2"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Headmaster Sign</p>
          </div>
          <div className="text-center">
            <div className="h-px bg-slate-200 dark:bg-slate-800 w-32 mx-auto mb-2"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Parent Sign</p>
          </div>
        </div>
      </div>
    </div>
  );
}

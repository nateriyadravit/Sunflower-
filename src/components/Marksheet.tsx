import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  FileSpreadsheet, 
  Search, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  LineChart as LineChartIcon,
  Award,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  History
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend
} from 'recharts';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { doc, onSnapshot, setDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';

export interface MarkRecord {
  subject: string;
  theoryMarks: number;
  projectMarks: number;
  obtained: number;
  total: number;
  grade: string;
  previousObtained?: number;
}

export interface ExamHistoryPoint {
  term: string;
  percentage: number;
  obtained: number;
  total: number;
  date: string;
}

export interface StudentResult {
  name: string;
  class: string;
  roll: string;
  marks: MarkRecord[];
  previousExamName?: string;
  currentExamName?: string;
  examHistory?: ExamHistoryPoint[];
  teacherRemarks?: string;
  promotionStatus?: string;
  attendance?: string;
}

interface MarksheetProps {
  role: 'student' | 'teacher' | 'principal' | 'director' | null;
}

// Custom Tooltip for Subject Comparison Line Graph
const SubjectComparisonTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const currentVal = payload.find((p: any) => p.dataKey === 'current')?.value ?? 0;
    const prevVal = payload.find((p: any) => p.dataKey === 'previous')?.value ?? 0;
    const diff = currentVal - prevVal;

    return (
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[200px] z-50">
        <p className="font-black text-slate-900 dark:text-white mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
          {label}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block shadow-sm"></span>
              Current Result:
            </span>
            <span className="font-black text-slate-900 dark:text-white">{currentVal} / 100</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-sm"></span>
              Previous Result:
            </span>
            <span className="font-bold text-slate-600 dark:text-slate-300">{prevVal} / 100</span>
          </div>
          <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Progress:</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1",
              diff >= 0 ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
            )}>
              {diff >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {diff >= 0 ? `+${diff}` : diff} marks ({diff >= 0 ? 'Improved' : 'Dropped'})
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Timeline Progress Line Graph
const TimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[180px] z-50">
        <p className="font-black text-slate-900 dark:text-white mb-1 text-sm">{label}</p>
        {data?.date && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">{data.date}</p>}
        <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Score Aggregate:</span>
            <span className="font-black text-amber-500 text-sm">{data?.percentage}%</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Marks:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{data?.obtained} / {data?.total}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

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
  const [chartMode, setChartMode] = useState<'comparison' | 'timeline'>('comparison');

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
          const data = docSnap.data() as StudentResult;
          // Ensure previous marks and history are initialized for comparison graph
          const rollNum = parseInt(currentRoll) || 101;
          let needsUpdate = false;
          let updatedMarks = data.marks;

          if (!data.marks || data.marks.length === 0) {
            updatedMarks = [
              { subject: 'Mathematics', theoryMarks: 50 + (rollNum % 40), projectMarks: 20, obtained: 70 + (rollNum % 40), total: 100, grade: calculateGrade(70 + (rollNum % 40)), previousObtained: Math.max(35, (70 + (rollNum % 40)) - 8 + (rollNum % 7)) },
              { subject: 'Science', theoryMarks: 60 + (rollNum % 30), projectMarks: 20, obtained: 80 + (rollNum % 30), total: 100, grade: calculateGrade(80 + (rollNum % 30)), previousObtained: Math.max(35, (80 + (rollNum % 30)) - 10 + (rollNum % 6)) },
              { subject: 'English', theoryMarks: 55 + (rollNum % 35), projectMarks: 20, obtained: 75 + (rollNum % 35), total: 100, grade: calculateGrade(75 + (rollNum % 35)), previousObtained: Math.max(35, (75 + (rollNum % 35)) - 5 + (rollNum % 5)) },
              { subject: 'Social Studies', theoryMarks: 45 + (rollNum % 45), projectMarks: 20, obtained: 65 + (rollNum % 45), total: 100, grade: calculateGrade(65 + (rollNum % 45)), previousObtained: Math.max(35, (65 + (rollNum % 45)) - 7 + (rollNum % 8)) },
              { subject: 'Hindi', theoryMarks: 52 + (rollNum % 38), projectMarks: 20, obtained: 72 + (rollNum % 38), total: 100, grade: calculateGrade(72 + (rollNum % 38)), previousObtained: Math.max(35, (72 + (rollNum % 38)) - 4 + (rollNum % 4)) },
            ];
            needsUpdate = true;
          } else if (data.marks.some(m => m.previousObtained === undefined)) {
            updatedMarks = data.marks.map((m, idx) => ({
              ...m,
              previousObtained: m.previousObtained !== undefined 
                ? m.previousObtained 
                : Math.max(35, Math.min(100, m.obtained - (6 - ((rollNum + idx * 3) % 12))))
            }));
            needsUpdate = true;
          }

          const currentTotal = updatedMarks.reduce((sum, m) => sum + m.obtained, 0);
          const currentMax = updatedMarks.reduce((sum, m) => sum + m.total, 0) || 500;
          const currentPct = Math.round((currentTotal / currentMax) * 100);

          const defaultHistory: ExamHistoryPoint[] = [
            { term: 'Unit Test 1', percentage: Math.max(40, currentPct - 12), obtained: Math.round(((currentPct - 12) / 100) * currentMax), total: currentMax, date: 'Aug 2025' },
            { term: 'Quarterly', percentage: Math.max(42, currentPct - 8), obtained: Math.round(((currentPct - 8) / 100) * currentMax), total: currentMax, date: 'Oct 2025' },
            { term: 'Half-Yearly', percentage: Math.max(45, currentPct - 5), obtained: Math.round(((currentPct - 5) / 100) * currentMax), total: currentMax, date: 'Dec 2025' },
            { term: 'Term 1 (Current)', percentage: currentPct, obtained: currentTotal, total: currentMax, date: 'Mar 2026' }
          ];

          const fullResult: StudentResult = {
            ...data,
            marks: updatedMarks,
            previousExamName: data.previousExamName || 'Half-Yearly Examination',
            currentExamName: data.currentExamName || 'Term 1 (Annual Examination)',
            examHistory: data.examHistory && data.examHistory.length > 0 ? data.examHistory : defaultHistory
          };

          if (needsUpdate) {
            updateDoc(doc(db, 'marks', `STUDENT_${currentRoll}`), {
              marks: updatedMarks,
              previousExamName: fullResult.previousExamName,
              currentExamName: fullResult.currentExamName,
              examHistory: fullResult.examHistory
            }).catch(() => {});
          }

          setResult(fullResult);
        } else {
          // Auto-generate unique marksheet with comparison history
          const studentName = role === 'student' ? (localStorage.getItem('sps_student_name') || 'Student') : (students.find(s => s.roll === currentRoll)?.name || 'Kabir Verma');
          const rollNum = parseInt(currentRoll) || 101;
          const isEven = rollNum % 2 === 0;

          const defaultMarks: MarkRecord[] = [
            { subject: 'Mathematics', theoryMarks: 50 + (rollNum % 40), projectMarks: 20, obtained: 70 + (rollNum % 40), total: 100, grade: calculateGrade(70 + (rollNum % 40)), previousObtained: Math.max(35, 62 + (rollNum % 35)) },
            { subject: 'Science', theoryMarks: 60 + (rollNum % 30), projectMarks: 20, obtained: 80 + (rollNum % 30), total: 100, grade: calculateGrade(80 + (rollNum % 30)), previousObtained: Math.max(35, 71 + (rollNum % 25)) },
            { subject: 'English', theoryMarks: 55 + (rollNum % 35), projectMarks: 20, obtained: 75 + (rollNum % 35), total: 100, grade: calculateGrade(75 + (rollNum % 35)), previousObtained: Math.max(35, 68 + (rollNum % 30)) },
            { subject: 'Social Studies', theoryMarks: 45 + (rollNum % 45), projectMarks: 20, obtained: 65 + (rollNum % 45), total: 100, grade: calculateGrade(65 + (rollNum % 45)), previousObtained: Math.max(35, 59 + (rollNum % 38)) },
            { subject: 'Hindi', theoryMarks: 52 + (rollNum % 38), projectMarks: 20, obtained: 72 + (rollNum % 38), total: 100, grade: calculateGrade(72 + (rollNum % 38)), previousObtained: Math.max(35, 66 + (rollNum % 32)) },
          ];

          const totalObt = defaultMarks.reduce((sum, m) => sum + m.obtained, 0);
          const totalM = defaultMarks.reduce((sum, m) => sum + m.total, 0);
          const currentPct = Math.round((totalObt / totalM) * 100);

          const initialData: StudentResult = {
            name: studentName,
            class: `Class ${role === 'student' ? (localStorage.getItem('sps_student_class') || '6') : (students.find(s => s.roll === currentRoll)?.class || '6')} - A`,
            roll: currentRoll,
            previousExamName: 'Half-Yearly Examination',
            currentExamName: 'Term 1 (Annual Examination)',
            teacherRemarks: isEven ? 'Excellent progress, keep it up!' : 'Hardworking student. Showing steady improvement across terms.',
            promotionStatus: 'Promoted to Next Class',
            attendance: `${180 + (rollNum % 20)}/210`,
            marks: defaultMarks,
            examHistory: [
              { term: 'Unit Test 1', percentage: Math.max(40, currentPct - 12), obtained: Math.round(((currentPct - 12) / 100) * totalM), total: totalM, date: 'Aug 2025' },
              { term: 'Quarterly', percentage: Math.max(42, currentPct - 8), obtained: Math.round(((currentPct - 8) / 100) * totalM), total: totalM, date: 'Oct 2025' },
              { term: 'Half-Yearly', percentage: Math.max(45, currentPct - 5), obtained: Math.round(((currentPct - 5) / 100) * totalM), total: totalM, date: 'Dec 2025' },
              { term: 'Term 1 (Current)', percentage: currentPct, obtained: totalObt, total: totalM, date: 'Mar 2026' }
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

  const handleUpdatePreviousMark = async (index: number, val: number) => {
    if (!result) return;
    const newMarks = [...result.marks];
    newMarks[index].previousObtained = val;
    await updateDoc(doc(db, 'marks', `STUDENT_${result.roll}`), { marks: newMarks });
  };

  const handleUpdateInfo = async (field: keyof StudentResult, val: string) => {
    if (!result) return;
    await updateDoc(doc(db, 'marks', `STUDENT_${result.roll}`), { [field]: val });
  };

  const totalObtained = result?.marks.reduce((sum, m) => sum + m.obtained, 0) || 0;
  const totalMax = result?.marks.reduce((sum, m) => sum + m.total, 0) || 100;
  const percentage = Math.round((totalObtained / totalMax) * 100);

  const prevTotalObtained = result?.marks.reduce((sum, m) => sum + (m.previousObtained ?? m.obtained), 0) || 0;
  const prevPercentage = Math.round((prevTotalObtained / totalMax) * 100);
  const netGrowth = percentage - prevPercentage;

  // Comparison data formatted for Recharts LineChart
  const comparisonData = (result?.marks || []).map((m) => {
    const prev = m.previousObtained ?? Math.max(30, m.obtained - 5);
    return {
      subject: m.subject,
      shortSubject: m.subject.length > 10 ? m.subject.substring(0, 8) + '..' : m.subject,
      current: m.obtained,
      previous: prev,
      diff: m.obtained - prev,
      max: m.total
    };
  });

  // Timeline data for progress over time LineChart
  const timelineData = (result?.examHistory && result.examHistory.length > 0)
    ? result.examHistory.map(h => ({
        term: h.term,
        percentage: h.percentage,
        obtained: h.obtained,
        total: h.total,
        date: h.date
      }))
    : [
        { term: 'Unit Test 1', percentage: Math.max(40, percentage - 12), obtained: 320, total: 500, date: 'Aug 2025' },
        { term: 'Quarterly', percentage: Math.max(42, percentage - 8), obtained: 340, total: 500, date: 'Oct 2025' },
        { term: 'Half-Yearly', percentage: prevPercentage, obtained: prevTotalObtained, total: totalMax, date: 'Dec 2025' },
        { term: 'Term 1 (Current)', percentage: percentage, obtained: totalObtained, total: totalMax, date: 'Mar 2026' }
      ];

  // Best improved subject
  const bestImproved = comparisonData.reduce((best, cur) => {
    return (!best || cur.diff > best.diff) ? cur : best;
  }, comparisonData[0]);

  // Sub-component: Progress and Recharts Visualization
  const renderProgressAnalytics = () => (
    <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-6 my-8 shadow-sm">
      {/* Analytics Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-xl">
              <LineChartIcon size={18} />
            </span>
            <h3 className="font-black text-slate-900 dark:text-white text-base md:text-lg tracking-tight">
              Academic Progress & Examination Comparison
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Comparing <span className="font-bold text-slate-800 dark:text-slate-200">{result?.currentExamName || 'Current Examination'}</span> with <span className="font-bold text-slate-800 dark:text-slate-200">{result?.previousExamName || 'Previous Examination'}</span> over time.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setChartMode('comparison')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              chartMode === 'comparison'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Layers size={14} /> Subject Comparison
          </button>
          <button
            onClick={() => setChartMode('timeline')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              chartMode === 'timeline'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <History size={14} /> Progress Timeline
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Exam</span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{percentage}%</span>
            <span className="text-[11px] font-bold text-slate-400">({totalObtained}/{totalMax})</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">Term 1 Results</p>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Previous Exam</span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{prevPercentage}%</span>
            <span className="text-[11px] font-bold text-slate-400">({prevTotalObtained}/{totalMax})</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">Half-Yearly Results</p>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Growth Rate</span>
            {netGrowth >= 0 ? (
              <span className="p-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
                <TrendingUp size={14} />
              </span>
            ) : (
              <span className="p-1 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-lg">
                <TrendingDown size={14} />
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={cn(
              "text-2xl font-black",
              netGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {netGrowth >= 0 ? `+${netGrowth}%` : `${netGrowth}%`}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {netGrowth >= 0 ? 'Positive upward trajectory' : 'Needs attention'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Top Growth</span>
            <span className="p-1 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-lg">
              <Sparkles size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">
              {bestImproved ? bestImproved.subject : 'N/A'}
            </span>
          </div>
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {bestImproved ? `+${bestImproved.diff} marks jump` : ''}
          </p>
        </div>
      </div>

      {/* Main Recharts Line Graph */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-6 shadow-xs">
        {chartMode === 'comparison' ? (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Subject-Wise Performance: Current vs Previous Exam
                </h4>
                <p className="text-[11px] text-slate-400">
                  Solid yellow line indicates current exam score; dashed purple line indicates previous result.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="w-3 h-1 bg-yellow-400 rounded-full inline-block"></span> Current Exam
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="w-3 h-1 bg-indigo-500 rounded-full inline-block border-b border-dashed"></span> Previous Exam
                </span>
              </div>
            </div>

            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={comparisonData} 
                  margin={{ top: 15, right: 20, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" opacity={0.6} />
                  <XAxis 
                    dataKey="subject" 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <Tooltip content={<SubjectComparisonTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="current" 
                    name="Current Exam" 
                    stroke="#eab308" 
                    strokeWidth={3.5}
                    dot={{ r: 5, strokeWidth: 2, fill: '#fef08a', stroke: '#ca8a04' }}
                    activeDot={{ r: 8, strokeWidth: 3, fill: '#eab308', stroke: '#ffffff' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="previous" 
                    name="Previous Exam" 
                    stroke="#6366f1" 
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 4, strokeWidth: 2, fill: '#c7d2fe', stroke: '#4f46e5' }}
                    activeDot={{ r: 7, strokeWidth: 2, fill: '#6366f1', stroke: '#ffffff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Academic Progress Over Time (Term-Wise Historical Trajectory)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tracks aggregate percentage across examinations conducted throughout the school session.
                </p>
              </div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp size={14} /> Continual Improvement
              </div>
            </div>

            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={timelineData} 
                  margin={{ top: 15, right: 20, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" opacity={0.6} />
                  <XAxis 
                    dataKey="term" 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <Tooltip content={<TimelineTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    name="Aggregate %" 
                    stroke="#10b981" 
                    strokeWidth={3.5}
                    dot={{ r: 5, strokeWidth: 2, fill: '#a7f3d0', stroke: '#059669' }}
                    activeDot={{ r: 8, strokeWidth: 3, fill: '#10b981', stroke: '#ffffff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Common Table of Marks for both views with Previous Exam column
  const renderMarksTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left mb-8 min-w-[620px]">
        <thead>
          <tr className="border-b-2 border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider text-slate-400">
            <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Subject</th>
            <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Theory</th>
            <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Project</th>
            <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Obtained</th>
            <th className="py-4 font-bold text-indigo-600 dark:text-indigo-400">Previous Exam</th>
            <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Progress</th>
            <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Total</th>
            <th className="py-4 font-bold text-slate-900 dark:text-slate-300">Grade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {result?.marks.map((row, i) => {
            const prev = row.previousObtained ?? Math.max(30, row.obtained - 5);
            const delta = row.obtained - prev;
            return (
              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-4 font-medium text-slate-800 dark:text-slate-200">{row.subject}</td>
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
                <td className="py-4 text-slate-900 dark:text-white font-black text-sm">
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
                <td className="py-4 font-bold text-indigo-600 dark:text-indigo-400">
                  {isEditing ? (
                    <input 
                      type="number" 
                      defaultValue={prev} 
                      onBlur={(e) => handleUpdatePreviousMark(i, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded font-bold text-indigo-700 dark:text-indigo-300"
                    />
                  ) : (
                    <span>{prev}</span>
                  )}
                </td>
                <td className="py-4">
                  <span className={cn(
                    "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold",
                    delta >= 0 
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" 
                      : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                  )}>
                    {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {delta >= 0 ? `+${delta}` : delta}
                  </span>
                </td>
                <td className="py-4 text-slate-500 dark:text-slate-400 font-medium">{row.total}</td>
                <td className="py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-black",
                    row.obtained >= 80 ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : row.obtained >= 60 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                  )}>{row.grade}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <td className="py-4 px-4 font-bold text-slate-900 dark:text-white uppercase text-[10px]">Total Marks</td>
            <td colSpan={2} className="py-4 font-bold text-sm text-slate-600 dark:text-slate-300">Grand Total</td>
            <td className="py-4 font-black text-xl text-slate-900 dark:text-white">{totalObtained}</td>
            <td className="py-4 font-bold text-indigo-600 dark:text-indigo-400">{prevTotalObtained}</td>
            <td className="py-4">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-black",
                netGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {netGrowth >= 0 ? `+${netGrowth}%` : `${netGrowth}%`}
              </span>
            </td>
            <td className="py-4 font-bold text-slate-500 dark:text-slate-400">{totalMax}</td>
            <td className="py-4 text-right px-4">
              <span className="text-xl font-black text-slate-900 dark:text-white">{percentage}% Aggregate</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  // Teacher / Principal / Director layout
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
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse space-y-6">
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl w-1/3"></div>
              <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full"></div>
              <div className="h-60 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full"></div>
            </div>
          ) : result ? (
             <div className="space-y-6 text-left">
               <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none">
                 <header className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
                   <div className="flex gap-4">
                     <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
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
                          if (isEditing) toast.success('Marks updated and locked');
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
          
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8 text-left">
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
                       <p className="font-mono text-slate-900 dark:text-slate-100 font-bold">#SV-2026-{result.roll}</p>
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

                  {/* Recharts Progress & Examination Comparison Section */}
                  {renderProgressAnalytics()}
            
                  {/* Detailed Marks Table with Previous Exam Column */}
                  {renderMarksTable()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

  // Student direct view
  if (loading && !result) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto text-left animate-pulse">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl w-1/3"></div>
          <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full"></div>
          <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full"></div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-12 text-center text-red-400 font-bold italic uppercase tracking-widest bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md mx-auto mt-12">
        Result Not Published Yet
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none">
        <header className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
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

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8 text-left">
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
            <p className="font-mono text-slate-900 dark:text-slate-100 font-bold">#SV-2026-{result.roll}</p>
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

        {/* Recharts Progress & Comparison Line Graph Section */}
        {renderProgressAnalytics()}

        {/* Marks Table with Previous Marks and Delta */}
        {renderMarksTable()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

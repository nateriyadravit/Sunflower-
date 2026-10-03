export type UserRole = 'student' | 'teacher' | 'principal' | 'director' | null;

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  classId: string;
  parentIds: string[];
  dob: string;
  address: string;
  phone: string;
  photoUrl?: string;
}

export interface Class {
  id: string;
  name: string;
  section: string;
  classTeacherId: string;
}

export interface Attendance {
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  classId: string;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  classId: string;
}

export interface Mark {
  examId: string;
  studentId: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
}

export interface Fee {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending';
  paidDate?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  available: boolean;
}

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'holiday' | 'exam' | 'function' | 'meeting';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

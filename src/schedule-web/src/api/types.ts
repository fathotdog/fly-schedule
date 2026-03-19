export interface Semester {
  id: number;
  academicYear: number;
  term: number;
  startDate: string;
  isCurrent: boolean;
  schoolName: string;
}

export interface SchoolClass {
  id: number;
  semesterId: number;
  gradeYear: number;
  section: number;
  displayName: string;
}

export interface SchoolDay {
  id: number;
  semesterId: number;
  dayOfWeek: number;
  isActive: boolean;
}

export interface StaffTitle {
  id: number;
  name: string;
}

export interface Teacher {
  id: number;
  name: string;
  staffTitleId: number;
  staffTitleName: string;
  maxWeeklyPeriods: number;
}

export interface Course {
  id: number;
  name: string;
  colorCode: string;
  requiresSpecialRoom: boolean;
}

export interface CourseAssignment {
  id: number;
  semesterId: number;
  courseId: number;
  courseName: string;
  courseColorCode: string;
  teacherId: number;
  teacherName: string;
  classId: number;
  classDisplayName: string;
  weeklyPeriods: number;
  scheduledPeriods: number;
}

export interface Period {
  id: number;
  semesterId: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  isActivity: boolean;
  activityName: string | null;
}

export interface HomeroomAssignment {
  id: number;
  semesterId: number;
  teacherId: number;
  teacherName: string;
  classId: number;
  classDisplayName: string;
}

export interface SpecialRoom {
  id: number;
  name: string;
  capacity: number;
}

export interface TimetableSlot {
  id: number;
  courseAssignmentId: number;
  dayOfWeek: number;
  periodId: number;
  periodNumber: number;
  courseName: string;
  courseColorCode: string;
  teacherName: string;
  teacherId: number;
  classDisplayName: string;
  classId: number;
  specialRoomId: number | null;
  specialRoomName: string | null;
}

export interface CourseAssignmentProgress {
  id: number;
  courseId: number;
  courseName: string;
  courseColorCode: string;
  teacherId: number;
  teacherName: string;
  classId: number;
  classDisplayName: string;
  weeklyPeriods: number;
  scheduledPeriods: number;
}

export interface TimetableGridResponse {
  slots: TimetableSlot[];
  courseAssignments: CourseAssignmentProgress[];
}

export interface TeacherScheduleResponse {
  teacherId: number;
  teacherName: string;
  slots: TimetableSlot[];
}

export interface ConflictInfo {
  type: string;
  message: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
}

export interface BatchCourseAssignmentItem {
  id?: number;
  courseId: number;
  teacherId: number;
  weeklyPeriods: number;
}

export interface BatchCourseAssignmentRequest {
  classId: number;
  upserts: BatchCourseAssignmentItem[];
  deleteIds: number[];
}

export interface BatchCourseAssignmentResponse {
  created: number;
  updated: number;
  deleted: number;
  assignments: CourseAssignment[];
}

export interface BatchTeacherAssignmentItem {
  id?: number;
  courseId: number;
  classId: number;
  weeklyPeriods: number;
}

export interface BatchTeacherAssignmentRequest {
  teacherId: number;
  upserts: BatchTeacherAssignmentItem[];
  deleteIds: number[];
}

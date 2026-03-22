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
  sortOrder: number;
}

export interface CourseAssignment {
  id: number;
  semesterId: number;
  courseId: number;
  courseName: string;
  courseColorCode: string;
  teacherId: number | null;
  teacherName: string | null;
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
  teacherName: string | null;
  teacherId: number | null;
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
  teacherId: number | null;
  teacherName: string | null;
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
  teacherId: number | null;
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

export interface CopyCourseAssignmentsRequest {
  sourceClassId: number;
  targetClassId: number;
}

export interface CopyCourseAssignmentsResponse {
  created: number;
  updated: number;
  skipped: number;
  assignments: CourseAssignment[];
}

export interface CopyCourseAssignmentsToGradeRequest {
  sourceClassId: number;
}

export interface CopyCourseAssignmentsToGradeResponse {
  targetClassCount: number;
  created: number;
  updated: number;
  skipped: number;
}

export interface AssignTeacherRequest {
  assignmentIds: number[];
  teacherId: number;
}

export interface UnassignTeacherRequest {
  assignmentIds: number[];
}

export interface DashboardSummary {
  totalClasses: number;
  totalTeachers: number;
  totalAssignedPeriods: number;
  totalScheduledPeriods: number;
  overallCompletionRate: number;
}

export interface ClassProgressDto {
  classId: number;
  classDisplayName: string;
  gradeYear: number;
  section: number;
  totalWeeklyPeriods: number;
  scheduledPeriods: number;
  completionRate: number;
  hasHomeroomTeacher: boolean;
  homeroomTeacherName: string | null;
}

export interface TeacherLoadDto {
  teacherId: number;
  teacherName: string;
  staffTitleName: string | null;
  maxWeeklyPeriods: number;
  assignedPeriods: number;
  scheduledPeriods: number;
  loadRate: number;
}

export interface DashboardAlert {
  severity: string;
  type: string;
  message: string;
  relatedId: number | null;
}

export interface PeriodDistributionDto {
  dayOfWeek: number;
  periodId: number;
  periodNumber: number;
  slotCount: number;
  totalClasses: number;
  classNames: string[];
}

export interface GradeSummaryDto {
  gradeYear: number;
  classCount: number;
  avgCompletionRate: number;
  totalPeriods: number;
  scheduledPeriods: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  classProgress: ClassProgressDto[];
  teacherLoad: TeacherLoadDto[];
  alerts: DashboardAlert[];
  periodDistribution: PeriodDistributionDto[];
  unscheduledPeriods: number;
  gradeSummary: GradeSummaryDto[];
}

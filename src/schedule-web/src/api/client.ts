import axios from 'axios';
import type {
  Semester, SchoolClass, SchoolDay, StaffTitle, Teacher,
  Course, CourseAssignment, Period, HomeroomAssignment,
  SpecialRoom, TimetableSlot, TimetableGridResponse,
  TeacherScheduleResponse, ConflictInfo, ImportResult,
  BatchCourseAssignmentRequest, BatchCourseAssignmentResponse,
  BatchTeacherAssignmentRequest, DashboardResponse,
  CopyCourseAssignmentsRequest, CopyCourseAssignmentsResponse,
  AssignTeacherRequest, UnassignTeacherRequest
} from './types';

const api = axios.create({
  baseURL: '/api',
  paramsSerializer: { indexes: null },
});

async function downloadBlob(url: string, filename: string, params?: Record<string, unknown>) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const objectUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

// Semesters
export const getSemesters = () => api.get<Semester[]>('/semesters').then(r => r.data);
export const createSemester = (data: { academicYear: number; term: number; startDate: string; schoolName?: string; sourceSemesterId?: number }) =>
  api.post<Semester>('/semesters', data).then(r => r.data);
export const updateSemester = (id: number, data: { academicYear: number; term: number; startDate: string; schoolName?: string }) =>
  api.put<Semester>(`/semesters/${id}`, data).then(r => r.data);
export const deleteSemester = (id: number) => api.delete(`/semesters/${id}`);
export const setCurrentSemester = (id: number) =>
  api.post<Semester>(`/semesters/${id}/set-current`).then(r => r.data);

// Classes
export const getClasses = (semesterId: number) =>
  api.get<SchoolClass[]>(`/semesters/${semesterId}/classes`).then(r => r.data);
export const createClass = (semesterId: number, data: { gradeYear: number; section: number; displayName: string }) =>
  api.post<SchoolClass>(`/semesters/${semesterId}/classes`, data).then(r => r.data);
export const batchCreateClasses = (semesterId: number, data: { gradeYear: number; numberOfSections: number }) =>
  api.post<SchoolClass[]>(`/semesters/${semesterId}/classes/batch`, data).then(r => r.data);
export const deleteClass = (semesterId: number, id: number) =>
  api.delete(`/semesters/${semesterId}/classes/${id}`);

// School Days
export const getSchoolDays = (semesterId: number) =>
  api.get<SchoolDay[]>(`/semesters/${semesterId}/school-days`).then(r => r.data);
export const updateSchoolDays = (semesterId: number, days: { dayOfWeek: number; isActive: boolean }[]) =>
  api.put<SchoolDay[]>(`/semesters/${semesterId}/school-days`, { days }).then(r => r.data);

// Staff Titles
export const getStaffTitles = () => api.get<StaffTitle[]>('/staff-titles').then(r => r.data);
export const createStaffTitle = (data: { name: string }) =>
  api.post<StaffTitle>('/staff-titles', data).then(r => r.data);
export const updateStaffTitle = (id: number, data: { name: string }) =>
  api.put<StaffTitle>(`/staff-titles/${id}`, data).then(r => r.data);
export const deleteStaffTitle = (id: number) => api.delete(`/staff-titles/${id}`);

// Teachers
export const getTeachers = () => api.get<Teacher[]>('/teachers').then(r => r.data);
export const createTeacher = (data: { name: string; staffTitleId: number; maxWeeklyPeriods: number }) =>
  api.post<Teacher>('/teachers', data).then(r => r.data);
export const updateTeacher = (id: number, data: { name: string; staffTitleId: number; maxWeeklyPeriods: number }) =>
  api.put<Teacher>(`/teachers/${id}`, data).then(r => r.data);
export const deleteTeacher = (id: number) => api.delete(`/teachers/${id}`);

export const exportTeachersExcel = () => downloadBlob('/teachers/export-excel', '教師.xlsx');

export const importTeachersExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<ImportResult>('/teachers/import-excel', formData).then(r => r.data);
};

// Courses
export const getCourses = () => api.get<Course[]>('/courses').then(r => r.data);
export const createCourse = (data: { name: string; colorCode: string; requiresSpecialRoom: boolean }) =>
  api.post<Course>('/courses', data).then(r => r.data);
export const updateCourse = (id: number, data: { name: string; colorCode: string; requiresSpecialRoom: boolean }) =>
  api.put<Course>(`/courses/${id}`, data).then(r => r.data);
export const deleteCourse = (id: number) => api.delete(`/courses/${id}`);

export const exportCoursesExcel = () => downloadBlob('/courses/export-excel', '課程.xlsx');

export const importCoursesExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<ImportResult>('/courses/import-excel', formData).then(r => r.data);
};

// Course Assignments
export const getCourseAssignments = (semesterId: number, classId?: number, teacherId?: number) => {
  const params: Record<string, number> = {};
  if (classId) params.classId = classId;
  if (teacherId) params.teacherId = teacherId;
  return api.get<CourseAssignment[]>(`/semesters/${semesterId}/course-assignments`, { params }).then(r => r.data);
};
export const createCourseAssignment = (semesterId: number, data: { courseId: number; teacherId: number | null; classId: number; weeklyPeriods: number }) =>
  api.post<CourseAssignment>(`/semesters/${semesterId}/course-assignments`, data).then(r => r.data);
export const updateCourseAssignment = (semesterId: number, id: number, data: { teacherId: number | null; weeklyPeriods: number }) =>
  api.put<CourseAssignment>(`/semesters/${semesterId}/course-assignments/${id}`, data).then(r => r.data);
export const deleteCourseAssignment = (semesterId: number, id: number) =>
  api.delete(`/semesters/${semesterId}/course-assignments/${id}`);
export const batchCourseAssignments = (semesterId: number, data: BatchCourseAssignmentRequest) =>
  api.post<BatchCourseAssignmentResponse>(`/semesters/${semesterId}/course-assignments/batch`, data).then(r => r.data);
export const batchTeacherCourseAssignments = (semesterId: number, data: BatchTeacherAssignmentRequest) =>
  api.post<BatchCourseAssignmentResponse>(`/semesters/${semesterId}/course-assignments/batch-by-teacher`, data).then(r => r.data);
export const copyCourseAssignments = (semesterId: number, data: CopyCourseAssignmentsRequest) =>
  api.post<CopyCourseAssignmentsResponse>(`/semesters/${semesterId}/course-assignments/copy`, data).then(r => r.data);
export const assignTeacher = (semesterId: number, data: AssignTeacherRequest) =>
  api.post(`/semesters/${semesterId}/course-assignments/assign-teacher`, data).then(r => r.data);
export const unassignTeacher = (semesterId: number, data: UnassignTeacherRequest) =>
  api.post(`/semesters/${semesterId}/course-assignments/unassign-teacher`, data).then(r => r.data);

// Periods
export const getPeriods = (semesterId: number) =>
  api.get<Period[]>(`/semesters/${semesterId}/periods`).then(r => r.data);
export const createPeriod = (semesterId: number, data: { periodNumber: number; startTime: string; endTime: string; isActivity?: boolean; activityName?: string }) =>
  api.post<Period>(`/semesters/${semesterId}/periods`, data).then(r => r.data);
export const updatePeriod = (semesterId: number, id: number, data: { periodNumber: number; startTime: string; endTime: string; isActivity?: boolean; activityName?: string }) =>
  api.put<Period>(`/semesters/${semesterId}/periods/${id}`, data).then(r => r.data);
export const deletePeriod = (semesterId: number, id: number) =>
  api.delete(`/semesters/${semesterId}/periods/${id}`);

// Homeroom
export const getHomerooms = (semesterId: number) =>
  api.get<HomeroomAssignment[]>(`/semesters/${semesterId}/homerooms`).then(r => r.data);
export const createHomeroom = (semesterId: number, data: { teacherId: number; classId: number }) =>
  api.post<HomeroomAssignment>(`/semesters/${semesterId}/homerooms`, data).then(r => r.data);
export const updateHomeroom = (semesterId: number, id: number, data: { teacherId: number; classId: number }) =>
  api.put<HomeroomAssignment>(`/semesters/${semesterId}/homerooms/${id}`, data).then(r => r.data);
export const deleteHomeroom = (semesterId: number, id: number) =>
  api.delete(`/semesters/${semesterId}/homerooms/${id}`);

// Special Rooms
export const getSpecialRooms = () => api.get<SpecialRoom[]>('/special-rooms').then(r => r.data);
export const createSpecialRoom = (data: { name: string; capacity: number }) =>
  api.post<SpecialRoom>('/special-rooms', data).then(r => r.data);
export const updateSpecialRoom = (id: number, data: { name: string; capacity: number }) =>
  api.put<SpecialRoom>(`/special-rooms/${id}`, data).then(r => r.data);
export const deleteSpecialRoom = (id: number) => api.delete(`/special-rooms/${id}`);

// Timetable
export const getTimetable = (semesterId: number, classId: number) =>
  api.get<TimetableGridResponse>(`/semesters/${semesterId}/timetable`, { params: { classId } }).then(r => r.data);
export const getTeacherSchedule = (semesterId: number, teacherId: number) =>
  api.get<TeacherScheduleResponse>(`/semesters/${semesterId}/timetable/teacher/${teacherId}`).then(r => r.data);
export const createTimetableSlot = (semesterId: number, data: { courseAssignmentId: number; dayOfWeek: number; periodId: number; specialRoomId?: number }) =>
  api.post<TimetableSlot>(`/semesters/${semesterId}/timetable/slots`, data).then(r => r.data);
export const deleteTimetableSlot = (id: number) => api.delete(`/timetable/slots/${id}`);
export const moveTimetableSlot = (id: number, data: { dayOfWeek: number; periodId: number }) =>
  api.put<TimetableSlot>(`/timetable/slots/${id}/move`, data).then(r => r.data);
export const swapTimetableSlots = (data: { slotId1: number; slotId2: number }) =>
  api.put<TimetableSlot[]>('/timetable/slots/swap', data).then(r => r.data);
export const checkConflicts = (semesterId: number, params: { courseAssignmentId: number; dayOfWeek: number; periodId: number; specialRoomId?: number; excludeSlotIds?: number[] }) =>
  api.get<{ conflicts: ConflictInfo[]; hasConflicts: boolean }>(`/semesters/${semesterId}/timetable/conflicts/check`, { params }).then(r => r.data);
export const checkSwapConflicts = (slotId1: number, slotId2: number) =>
  api.get<{ conflicts: ConflictInfo[]; hasConflicts: boolean }>('/timetable/slots/swap/check', { params: { slotId1, slotId2 } }).then(r => r.data);

// Dashboard
export const getDashboard = (semesterId: number) =>
  api.get<DashboardResponse>(`/semesters/${semesterId}/dashboard`).then(r => r.data);

export const exportTimetablePdf = (semesterId: number, classId: number) =>
  downloadBlob(`/semesters/${semesterId}/timetable/export-pdf`, '課表.pdf', { classId });

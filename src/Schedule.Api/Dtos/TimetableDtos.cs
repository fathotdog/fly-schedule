namespace Schedule.Api.Dtos;

public record TimetableSlotDto(
    int Id, int CourseAssignmentId,
    int DayOfWeek, int PeriodId, int PeriodNumber,
    string CourseName, string CourseColorCode,
    string TeacherName, int TeacherId,
    string ClassDisplayName, int ClassId,
    int? SpecialRoomId, string? SpecialRoomName);

public record CreateTimetableSlotRequest(int CourseAssignmentId, int DayOfWeek, int PeriodId, int? SpecialRoomId);
public record ConflictCheckRequest(int CourseAssignmentId, int DayOfWeek, int PeriodId, int? SpecialRoomId);

public record ConflictInfo(string Type, string Message);

public record TimetableGridResponse(
    List<TimetableSlotDto> Slots,
    List<CourseAssignmentProgressDto> CourseAssignments);

public record CourseAssignmentProgressDto(
    int Id, int CourseId, string CourseName, string CourseColorCode,
    int TeacherId, string TeacherName,
    int ClassId, string ClassDisplayName,
    int WeeklyPeriods, int ScheduledPeriods);

public record TeacherScheduleResponse(
    int TeacherId, string TeacherName,
    List<TimetableSlotDto> Slots);

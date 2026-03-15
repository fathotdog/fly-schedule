namespace Schedule.Api.Dtos;

public record CourseAssignmentDto(
    int Id, int SemesterId, int CourseId, string CourseName, string CourseColorCode,
    int TeacherId, string TeacherName,
    int ClassId, string ClassDisplayName,
    int WeeklyPeriods, int ScheduledPeriods);

public record CreateCourseAssignmentRequest(int CourseId, int TeacherId, int ClassId, int WeeklyPeriods);
public record UpdateCourseAssignmentRequest(int TeacherId, int WeeklyPeriods);

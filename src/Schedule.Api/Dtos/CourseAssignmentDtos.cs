namespace Schedule.Api.Dtos;

public record CourseAssignmentDto(
    int Id, int SemesterId, int CourseId, string CourseName, string CourseColorCode,
    int TeacherId, string TeacherName,
    int ClassId, string ClassDisplayName,
    int WeeklyPeriods, int ScheduledPeriods);

public record CreateCourseAssignmentRequest(int CourseId, int TeacherId, int ClassId, int WeeklyPeriods);
public record UpdateCourseAssignmentRequest(int TeacherId, int WeeklyPeriods);

public record BatchCourseAssignmentItem(int? Id, int CourseId, int TeacherId, int WeeklyPeriods);
public record BatchCourseAssignmentRequest(int ClassId, List<BatchCourseAssignmentItem> Upserts, List<int> DeleteIds);
public record BatchCourseAssignmentResponse(int Created, int Updated, int Deleted, List<CourseAssignmentDto> Assignments);

public record BatchTeacherAssignmentItem(int? Id, int CourseId, int ClassId, int WeeklyPeriods);
public record BatchTeacherAssignmentRequest(int TeacherId, List<BatchTeacherAssignmentItem> Upserts, List<int> DeleteIds);

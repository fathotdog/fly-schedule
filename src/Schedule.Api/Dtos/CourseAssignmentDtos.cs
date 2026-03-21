using System.Linq.Expressions;
using Schedule.Api.Models;

namespace Schedule.Api.Dtos;

public record CourseAssignmentDto(
    int Id, int SemesterId, int CourseId, string CourseName, string CourseColorCode,
    int? TeacherId, string? TeacherName,
    int ClassId, string ClassDisplayName,
    int WeeklyPeriods, int ScheduledPeriods);

public record CreateCourseAssignmentRequest(int CourseId, int? TeacherId, int ClassId, int WeeklyPeriods);
public record UpdateCourseAssignmentRequest(int? TeacherId, int WeeklyPeriods);

public record BatchCourseAssignmentItem(int? Id, int CourseId, int? TeacherId, int WeeklyPeriods);
public record BatchCourseAssignmentRequest(int ClassId, List<BatchCourseAssignmentItem> Upserts, List<int> DeleteIds);
public record BatchCourseAssignmentResponse(int Created, int Updated, int Deleted, List<CourseAssignmentDto> Assignments);

public record BatchTeacherAssignmentItem(int? Id, int CourseId, int ClassId, int WeeklyPeriods);
public record BatchTeacherAssignmentRequest(int TeacherId, List<BatchTeacherAssignmentItem> Upserts, List<int> DeleteIds);

public record CopyCourseAssignmentsRequest(int SourceClassId, int TargetClassId);
public record CopyCourseAssignmentsResponse(int Created, int Skipped, List<CourseAssignmentDto> Assignments);

public record AssignTeacherRequest(List<int> AssignmentIds, int TeacherId);
public record UnassignTeacherRequest(List<int> AssignmentIds);

public static class CourseAssignmentMapper
{
    public static readonly Expression<Func<CourseAssignment, CourseAssignmentDto>> ToDto =
        ca => new CourseAssignmentDto(
            ca.Id, ca.SemesterId, ca.CourseId, ca.Course.Name, ca.Course.ColorCode,
            ca.TeacherId, ca.Teacher != null ? ca.Teacher.Name : null,
            ca.ClassId, ca.Class.DisplayName,
            ca.WeeklyPeriods, ca.TimetableSlots.Count);

    private static readonly Func<CourseAssignment, CourseAssignmentDto> _compiled = ToDto.Compile();

    public static CourseAssignmentDto Map(CourseAssignment ca) => _compiled(ca);
}

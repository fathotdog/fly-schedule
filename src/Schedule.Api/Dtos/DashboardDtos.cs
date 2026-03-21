namespace Schedule.Api.Dtos;

public record DashboardResponse(
    DashboardSummary Summary,
    List<ClassProgressDto> ClassProgress,
    List<TeacherLoadDto> TeacherLoad,
    List<DashboardAlert> Alerts,
    List<PeriodDistributionDto> PeriodDistribution,
    int UnscheduledPeriods,
    List<GradeSummaryDto> GradeSummary);

public record DashboardSummary(
    int TotalClasses,
    int TotalTeachers,
    int TotalAssignedPeriods,
    int TotalScheduledPeriods,
    double OverallCompletionRate);

public record ClassProgressDto(
    int ClassId,
    string ClassDisplayName,
    int GradeYear,
    int Section,
    int TotalWeeklyPeriods,
    int ScheduledPeriods,
    double CompletionRate,
    bool HasHomeroomTeacher,
    string? HomeroomTeacherName);

public record TeacherLoadDto(
    int TeacherId,
    string TeacherName,
    string? StaffTitleName,
    int MaxWeeklyPeriods,
    int AssignedPeriods,
    int ScheduledPeriods,
    double LoadRate);

public record DashboardAlert(
    string Severity,
    string Type,
    string Message,
    int? RelatedId);

public record PeriodDistributionDto(
    int DayOfWeek,
    int PeriodId,
    int PeriodNumber,
    int SlotCount,
    int TotalClasses,
    string[] ClassNames);

public record GradeSummaryDto(
    int GradeYear,
    int ClassCount,
    double AvgCompletionRate,
    int TotalPeriods,
    int ScheduledPeriods);

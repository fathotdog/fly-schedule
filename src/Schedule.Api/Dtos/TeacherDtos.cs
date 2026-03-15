namespace Schedule.Api.Dtos;

public record TeacherDto(int Id, string Name, int StaffTitleId, string StaffTitleName, int MaxWeeklyPeriods);
public record CreateTeacherRequest(string Name, int StaffTitleId, int MaxWeeklyPeriods);
public record UpdateTeacherRequest(string Name, int StaffTitleId, int MaxWeeklyPeriods);

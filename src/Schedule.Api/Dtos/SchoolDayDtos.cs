namespace Schedule.Api.Dtos;

public record SchoolDayDto(int Id, int SemesterId, int DayOfWeek, bool IsActive);
public record UpdateSchoolDaysRequest(List<SchoolDayUpdate> Days);
public record SchoolDayUpdate(int DayOfWeek, bool IsActive);

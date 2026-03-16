namespace Schedule.Api.Dtos;

public record PeriodDto(int Id, int SemesterId, int PeriodNumber, TimeOnly StartTime, TimeOnly EndTime, bool IsActivity, string? ActivityName);
public record CreatePeriodRequest(int PeriodNumber, TimeOnly StartTime, TimeOnly EndTime, bool IsActivity = false, string? ActivityName = null);
public record UpdatePeriodRequest(int PeriodNumber, TimeOnly StartTime, TimeOnly EndTime, bool IsActivity = false, string? ActivityName = null);

namespace Schedule.Api.Dtos;

public record PeriodDto(int Id, int SemesterId, int PeriodNumber, TimeOnly StartTime, TimeOnly EndTime);
public record CreatePeriodRequest(int PeriodNumber, TimeOnly StartTime, TimeOnly EndTime);
public record UpdatePeriodRequest(int PeriodNumber, TimeOnly StartTime, TimeOnly EndTime);

namespace Schedule.Api.Dtos;

public record TeacherUnavailabilityDto(int SemesterId, int TeacherId, int DayOfWeek, int PeriodId);

public record UpdateTeacherAvailabilitySlotRequest(int DayOfWeek, int PeriodId);

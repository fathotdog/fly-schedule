namespace Schedule.Api.Dtos;

public record SemesterDto(int Id, int AcademicYear, int Term, DateOnly StartDate, bool IsCurrent);
public record CreateSemesterRequest(int AcademicYear, int Term, DateOnly StartDate);
public record UpdateSemesterRequest(int AcademicYear, int Term, DateOnly StartDate);

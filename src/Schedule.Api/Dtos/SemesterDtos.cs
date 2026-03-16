namespace Schedule.Api.Dtos;

public record SemesterDto(int Id, int AcademicYear, int Term, DateOnly StartDate, bool IsCurrent, string SchoolName);
public record CreateSemesterRequest(int AcademicYear, int Term, DateOnly StartDate, string SchoolName = "");
public record UpdateSemesterRequest(int AcademicYear, int Term, DateOnly StartDate, string SchoolName = "");

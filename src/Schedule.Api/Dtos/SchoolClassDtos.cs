namespace Schedule.Api.Dtos;

public record SchoolClassDto(int Id, int SemesterId, int GradeYear, int Section, string DisplayName);
public record CreateSchoolClassRequest(int GradeYear, int Section, string DisplayName);
public record BatchCreateClassesRequest(int GradeYear, int NumberOfSections);

namespace Schedule.Api.Dtos;

public record HomeroomAssignmentDto(int Id, int SemesterId, int TeacherId, string TeacherName, int ClassId, string ClassDisplayName);
public record CreateHomeroomRequest(int TeacherId, int ClassId);

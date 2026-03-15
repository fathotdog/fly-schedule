namespace Schedule.Api.Dtos;

public record CourseDto(int Id, string Name, string ColorCode, bool RequiresSpecialRoom);
public record CreateCourseRequest(string Name, string ColorCode, bool RequiresSpecialRoom);
public record UpdateCourseRequest(string Name, string ColorCode, bool RequiresSpecialRoom);

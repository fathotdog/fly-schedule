namespace Schedule.Api.Dtos;

public record CourseDto(int Id, string Name, string ColorCode, int SortOrder);
public record CreateCourseRequest(string Name, string ColorCode);
public record UpdateCourseRequest(string Name, string ColorCode);
public record ReorderCoursesRequest(int[] CourseIds);

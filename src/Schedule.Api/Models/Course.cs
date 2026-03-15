namespace Schedule.Api.Models;

public class Course
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColorCode { get; set; } = "#6366f1"; // default indigo
    public bool RequiresSpecialRoom { get; set; }

    public ICollection<CourseAssignment> CourseAssignments { get; set; } = [];
}

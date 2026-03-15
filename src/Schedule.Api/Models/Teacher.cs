namespace Schedule.Api.Models;

public class Teacher
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int StaffTitleId { get; set; }
    public int MaxWeeklyPeriods { get; set; }

    public StaffTitle StaffTitle { get; set; } = null!;
    public ICollection<CourseAssignment> CourseAssignments { get; set; } = [];
    public ICollection<HomeroomAssignment> HomeroomAssignments { get; set; } = [];
}

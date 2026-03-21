namespace Schedule.Api.Models;

public class SchoolClass
{
    public int Id { get; set; }
    public int SemesterId { get; set; }
    public int GradeYear { get; set; } // 1-6
    public int Section { get; set; }
    public string DisplayName { get; set; } = string.Empty; // e.g. 一年一班

    public Semester Semester { get; set; } = null!;
    public ICollection<CourseAssignment> CourseAssignments { get; set; } = [];
    public HomeroomAssignment? HomeroomAssignment { get; set; }
}

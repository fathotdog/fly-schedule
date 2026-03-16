namespace Schedule.Api.Models;

public class Semester
{
    public int Id { get; set; }
    public int AcademicYear { get; set; }
    public int Term { get; set; } // 1 or 2
    public DateOnly StartDate { get; set; }
    public bool IsCurrent { get; set; }
    public string SchoolName { get; set; } = "";

    public ICollection<SchoolClass> Classes { get; set; } = [];
    public ICollection<SchoolDay> SchoolDays { get; set; } = [];
    public ICollection<Period> Periods { get; set; } = [];
    public ICollection<CourseAssignment> CourseAssignments { get; set; } = [];
    public ICollection<HomeroomAssignment> HomeroomAssignments { get; set; } = [];
}

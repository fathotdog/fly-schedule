namespace Schedule.Api.Models;

public class CourseAssignment
{
    public int Id { get; set; }
    public int SemesterId { get; set; }
    public int CourseId { get; set; }
    public int? TeacherId { get; set; }
    public int ClassId { get; set; }
    public int WeeklyPeriods { get; set; }

    public Semester Semester { get; set; } = null!;
    public Course Course { get; set; } = null!;
    public Teacher? Teacher { get; set; }
    public SchoolClass Class { get; set; } = null!;
    public ICollection<TimetableSlot> TimetableSlots { get; set; } = [];
}

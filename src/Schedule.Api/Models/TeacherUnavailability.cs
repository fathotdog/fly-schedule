namespace Schedule.Api.Models;

public class TeacherUnavailability
{
    public int Id { get; set; }
    public int SemesterId { get; set; }
    public int TeacherId { get; set; }
    public int DayOfWeek { get; set; }
    public int PeriodId { get; set; }

    public Semester Semester { get; set; } = null!;
    public Teacher Teacher { get; set; } = null!;
    public Period Period { get; set; } = null!;
}

namespace Schedule.Api.Models;

public class SchoolDay
{
    public int Id { get; set; }
    public int SemesterId { get; set; }
    public int DayOfWeek { get; set; } // 1=Monday ... 5=Friday
    public bool IsActive { get; set; } = true;

    public Semester Semester { get; set; } = null!;
}

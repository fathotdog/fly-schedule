namespace Schedule.Api.Models;

public class Period
{
    public int Id { get; set; }
    public int SemesterId { get; set; }
    public int PeriodNumber { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsActivity { get; set; }
    public string? ActivityName { get; set; }

    public Semester Semester { get; set; } = null!;
    public ICollection<TimetableSlot> TimetableSlots { get; set; } = [];
}

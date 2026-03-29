namespace Schedule.Api.Models;

public class TimetableSlot
{
    public int Id { get; set; }
    public int CourseAssignmentId { get; set; }
    public int DayOfWeek { get; set; } // 1-5
    public int PeriodId { get; set; }
    public bool IsLocked { get; set; }

    public CourseAssignment CourseAssignment { get; set; } = null!;
    public Period Period { get; set; } = null!;
    public RoomBooking? RoomBooking { get; set; }
}

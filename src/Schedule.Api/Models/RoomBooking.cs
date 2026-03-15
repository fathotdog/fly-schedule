namespace Schedule.Api.Models;

public class RoomBooking
{
    public int Id { get; set; }
    public int TimetableSlotId { get; set; }
    public int SpecialRoomId { get; set; }

    public TimetableSlot TimetableSlot { get; set; } = null!;
    public SpecialRoom SpecialRoom { get; set; } = null!;
}

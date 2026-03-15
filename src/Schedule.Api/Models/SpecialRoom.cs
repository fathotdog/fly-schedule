namespace Schedule.Api.Models;

public class SpecialRoom
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }

    public ICollection<RoomBooking> RoomBookings { get; set; } = [];
}

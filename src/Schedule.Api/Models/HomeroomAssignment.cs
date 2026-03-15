namespace Schedule.Api.Models;

public class HomeroomAssignment
{
    public int Id { get; set; }
    public int SemesterId { get; set; }
    public int TeacherId { get; set; }
    public int ClassId { get; set; }

    public Semester Semester { get; set; } = null!;
    public Teacher Teacher { get; set; } = null!;
    public SchoolClass Class { get; set; } = null!;
}

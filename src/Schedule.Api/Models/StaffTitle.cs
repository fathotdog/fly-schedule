namespace Schedule.Api.Models;

public class StaffTitle
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // 專任教師, 代理教師, 代課教師

    public ICollection<Teacher> Teachers { get; set; } = [];
}

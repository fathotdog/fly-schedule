namespace Schedule.Api.Dtos;

public record SpecialRoomDto(int Id, string Name, int Capacity);
public record CreateSpecialRoomRequest(string Name, int Capacity);
public record UpdateSpecialRoomRequest(string Name, int Capacity);

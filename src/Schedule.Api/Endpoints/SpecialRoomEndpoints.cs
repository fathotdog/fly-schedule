using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class SpecialRoomEndpoints
{
    public static void MapSpecialRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/special-rooms").WithTags("SpecialRooms");

        group.MapGet("/", async (ScheduleDbContext db) =>
            await db.SpecialRooms.OrderBy(r => r.Name)
                .Select(r => new SpecialRoomDto(r.Id, r.Name, r.Capacity))
                .ToListAsync());

        group.MapPost("/", async (CreateSpecialRoomRequest req, ScheduleDbContext db) =>
        {
            var room = new SpecialRoom { Name = req.Name, Capacity = req.Capacity };
            db.SpecialRooms.Add(room);
            await db.SaveChangesAsync();
            return Results.Created($"/api/special-rooms/{room.Id}", new SpecialRoomDto(room.Id, room.Name, room.Capacity));
        });

        group.MapPut("/{id:int}", async (int id, UpdateSpecialRoomRequest req, ScheduleDbContext db) =>
        {
            var room = await db.SpecialRooms.FindAsync(id);
            if (room is null) return Results.NotFound();
            room.Name = req.Name;
            room.Capacity = req.Capacity;
            await db.SaveChangesAsync();
            return Results.Ok(new SpecialRoomDto(room.Id, room.Name, room.Capacity));
        });

        group.MapDelete("/{id:int}", async (int id, ScheduleDbContext db) =>
        {
            var room = await db.SpecialRooms.FindAsync(id);
            if (room is null) return Results.NotFound();
            db.SpecialRooms.Remove(room);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

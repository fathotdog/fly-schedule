using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class StaffTitleEndpoints
{
    public static void MapStaffTitleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/staff-titles").WithTags("StaffTitles");

        group.MapGet("/", async (ScheduleDbContext db) =>
            await db.StaffTitles.OrderBy(s => s.Id)
                .Select(s => new StaffTitleDto(s.Id, s.Name))
                .ToListAsync());

        group.MapPost("/", async (CreateStaffTitleRequest req, ScheduleDbContext db) =>
        {
            var title = new StaffTitle { Name = req.Name };
            db.StaffTitles.Add(title);
            await db.SaveChangesAsync();
            return Results.Created($"/api/staff-titles/{title.Id}", new StaffTitleDto(title.Id, title.Name));
        });

        group.MapPut("/{id:int}", async (int id, CreateStaffTitleRequest req, ScheduleDbContext db) =>
        {
            var title = await db.StaffTitles.FindAsync(id);
            if (title is null) return Results.NotFound();
            title.Name = req.Name;
            await db.SaveChangesAsync();
            return Results.Ok(new StaffTitleDto(title.Id, title.Name));
        });

        group.MapDelete("/{id:int}", async (int id, ScheduleDbContext db) =>
        {
            var title = await db.StaffTitles.FindAsync(id);
            if (title is null) return Results.NotFound();
            db.StaffTitles.Remove(title);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class TeacherEndpoints
{
    public static void MapTeacherEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/teachers").WithTags("Teachers");

        group.MapGet("/", async (ScheduleDbContext db) =>
            await db.Teachers.Include(t => t.StaffTitle)
                .OrderBy(t => t.Name)
                .Select(t => new TeacherDto(t.Id, t.Name, t.StaffTitleId, t.StaffTitle.Name, t.MaxWeeklyPeriods))
                .ToListAsync());

        group.MapGet("/{id:int}", async (int id, ScheduleDbContext db) =>
            await db.Teachers.Include(t => t.StaffTitle).FirstOrDefaultAsync(t => t.Id == id) is { } t
                ? Results.Ok(new TeacherDto(t.Id, t.Name, t.StaffTitleId, t.StaffTitle.Name, t.MaxWeeklyPeriods))
                : Results.NotFound());

        group.MapPost("/", async (CreateTeacherRequest req, ScheduleDbContext db) =>
        {
            var teacher = new Teacher
            {
                Name = req.Name,
                StaffTitleId = req.StaffTitleId,
                MaxWeeklyPeriods = req.MaxWeeklyPeriods
            };
            db.Teachers.Add(teacher);
            await db.SaveChangesAsync();
            var title = await db.StaffTitles.FindAsync(teacher.StaffTitleId);
            return Results.Created($"/api/teachers/{teacher.Id}",
                new TeacherDto(teacher.Id, teacher.Name, teacher.StaffTitleId, title?.Name ?? "", teacher.MaxWeeklyPeriods));
        });

        group.MapPut("/{id:int}", async (int id, UpdateTeacherRequest req, ScheduleDbContext db) =>
        {
            var teacher = await db.Teachers.FindAsync(id);
            if (teacher is null) return Results.NotFound();
            teacher.Name = req.Name;
            teacher.StaffTitleId = req.StaffTitleId;
            teacher.MaxWeeklyPeriods = req.MaxWeeklyPeriods;
            await db.SaveChangesAsync();
            var title = await db.StaffTitles.FindAsync(teacher.StaffTitleId);
            return Results.Ok(new TeacherDto(teacher.Id, teacher.Name, teacher.StaffTitleId, title?.Name ?? "", teacher.MaxWeeklyPeriods));
        });

        group.MapDelete("/{id:int}", async (int id, ScheduleDbContext db) =>
        {
            var teacher = await db.Teachers.FindAsync(id);
            if (teacher is null) return Results.NotFound();
            db.Teachers.Remove(teacher);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

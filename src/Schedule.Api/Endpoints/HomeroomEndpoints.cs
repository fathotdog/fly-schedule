using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class HomeroomEndpoints
{
    public static void MapHomeroomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/homerooms").WithTags("Homerooms");

        group.MapGet("/", async (int semesterId, ScheduleDbContext db) =>
            await db.HomeroomAssignments
                .Include(h => h.Teacher).Include(h => h.Class)
                .Where(h => h.SemesterId == semesterId)
                .OrderBy(h => h.Class.GradeYear).ThenBy(h => h.Class.Section)
                .Select(h => new HomeroomAssignmentDto(h.Id, h.SemesterId, h.TeacherId, h.Teacher.Name, h.ClassId, h.Class.DisplayName))
                .ToListAsync());

        group.MapPost("/", async (int semesterId, CreateHomeroomRequest req, ScheduleDbContext db) =>
        {
            var assignment = new HomeroomAssignment
            {
                SemesterId = semesterId,
                TeacherId = req.TeacherId,
                ClassId = req.ClassId
            };
            db.HomeroomAssignments.Add(assignment);
            await db.SaveChangesAsync();

            var teacher = await db.Teachers.FindAsync(req.TeacherId);
            var cls = await db.SchoolClasses.FindAsync(req.ClassId);

            return Results.Created($"/api/semesters/{semesterId}/homerooms/{assignment.Id}",
                new HomeroomAssignmentDto(assignment.Id, semesterId, req.TeacherId, teacher?.Name ?? "", req.ClassId, cls?.DisplayName ?? ""));
        });

        group.MapPut("/{id:int}", async (int semesterId, int id, CreateHomeroomRequest req, ScheduleDbContext db) =>
        {
            var assignment = await db.HomeroomAssignments.FirstOrDefaultAsync(h => h.Id == id && h.SemesterId == semesterId);
            if (assignment is null) return Results.NotFound();
            assignment.TeacherId = req.TeacherId;
            assignment.ClassId = req.ClassId;
            await db.SaveChangesAsync();

            var teacher = await db.Teachers.FindAsync(req.TeacherId);
            var cls = await db.SchoolClasses.FindAsync(req.ClassId);

            return Results.Ok(new HomeroomAssignmentDto(assignment.Id, semesterId, req.TeacherId, teacher?.Name ?? "", req.ClassId, cls?.DisplayName ?? ""));
        });

        group.MapDelete("/{id:int}", async (int semesterId, int id, ScheduleDbContext db) =>
        {
            var assignment = await db.HomeroomAssignments.FirstOrDefaultAsync(h => h.Id == id && h.SemesterId == semesterId);
            if (assignment is null) return Results.NotFound();
            db.HomeroomAssignments.Remove(assignment);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

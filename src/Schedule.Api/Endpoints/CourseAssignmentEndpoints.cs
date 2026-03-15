using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class CourseAssignmentEndpoints
{
    public static void MapCourseAssignmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/course-assignments").WithTags("CourseAssignments");

        group.MapGet("/", async (int semesterId, int? classId, ScheduleDbContext db) =>
        {
            var query = db.CourseAssignments
                .Include(ca => ca.Course)
                .Include(ca => ca.Teacher)
                .Include(ca => ca.Class)
                .Include(ca => ca.TimetableSlots)
                .Where(ca => ca.SemesterId == semesterId);

            if (classId.HasValue)
                query = query.Where(ca => ca.ClassId == classId.Value);

            return await query.OrderBy(ca => ca.Class.GradeYear)
                .ThenBy(ca => ca.Class.Section)
                .ThenBy(ca => ca.Course.Name)
                .Select(ca => new CourseAssignmentDto(
                    ca.Id, ca.SemesterId, ca.CourseId, ca.Course.Name, ca.Course.ColorCode,
                    ca.TeacherId, ca.Teacher.Name,
                    ca.ClassId, ca.Class.DisplayName,
                    ca.WeeklyPeriods, ca.TimetableSlots.Count))
                .ToListAsync();
        });

        group.MapPost("/", async (int semesterId, CreateCourseAssignmentRequest req, ScheduleDbContext db) =>
        {
            var assignment = new CourseAssignment
            {
                SemesterId = semesterId,
                CourseId = req.CourseId,
                TeacherId = req.TeacherId,
                ClassId = req.ClassId,
                WeeklyPeriods = req.WeeklyPeriods
            };
            db.CourseAssignments.Add(assignment);
            await db.SaveChangesAsync();

            var loaded = await db.CourseAssignments
                .Include(ca => ca.Course).Include(ca => ca.Teacher).Include(ca => ca.Class).Include(ca => ca.TimetableSlots)
                .FirstAsync(ca => ca.Id == assignment.Id);

            return Results.Created($"/api/semesters/{semesterId}/course-assignments/{assignment.Id}",
                new CourseAssignmentDto(
                    loaded.Id, loaded.SemesterId, loaded.CourseId, loaded.Course.Name, loaded.Course.ColorCode,
                    loaded.TeacherId, loaded.Teacher.Name,
                    loaded.ClassId, loaded.Class.DisplayName,
                    loaded.WeeklyPeriods, loaded.TimetableSlots.Count));
        });

        group.MapPut("/{id:int}", async (int semesterId, int id, UpdateCourseAssignmentRequest req, ScheduleDbContext db) =>
        {
            var assignment = await db.CourseAssignments
                .Include(ca => ca.Course).Include(ca => ca.Teacher).Include(ca => ca.Class).Include(ca => ca.TimetableSlots)
                .FirstOrDefaultAsync(ca => ca.Id == id && ca.SemesterId == semesterId);
            if (assignment is null) return Results.NotFound();

            assignment.TeacherId = req.TeacherId;
            assignment.WeeklyPeriods = req.WeeklyPeriods;
            await db.SaveChangesAsync();

            // Reload teacher
            await db.Entry(assignment).Reference(ca => ca.Teacher).LoadAsync();

            return Results.Ok(new CourseAssignmentDto(
                assignment.Id, assignment.SemesterId, assignment.CourseId, assignment.Course.Name, assignment.Course.ColorCode,
                assignment.TeacherId, assignment.Teacher.Name,
                assignment.ClassId, assignment.Class.DisplayName,
                assignment.WeeklyPeriods, assignment.TimetableSlots.Count));
        });

        group.MapDelete("/{id:int}", async (int semesterId, int id, ScheduleDbContext db) =>
        {
            var assignment = await db.CourseAssignments
                .FirstOrDefaultAsync(ca => ca.Id == id && ca.SemesterId == semesterId);
            if (assignment is null) return Results.NotFound();
            db.CourseAssignments.Remove(assignment);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

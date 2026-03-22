using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;
using Schedule.Api.Services;

namespace Schedule.Api.Endpoints;

public static class CourseEndpoints
{
    public static void MapCourseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/courses").WithTags("Courses");

        group.MapGet("/export-excel", async (ExcelService excel) =>
        {
            var bytes = await excel.ExportCoursesAsync();
            return Results.File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "課程.xlsx");
        });

        group.MapPost("/import-excel", async (IFormFile file, ExcelService excel) =>
        {
            using var stream = file.OpenReadStream();
            var result = await excel.ImportCoursesAsync(stream);
            return Results.Ok(result);
        }).DisableAntiforgery();

        group.MapPut("/reorder", async (ReorderCoursesRequest req, ScheduleDbContext db) =>
        {
            var courses = await db.Courses.ToListAsync();
            var courseIdSet = new HashSet<int>(courses.Select(c => c.Id));
            if (req.CourseIds.Length != courseIdSet.Count || !new HashSet<int>(req.CourseIds).SetEquals(courseIdSet))
                return Results.BadRequest("CourseIds must contain all course IDs exactly once");

            var lookup = courses.ToDictionary(c => c.Id);
            for (var i = 0; i < req.CourseIds.Length; i++)
                lookup[req.CourseIds[i]].SortOrder = i;

            await db.SaveChangesAsync();
            return Results.Ok(courses
                .OrderBy(c => c.SortOrder)
                .Select(c => new CourseDto(c.Id, c.Name, c.ColorCode, c.RequiresSpecialRoom, c.SortOrder))
                .ToList());
        });

        group.MapGet("/", async (ScheduleDbContext db) =>
            await db.Courses.OrderBy(c => c.SortOrder).ThenBy(c => c.Id)
                .Select(c => new CourseDto(c.Id, c.Name, c.ColorCode, c.RequiresSpecialRoom, c.SortOrder))
                .ToListAsync());

        group.MapPost("/", async (CreateCourseRequest req, ScheduleDbContext db) =>
        {
            var maxSort = await db.Courses.MaxAsync(c => (int?)c.SortOrder) ?? -1;
            var course = new Course
            {
                Name = req.Name,
                ColorCode = req.ColorCode,
                RequiresSpecialRoom = req.RequiresSpecialRoom,
                SortOrder = maxSort + 1,
            };
            db.Courses.Add(course);
            await db.SaveChangesAsync();
            return Results.Created($"/api/courses/{course.Id}",
                new CourseDto(course.Id, course.Name, course.ColorCode, course.RequiresSpecialRoom, course.SortOrder));
        });

        group.MapPut("/{id:int}", async (int id, UpdateCourseRequest req, ScheduleDbContext db) =>
        {
            var course = await db.Courses.FindAsync(id);
            if (course is null) return Results.NotFound();
            course.Name = req.Name;
            course.ColorCode = req.ColorCode;
            course.RequiresSpecialRoom = req.RequiresSpecialRoom;
            await db.SaveChangesAsync();
            return Results.Ok(new CourseDto(course.Id, course.Name, course.ColorCode, course.RequiresSpecialRoom, course.SortOrder));
        });

        group.MapGet("/{id:int}/related-counts", async (int id, ScheduleDbContext db) =>
        {
            if (!await db.Courses.AnyAsync(c => c.Id == id)) return Results.NotFound();
            var assignmentCount = await db.CourseAssignments.CountAsync(ca => ca.CourseId == id);
            var slotCount = await db.TimetableSlots.CountAsync(ts => ts.CourseAssignment.CourseId == id);
            return Results.Ok(new { assignmentCount, timetableSlotCount = slotCount });
        });

        group.MapDelete("/{id:int}", async (int id, ScheduleDbContext db) =>
        {
            var course = await db.Courses
                .Include(c => c.CourseAssignments)
                    .ThenInclude(ca => ca.TimetableSlots)
                        .ThenInclude(ts => ts.RoomBooking)
                .FirstOrDefaultAsync(c => c.Id == id);
            if (course is null) return Results.NotFound();
            db.Courses.Remove(course);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

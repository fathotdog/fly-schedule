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

        group.MapGet("/", async (ScheduleDbContext db) =>
            await db.Courses.OrderBy(c => c.Id)
                .Select(c => new CourseDto(c.Id, c.Name, c.ColorCode, c.RequiresSpecialRoom))
                .ToListAsync());

        group.MapPost("/", async (CreateCourseRequest req, ScheduleDbContext db) =>
        {
            var course = new Course { Name = req.Name, ColorCode = req.ColorCode, RequiresSpecialRoom = req.RequiresSpecialRoom };
            db.Courses.Add(course);
            await db.SaveChangesAsync();
            return Results.Created($"/api/courses/{course.Id}",
                new CourseDto(course.Id, course.Name, course.ColorCode, course.RequiresSpecialRoom));
        });

        group.MapPut("/{id:int}", async (int id, UpdateCourseRequest req, ScheduleDbContext db) =>
        {
            var course = await db.Courses.FindAsync(id);
            if (course is null) return Results.NotFound();
            course.Name = req.Name;
            course.ColorCode = req.ColorCode;
            course.RequiresSpecialRoom = req.RequiresSpecialRoom;
            await db.SaveChangesAsync();
            return Results.Ok(new CourseDto(course.Id, course.Name, course.ColorCode, course.RequiresSpecialRoom));
        });

        group.MapDelete("/{id:int}", async (int id, ScheduleDbContext db) =>
        {
            var course = await db.Courses.FindAsync(id);
            if (course is null) return Results.NotFound();
            db.Courses.Remove(course);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class SchoolClassEndpoints
{
    private static readonly string[] GradeNames = ["", "一", "二", "三", "四", "五", "六"];
    private static readonly string[] SectionNames = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
        "十一", "十二", "十三", "十四", "十五"];

    public static void MapSchoolClassEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/classes").WithTags("Classes");

        group.MapGet("/", async (int semesterId, ScheduleDbContext db) =>
            await db.SchoolClasses
                .Where(c => c.SemesterId == semesterId)
                .OrderBy(c => c.GradeYear).ThenBy(c => c.Section)
                .Select(c => new SchoolClassDto(c.Id, c.SemesterId, c.GradeYear, c.Section, c.DisplayName))
                .ToListAsync());

        group.MapPost("/", async (int semesterId, CreateSchoolClassRequest req, ScheduleDbContext db) =>
        {
            var cls = new SchoolClass
            {
                SemesterId = semesterId,
                GradeYear = req.GradeYear,
                Section = req.Section,
                DisplayName = req.DisplayName
            };
            db.SchoolClasses.Add(cls);
            await db.SaveChangesAsync();
            return Results.Created($"/api/semesters/{semesterId}/classes/{cls.Id}",
                new SchoolClassDto(cls.Id, cls.SemesterId, cls.GradeYear, cls.Section, cls.DisplayName));
        });

        group.MapPost("/batch", async (int semesterId, BatchCreateClassesRequest req, ScheduleDbContext db) =>
        {
            var classes = new List<SchoolClass>();
            for (var s = 1; s <= req.NumberOfSections; s++)
            {
                var gradeName = req.GradeYear >= 1 && req.GradeYear <= 6 ? GradeNames[req.GradeYear] : req.GradeYear.ToString();
                var sectionName = s <= 15 ? SectionNames[s] : s.ToString();
                classes.Add(new SchoolClass
                {
                    SemesterId = semesterId,
                    GradeYear = req.GradeYear,
                    Section = s,
                    DisplayName = $"{gradeName}年{sectionName}班"
                });
            }
            db.SchoolClasses.AddRange(classes);
            await db.SaveChangesAsync();
            return Results.Ok(classes.Select(c => new SchoolClassDto(c.Id, c.SemesterId, c.GradeYear, c.Section, c.DisplayName)));
        });

        group.MapDelete("/{id:int}", async (int semesterId, int id, ScheduleDbContext db) =>
        {
            var cls = await db.SchoolClasses.FirstOrDefaultAsync(c => c.Id == id && c.SemesterId == semesterId);
            if (cls is null) return Results.NotFound();
            db.SchoolClasses.Remove(cls);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

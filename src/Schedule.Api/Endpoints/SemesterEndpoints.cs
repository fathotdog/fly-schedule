using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class SemesterEndpoints
{
    public static void MapSemesterEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters").WithTags("Semesters");

        group.MapGet("/", async (ScheduleDbContext db) =>
            await db.Semesters
                .OrderByDescending(s => s.AcademicYear).ThenByDescending(s => s.Term)
                .Select(s => new SemesterDto(s.Id, s.AcademicYear, s.Term, s.StartDate, s.IsCurrent))
                .ToListAsync());

        group.MapGet("/{id:int}", async (int id, ScheduleDbContext db) =>
            await db.Semesters.FindAsync(id) is { } s
                ? Results.Ok(new SemesterDto(s.Id, s.AcademicYear, s.Term, s.StartDate, s.IsCurrent))
                : Results.NotFound());

        group.MapPost("/", async (CreateSemesterRequest req, ScheduleDbContext db) =>
        {
            var semester = new Semester
            {
                AcademicYear = req.AcademicYear,
                Term = req.Term,
                StartDate = req.StartDate
            };
            db.Semesters.Add(semester);
            await db.SaveChangesAsync();

            // Auto-create school days (Mon-Fri)
            for (var d = 1; d <= 5; d++)
                db.SchoolDays.Add(new SchoolDay { SemesterId = semester.Id, DayOfWeek = d, IsActive = true });

            // Auto-create default periods (7 periods)
            var defaultPeriods = new (int Num, TimeOnly Start, TimeOnly End)[]
            {
                (1, new(8, 30), new(9, 15)),
                (2, new(9, 25), new(10, 10)),
                (3, new(10, 20), new(11, 5)),
                (4, new(11, 15), new(12, 0)),
                (5, new(13, 20), new(14, 5)),
                (6, new(14, 15), new(15, 0)),
                (7, new(15, 10), new(15, 55)),
            };
            foreach (var (num, start, end) in defaultPeriods)
                db.Periods.Add(new Period { SemesterId = semester.Id, PeriodNumber = num, StartTime = start, EndTime = end });

            await db.SaveChangesAsync();

            return Results.Created($"/api/semesters/{semester.Id}",
                new SemesterDto(semester.Id, semester.AcademicYear, semester.Term, semester.StartDate, semester.IsCurrent));
        });

        group.MapPut("/{id:int}", async (int id, UpdateSemesterRequest req, ScheduleDbContext db) =>
        {
            var semester = await db.Semesters.FindAsync(id);
            if (semester is null) return Results.NotFound();

            semester.AcademicYear = req.AcademicYear;
            semester.Term = req.Term;
            semester.StartDate = req.StartDate;
            await db.SaveChangesAsync();

            return Results.Ok(new SemesterDto(semester.Id, semester.AcademicYear, semester.Term, semester.StartDate, semester.IsCurrent));
        });

        group.MapPost("/{id:int}/set-current", async (int id, ScheduleDbContext db) =>
        {
            var semester = await db.Semesters.FindAsync(id);
            if (semester is null) return Results.NotFound();

            await db.Semesters.Where(s => s.IsCurrent).ExecuteUpdateAsync(s => s.SetProperty(x => x.IsCurrent, false));
            semester.IsCurrent = true;
            await db.SaveChangesAsync();

            return Results.Ok(new SemesterDto(semester.Id, semester.AcademicYear, semester.Term, semester.StartDate, semester.IsCurrent));
        });

        group.MapDelete("/{id:int}", async (int id, ScheduleDbContext db) =>
        {
            var semester = await db.Semesters.FindAsync(id);
            if (semester is null) return Results.NotFound();
            db.Semesters.Remove(semester);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

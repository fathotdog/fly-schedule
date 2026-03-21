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
                .Select(s => new SemesterDto(s.Id, s.AcademicYear, s.Term, s.StartDate, s.IsCurrent, s.SchoolName))
                .ToListAsync());

        group.MapGet("/{id:int}", async (int id, ScheduleDbContext db) =>
            await db.Semesters.FindAsync(id) is { } s
                ? Results.Ok(new SemesterDto(s.Id, s.AcademicYear, s.Term, s.StartDate, s.IsCurrent, s.SchoolName))
                : Results.NotFound());

        group.MapPost("/", async (CreateSemesterRequest req, ScheduleDbContext db) =>
        {
            await using var tx = await db.Database.BeginTransactionAsync();

            var semester = new Semester
            {
                AcademicYear = req.AcademicYear,
                Term = req.Term,
                StartDate = req.StartDate,
                SchoolName = req.SchoolName
            };
            db.Semesters.Add(semester);
            await db.SaveChangesAsync();

            if (req.SourceSemesterId is { } srcId)
            {
                var src = await db.Semesters.FindAsync(srcId);
                if (src is null)
                    return Results.BadRequest($"找不到來源學期 (id={srcId})");

                // Copy SchoolDays
                var srcDays = await db.SchoolDays.Where(x => x.SemesterId == srcId).ToListAsync();
                foreach (var d in srcDays)
                    db.SchoolDays.Add(new SchoolDay { SemesterId = semester.Id, DayOfWeek = d.DayOfWeek, IsActive = d.IsActive });

                // Copy Periods
                var srcPeriods = await db.Periods.Where(x => x.SemesterId == srcId).ToListAsync();
                foreach (var p in srcPeriods)
                    db.Periods.Add(new Period
                    {
                        SemesterId = semester.Id,
                        PeriodNumber = p.PeriodNumber,
                        StartTime = p.StartTime,
                        EndTime = p.EndTime,
                        IsActivity = p.IsActivity,
                        ActivityName = p.ActivityName
                    });

                // Copy SchoolClasses — need new IDs for remapping
                var srcClasses = await db.SchoolClasses.Where(x => x.SemesterId == srcId).ToListAsync();
                var newClasses = srcClasses.Select(c => new SchoolClass
                {
                    SemesterId = semester.Id,
                    GradeYear = c.GradeYear,
                    Section = c.Section,
                    DisplayName = c.DisplayName
                }).ToList();
                db.SchoolClasses.AddRange(newClasses);
                await db.SaveChangesAsync(); // flush to get new IDs

                // Build old → new class ID map by GradeYear+Section
                var classIdMap = srcClasses
                    .Join(newClasses,
                        o => (o.GradeYear, o.Section),
                        n => (n.GradeYear, n.Section),
                        (o, n) => (OldId: o.Id, NewId: n.Id))
                    .ToDictionary(x => x.OldId, x => x.NewId);

                // Copy CourseAssignments
                var srcAssignments = await db.CourseAssignments.Where(x => x.SemesterId == srcId).ToListAsync();
                foreach (var a in srcAssignments)
                {
                    if (!classIdMap.TryGetValue(a.ClassId, out var newClassId)) continue;
                    db.CourseAssignments.Add(new CourseAssignment
                    {
                        SemesterId = semester.Id,
                        CourseId = a.CourseId,
                        TeacherId = a.TeacherId,
                        ClassId = newClassId,
                        WeeklyPeriods = a.WeeklyPeriods
                    });
                }

                // Copy HomeroomAssignments
                var srcHomerooms = await db.HomeroomAssignments.Where(x => x.SemesterId == srcId).ToListAsync();
                foreach (var h in srcHomerooms)
                {
                    if (!classIdMap.TryGetValue(h.ClassId, out var newClassId)) continue;
                    db.HomeroomAssignments.Add(new HomeroomAssignment
                    {
                        SemesterId = semester.Id,
                        TeacherId = h.TeacherId,
                        ClassId = newClassId
                    });
                }

                await db.SaveChangesAsync();
            }
            else
            {
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

                // Auto-create default activity periods
                var defaultActivities = new (string Name, TimeOnly Start, TimeOnly End)[]
                {
                    ("晨間打掃", new(7, 40), new(7, 55)),
                    ("朝會&導師時間", new(7, 55), new(8, 30)),
                    ("課間活動", new(10, 10), new(10, 20)),
                    ("午餐、潔牙時間", new(12, 0), new(13, 20)),
                    ("整潔活動", new(15, 0), new(15, 10)),
                    ("放學", new(15, 55), new(16, 0)),
                };
                foreach (var (name, start, end) in defaultActivities)
                    db.Periods.Add(new Period
                    {
                        SemesterId = semester.Id,
                        PeriodNumber = 0,
                        IsActivity = true,
                        ActivityName = name,
                        StartTime = start,
                        EndTime = end
                    });

                await db.SaveChangesAsync();
            }

            await tx.CommitAsync();

            return Results.Created($"/api/semesters/{semester.Id}",
                new SemesterDto(semester.Id, semester.AcademicYear, semester.Term, semester.StartDate, semester.IsCurrent, semester.SchoolName));
        });

        group.MapPut("/{id:int}", async (int id, UpdateSemesterRequest req, ScheduleDbContext db) =>
        {
            var semester = await db.Semesters.FindAsync(id);
            if (semester is null) return Results.NotFound();

            semester.AcademicYear = req.AcademicYear;
            semester.Term = req.Term;
            semester.StartDate = req.StartDate;
            semester.SchoolName = req.SchoolName;
            await db.SaveChangesAsync();

            return Results.Ok(new SemesterDto(semester.Id, semester.AcademicYear, semester.Term, semester.StartDate, semester.IsCurrent, semester.SchoolName));
        });

        group.MapPost("/{id:int}/set-current", async (int id, ScheduleDbContext db) =>
        {
            var semester = await db.Semesters.FindAsync(id);
            if (semester is null) return Results.NotFound();

            await db.Semesters.Where(s => s.IsCurrent).ExecuteUpdateAsync(s => s.SetProperty(x => x.IsCurrent, false));
            semester.IsCurrent = true;
            await db.SaveChangesAsync();

            return Results.Ok(new SemesterDto(semester.Id, semester.AcademicYear, semester.Term, semester.StartDate, semester.IsCurrent, semester.SchoolName));
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

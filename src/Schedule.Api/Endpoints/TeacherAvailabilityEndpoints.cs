using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class TeacherAvailabilityEndpoints
{
    public static void MapTeacherAvailabilityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/teachers").WithTags("Teachers");

        group.MapGet("/{teacherId:int}/availability", async (int semesterId, int teacherId, ScheduleDbContext db) =>
        {
            if (!await db.Semesters.AnyAsync(s => s.Id == semesterId)) return Results.NotFound();
            if (!await db.Teachers.AnyAsync(t => t.Id == teacherId)) return Results.NotFound();

            var items = await db.TeacherUnavailabilities
                .Where(u => u.SemesterId == semesterId && u.TeacherId == teacherId)
                .OrderBy(u => u.DayOfWeek)
                .ThenBy(u => u.Period.PeriodNumber)
                .Select(u => new TeacherUnavailabilityDto(u.SemesterId, u.TeacherId, u.DayOfWeek, u.PeriodId))
                .ToListAsync();

            return Results.Ok(items);
        });

        group.MapPut("/{teacherId:int}/availability", async (
            int semesterId,
            int teacherId,
            List<UpdateTeacherAvailabilitySlotRequest>? slots,
            ScheduleDbContext db) =>
        {
            if (!await db.Semesters.AnyAsync(s => s.Id == semesterId)) return Results.NotFound();
            if (!await db.Teachers.AnyAsync(t => t.Id == teacherId)) return Results.NotFound();

            // Treat missing/null body as an empty replacement set.
            slots ??= [];

            // Validate DayOfWeek against the semester's active SchoolDays — but also accept
            // any DayOfWeek that already has a saved row in the DB for this teacher+semester.
            // This prevents the lockout where an admin disables a SchoolDay after rows exist
            // referencing it, leaving the user unable to edit until the orphan rows are purged.
            var activeDays = await db.SchoolDays
                .Where(d => d.SemesterId == semesterId && d.IsActive)
                .Select(d => d.DayOfWeek)
                .ToListAsync();
            if (activeDays.Count == 0) activeDays = [1, 2, 3, 4, 5];

            var legacyDays = await db.TeacherUnavailabilities
                .Where(u => u.SemesterId == semesterId && u.TeacherId == teacherId)
                .Select(u => u.DayOfWeek)
                .Distinct()
                .ToListAsync();
            var allowedDays = activeDays.Union(legacyDays).ToHashSet();

            if (slots.Any(slot => !allowedDays.Contains(slot.DayOfWeek)))
            {
                return Results.BadRequest(new
                {
                    message = $"dayOfWeek 必須為本學期啟用的上課日 ({string.Join(", ", activeDays)})"
                });
            }

            var normalizedSlots = slots.Distinct().ToList();
            var periodIds = normalizedSlots.Select(slot => slot.PeriodId).Distinct().ToList();

            // Validate that every PeriodId belongs to THIS semester AND is not an activity
            // period (lunch/朝會 etc.) — those rows would be orphan data since the conflict
            // service short-circuits IsActivity periods before checking unavailability.
            var validPeriodIds = await db.Periods
                .Where(p => p.SemesterId == semesterId && !p.IsActivity && periodIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync();

            if (periodIds.Except(validPeriodIds).Any())
            {
                return Results.BadRequest(new { message = "包含不存在、不屬於此學期、或為活動節次的節次" });
            }

            // Replace within this semester only — preserves other semesters' rows for this teacher.
            await using var tx = db.Database.IsRelational()
                ? await db.Database.BeginTransactionAsync()
                : null;

            var existing = await db.TeacherUnavailabilities
                .Where(u => u.SemesterId == semesterId && u.TeacherId == teacherId)
                .ToListAsync();

            db.TeacherUnavailabilities.RemoveRange(existing);
            db.TeacherUnavailabilities.AddRange(normalizedSlots.Select(slot => new TeacherUnavailability
            {
                SemesterId = semesterId,
                TeacherId = teacherId,
                DayOfWeek = slot.DayOfWeek,
                PeriodId = slot.PeriodId
            }));

            await db.SaveChangesAsync();
            if (tx is not null) await tx.CommitAsync();

            var items = await db.TeacherUnavailabilities
                .Where(u => u.SemesterId == semesterId && u.TeacherId == teacherId)
                .OrderBy(u => u.DayOfWeek)
                .ThenBy(u => u.Period.PeriodNumber)
                .Select(u => new TeacherUnavailabilityDto(u.SemesterId, u.TeacherId, u.DayOfWeek, u.PeriodId))
                .ToListAsync();

            return Results.Ok(items);
        });
    }
}

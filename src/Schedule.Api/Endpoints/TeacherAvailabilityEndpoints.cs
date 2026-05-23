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

            // Validate DayOfWeek against the semester's active SchoolDays.
            // If no active SchoolDays are configured, fall back to Mon-Fri so existing semesters keep working.
            var activeDays = await db.SchoolDays
                .Where(d => d.SemesterId == semesterId && d.IsActive)
                .Select(d => d.DayOfWeek)
                .ToListAsync();
            if (activeDays.Count == 0) activeDays = [1, 2, 3, 4, 5];

            if (slots.Any(slot => !activeDays.Contains(slot.DayOfWeek)))
            {
                return Results.BadRequest(new
                {
                    message = $"dayOfWeek 必須為本學期啟用的上課日 ({string.Join(", ", activeDays)})"
                });
            }

            var normalizedSlots = slots.Distinct().ToList();
            var periodIds = normalizedSlots.Select(slot => slot.PeriodId).Distinct().ToList();

            // Validate that every PeriodId belongs to THIS semester (not a different one).
            var validPeriodIds = await db.Periods
                .Where(p => p.SemesterId == semesterId && periodIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync();

            if (periodIds.Except(validPeriodIds).Any())
            {
                return Results.BadRequest(new { message = "包含不存在或不屬於此學期的節次" });
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

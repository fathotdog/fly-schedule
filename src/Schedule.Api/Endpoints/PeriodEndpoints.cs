using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Endpoints;

public static class PeriodEndpoints
{
    public static void MapPeriodEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/periods").WithTags("Periods");

        group.MapGet("/", async (int semesterId, ScheduleDbContext db) =>
            await db.Periods
                .Where(p => p.SemesterId == semesterId)
                .OrderBy(p => p.StartTime)
                .Select(p => new PeriodDto(p.Id, p.SemesterId, p.PeriodNumber, p.StartTime, p.EndTime, p.IsActivity, p.ActivityName))
                .ToListAsync());

        group.MapPost("/", async (int semesterId, CreatePeriodRequest req, ScheduleDbContext db) =>
        {
            var period = new Period
            {
                SemesterId = semesterId,
                PeriodNumber = req.PeriodNumber,
                StartTime = req.StartTime,
                EndTime = req.EndTime,
                IsActivity = req.IsActivity,
                ActivityName = req.ActivityName
            };
            db.Periods.Add(period);
            await db.SaveChangesAsync();
            return Results.Created($"/api/semesters/{semesterId}/periods/{period.Id}",
                new PeriodDto(period.Id, period.SemesterId, period.PeriodNumber, period.StartTime, period.EndTime, period.IsActivity, period.ActivityName));
        });

        group.MapPut("/{id:int}", async (int semesterId, int id, UpdatePeriodRequest req, ScheduleDbContext db) =>
        {
            var period = await db.Periods.FirstOrDefaultAsync(p => p.Id == id && p.SemesterId == semesterId);
            if (period is null) return Results.NotFound();
            period.PeriodNumber = req.PeriodNumber;
            period.StartTime = req.StartTime;
            period.EndTime = req.EndTime;
            period.IsActivity = req.IsActivity;
            period.ActivityName = req.ActivityName;
            await db.SaveChangesAsync();
            return Results.Ok(new PeriodDto(period.Id, period.SemesterId, period.PeriodNumber, period.StartTime, period.EndTime, period.IsActivity, period.ActivityName));
        });

        group.MapDelete("/{id:int}", async (int semesterId, int id, ScheduleDbContext db) =>
        {
            var period = await db.Periods.FirstOrDefaultAsync(p => p.Id == id && p.SemesterId == semesterId);
            if (period is null) return Results.NotFound();

            // TeacherUnavailability.Period FK is Restrict to protect against accidental
            // erasure of teacher availability config. Surface as 409 with an actionable message
            // instead of letting DbUpdateException bubble up as 500.
            var unavailabilityCount = await db.TeacherUnavailabilities.CountAsync(u => u.PeriodId == id);
            if (unavailabilityCount > 0)
            {
                return Results.Conflict(new
                {
                    message = $"無法刪除此節次：仍有 {unavailabilityCount} 筆教師不可排時段設定參照此節次，請先清除相關設定。"
                });
            }

            db.Periods.Remove(period);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

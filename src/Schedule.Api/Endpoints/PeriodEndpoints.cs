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
                .OrderBy(p => p.PeriodNumber)
                .Select(p => new PeriodDto(p.Id, p.SemesterId, p.PeriodNumber, p.StartTime, p.EndTime))
                .ToListAsync());

        group.MapPost("/", async (int semesterId, CreatePeriodRequest req, ScheduleDbContext db) =>
        {
            var period = new Period
            {
                SemesterId = semesterId,
                PeriodNumber = req.PeriodNumber,
                StartTime = req.StartTime,
                EndTime = req.EndTime
            };
            db.Periods.Add(period);
            await db.SaveChangesAsync();
            return Results.Created($"/api/semesters/{semesterId}/periods/{period.Id}",
                new PeriodDto(period.Id, period.SemesterId, period.PeriodNumber, period.StartTime, period.EndTime));
        });

        group.MapPut("/{id:int}", async (int semesterId, int id, UpdatePeriodRequest req, ScheduleDbContext db) =>
        {
            var period = await db.Periods.FirstOrDefaultAsync(p => p.Id == id && p.SemesterId == semesterId);
            if (period is null) return Results.NotFound();
            period.PeriodNumber = req.PeriodNumber;
            period.StartTime = req.StartTime;
            period.EndTime = req.EndTime;
            await db.SaveChangesAsync();
            return Results.Ok(new PeriodDto(period.Id, period.SemesterId, period.PeriodNumber, period.StartTime, period.EndTime));
        });

        group.MapDelete("/{id:int}", async (int semesterId, int id, ScheduleDbContext db) =>
        {
            var period = await db.Periods.FirstOrDefaultAsync(p => p.Id == id && p.SemesterId == semesterId);
            if (period is null) return Results.NotFound();
            db.Periods.Remove(period);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

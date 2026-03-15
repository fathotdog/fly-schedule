using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;

namespace Schedule.Api.Endpoints;

public static class SchoolDayEndpoints
{
    public static void MapSchoolDayEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/school-days").WithTags("SchoolDays");

        group.MapGet("/", async (int semesterId, ScheduleDbContext db) =>
            await db.SchoolDays
                .Where(d => d.SemesterId == semesterId)
                .OrderBy(d => d.DayOfWeek)
                .Select(d => new SchoolDayDto(d.Id, d.SemesterId, d.DayOfWeek, d.IsActive))
                .ToListAsync());

        group.MapPut("/", async (int semesterId, UpdateSchoolDaysRequest req, ScheduleDbContext db) =>
        {
            var days = await db.SchoolDays.Where(d => d.SemesterId == semesterId).ToListAsync();
            foreach (var update in req.Days)
            {
                var day = days.FirstOrDefault(d => d.DayOfWeek == update.DayOfWeek);
                if (day is not null)
                    day.IsActive = update.IsActive;
            }
            await db.SaveChangesAsync();
            return Results.Ok(days.OrderBy(d => d.DayOfWeek)
                .Select(d => new SchoolDayDto(d.Id, d.SemesterId, d.DayOfWeek, d.IsActive)));
        });
    }
}

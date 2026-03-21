using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Services;

namespace Schedule.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/semesters/{semesterId:int}/dashboard", async (int semesterId, ScheduleDbContext db, DashboardService dashboardService) =>
        {
            var semesterExists = await db.Semesters.AnyAsync(s => s.Id == semesterId);
            if (!semesterExists) return Results.NotFound();

            return Results.Ok(await dashboardService.GetDashboardAsync(semesterId));
        }).WithTags("Dashboard");
    }
}

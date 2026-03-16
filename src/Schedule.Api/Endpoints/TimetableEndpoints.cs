using Schedule.Api.Dtos;
using Schedule.Api.Services;

namespace Schedule.Api.Endpoints;

public static class TimetableEndpoints
{
    public static void MapTimetableEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/timetable").WithTags("Timetable");

        group.MapGet("/", async (int semesterId, int classId, TimetableService svc) =>
            Results.Ok(await svc.GetClassTimetableAsync(semesterId, classId)));

        group.MapGet("/teacher/{teacherId:int}", async (int semesterId, int teacherId, TimetableService svc) =>
            Results.Ok(await svc.GetTeacherScheduleAsync(semesterId, teacherId)));

        group.MapPost("/slots", async (int semesterId, CreateTimetableSlotRequest req, TimetableService svc) =>
        {
            var (slot, conflicts) = await svc.CreateSlotAsync(semesterId, req);
            if (conflicts.Count > 0)
                return Results.Conflict(new { conflicts });
            return Results.Created($"/api/timetable/slots/{slot!.Id}", slot);
        });

        group.MapGet("/conflicts/check", async (
            int semesterId, int courseAssignmentId, int dayOfWeek, int periodId, int? specialRoomId,
            ConflictDetectionService svc) =>
        {
            var conflicts = await svc.CheckConflictsAsync(courseAssignmentId, dayOfWeek, periodId, specialRoomId);
            return Results.Ok(new { conflicts, hasConflicts = conflicts.Count > 0 });
        });

        group.MapGet("/export-pdf", async (int semesterId, int classId, TimetablePdfService pdfService) =>
        {
            var pdfBytes = await pdfService.GenerateClassTimetablePdfAsync(semesterId, classId);
            return Results.File(pdfBytes, "application/pdf", "課表.pdf");
        });

        // Delete slot (outside semester group for simpler URL)
        app.MapDelete("/api/timetable/slots/{id:int}", async (int id, TimetableService svc) =>
            await svc.DeleteSlotAsync(id) ? Results.NoContent() : Results.NotFound())
            .WithTags("Timetable");
    }
}

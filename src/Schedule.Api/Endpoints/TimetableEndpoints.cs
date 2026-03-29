using Schedule.Api.Dtos;
using Schedule.Api.Services;

namespace Schedule.Api.Endpoints;

public static class TimetableEndpoints
{
    public static void MapTimetableEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/timetable").WithTags("Timetable");

        group.MapGet("/", async (int semesterId, int? classId, int? teacherId, TimetableService svc) =>
        {
            if (classId.HasValue)
                return Results.Ok(await svc.GetClassTimetableAsync(semesterId, classId.Value));
            if (teacherId.HasValue)
                return Results.Ok(await svc.GetTeacherTimetableAsync(semesterId, teacherId.Value));
            return Results.BadRequest(new { message = "classId or teacherId is required" });
        });

        group.MapGet("/teacher/{teacherId:int}", async (int semesterId, int teacherId, TimetableService svc) =>
            Results.Ok(await svc.GetTeacherScheduleAsync(semesterId, teacherId)));

        group.MapGet("/room/{roomId:int}", async (int semesterId, int roomId, TimetableService svc) =>
            Results.Ok(await svc.GetRoomTimetableAsync(semesterId, roomId)));

        group.MapPost("/slots", async (int semesterId, CreateTimetableSlotRequest req, TimetableService svc) =>
        {
            var (slot, conflicts) = await svc.CreateSlotAsync(semesterId, req);
            if (conflicts.Count > 0)
                return Results.Conflict(new { conflicts });
            return Results.Created($"/api/timetable/slots/{slot!.Id}", slot);
        });

        group.MapGet("/conflicts/check", async (
            int semesterId, int courseAssignmentId, int dayOfWeek, int periodId, int? specialRoomId,
            [Microsoft.AspNetCore.Mvc.FromQuery] int[]? excludeSlotIds,
            ConflictDetectionService svc) =>
        {
            var conflicts = await svc.CheckConflictsAsync(courseAssignmentId, dayOfWeek, periodId, specialRoomId, excludeSlotIds);
            return Results.Ok(new { conflicts, hasConflicts = conflicts.Count > 0 });
        });

        group.MapGet("/export-pdf", async (int semesterId, int? classId, int? teacherId, TimetablePdfService pdfService) =>
        {
            if (teacherId.HasValue)
            {
                var pdfBytes = await pdfService.GenerateTeacherTimetablePdfAsync(semesterId, teacherId.Value);
                return Results.File(pdfBytes, "application/pdf", "教師課表.pdf");
            }
            if (classId.HasValue)
            {
                var pdfBytes = await pdfService.GenerateClassTimetablePdfAsync(semesterId, classId.Value);
                return Results.File(pdfBytes, "application/pdf", "課表.pdf");
            }
            return Results.BadRequest(new { message = "classId or teacherId is required" });
        });

        group.MapGet("/export-pdf/room/{roomId:int}", async (int semesterId, int roomId, TimetablePdfService pdfService) =>
        {
            var pdfBytes = await pdfService.GenerateRoomTimetablePdfAsync(semesterId, roomId);
            return Results.File(pdfBytes, "application/pdf", "專科教室課表.pdf");
        });

        // Delete slot (outside semester group for simpler URL)
        app.MapDelete("/api/timetable/slots/{id:int}", async (int id, TimetableService svc) =>
        {
            var (found, locked) = await svc.DeleteSlotAsync(id);
            if (!found) return Results.NotFound();
            if (locked) return Results.Conflict(new { conflicts = new[] { new { type = "Locked", message = "此節次已鎖定，無法刪除" } } });
            return Results.NoContent();
        }).WithTags("Timetable");

        // Toggle lock on a slot
        app.MapPut("/api/timetable/slots/{id:int}/lock", async (int id, ToggleLockSlotRequest req, TimetableService svc) =>
        {
            var slot = await svc.ToggleLockAsync(id, req.IsLocked);
            return slot is null ? Results.NotFound() : Results.Ok(slot);
        }).WithTags("Timetable");

        // Move slot to a new day/period
        app.MapPut("/api/timetable/slots/{id:int}/move", async (int id, MoveTimetableSlotRequest req, TimetableService svc) =>
        {
            var (slot, conflicts) = await svc.MoveSlotAsync(id, req);
            if (conflicts.Any(c => c.Type == "NotFound")) return Results.NotFound();
            if (conflicts.Count > 0) return Results.Conflict(new { conflicts });
            return Results.Ok(slot);
        }).WithTags("Timetable");

        // Dry-run swap conflict check
        app.MapGet("/api/timetable/slots/swap/check", async (int slotId1, int slotId2, TimetableService svc) =>
        {
            var conflicts = await svc.CheckSwapConflictsAsync(slotId1, slotId2);
            return Results.Ok(new { conflicts, hasConflicts = conflicts.Count > 0 });
        }).WithTags("Timetable");

        // Swap two slots
        app.MapPut("/api/timetable/slots/swap", async (SwapTimetableSlotsRequest req, TimetableService svc) =>
        {
            var (slots, conflicts) = await svc.SwapSlotsAsync(req);
            if (conflicts.Any(c => c.Type == "NotFound")) return Results.NotFound();
            if (conflicts.Count > 0) return Results.Conflict(new { conflicts });
            return Results.Ok(slots);
        }).WithTags("Timetable");

        // Clear all slots for a course assignment
        app.MapDelete("/api/course-assignments/{id:int}/slots", async (int id, TimetableService svc) =>
        {
            var (deleted, skippedLocked) = await svc.ClearAssignmentSlotsAsync(id);
            return Results.Ok(new { deleted, skippedLocked });
        }).WithTags("Timetable");
    }
}

using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;
using Schedule.Api.Services;

namespace Schedule.Api.Endpoints;

public static class CourseAssignmentEndpoints
{
    public static void MapCourseAssignmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/semesters/{semesterId:int}/course-assignments").WithTags("CourseAssignments");

        group.MapGet("/export-excel", async (int semesterId, ExcelService excel) =>
        {
            var bytes = await excel.ExportCourseAssignmentsAsync(semesterId);
            return Results.File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "配課.xlsx");
        });

        group.MapPost("/import-excel", async (int semesterId, IFormFile file, ExcelService excel) =>
        {
            using var stream = file.OpenReadStream();
            var result = await excel.ImportCourseAssignmentsAsync(semesterId, stream);
            return Results.Ok(result);
        }).DisableAntiforgery();

        group.MapGet("/", async (int semesterId, int? classId, int? teacherId, ScheduleDbContext db) =>
        {
            var query = db.CourseAssignments
                .Include(ca => ca.Course)
                .Include(ca => ca.Teacher)
                .Include(ca => ca.Class)
                .Include(ca => ca.TimetableSlots)
                .Where(ca => ca.SemesterId == semesterId);

            if (classId.HasValue)
                query = query.Where(ca => ca.ClassId == classId.Value);

            if (teacherId.HasValue)
                query = query.Where(ca => ca.TeacherId == teacherId.Value);

            return await query.OrderBy(ca => ca.Class.GradeYear)
                .ThenBy(ca => ca.Class.Section)
                .ThenBy(ca => ca.Course.Name)
                .Select(ca => new CourseAssignmentDto(
                    ca.Id, ca.SemesterId, ca.CourseId, ca.Course.Name, ca.Course.ColorCode,
                    ca.TeacherId, ca.Teacher.Name,
                    ca.ClassId, ca.Class.DisplayName,
                    ca.WeeklyPeriods, ca.TimetableSlots.Count))
                .ToListAsync();
        });

        group.MapPost("/", async (int semesterId, CreateCourseAssignmentRequest req, ScheduleDbContext db) =>
        {
            var dup = await db.CourseAssignments.AnyAsync(ca =>
                ca.SemesterId == semesterId && ca.CourseId == req.CourseId &&
                ca.ClassId == req.ClassId && ca.TeacherId == req.TeacherId);
            if (dup) return Results.BadRequest("此班級已有相同課程與教師的配課");

            var assignment = new CourseAssignment
            {
                SemesterId = semesterId,
                CourseId = req.CourseId,
                TeacherId = req.TeacherId,
                ClassId = req.ClassId,
                WeeklyPeriods = req.WeeklyPeriods
            };
            db.CourseAssignments.Add(assignment);
            await db.SaveChangesAsync();

            var loaded = await db.CourseAssignments
                .Include(ca => ca.Course).Include(ca => ca.Teacher).Include(ca => ca.Class).Include(ca => ca.TimetableSlots)
                .FirstAsync(ca => ca.Id == assignment.Id);

            return Results.Created($"/api/semesters/{semesterId}/course-assignments/{assignment.Id}",
                new CourseAssignmentDto(
                    loaded.Id, loaded.SemesterId, loaded.CourseId, loaded.Course.Name, loaded.Course.ColorCode,
                    loaded.TeacherId, loaded.Teacher.Name,
                    loaded.ClassId, loaded.Class.DisplayName,
                    loaded.WeeklyPeriods, loaded.TimetableSlots.Count));
        });

        group.MapPut("/{id:int}", async (int semesterId, int id, UpdateCourseAssignmentRequest req, ScheduleDbContext db) =>
        {
            var assignment = await db.CourseAssignments
                .Include(ca => ca.Course).Include(ca => ca.Teacher).Include(ca => ca.Class).Include(ca => ca.TimetableSlots)
                .FirstOrDefaultAsync(ca => ca.Id == id && ca.SemesterId == semesterId);
            if (assignment is null) return Results.NotFound();

            assignment.TeacherId = req.TeacherId;
            assignment.WeeklyPeriods = req.WeeklyPeriods;
            await db.SaveChangesAsync();

            // Reload teacher
            await db.Entry(assignment).Reference(ca => ca.Teacher).LoadAsync();

            return Results.Ok(new CourseAssignmentDto(
                assignment.Id, assignment.SemesterId, assignment.CourseId, assignment.Course.Name, assignment.Course.ColorCode,
                assignment.TeacherId, assignment.Teacher.Name,
                assignment.ClassId, assignment.Class.DisplayName,
                assignment.WeeklyPeriods, assignment.TimetableSlots.Count));
        });

        group.MapDelete("/{id:int}", async (int semesterId, int id, ScheduleDbContext db) =>
        {
            var assignment = await db.CourseAssignments
                .FirstOrDefaultAsync(ca => ca.Id == id && ca.SemesterId == semesterId);
            if (assignment is null) return Results.NotFound();
            db.CourseAssignments.Remove(assignment);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapPost("/batch", async (int semesterId, BatchCourseAssignmentRequest req, ScheduleDbContext db) =>
        {
            // Validate class belongs to semester
            var classExists = await db.SchoolClasses.AnyAsync(c => c.Id == req.ClassId && c.SemesterId == semesterId);
            if (!classExists) return Results.BadRequest("指定的班級不屬於此學期");

            // Load existing assignments for this class
            var existing = await db.CourseAssignments
                .Include(ca => ca.TimetableSlots)
                .Where(ca => ca.SemesterId == semesterId && ca.ClassId == req.ClassId)
                .ToListAsync();

            int created = 0, updated = 0, deleted = 0;

            // Process deletes first
            foreach (var deleteId in req.DeleteIds)
            {
                var toDelete = existing.FirstOrDefault(ca => ca.Id == deleteId);
                if (toDelete is null) continue;
                if (toDelete.TimetableSlots.Count > 0)
                    return Results.BadRequest($"課程已排課 {toDelete.TimetableSlots.Count} 節，無法刪除配課");
                db.CourseAssignments.Remove(toDelete);
                deleted++;
            }

            // Process upserts
            foreach (var item in req.Upserts)
            {
                if (item.Id is int existingId)
                {
                    var assignment = existing.FirstOrDefault(ca => ca.Id == existingId);
                    if (assignment is null) continue;
                    assignment.TeacherId = item.TeacherId;
                    assignment.WeeklyPeriods = item.WeeklyPeriods;
                    updated++;
                }
                else
                {
                    var dup = existing.Any(ca => ca.CourseId == item.CourseId && ca.TeacherId == item.TeacherId);
                    if (dup) return Results.BadRequest($"此班級已有相同課程與教師的配課");
                    var newAssignment = new CourseAssignment
                    {
                        SemesterId = semesterId,
                        ClassId = req.ClassId,
                        CourseId = item.CourseId,
                        TeacherId = item.TeacherId,
                        WeeklyPeriods = item.WeeklyPeriods
                    };
                    db.CourseAssignments.Add(newAssignment);
                    existing.Add(newAssignment);
                    created++;
                }
            }

            await db.SaveChangesAsync();

            // Return updated list for this class
            var assignments = await db.CourseAssignments
                .Include(ca => ca.Course)
                .Include(ca => ca.Teacher)
                .Include(ca => ca.Class)
                .Include(ca => ca.TimetableSlots)
                .Where(ca => ca.SemesterId == semesterId && ca.ClassId == req.ClassId)
                .OrderBy(ca => ca.Course.Name)
                .Select(ca => new CourseAssignmentDto(
                    ca.Id, ca.SemesterId, ca.CourseId, ca.Course.Name, ca.Course.ColorCode,
                    ca.TeacherId, ca.Teacher.Name,
                    ca.ClassId, ca.Class.DisplayName,
                    ca.WeeklyPeriods, ca.TimetableSlots.Count))
                .ToListAsync();

            return Results.Ok(new BatchCourseAssignmentResponse(created, updated, deleted, assignments));
        });

        group.MapPost("/batch-by-teacher", async (int semesterId, BatchTeacherAssignmentRequest req, ScheduleDbContext db) =>
        {
            // Validate teacher exists
            var teacherExists = await db.Teachers.AnyAsync(t => t.Id == req.TeacherId);
            if (!teacherExists) return Results.BadRequest("指定的教師不存在");

            // Load existing assignments for this teacher
            var existing = await db.CourseAssignments
                .Include(ca => ca.TimetableSlots)
                .Where(ca => ca.SemesterId == semesterId && ca.TeacherId == req.TeacherId)
                .ToListAsync();

            int created = 0, updated = 0, deleted = 0;

            // Process deletes first
            foreach (var deleteId in req.DeleteIds)
            {
                var toDelete = existing.FirstOrDefault(ca => ca.Id == deleteId);
                if (toDelete is null) continue;
                if (toDelete.TimetableSlots.Count > 0)
                    return Results.BadRequest($"課程已排課 {toDelete.TimetableSlots.Count} 節，無法刪除配課");
                db.CourseAssignments.Remove(toDelete);
                deleted++;
            }

            // Process upserts
            foreach (var item in req.Upserts)
            {
                if (item.Id is int existingId)
                {
                    var assignment = existing.FirstOrDefault(ca => ca.Id == existingId);
                    if (assignment is null) continue;
                    assignment.ClassId = item.ClassId;
                    assignment.WeeklyPeriods = item.WeeklyPeriods;
                    updated++;
                }
                else
                {
                    var dup = existing.Any(ca => ca.CourseId == item.CourseId && ca.ClassId == item.ClassId);
                    if (dup) return Results.BadRequest($"此教師已有相同課程與班級的配課");
                    var newAssignment = new CourseAssignment
                    {
                        SemesterId = semesterId,
                        TeacherId = req.TeacherId,
                        CourseId = item.CourseId,
                        ClassId = item.ClassId,
                        WeeklyPeriods = item.WeeklyPeriods
                    };
                    db.CourseAssignments.Add(newAssignment);
                    existing.Add(newAssignment);
                    created++;
                }
            }

            await db.SaveChangesAsync();

            // Return updated list for this teacher
            var assignments = await db.CourseAssignments
                .Include(ca => ca.Course)
                .Include(ca => ca.Teacher)
                .Include(ca => ca.Class)
                .Include(ca => ca.TimetableSlots)
                .Where(ca => ca.SemesterId == semesterId && ca.TeacherId == req.TeacherId)
                .OrderBy(ca => ca.Course.Name)
                .Select(ca => new CourseAssignmentDto(
                    ca.Id, ca.SemesterId, ca.CourseId, ca.Course.Name, ca.Course.ColorCode,
                    ca.TeacherId, ca.Teacher.Name,
                    ca.ClassId, ca.Class.DisplayName,
                    ca.WeeklyPeriods, ca.TimetableSlots.Count))
                .ToListAsync();

            return Results.Ok(new BatchCourseAssignmentResponse(created, updated, deleted, assignments));
        });
    }
}

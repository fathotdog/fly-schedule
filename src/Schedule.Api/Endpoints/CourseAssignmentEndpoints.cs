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
                .ThenBy(ca => ca.Course.SortOrder)
                .ThenBy(ca => ca.Course.Name)
                .Select(CourseAssignmentMapper.ToDto)
                .ToListAsync();
        });

        group.MapPost("/", async (int semesterId, CreateCourseAssignmentRequest req, ScheduleDbContext db) =>
        {
            if (req.WeeklyPeriods <= 0) return Results.BadRequest("每週節數必須大於 0");

            if (req.TeacherId is not null)
            {
                var dup = await db.CourseAssignments.AnyAsync(ca =>
                    ca.SemesterId == semesterId && ca.CourseId == req.CourseId &&
                    ca.ClassId == req.ClassId && ca.TeacherId == req.TeacherId);
                if (dup) return Results.BadRequest("此班級已有相同課程與教師的配課");
            }

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
                CourseAssignmentMapper.Map(loaded));
        });

        group.MapPut("/{id:int}", async (int semesterId, int id, UpdateCourseAssignmentRequest req, ScheduleDbContext db) =>
        {
            if (req.WeeklyPeriods <= 0) return Results.BadRequest("每週節數必須大於 0");

            var assignment = await db.CourseAssignments
                .Include(ca => ca.Course).Include(ca => ca.Teacher).Include(ca => ca.Class).Include(ca => ca.TimetableSlots)
                .FirstOrDefaultAsync(ca => ca.Id == id && ca.SemesterId == semesterId);
            if (assignment is null) return Results.NotFound();

            if (assignment.TimetableSlots.Count > 0 && req.WeeklyPeriods != assignment.WeeklyPeriods)
                return Results.BadRequest("課程已排課，無法修改每週節數");

            assignment.TeacherId = req.TeacherId;
            assignment.WeeklyPeriods = req.WeeklyPeriods;
            await db.SaveChangesAsync();

            if (assignment.TeacherId.HasValue)
                await db.Entry(assignment).Reference(ca => ca.Teacher).LoadAsync();
            else
                assignment.Teacher = null;

            return Results.Ok(CourseAssignmentMapper.Map(assignment));
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

        group.MapPost("/batch", async (int semesterId, BatchCourseAssignmentRequest req, CourseAssignmentService svc) =>
        {
            var (error, result) = await svc.BatchAsync(semesterId, req);
            return error is not null ? Results.BadRequest(error) : Results.Ok(result);
        });

        group.MapPost("/copy", async (int semesterId, CopyCourseAssignmentsRequest req, CourseAssignmentService svc) =>
        {
            var (error, result) = await svc.CopyAsync(semesterId, req);
            return error is not null ? Results.BadRequest(error) : Results.Ok(result);
        });

        group.MapPost("/copy-to-grade", async (int semesterId, CopyCourseAssignmentsToGradeRequest req, CourseAssignmentService svc) =>
        {
            var (error, result) = await svc.CopyToGradeAsync(semesterId, req);
            return error is not null ? Results.BadRequest(error) : Results.Ok(result);
        });

        group.MapPost("/assign-teacher", async (int semesterId, AssignTeacherRequest req, CourseAssignmentService svc) =>
        {
            var error = await svc.AssignTeacherAsync(semesterId, req);
            return error is not null ? Results.BadRequest(error) : Results.Ok();
        });

        group.MapPost("/unassign-teacher", async (int semesterId, UnassignTeacherRequest req, CourseAssignmentService svc) =>
        {
            await svc.UnassignTeacherAsync(semesterId, req);
            return Results.Ok();
        });

        group.MapPost("/batch-by-teacher", async (int semesterId, BatchTeacherAssignmentRequest req, CourseAssignmentService svc) =>
        {
            var (error, result) = await svc.BatchByTeacherAsync(semesterId, req);
            return error is not null ? Results.BadRequest(error) : Results.Ok(result);
        });
    }
}

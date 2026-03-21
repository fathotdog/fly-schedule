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
                .Select(CourseAssignmentMapper.ToDto)
                .ToListAsync();
        });

        group.MapPost("/", async (int semesterId, CreateCourseAssignmentRequest req, ScheduleDbContext db) =>
        {
            // 允許 TeacherId 為 null（未指定教師）；null 教師同班同課只能有一筆
            if (req.TeacherId is null)
            {
                var nullDup = await db.CourseAssignments.AnyAsync(ca =>
                    ca.SemesterId == semesterId && ca.CourseId == req.CourseId &&
                    ca.ClassId == req.ClassId && ca.TeacherId == null);
                if (nullDup) return Results.BadRequest("此班級已有相同課程且未指定教師的配課");
            }
            else
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
            var assignment = await db.CourseAssignments
                .Include(ca => ca.Course).Include(ca => ca.Teacher).Include(ca => ca.Class).Include(ca => ca.TimetableSlots)
                .FirstOrDefaultAsync(ca => ca.Id == id && ca.SemesterId == semesterId);
            if (assignment is null) return Results.NotFound();

            assignment.TeacherId = req.TeacherId;
            assignment.WeeklyPeriods = req.WeeklyPeriods;
            await db.SaveChangesAsync();

            // Reload teacher (may be null if TeacherId is null)
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
                    // Only update WeeklyPeriods; preserve existing TeacherId
                    assignment.WeeklyPeriods = item.WeeklyPeriods;
                    updated++;
                }
                else
                {
                    // Force TeacherId = null; one record per course per class
                    var dup = existing.Any(ca => ca.CourseId == item.CourseId && ca.TeacherId == null);
                    if (dup) return Results.BadRequest("此班級已有相同課程的配課");
                    var newAssignment = new CourseAssignment
                    {
                        SemesterId = semesterId,
                        ClassId = req.ClassId,
                        CourseId = item.CourseId,
                        TeacherId = null,
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
                .Select(CourseAssignmentMapper.ToDto)
                .ToListAsync();

            return Results.Ok(new BatchCourseAssignmentResponse(created, updated, deleted, assignments));
        });

        group.MapPost("/copy", async (int semesterId, CopyCourseAssignmentsRequest req, ScheduleDbContext db) =>
        {
            if (req.SourceClassId == req.TargetClassId)
                return Results.BadRequest("來源班級與目標班級不能相同");

            var validClassIds = await db.SchoolClasses
                .Where(c => c.SemesterId == semesterId && (c.Id == req.SourceClassId || c.Id == req.TargetClassId))
                .Select(c => c.Id)
                .ToListAsync();
            if (!validClassIds.Contains(req.SourceClassId)) return Results.BadRequest("來源班級不屬於此學期");
            if (!validClassIds.Contains(req.TargetClassId)) return Results.BadRequest("目標班級不屬於此學期");

            var sourceAssignments = await db.CourseAssignments
                .Where(ca => ca.SemesterId == semesterId && ca.ClassId == req.SourceClassId)
                .ToListAsync();

            var targetAssignments = await db.CourseAssignments
                .Where(ca => ca.SemesterId == semesterId && ca.ClassId == req.TargetClassId)
                .ToListAsync();

            int created = 0, skipped = 0;
            var copiedCourseIds = new HashSet<int>();

            foreach (var src in sourceAssignments)
            {
                // Deduplicate: copy each course only once (force TeacherId = null)
                if (copiedCourseIds.Contains(src.CourseId)) { skipped++; continue; }

                var dup = targetAssignments.Any(ca => ca.CourseId == src.CourseId && ca.TeacherId == null);
                if (dup) { skipped++; continue; }

                var newAssignment = new CourseAssignment
                {
                    SemesterId = semesterId,
                    ClassId = req.TargetClassId,
                    CourseId = src.CourseId,
                    TeacherId = null,
                    WeeklyPeriods = src.WeeklyPeriods
                };
                db.CourseAssignments.Add(newAssignment);
                targetAssignments.Add(newAssignment);
                copiedCourseIds.Add(src.CourseId);
                created++;
            }

            await db.SaveChangesAsync();

            var assignments = await db.CourseAssignments
                .Include(ca => ca.Course)
                .Include(ca => ca.Teacher)
                .Include(ca => ca.Class)
                .Include(ca => ca.TimetableSlots)
                .Where(ca => ca.SemesterId == semesterId && ca.ClassId == req.TargetClassId)
                .OrderBy(ca => ca.Course.Name)
                .Select(CourseAssignmentMapper.ToDto)
                .ToListAsync();

            return Results.Ok(new CopyCourseAssignmentsResponse(created, skipped, assignments));
        });

        group.MapPost("/assign-teacher", async (int semesterId, AssignTeacherRequest req, ScheduleDbContext db) =>
        {
            var teacherExists = await db.Teachers.AnyAsync(t => t.Id == req.TeacherId);
            if (!teacherExists) return Results.BadRequest("指定的教師不存在");

            var assignments = await db.CourseAssignments
                .Where(ca => req.AssignmentIds.Contains(ca.Id) && ca.SemesterId == semesterId && ca.TeacherId == null)
                .ToListAsync();

            if (assignments.Count != req.AssignmentIds.Count)
                return Results.BadRequest("部分配課記錄不存在、不屬於此學期或已有教師");

            foreach (var a in assignments)
                a.TeacherId = req.TeacherId;

            await db.SaveChangesAsync();
            return Results.Ok();
        });

        group.MapPost("/unassign-teacher", async (int semesterId, UnassignTeacherRequest req, ScheduleDbContext db) =>
        {
            var assignments = await db.CourseAssignments
                .Where(ca => req.AssignmentIds.Contains(ca.Id) && ca.SemesterId == semesterId)
                .ToListAsync();

            foreach (var a in assignments)
                a.TeacherId = null;

            await db.SaveChangesAsync();
            return Results.Ok();
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

            // Load unassigned (teacher=null) assignments for claiming
            var unassigned = await db.CourseAssignments
                .Where(ca => ca.SemesterId == semesterId && ca.TeacherId == null)
                .ToListAsync();

            int created = 0, updated = 0, deleted = 0;

            // Process deletes first (convert to unassigned to preserve class total periods)
            foreach (var deleteId in req.DeleteIds)
            {
                var toDelete = existing.FirstOrDefault(ca => ca.Id == deleteId);
                if (toDelete is null) continue;

                // Instead of deleting, preserve class periods by converting to unassigned (TeacherId = null)
                var existingNull = unassigned.FirstOrDefault(ca => ca.CourseId == toDelete.CourseId && ca.ClassId == toDelete.ClassId);
                if (existingNull is not null && toDelete.TimetableSlots.Count == 0)
                {
                    // Merge into existing null-teacher record
                    existingNull.WeeklyPeriods += toDelete.WeeklyPeriods;
                    db.CourseAssignments.Remove(toDelete);
                }
                else
                {
                    // Convert to unassigned (keeps timetable slots attached if any)
                    toDelete.TeacherId = null;
                    unassigned.Add(toDelete);
                }
                existing.Remove(toDelete);
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

                    var claimable = unassigned.FirstOrDefault(ca => ca.CourseId == item.CourseId && ca.ClassId == item.ClassId);
                    if (claimable is not null)
                    {
                        var remainder = claimable.WeeklyPeriods - item.WeeklyPeriods;
                        claimable.TeacherId = req.TeacherId;
                        claimable.WeeklyPeriods = item.WeeklyPeriods;
                        unassigned.Remove(claimable);
                        existing.Add(claimable);
                        updated++;

                        if (remainder > 0)
                        {
                            var leftover = new CourseAssignment
                            {
                                SemesterId = semesterId,
                                TeacherId = null,
                                CourseId = item.CourseId,
                                ClassId = item.ClassId,
                                WeeklyPeriods = remainder
                            };
                            db.CourseAssignments.Add(leftover);
                            unassigned.Add(leftover);
                        }
                    }
                    else
                    {
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
                .Select(CourseAssignmentMapper.ToDto)
                .ToListAsync();

            return Results.Ok(new BatchCourseAssignmentResponse(created, updated, deleted, assignments));
        });
    }
}

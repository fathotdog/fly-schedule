using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Services;

public class CourseAssignmentService(ScheduleDbContext db)
{
    private Task<List<CourseAssignmentDto>> GetAssignmentsAsync(int semesterId, int? classId = null, int? teacherId = null)
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

        return query.OrderBy(ca => ca.Course.Name)
            .Select(CourseAssignmentMapper.ToDto)
            .ToListAsync();
    }

    public async Task<(string? Error, BatchCourseAssignmentResponse? Result)> BatchAsync(int semesterId, BatchCourseAssignmentRequest req)
    {
        var classExists = await db.SchoolClasses.AnyAsync(c => c.Id == req.ClassId && c.SemesterId == semesterId);
        if (!classExists) return ("指定的班級不屬於此學期", null);

        var existing = await db.CourseAssignments
            .Include(ca => ca.TimetableSlots)
            .Where(ca => ca.SemesterId == semesterId && ca.ClassId == req.ClassId)
            .ToListAsync();

        int created = 0, updated = 0, deleted = 0;

        foreach (var deleteId in req.DeleteIds)
        {
            var toDelete = existing.FirstOrDefault(ca => ca.Id == deleteId);
            if (toDelete is null) continue;
            if (toDelete.TimetableSlots.Count > 0)
                return ($"課程已排課 {toDelete.TimetableSlots.Count} 節，無法刪除配課", null);
            db.CourseAssignments.Remove(toDelete);
            deleted++;
        }

        foreach (var item in req.Upserts)
        {
            if (item.Id is int existingId)
            {
                var assignment = existing.FirstOrDefault(ca => ca.Id == existingId);
                if (assignment is null) continue;
                assignment.WeeklyPeriods = item.WeeklyPeriods;
                updated++;
            }
            else
            {
                if (item.WeeklyPeriods <= 0) return ("每週節數必須大於 0", null);
                db.CourseAssignments.Add(new CourseAssignment
                {
                    SemesterId = semesterId,
                    ClassId = req.ClassId,
                    CourseId = item.CourseId,
                    TeacherId = null,
                    WeeklyPeriods = item.WeeklyPeriods
                });
                created++;
            }
        }

        await db.SaveChangesAsync();
        var assignments = await GetAssignmentsAsync(semesterId, classId: req.ClassId);
        return (null, new BatchCourseAssignmentResponse(created, updated, deleted, assignments));
    }

    public async Task<(string? Error, CopyCourseAssignmentsResponse? Result)> CopyAsync(int semesterId, CopyCourseAssignmentsRequest req)
    {
        if (req.SourceClassId == req.TargetClassId)
            return ("來源班級與目標班級不能相同", null);

        var validClassIds = await db.SchoolClasses
            .Where(c => c.SemesterId == semesterId && (c.Id == req.SourceClassId || c.Id == req.TargetClassId))
            .Select(c => c.Id)
            .ToListAsync();

        if (!validClassIds.Contains(req.SourceClassId)) return ("來源班級不屬於此學期", null);
        if (!validClassIds.Contains(req.TargetClassId)) return ("目標班級不屬於此學期", null);

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
            if (copiedCourseIds.Contains(src.CourseId)) { skipped++; continue; }
            if (targetAssignments.Any(ca => ca.CourseId == src.CourseId && ca.TeacherId == null)) { skipped++; continue; }

            db.CourseAssignments.Add(new CourseAssignment
            {
                SemesterId = semesterId,
                ClassId = req.TargetClassId,
                CourseId = src.CourseId,
                TeacherId = null,
                WeeklyPeriods = src.WeeklyPeriods
            });
            copiedCourseIds.Add(src.CourseId);
            created++;
        }

        await db.SaveChangesAsync();
        var assignments = await GetAssignmentsAsync(semesterId, classId: req.TargetClassId);
        return (null, new CopyCourseAssignmentsResponse(created, skipped, assignments));
    }

    public async Task<string?> AssignTeacherAsync(int semesterId, AssignTeacherRequest req)
    {
        var teacherExists = await db.Teachers.AnyAsync(t => t.Id == req.TeacherId);
        if (!teacherExists) return "指定的教師不存在";

        var assignments = await db.CourseAssignments
            .Where(ca => req.AssignmentIds.Contains(ca.Id) && ca.SemesterId == semesterId && ca.TeacherId == null)
            .ToListAsync();

        if (assignments.Count != req.AssignmentIds.Count)
            return "部分配課記錄不存在、不屬於此學期或已有教師";

        foreach (var a in assignments)
            a.TeacherId = req.TeacherId;

        await db.SaveChangesAsync();
        return null;
    }

    public async Task UnassignTeacherAsync(int semesterId, UnassignTeacherRequest req)
    {
        var assignments = await db.CourseAssignments
            .Where(ca => req.AssignmentIds.Contains(ca.Id) && ca.SemesterId == semesterId)
            .ToListAsync();

        foreach (var a in assignments)
            a.TeacherId = null;

        await db.SaveChangesAsync();
    }

    public async Task<(string? Error, BatchCourseAssignmentResponse? Result)> BatchByTeacherAsync(int semesterId, BatchTeacherAssignmentRequest req)
    {
        var teacherExists = await db.Teachers.AnyAsync(t => t.Id == req.TeacherId);
        if (!teacherExists) return ("指定的教師不存在", null);

        var existing = await db.CourseAssignments
            .Include(ca => ca.TimetableSlots)
            .Where(ca => ca.SemesterId == semesterId && ca.TeacherId == req.TeacherId)
            .ToListAsync();

        var unassigned = await db.CourseAssignments
            .Where(ca => ca.SemesterId == semesterId && ca.TeacherId == null)
            .ToListAsync();

        int created = 0, updated = 0, deleted = 0;

        foreach (var deleteId in req.DeleteIds)
        {
            var toDelete = existing.FirstOrDefault(ca => ca.Id == deleteId);
            if (toDelete is null) continue;

            var existingNull = unassigned.FirstOrDefault(ca => ca.CourseId == toDelete.CourseId && ca.ClassId == toDelete.ClassId);
            if (existingNull is not null && toDelete.TimetableSlots.Count == 0)
            {
                existingNull.WeeklyPeriods += toDelete.WeeklyPeriods;
                db.CourseAssignments.Remove(toDelete);
            }
            else
            {
                toDelete.TeacherId = null;
                unassigned.Add(toDelete);
            }
            existing.Remove(toDelete);
            deleted++;
        }

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
                if (existing.Any(ca => ca.CourseId == item.CourseId && ca.ClassId == item.ClassId))
                    return ("此教師已有相同課程與班級的配課", null);

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
                    db.CourseAssignments.Add(new CourseAssignment
                    {
                        SemesterId = semesterId,
                        TeacherId = req.TeacherId,
                        CourseId = item.CourseId,
                        ClassId = item.ClassId,
                        WeeklyPeriods = item.WeeklyPeriods
                    });
                    created++;
                }
            }
        }

        await db.SaveChangesAsync();
        var assignments = await GetAssignmentsAsync(semesterId, teacherId: req.TeacherId);
        return (null, new BatchCourseAssignmentResponse(created, updated, deleted, assignments));
    }
}

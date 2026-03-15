using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;

namespace Schedule.Api.Services;

public class ConflictDetectionService(ScheduleDbContext db)
{
    public async Task<List<ConflictInfo>> CheckConflictsAsync(
        int courseAssignmentId, int dayOfWeek, int periodId, int? specialRoomId)
    {
        var conflicts = new List<ConflictInfo>();

        var assignment = await db.CourseAssignments
            .Include(ca => ca.Teacher)
            .Include(ca => ca.Class)
            .Include(ca => ca.Course)
            .FirstOrDefaultAsync(ca => ca.Id == courseAssignmentId);

        if (assignment is null)
        {
            conflicts.Add(new ConflictInfo("NotFound", "找不到配課資料"));
            return conflicts;
        }

        // 1. Teacher conflict
        var teacherConflict = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Where(ts => ts.CourseAssignment.TeacherId == assignment.TeacherId
                         && ts.DayOfWeek == dayOfWeek
                         && ts.PeriodId == periodId)
            .FirstOrDefaultAsync();

        if (teacherConflict is not null)
        {
            conflicts.Add(new ConflictInfo("TeacherConflict",
                $"{assignment.Teacher.Name}已在此時段教{teacherConflict.CourseAssignment.Class.DisplayName}{teacherConflict.CourseAssignment.Course.Name}"));
        }

        // 2. Class conflict
        var classConflict = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Where(ts => ts.CourseAssignment.ClassId == assignment.ClassId
                         && ts.DayOfWeek == dayOfWeek
                         && ts.PeriodId == periodId)
            .FirstOrDefaultAsync();

        if (classConflict is not null)
        {
            conflicts.Add(new ConflictInfo("ClassConflict",
                $"{assignment.Class.DisplayName}此時段已有{classConflict.CourseAssignment.Course.Name}（{classConflict.CourseAssignment.Teacher.Name}）"));
        }

        // 3. Room conflict
        if (specialRoomId.HasValue)
        {
            var roomConflict = await db.RoomBookings
                .Include(rb => rb.TimetableSlot).ThenInclude(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
                .Include(rb => rb.TimetableSlot).ThenInclude(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
                .Include(rb => rb.SpecialRoom)
                .Where(rb => rb.SpecialRoomId == specialRoomId.Value
                             && rb.TimetableSlot.DayOfWeek == dayOfWeek
                             && rb.TimetableSlot.PeriodId == periodId)
                .FirstOrDefaultAsync();

            if (roomConflict is not null)
            {
                conflicts.Add(new ConflictInfo("RoomConflict",
                    $"{roomConflict.SpecialRoom.Name}此時段已被{roomConflict.TimetableSlot.CourseAssignment.Class.DisplayName}{roomConflict.TimetableSlot.CourseAssignment.Course.Name}使用"));
            }
        }

        return conflicts;
    }
}

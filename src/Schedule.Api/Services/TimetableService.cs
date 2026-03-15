using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Services;

public class TimetableService(ScheduleDbContext db, ConflictDetectionService conflictService)
{
    public async Task<TimetableGridResponse> GetClassTimetableAsync(int semesterId, int classId)
    {
        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Include(ts => ts.Period)
            .Include(ts => ts.RoomBooking).ThenInclude(rb => rb!.SpecialRoom)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId
                         && ts.CourseAssignment.ClassId == classId)
            .OrderBy(ts => ts.DayOfWeek).ThenBy(ts => ts.Period.PeriodNumber)
            .Select(ts => MapSlotDto(ts))
            .ToListAsync();

        var assignments = await db.CourseAssignments
            .Include(ca => ca.Course)
            .Include(ca => ca.Teacher)
            .Include(ca => ca.Class)
            .Include(ca => ca.TimetableSlots)
            .Where(ca => ca.SemesterId == semesterId && ca.ClassId == classId)
            .Select(ca => new CourseAssignmentProgressDto(
                ca.Id, ca.CourseId, ca.Course.Name, ca.Course.ColorCode,
                ca.TeacherId, ca.Teacher.Name,
                ca.ClassId, ca.Class.DisplayName,
                ca.WeeklyPeriods, ca.TimetableSlots.Count))
            .ToListAsync();

        return new TimetableGridResponse(slots, assignments);
    }

    public async Task<TeacherScheduleResponse> GetTeacherScheduleAsync(int semesterId, int teacherId)
    {
        var teacher = await db.Teachers.FindAsync(teacherId);
        if (teacher is null) return new TeacherScheduleResponse(teacherId, "", []);

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Include(ts => ts.Period)
            .Include(ts => ts.RoomBooking).ThenInclude(rb => rb!.SpecialRoom)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId
                         && ts.CourseAssignment.TeacherId == teacherId)
            .OrderBy(ts => ts.DayOfWeek).ThenBy(ts => ts.Period.PeriodNumber)
            .Select(ts => MapSlotDto(ts))
            .ToListAsync();

        return new TeacherScheduleResponse(teacherId, teacher.Name, slots);
    }

    public async Task<(TimetableSlotDto? Slot, List<ConflictInfo> Conflicts)> CreateSlotAsync(
        int semesterId, CreateTimetableSlotRequest request)
    {
        var conflicts = await conflictService.CheckConflictsAsync(
            request.CourseAssignmentId, request.DayOfWeek, request.PeriodId, request.SpecialRoomId);

        if (conflicts.Count > 0)
            return (null, conflicts);

        var slot = new TimetableSlot
        {
            CourseAssignmentId = request.CourseAssignmentId,
            DayOfWeek = request.DayOfWeek,
            PeriodId = request.PeriodId
        };
        db.TimetableSlots.Add(slot);

        if (request.SpecialRoomId.HasValue)
        {
            var booking = new RoomBooking
            {
                TimetableSlot = slot,
                SpecialRoomId = request.SpecialRoomId.Value
            };
            db.RoomBookings.Add(booking);
        }

        await db.SaveChangesAsync();

        // Reload with includes
        var loaded = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Include(ts => ts.Period)
            .Include(ts => ts.RoomBooking).ThenInclude(rb => rb!.SpecialRoom)
            .FirstAsync(ts => ts.Id == slot.Id);

        return (MapSlotDto(loaded), []);
    }

    public async Task<bool> DeleteSlotAsync(int slotId)
    {
        var slot = await db.TimetableSlots
            .Include(ts => ts.RoomBooking)
            .FirstOrDefaultAsync(ts => ts.Id == slotId);

        if (slot is null) return false;

        if (slot.RoomBooking is not null)
            db.RoomBookings.Remove(slot.RoomBooking);

        db.TimetableSlots.Remove(slot);
        await db.SaveChangesAsync();
        return true;
    }

    private static TimetableSlotDto MapSlotDto(TimetableSlot ts) => new(
        ts.Id, ts.CourseAssignmentId,
        ts.DayOfWeek, ts.PeriodId, ts.Period.PeriodNumber,
        ts.CourseAssignment.Course.Name, ts.CourseAssignment.Course.ColorCode,
        ts.CourseAssignment.Teacher.Name, ts.CourseAssignment.TeacherId,
        ts.CourseAssignment.Class.DisplayName, ts.CourseAssignment.ClassId,
        ts.RoomBooking?.SpecialRoomId, ts.RoomBooking?.SpecialRoom?.Name);
}

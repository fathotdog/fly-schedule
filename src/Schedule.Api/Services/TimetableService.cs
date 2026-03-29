using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Services;

public class TimetableService(ScheduleDbContext db, ConflictDetectionService conflictService)
{
    private IQueryable<TimetableSlot> SlotWithFullIncludes() =>
        db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Include(ts => ts.Period)
            .Include(ts => ts.RoomBooking).ThenInclude(rb => rb!.SpecialRoom);

    public Task<TimetableGridResponse> GetClassTimetableAsync(int semesterId, int classId) =>
        GetTimetableAsync(
            ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.ClassId == classId,
            ca => ca.SemesterId == semesterId && ca.ClassId == classId && ca.TeacherId != null);

    public Task<TimetableGridResponse> GetTeacherTimetableAsync(int semesterId, int teacherId) =>
        GetTimetableAsync(
            ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.TeacherId == teacherId,
            ca => ca.SemesterId == semesterId && ca.TeacherId == teacherId);

    public async Task<List<TimetableSlotDto>> GetRoomTimetableAsync(int semesterId, int roomId)
    {
        return await GetSlotsAsync(
            ts => ts.CourseAssignment.SemesterId == semesterId
                  && ts.RoomBooking != null && ts.RoomBooking.SpecialRoomId == roomId);
    }

    public async Task<TeacherScheduleResponse> GetTeacherScheduleAsync(int semesterId, int teacherId)
    {
        var teacher = await db.Teachers.FindAsync(teacherId);
        if (teacher is null) return new TeacherScheduleResponse(teacherId, "", []);

        var slots = await GetSlotsAsync(
            ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.TeacherId == teacherId);

        return new TeacherScheduleResponse(teacherId, teacher.Name, slots);
    }

    private async Task<List<TimetableSlotDto>> GetSlotsAsync(
        System.Linq.Expressions.Expression<Func<TimetableSlot, bool>> filter)
    {
        return await SlotWithFullIncludes()
            .Where(filter)
            .OrderBy(ts => ts.DayOfWeek).ThenBy(ts => ts.Period.PeriodNumber)
            .Select(ts => MapSlotDto(ts))
            .ToListAsync();
    }

    private async Task<TimetableGridResponse> GetTimetableAsync(
        System.Linq.Expressions.Expression<Func<TimetableSlot, bool>> slotFilter,
        System.Linq.Expressions.Expression<Func<CourseAssignment, bool>> assignmentFilter)
    {
        var slots = await GetSlotsAsync(slotFilter);

        var assignments = await db.CourseAssignments
            .Include(ca => ca.Course)
            .Include(ca => ca.Teacher)
            .Include(ca => ca.Class)
            .Include(ca => ca.TimetableSlots)
            .Where(assignmentFilter)
            .Select(ca => new CourseAssignmentProgressDto(
                ca.Id, ca.CourseId, ca.Course.Name, ca.Course.ColorCode,
                ca.TeacherId, ca.Teacher != null ? ca.Teacher.Name : null,
                ca.ClassId, ca.Class.DisplayName,
                ca.WeeklyPeriods, ca.TimetableSlots.Count))
            .ToListAsync();

        return new TimetableGridResponse(slots, assignments);
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

        var loaded = await SlotWithFullIncludes().FirstAsync(ts => ts.Id == slot.Id);

        return (MapSlotDto(loaded), []);
    }

    public async Task<(bool Found, bool Locked)> DeleteSlotAsync(int slotId)
    {
        var slot = await db.TimetableSlots
            .Include(ts => ts.RoomBooking)
            .FirstOrDefaultAsync(ts => ts.Id == slotId);

        if (slot is null) return (false, false);
        if (slot.IsLocked) return (true, true);

        if (slot.RoomBooking is not null)
            db.RoomBookings.Remove(slot.RoomBooking);

        db.TimetableSlots.Remove(slot);
        await db.SaveChangesAsync();
        return (true, false);
    }

    public async Task<(int Deleted, int SkippedLocked)> ClearAssignmentSlotsAsync(int courseAssignmentId)
    {
        var slots = await db.TimetableSlots
            .Include(ts => ts.RoomBooking)
            .Where(ts => ts.CourseAssignmentId == courseAssignmentId)
            .ToListAsync();

        var toDelete = slots.Where(s => !s.IsLocked).ToList();
        var skipped = slots.Count - toDelete.Count;

        foreach (var slot in toDelete)
            if (slot.RoomBooking is not null)
                db.RoomBookings.Remove(slot.RoomBooking);

        db.TimetableSlots.RemoveRange(toDelete);
        await db.SaveChangesAsync();
        return (toDelete.Count, skipped);
    }

    public async Task<(TimetableSlotDto? Slot, List<ConflictInfo> Conflicts)> MoveSlotAsync(
        int slotId, MoveTimetableSlotRequest request)
    {
        var slot = await SlotWithFullIncludes().FirstOrDefaultAsync(ts => ts.Id == slotId);

        if (slot is null)
            return (null, [new ConflictInfo("NotFound", "找不到排課資料")]);

        if (slot.IsLocked)
            return (null, [new ConflictInfo("Locked", "此節次已鎖定，無法移動")]);

        var conflicts = await conflictService.CheckConflictsAsync(
            slot.CourseAssignmentId, request.DayOfWeek, request.PeriodId,
            slot.RoomBooking?.SpecialRoomId, excludeSlotIds: [slotId]);

        if (conflicts.Count > 0)
            return (null, conflicts);

        slot.DayOfWeek = request.DayOfWeek;
        slot.PeriodId = request.PeriodId;
        await db.SaveChangesAsync();

        // Refresh Period navigation property after PeriodId change
        await db.Entry(slot).Reference(s => s.Period).LoadAsync();

        return (MapSlotDto(slot), []);
    }

    public async Task<(List<TimetableSlotDto> Slots, List<ConflictInfo> Conflicts)> SwapSlotsAsync(
        SwapTimetableSlotsRequest req)
    {
        var (slot1, slot2, notFound) = await LoadSwapSlots(req.SlotId1, req.SlotId2);
        if (notFound is not null) return ([], notFound);

        if (slot1!.IsLocked || slot2!.IsLocked)
            return ([], [new ConflictInfo("Locked", "已鎖定的節次無法交換")]);

        var allConflicts = await CheckSwapConflictsForSlots(slot1!, slot2!);
        if (allConflicts.Count > 0)
            return ([], allConflicts);

        var (origDay1, origPeriod1) = (slot1!.DayOfWeek, slot1.PeriodId);
        var (origDay2, origPeriod2) = (slot2!.DayOfWeek, slot2.PeriodId);

        if (slot1.CourseAssignmentId == slot2.CourseAssignmentId)
        {
            // Same CA: two-phase swap to avoid unique constraint violation
            // (SQLite checks per-statement; direct swap would temporarily duplicate a row)
            slot1.DayOfWeek = -1;
            await db.SaveChangesAsync();

            slot1.DayOfWeek = origDay2;
            slot1.PeriodId = origPeriod2;
            slot2.DayOfWeek = origDay1;
            slot2.PeriodId = origPeriod1;
            await db.SaveChangesAsync();
        }
        else
        {
            (slot1.DayOfWeek, slot2.DayOfWeek) = (origDay2, origDay1);
            (slot1.PeriodId, slot2.PeriodId) = (origPeriod2, origPeriod1);
            await db.SaveChangesAsync();
        }

        var reloaded = await SlotWithFullIncludes()
            .Where(ts => ts.Id == slot1.Id || ts.Id == slot2.Id)
            .ToListAsync();

        return ([MapSlotDto(reloaded.First(ts => ts.Id == slot1.Id)), MapSlotDto(reloaded.First(ts => ts.Id == slot2.Id))], []);
    }

    public async Task<List<ConflictInfo>> CheckSwapConflictsAsync(int slotId1, int slotId2)
    {
        var (slot1, slot2, notFound) = await LoadSwapSlots(slotId1, slotId2);
        if (notFound is not null) return notFound;
        return await CheckSwapConflictsForSlots(slot1!, slot2!);
    }

    private async Task<(TimetableSlot? Slot1, TimetableSlot? Slot2, List<ConflictInfo>? NotFound)> LoadSwapSlots(int slotId1, int slotId2)
    {
        var both = await SlotWithFullIncludes()
            .Where(ts => ts.Id == slotId1 || ts.Id == slotId2)
            .ToListAsync();
        var slot1 = both.FirstOrDefault(ts => ts.Id == slotId1);
        var slot2 = both.FirstOrDefault(ts => ts.Id == slotId2);
        if (slot1 is null || slot2 is null)
            return (null, null, [new ConflictInfo("NotFound", "找不到排課資料")]);
        return (slot1, slot2, null);
    }

    private async Task<List<ConflictInfo>> CheckSwapConflictsForSlots(TimetableSlot slot1, TimetableSlot slot2)
    {
        var excludeIds = new[] { slot1.Id, slot2.Id };
        var t1 = conflictService.CheckConflictsAsync(slot1.CourseAssignmentId, slot2.DayOfWeek, slot2.PeriodId,
            slot1.RoomBooking?.SpecialRoomId, excludeSlotIds: excludeIds);
        var t2 = conflictService.CheckConflictsAsync(slot2.CourseAssignmentId, slot1.DayOfWeek, slot1.PeriodId,
            slot2.RoomBooking?.SpecialRoomId, excludeSlotIds: excludeIds);
        await Task.WhenAll(t1, t2);
        return t1.Result.Concat(t2.Result).ToList();
    }

    public async Task<TimetableSlotDto?> ToggleLockAsync(int slotId, bool isLocked)
    {
        var slot = await SlotWithFullIncludes().FirstOrDefaultAsync(ts => ts.Id == slotId);
        if (slot is null) return null;
        slot.IsLocked = isLocked;
        await db.SaveChangesAsync();
        return MapSlotDto(slot);
    }

    private static TimetableSlotDto MapSlotDto(TimetableSlot ts) => new(
        ts.Id, ts.CourseAssignmentId,
        ts.DayOfWeek, ts.PeriodId, ts.Period.PeriodNumber,
        ts.CourseAssignment.Course.Name, ts.CourseAssignment.Course.ColorCode,
        ts.CourseAssignment.Teacher != null ? ts.CourseAssignment.Teacher.Name : null, ts.CourseAssignment.TeacherId,
        ts.CourseAssignment.Class.DisplayName, ts.CourseAssignment.ClassId,
        ts.RoomBooking?.SpecialRoomId, ts.RoomBooking?.SpecialRoom?.Name,
        ts.IsLocked);
}

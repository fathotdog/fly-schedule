using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;
using Schedule.Api.Services;

namespace Schedule.Api.Tests;

public class TimetableServiceTests
{
    private static ScheduleDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ScheduleDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new ScheduleDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    private static async Task<(ScheduleDbContext db, CourseAssignment ca, Period period)> SetupAsync()
    {
        var db = CreateDb();

        var semester = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
        db.Semesters.Add(semester);

        var cls = new SchoolClass { Semester = semester, GradeYear = 7, Section = 1, DisplayName = "七年一班" };
        db.SchoolClasses.Add(cls);

        var teacher = new Teacher { Name = "王老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
        db.Teachers.Add(teacher);

        var course = new Course { Name = "國文", ColorCode = "#ef4444" };
        db.Courses.Add(course);

        var period = new Period { Semester = semester, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };
        db.Periods.Add(period);

        await db.SaveChangesAsync();

        var ca = new CourseAssignment { Semester = semester, Course = course, Teacher = teacher, Class = cls, WeeklyPeriods = 5 };
        db.CourseAssignments.Add(ca);
        await db.SaveChangesAsync();

        return (db, ca, period);
    }

    [Fact]
    public async Task CreateSlot_SucceedsWhenNoConflict()
    {
        var (db, ca, period) = await SetupAsync();
        var conflictSvc = new ConflictDetectionService(db);
        var svc = new TimetableService(db, conflictSvc);

        var (slot, conflicts) = await svc.CreateSlotAsync(ca.SemesterId, new CreateTimetableSlotRequest(ca.Id, 1, period.Id, null));

        Assert.NotNull(slot);
        Assert.Empty(conflicts);
    }

    [Fact]
    public async Task CreateSlot_ReturnsConflictWhenTeacherBusy()
    {
        var (db, ca, period) = await SetupAsync();

        // Create second assignment for different class, same teacher, same course
        var semester2Class = new SchoolClass { SemesterId = ca.SemesterId, GradeYear = 7, Section = 2, DisplayName = "七年二班" };
        db.SchoolClasses.Add(semester2Class);
        await db.SaveChangesAsync();

        var ca2 = new CourseAssignment
        {
            SemesterId = ca.SemesterId,
            CourseId = ca.CourseId,
            TeacherId = ca.TeacherId,
            ClassId = semester2Class.Id,
            WeeklyPeriods = 5
        };
        db.CourseAssignments.Add(ca2);

        // Schedule ca in Monday period 1
        db.TimetableSlots.Add(new TimetableSlot { CourseAssignment = ca, DayOfWeek = 1, Period = period });
        await db.SaveChangesAsync();

        var conflictSvc = new ConflictDetectionService(db);
        var svc = new TimetableService(db, conflictSvc);

        // Try to schedule ca2 (same teacher) in same slot
        var (slot, conflicts) = await svc.CreateSlotAsync(ca2.SemesterId, new CreateTimetableSlotRequest(ca2.Id, 1, period.Id, null));

        Assert.Null(slot);
        Assert.Contains(conflicts, c => c.Type == "TeacherConflict");
    }

    [Fact]
    public async Task CreateSlot_ReturnsConflictWhenPeriodLimitReached()
    {
        var (db, ca, period) = await SetupAsync();

        // Fill all 5 weekly periods
        for (var day = 1; day <= 5; day++)
        {
            db.TimetableSlots.Add(new TimetableSlot { CourseAssignment = ca, DayOfWeek = day, Period = period });
        }
        await db.SaveChangesAsync();

        var conflictSvc = new ConflictDetectionService(db);
        var svc = new TimetableService(db, conflictSvc);

        // Create a second period to try to add a 6th slot
        var period2 = new Period { SemesterId = ca.SemesterId, PeriodNumber = 2, StartTime = new TimeOnly(9, 25), EndTime = new TimeOnly(10, 10) };
        db.Periods.Add(period2);
        await db.SaveChangesAsync();

        var (slot, conflicts) = await svc.CreateSlotAsync(ca.SemesterId, new CreateTimetableSlotRequest(ca.Id, 1, period2.Id, null));

        Assert.Null(slot);
        Assert.Contains(conflicts, c => c.Type == "PeriodLimitExceeded");
    }

    [Fact]
    public async Task DeleteSlot_RemovesSlotFromDb()
    {
        var (db, ca, period) = await SetupAsync();
        var conflictSvc = new ConflictDetectionService(db);
        var svc = new TimetableService(db, conflictSvc);

        var (created, _) = await svc.CreateSlotAsync(ca.SemesterId, new CreateTimetableSlotRequest(ca.Id, 1, period.Id, null));
        Assert.NotNull(created);

        var (found, locked) = await svc.DeleteSlotAsync(created.Id);

        Assert.True(found);
        Assert.False(locked);
        Assert.False(await db.TimetableSlots.AnyAsync(ts => ts.Id == created.Id));
    }

    [Fact]
    public async Task DeleteSlot_ReturnsFalseForMissingSlot()
    {
        var (db, _, _) = await SetupAsync();
        var conflictSvc = new ConflictDetectionService(db);
        var svc = new TimetableService(db, conflictSvc);

        var (found, _) = await svc.DeleteSlotAsync(9999);

        Assert.False(found);
    }
}

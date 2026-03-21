using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Models;
using Schedule.Api.Services;

namespace Schedule.Api.Tests;

public class ConflictDetectionTests
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

    private static async Task<(ScheduleDbContext db, CourseAssignment ca1, CourseAssignment ca2, Period period)> SetupScenario()
    {
        var db = CreateDb();

        var semester = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
        db.Semesters.Add(semester);

        var class1 = new SchoolClass { Semester = semester, GradeYear = 7, Section = 1, DisplayName = "七年一班" };
        var class2 = new SchoolClass { Semester = semester, GradeYear = 7, Section = 2, DisplayName = "七年二班" };
        db.SchoolClasses.AddRange(class1, class2);

        var teacher = new Teacher { Name = "王老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
        db.Teachers.Add(teacher);

        var course1 = new Course { Name = "國文", ColorCode = "#ef4444" };
        var course2 = new Course { Name = "數學", ColorCode = "#22c55e" };
        db.Courses.AddRange(course1, course2);

        var period = new Period { Semester = semester, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };
        db.Periods.Add(period);

        await db.SaveChangesAsync();

        var ca1 = new CourseAssignment { Semester = semester, Course = course1, Teacher = teacher, Class = class1, WeeklyPeriods = 5 };
        var ca2 = new CourseAssignment { Semester = semester, Course = course2, Teacher = teacher, Class = class2, WeeklyPeriods = 4 };
        db.CourseAssignments.AddRange(ca1, ca2);
        await db.SaveChangesAsync();

        return (db, ca1, ca2, period);
    }

    [Fact]
    public async Task NoConflict_WhenSlotIsEmpty()
    {
        var (db, ca1, _, period) = await SetupScenario();
        var svc = new ConflictDetectionService(db);

        var conflicts = await svc.CheckConflictsAsync(ca1.Id, 1, period.Id, null);

        Assert.Empty(conflicts);
    }

    [Fact]
    public async Task DetectsTeacherConflict()
    {
        var (db, ca1, ca2, period) = await SetupScenario();

        // Place ca1 in Monday period 1
        db.TimetableSlots.Add(new TimetableSlot { CourseAssignment = ca1, DayOfWeek = 1, Period = period });
        await db.SaveChangesAsync();

        var svc = new ConflictDetectionService(db);

        // Try placing ca2 (same teacher) in Monday period 1
        var conflicts = await svc.CheckConflictsAsync(ca2.Id, 1, period.Id, null);

        Assert.Contains(conflicts, c => c.Type == "TeacherConflict");
    }

    [Fact]
    public async Task DetectsClassConflict()
    {
        var (db, ca1, _, period) = await SetupScenario();

        // Add a second course assignment for the same class with a different teacher
        var teacher2 = new Teacher { Name = "李老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
        db.Teachers.Add(teacher2);

        var course3 = new Course { Name = "英語", ColorCode = "#3b82f6" };
        db.Courses.Add(course3);
        await db.SaveChangesAsync();

        var ca3 = new CourseAssignment
        {
            SemesterId = ca1.SemesterId, Course = course3, Teacher = teacher2, ClassId = ca1.ClassId, WeeklyPeriods = 3
        };
        db.CourseAssignments.Add(ca3);

        // Place ca1 in Monday period 1
        db.TimetableSlots.Add(new TimetableSlot { CourseAssignment = ca1, DayOfWeek = 1, Period = period });
        await db.SaveChangesAsync();

        var svc = new ConflictDetectionService(db);

        // Try placing ca3 (same class, different teacher) in Monday period 1
        var conflicts = await svc.CheckConflictsAsync(ca3.Id, 1, period.Id, null);

        Assert.Contains(conflicts, c => c.Type == "ClassConflict");
    }

    [Fact]
    public async Task DetectsRoomConflict()
    {
        var (db, ca1, ca2, period) = await SetupScenario();

        var room = new SpecialRoom { Name = "音樂教室", Capacity = 40 };
        db.SpecialRooms.Add(room);

        var slot = new TimetableSlot { CourseAssignment = ca1, DayOfWeek = 1, Period = period };
        db.TimetableSlots.Add(slot);
        await db.SaveChangesAsync();

        db.RoomBookings.Add(new RoomBooking { TimetableSlot = slot, SpecialRoom = room });
        await db.SaveChangesAsync();

        var svc = new ConflictDetectionService(db);

        // Try placing ca2 in Monday period 1 with same room
        var conflicts = await svc.CheckConflictsAsync(ca2.Id, 1, period.Id, room.Id);

        Assert.Contains(conflicts, c => c.Type == "RoomConflict");
    }
}

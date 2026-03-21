using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;
using Schedule.Api.Services;

namespace Schedule.Api.Tests;

public class CourseAssignmentServiceTests
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

    private static async Task<(ScheduleDbContext db, Semester semester, SchoolClass class1, SchoolClass class2, Course course1, Course course2)> SetupAsync()
    {
        var db = CreateDb();

        var semester = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
        db.Semesters.Add(semester);

        var class1 = new SchoolClass { Semester = semester, GradeYear = 7, Section = 1, DisplayName = "七年一班" };
        var class2 = new SchoolClass { Semester = semester, GradeYear = 7, Section = 2, DisplayName = "七年二班" };
        db.SchoolClasses.AddRange(class1, class2);

        var course1 = new Course { Name = "國文", ColorCode = "#ef4444" };
        var course2 = new Course { Name = "數學", ColorCode = "#22c55e" };
        db.Courses.AddRange(course1, course2);

        await db.SaveChangesAsync();
        return (db, semester, class1, class2, course1, course2);
    }

    [Fact]
    public async Task Batch_CreatesNewAssignment()
    {
        var (db, semester, class1, _, course1, _) = await SetupAsync();
        var svc = new CourseAssignmentService(db);

        var req = new BatchCourseAssignmentRequest(
            ClassId: class1.Id,
            Upserts: [new BatchCourseAssignmentItem(null, course1.Id, null, 5)],
            DeleteIds: []
        );

        var (error, result) = await svc.BatchAsync(semester.Id, req);

        Assert.Null(error);
        Assert.NotNull(result);
        Assert.Equal(1, result.Created);
        Assert.Single(result.Assignments);
        Assert.Equal(5, result.Assignments[0].WeeklyPeriods);
    }

    [Fact]
    public async Task Batch_RejectsZeroWeeklyPeriods()
    {
        var (db, semester, class1, _, course1, _) = await SetupAsync();
        var svc = new CourseAssignmentService(db);

        var req = new BatchCourseAssignmentRequest(
            ClassId: class1.Id,
            Upserts: [new BatchCourseAssignmentItem(null, course1.Id, null, 0)],
            DeleteIds: []
        );

        var (error, result) = await svc.BatchAsync(semester.Id, req);

        Assert.NotNull(error);
        Assert.Null(result);
    }

    [Fact]
    public async Task Batch_RejectsInvalidClass()
    {
        var (db, semester, _, _, course1, _) = await SetupAsync();
        var svc = new CourseAssignmentService(db);

        var req = new BatchCourseAssignmentRequest(
            ClassId: 9999,
            Upserts: [new BatchCourseAssignmentItem(null, course1.Id, null, 5)],
            DeleteIds: []
        );

        var (error, result) = await svc.BatchAsync(semester.Id, req);

        Assert.NotNull(error);
        Assert.Null(result);
    }

    [Fact]
    public async Task Batch_UpdatesExistingAssignment()
    {
        var (db, semester, class1, _, course1, _) = await SetupAsync();
        var existing = new CourseAssignment
        {
            SemesterId = semester.Id,
            ClassId = class1.Id,
            CourseId = course1.Id,
            TeacherId = null,
            WeeklyPeriods = 3
        };
        db.CourseAssignments.Add(existing);
        await db.SaveChangesAsync();

        var svc = new CourseAssignmentService(db);
        var req = new BatchCourseAssignmentRequest(
            ClassId: class1.Id,
            Upserts: [new BatchCourseAssignmentItem(existing.Id, course1.Id, null, 5)],
            DeleteIds: []
        );

        var (error, result) = await svc.BatchAsync(semester.Id, req);

        Assert.Null(error);
        Assert.Equal(1, result!.Updated);
        Assert.Equal(5, result.Assignments[0].WeeklyPeriods);
    }

    [Fact]
    public async Task Batch_DeletesAssignmentWithNoSlots()
    {
        var (db, semester, class1, _, course1, _) = await SetupAsync();
        var existing = new CourseAssignment
        {
            SemesterId = semester.Id,
            ClassId = class1.Id,
            CourseId = course1.Id,
            TeacherId = null,
            WeeklyPeriods = 3
        };
        db.CourseAssignments.Add(existing);
        await db.SaveChangesAsync();

        var svc = new CourseAssignmentService(db);
        var req = new BatchCourseAssignmentRequest(
            ClassId: class1.Id,
            Upserts: [],
            DeleteIds: [existing.Id]
        );

        var (error, result) = await svc.BatchAsync(semester.Id, req);

        Assert.Null(error);
        Assert.Equal(1, result!.Deleted);
        Assert.Empty(result.Assignments);
    }

    [Fact]
    public async Task Batch_BlocksDeletionOfScheduledAssignment()
    {
        var (db, semester, class1, _, course1, _) = await SetupAsync();
        var assignment = new CourseAssignment
        {
            SemesterId = semester.Id,
            ClassId = class1.Id,
            CourseId = course1.Id,
            TeacherId = null,
            WeeklyPeriods = 3
        };
        db.CourseAssignments.Add(assignment);
        await db.SaveChangesAsync();

        var period = new Period { Semester = semester, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };
        db.Periods.Add(period);
        db.TimetableSlots.Add(new TimetableSlot { CourseAssignment = assignment, DayOfWeek = 1, Period = period });
        await db.SaveChangesAsync();

        var svc = new CourseAssignmentService(db);
        var req = new BatchCourseAssignmentRequest(
            ClassId: class1.Id,
            Upserts: [],
            DeleteIds: [assignment.Id]
        );

        var (error, result) = await svc.BatchAsync(semester.Id, req);

        Assert.NotNull(error);
        Assert.Null(result);
    }

    [Fact]
    public async Task Copy_CopiesAssignmentsToTarget()
    {
        var (db, semester, class1, class2, course1, course2) = await SetupAsync();
        db.CourseAssignments.AddRange(
            new CourseAssignment { SemesterId = semester.Id, ClassId = class1.Id, CourseId = course1.Id, TeacherId = null, WeeklyPeriods = 4 },
            new CourseAssignment { SemesterId = semester.Id, ClassId = class1.Id, CourseId = course2.Id, TeacherId = null, WeeklyPeriods = 3 }
        );
        await db.SaveChangesAsync();

        var svc = new CourseAssignmentService(db);
        var req = new CopyCourseAssignmentsRequest(class1.Id, class2.Id);

        var (error, result) = await svc.CopyAsync(semester.Id, req);

        Assert.Null(error);
        Assert.Equal(2, result!.Created);
        Assert.Equal(0, result.Skipped);
    }

    [Fact]
    public async Task Copy_SkipsDuplicateCourses()
    {
        var (db, semester, class1, class2, course1, _) = await SetupAsync();
        db.CourseAssignments.AddRange(
            new CourseAssignment { SemesterId = semester.Id, ClassId = class1.Id, CourseId = course1.Id, TeacherId = null, WeeklyPeriods = 4 },
            // class2 already has course1 (no teacher)
            new CourseAssignment { SemesterId = semester.Id, ClassId = class2.Id, CourseId = course1.Id, TeacherId = null, WeeklyPeriods = 4 }
        );
        await db.SaveChangesAsync();

        var svc = new CourseAssignmentService(db);
        var req = new CopyCourseAssignmentsRequest(class1.Id, class2.Id);

        var (error, result) = await svc.CopyAsync(semester.Id, req);

        Assert.Null(error);
        Assert.Equal(0, result!.Created);
        Assert.Equal(1, result.Skipped);
    }

    [Fact]
    public async Task Copy_RejectsSameSourceAndTarget()
    {
        var (db, semester, class1, _, _, _) = await SetupAsync();
        var svc = new CourseAssignmentService(db);
        var req = new CopyCourseAssignmentsRequest(class1.Id, class1.Id);

        var (error, result) = await svc.CopyAsync(semester.Id, req);

        Assert.NotNull(error);
        Assert.Null(result);
    }

    [Fact]
    public async Task AssignTeacher_AssignsToUnassignedRecords()
    {
        var (db, semester, class1, _, course1, _) = await SetupAsync();
        var teacher = new Teacher { Name = "王老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
        db.Teachers.Add(teacher);
        var assignment = new CourseAssignment
        {
            SemesterId = semester.Id,
            ClassId = class1.Id,
            CourseId = course1.Id,
            TeacherId = null,
            WeeklyPeriods = 4
        };
        db.CourseAssignments.Add(assignment);
        await db.SaveChangesAsync();

        var svc = new CourseAssignmentService(db);
        var error = await svc.AssignTeacherAsync(semester.Id, new AssignTeacherRequest([assignment.Id], teacher.Id));

        Assert.Null(error);
        var updated = await db.CourseAssignments.FindAsync(assignment.Id);
        Assert.Equal(teacher.Id, updated!.TeacherId);
    }

    [Fact]
    public async Task AssignTeacher_RejectsNonexistentTeacher()
    {
        var (db, semester, class1, _, course1, _) = await SetupAsync();
        var assignment = new CourseAssignment
        {
            SemesterId = semester.Id,
            ClassId = class1.Id,
            CourseId = course1.Id,
            TeacherId = null,
            WeeklyPeriods = 4
        };
        db.CourseAssignments.Add(assignment);
        await db.SaveChangesAsync();

        var svc = new CourseAssignmentService(db);
        var error = await svc.AssignTeacherAsync(semester.Id, new AssignTeacherRequest([assignment.Id], 9999));

        Assert.NotNull(error);
    }

    [Fact]
    public async Task UnassignTeacher_ClearsTeacherId()
    {
        var (db, semester, class1, _, course1, _) = await SetupAsync();
        var teacher = new Teacher { Name = "王老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
        db.Teachers.Add(teacher);
        var assignment = new CourseAssignment
        {
            SemesterId = semester.Id,
            ClassId = class1.Id,
            CourseId = course1.Id,
            Teacher = teacher,
            WeeklyPeriods = 4
        };
        db.CourseAssignments.Add(assignment);
        await db.SaveChangesAsync();

        var svc = new CourseAssignmentService(db);
        await svc.UnassignTeacherAsync(semester.Id, new UnassignTeacherRequest([assignment.Id]));

        var updated = await db.CourseAssignments.FindAsync(assignment.Id);
        Assert.Null(updated!.TeacherId);
    }
}

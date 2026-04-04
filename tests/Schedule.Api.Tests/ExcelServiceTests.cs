using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Models;
using Schedule.Api.Services;

namespace Schedule.Api.Tests;

public class ExcelServiceTests
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

    private static async Task<(ScheduleDbContext db, Semester semester, SchoolClass schoolClass, Course course)> SetupAsync()
    {
        var db = CreateDb();

        var semester = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
        var schoolClass = new SchoolClass { Semester = semester, GradeYear = 7, Section = 1, DisplayName = "七年一班" };
        var course = new Course { Name = "國文", ColorCode = "#ef4444" };

        db.Semesters.Add(semester);
        db.SchoolClasses.Add(schoolClass);
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        return (db, semester, schoolClass, course);
    }

    private static MemoryStream CreateImportWorkbook(params (string ClassName, string CourseName, string TeacherName, int WeeklyPeriods)[] rows)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("配課");
        ws.Cell(1, 1).Value = "班級";
        ws.Cell(1, 2).Value = "課程";
        ws.Cell(1, 3).Value = "教師";
        ws.Cell(1, 4).Value = "每週節數";

        for (var i = 0; i < rows.Length; i++)
        {
            var row = rows[i];
            ws.Cell(i + 2, 1).Value = row.ClassName;
            ws.Cell(i + 2, 2).Value = row.CourseName;
            ws.Cell(i + 2, 3).Value = row.TeacherName;
            ws.Cell(i + 2, 4).Value = row.WeeklyPeriods;
        }

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    [Fact]
    public async Task ImportCourseAssignments_CreatesUnassignedAssignmentWhenTeacherCellIsBlank()
    {
        var (db, semester, schoolClass, course) = await SetupAsync();
        var svc = new ExcelService(db);
        using var stream = CreateImportWorkbook((schoolClass.DisplayName, course.Name, string.Empty, 4));

        var result = await svc.ImportCourseAssignmentsAsync(semester.Id, stream);

        Assert.Equal(1, result.Created);
        Assert.Equal(0, result.Updated);
        Assert.Equal(0, result.Skipped);
        var assignment = await db.CourseAssignments.SingleAsync();
        Assert.Equal(course.Id, assignment.CourseId);
        Assert.Equal(schoolClass.Id, assignment.ClassId);
        Assert.Null(assignment.TeacherId);
        Assert.Equal(4, assignment.WeeklyPeriods);
    }

    [Fact]
    public async Task ImportCourseAssignments_UpdatesExistingUnassignedAssignmentWhenTeacherCellIsBlank()
    {
        var (db, semester, schoolClass, course) = await SetupAsync();
        db.CourseAssignments.Add(new CourseAssignment
        {
            SemesterId = semester.Id,
            CourseId = course.Id,
            ClassId = schoolClass.Id,
            TeacherId = null,
            WeeklyPeriods = 2
        });
        await db.SaveChangesAsync();

        var svc = new ExcelService(db);
        using var stream = CreateImportWorkbook((schoolClass.DisplayName, course.Name, "   ", 5));

        var result = await svc.ImportCourseAssignmentsAsync(semester.Id, stream);

        Assert.Equal(0, result.Created);
        Assert.Equal(1, result.Updated);
        Assert.Equal(0, result.Skipped);
        var assignment = await db.CourseAssignments.SingleAsync();
        Assert.Null(assignment.TeacherId);
        Assert.Equal(5, assignment.WeeklyPeriods);
    }
}

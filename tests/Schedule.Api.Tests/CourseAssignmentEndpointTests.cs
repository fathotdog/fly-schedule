using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Schedule.Api.Data;
using Schedule.Api.Models;

namespace Schedule.Api.Tests;

public class CourseAssignmentEndpointTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly SqliteConnection _connection;

    public CourseAssignmentEndpointTests(WebApplicationFactory<Program> factory)
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _factory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ScheduleDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddDbContext<ScheduleDbContext>(options =>
                    options.UseSqlite(_connection));
            }));
    }

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task DeleteCourseAssignment_WithScheduledSlots_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        int semesterId;
        int assignmentId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();

            var semester = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
            var schoolClass = new SchoolClass { Semester = semester, GradeYear = 7, Section = 1, DisplayName = "七年一班" };
            var course = new Course { Name = "國文", ColorCode = "#ef4444" };
            var assignment = new CourseAssignment
            {
                Semester = semester,
                Class = schoolClass,
                Course = course,
                WeeklyPeriods = 3
            };
            var period = new Period
            {
                Semester = semester,
                PeriodNumber = 1,
                StartTime = new TimeOnly(8, 30),
                EndTime = new TimeOnly(9, 15)
            };

            db.CourseAssignments.Add(assignment);
            db.Periods.Add(period);
            db.TimetableSlots.Add(new TimetableSlot
            {
                CourseAssignment = assignment,
                DayOfWeek = 1,
                Period = period
            });
            await db.SaveChangesAsync();

            semesterId = semester.Id;
            assignmentId = assignment.Id;
        }

        var response = await client.DeleteAsync($"/api/semesters/{semesterId}/course-assignments/{assignmentId}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
        Assert.True(await verifyDb.CourseAssignments.AnyAsync(ca => ca.Id == assignmentId));
    }
}

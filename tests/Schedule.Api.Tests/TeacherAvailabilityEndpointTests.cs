using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Schedule.Api.Data;
using Schedule.Api.Dtos;
using Schedule.Api.Models;

namespace Schedule.Api.Tests;

public class TeacherAvailabilityEndpointTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly SqliteConnection _connection;

    public TeacherAvailabilityEndpointTests(WebApplicationFactory<Program> factory)
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
    public async Task PutAvailability_ReplacesTeacherAvailabilityWithinSemester()
    {
        var client = _factory.CreateClient();
        int semesterId, teacherId, period1Id, period2Id;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
            await db.Database.EnsureCreatedAsync();

            var semester = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
            var teacher = new Teacher { Name = "王老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
            var period1 = new Period { Semester = semester, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };
            var period2 = new Period { Semester = semester, PeriodNumber = 2, StartTime = new TimeOnly(9, 25), EndTime = new TimeOnly(10, 10) };

            db.AddRange(semester, teacher, period1, period2);
            await db.SaveChangesAsync();

            db.TeacherUnavailabilities.Add(new TeacherUnavailability
            {
                SemesterId = semester.Id,
                TeacherId = teacher.Id,
                DayOfWeek = 1,
                PeriodId = period1.Id
            });
            await db.SaveChangesAsync();

            semesterId = semester.Id;
            teacherId = teacher.Id;
            period1Id = period1.Id;
            period2Id = period2.Id;
        }

        var response = await client.PutAsJsonAsync(
            $"/api/semesters/{semesterId}/teachers/{teacherId}/availability",
            new[] { new { dayOfWeek = 2, periodId = period2Id } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<List<TeacherUnavailabilityDto>>();
        Assert.NotNull(body);
        Assert.Single(body!);
        Assert.Equal(semesterId, body[0].SemesterId);
        Assert.Equal(2, body[0].DayOfWeek);
        Assert.Equal(period2Id, body[0].PeriodId);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
        var items = await verifyDb.TeacherUnavailabilities
            .Where(u => u.TeacherId == teacherId)
            .OrderBy(u => u.DayOfWeek)
            .ToListAsync();

        Assert.Single(items);
        Assert.Equal(2, items[0].DayOfWeek);
        Assert.Equal(period2Id, items[0].PeriodId);
        Assert.DoesNotContain(items, item => item.PeriodId == period1Id);
    }

    [Fact]
    public async Task PutAvailability_DoesNotWipeOtherSemesterRows()
    {
        var client = _factory.CreateClient();
        int semesterAId, semesterBId, teacherId, periodAId, periodBId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
            await db.Database.EnsureCreatedAsync();

            var semesterA = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
            var semesterB = new Semester { AcademicYear = 114, Term = 2, StartDate = new DateOnly(2026, 2, 1) };
            var teacher = new Teacher { Name = "王老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
            var periodA = new Period { Semester = semesterA, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };
            var periodB = new Period { Semester = semesterB, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };
            db.AddRange(semesterA, semesterB, teacher, periodA, periodB);
            await db.SaveChangesAsync();

            db.TeacherUnavailabilities.Add(new TeacherUnavailability
            {
                SemesterId = semesterA.Id,
                TeacherId = teacher.Id,
                DayOfWeek = 1,
                PeriodId = periodA.Id
            });
            await db.SaveChangesAsync();

            semesterAId = semesterA.Id;
            semesterBId = semesterB.Id;
            teacherId = teacher.Id;
            periodAId = periodA.Id;
            periodBId = periodB.Id;
        }

        // Save availability in semester B — semester A's row must remain intact.
        var response = await client.PutAsJsonAsync(
            $"/api/semesters/{semesterBId}/teachers/{teacherId}/availability",
            new[] { new { dayOfWeek = 2, periodId = periodBId } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
        var aItems = await verifyDb.TeacherUnavailabilities
            .Where(u => u.SemesterId == semesterAId && u.TeacherId == teacherId)
            .ToListAsync();
        var bItems = await verifyDb.TeacherUnavailabilities
            .Where(u => u.SemesterId == semesterBId && u.TeacherId == teacherId)
            .ToListAsync();

        Assert.Single(aItems);
        Assert.Equal(periodAId, aItems[0].PeriodId);
        Assert.Single(bItems);
        Assert.Equal(periodBId, bItems[0].PeriodId);
    }

    [Fact]
    public async Task PutAvailability_RejectsCrossSemesterPeriodIds()
    {
        var client = _factory.CreateClient();
        int semesterAId, semesterBId, teacherId, periodBId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
            await db.Database.EnsureCreatedAsync();

            var semesterA = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
            var semesterB = new Semester { AcademicYear = 114, Term = 2, StartDate = new DateOnly(2026, 2, 1) };
            var teacher = new Teacher { Name = "王老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
            var periodB = new Period { Semester = semesterB, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };
            db.AddRange(semesterA, semesterB, teacher, periodB);
            await db.SaveChangesAsync();

            semesterAId = semesterA.Id;
            semesterBId = semesterB.Id;
            teacherId = teacher.Id;
            periodBId = periodB.Id;
        }

        // Attempt to save semester-B periods into semester A — should be rejected.
        var response = await client.PutAsJsonAsync(
            $"/api/semesters/{semesterAId}/teachers/{teacherId}/availability",
            new[] { new { dayOfWeek = 1, periodId = periodBId } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PutAvailability_AcceptsNullBodyAsEmptyReplacement()
    {
        var client = _factory.CreateClient();
        int semesterId, teacherId, periodId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
            await db.Database.EnsureCreatedAsync();

            var semester = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
            var teacher = new Teacher { Name = "王老師", StaffTitleId = 1, MaxWeeklyPeriods = 20 };
            var period = new Period { Semester = semester, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };
            db.AddRange(semester, teacher, period);
            await db.SaveChangesAsync();

            db.TeacherUnavailabilities.Add(new TeacherUnavailability
            {
                SemesterId = semester.Id,
                TeacherId = teacher.Id,
                DayOfWeek = 1,
                PeriodId = period.Id
            });
            await db.SaveChangesAsync();

            semesterId = semester.Id;
            teacherId = teacher.Id;
            periodId = period.Id;
        }

        var response = await client.PutAsJsonAsync<List<object>?>(
            $"/api/semesters/{semesterId}/teachers/{teacherId}/availability", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
        var items = await verifyDb.TeacherUnavailabilities
            .Where(u => u.SemesterId == semesterId && u.TeacherId == teacherId)
            .ToListAsync();

        Assert.Empty(items);
        _ = periodId; // suppress unused-variable warning
    }

    [Fact]
    public async Task GetAvailability_ReturnsTeacherAvailability()
    {
        var client = _factory.CreateClient();
        int semesterId, teacherId, periodId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
            await db.Database.EnsureCreatedAsync();

            var semester = new Semester { AcademicYear = 114, Term = 1, StartDate = new DateOnly(2025, 9, 1) };
            var teacher = new Teacher { Name = "李老師", StaffTitleId = 1, MaxWeeklyPeriods = 18 };
            var period = new Period { Semester = semester, PeriodNumber = 1, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(9, 15) };

            db.AddRange(semester, teacher, period);
            await db.SaveChangesAsync();

            db.TeacherUnavailabilities.Add(new TeacherUnavailability
            {
                SemesterId = semester.Id,
                TeacherId = teacher.Id,
                DayOfWeek = 3,
                PeriodId = period.Id
            });
            await db.SaveChangesAsync();

            semesterId = semester.Id;
            teacherId = teacher.Id;
            periodId = period.Id;
        }

        var response = await client.GetAsync($"/api/semesters/{semesterId}/teachers/{teacherId}/availability");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<List<TeacherUnavailabilityDto>>();
        Assert.NotNull(body);
        Assert.Single(body!);
        Assert.Equal(semesterId, body[0].SemesterId);
        Assert.Equal(teacherId, body[0].TeacherId);
        Assert.Equal(3, body[0].DayOfWeek);
        Assert.Equal(periodId, body[0].PeriodId);
    }
}

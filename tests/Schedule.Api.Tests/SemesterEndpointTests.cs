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

public class SemesterEndpointTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly SqliteConnection _connection;

    public SemesterEndpointTests(WebApplicationFactory<Program> factory)
    {
        // Use SQLite in-memory (same provider as prod) to avoid two-provider conflict
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

    private HttpClient CreateClient() => _factory.CreateClient();

    [Fact]
    public async Task CreateSemester_ReturnsCreated_WithDefaultPeriodsAndDays()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/semesters", new
        {
            academicYear = 114,
            term = 1,
            startDate = "2025-09-01",
            schoolName = "測試國中"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<SemesterDto>();
        Assert.NotNull(result);
        Assert.Equal(114, result.AcademicYear);
        Assert.Equal(1, result.Term);
        Assert.Equal("測試國中", result.SchoolName);

        // Verify DB: 5 school days + 7 instruction periods + 6 activity periods = 13 periods
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
        var days = await db.SchoolDays.Where(d => d.SemesterId == result.Id).CountAsync();
        var periods = await db.Periods.Where(p => p.SemesterId == result.Id).CountAsync();
        Assert.Equal(5, days);
        Assert.Equal(13, periods);
    }

    [Fact]
    public async Task CreateSemester_DuplicateYearTerm_ReturnsConflict()
    {
        var client = CreateClient();

        await client.PostAsJsonAsync("/api/semesters", new
        {
            academicYear = 113,
            term = 2,
            startDate = "2025-02-01"
        });

        var response = await client.PostAsJsonAsync("/api/semesters", new
        {
            academicYear = 113,
            term = 2,
            startDate = "2025-02-10"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task CreateSemester_InvalidTerm_ReturnsBadRequest()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/semesters", new
        {
            academicYear = 114,
            term = 3,
            startDate = "2025-09-01"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateSemester_WithSourceSemesterId_ClonesData()
    {
        var client = CreateClient();

        // Create source semester
        var srcResponse = await client.PostAsJsonAsync("/api/semesters", new
        {
            academicYear = 112,
            term = 1,
            startDate = "2023-09-01",
            schoolName = "來源學校"
        });
        Assert.Equal(HttpStatusCode.Created, srcResponse.StatusCode);
        var src = await srcResponse.Content.ReadFromJsonAsync<SemesterDto>();

        // Add a class to source semester
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
            db.SchoolClasses.Add(new SchoolClass { SemesterId = src!.Id, GradeYear = 7, Section = 1, DisplayName = "七年一班" });
            await db.SaveChangesAsync();
        }

        // Clone
        var cloneResponse = await client.PostAsJsonAsync("/api/semesters", new
        {
            academicYear = 112,
            term = 2,
            startDate = "2024-02-01",
            sourceSemesterId = src!.Id
        });

        Assert.Equal(HttpStatusCode.Created, cloneResponse.StatusCode);
        var clone = await cloneResponse.Content.ReadFromJsonAsync<SemesterDto>();

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
        var clonedDays = await verifyDb.SchoolDays.Where(d => d.SemesterId == clone!.Id).CountAsync();
        var clonedClasses = await verifyDb.SchoolClasses.Where(c => c.SemesterId == clone!.Id).CountAsync();
        var srcDays = await verifyDb.SchoolDays.Where(d => d.SemesterId == src.Id).CountAsync();
        Assert.Equal(srcDays, clonedDays);
        Assert.Equal(1, clonedClasses);
    }

    [Fact]
    public async Task CreateSemester_InvalidSourceSemesterId_ReturnsBadRequest()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/semesters", new
        {
            academicYear = 115,
            term = 1,
            startDate = "2026-09-01",
            sourceSemesterId = 9999
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

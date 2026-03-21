using Microsoft.EntityFrameworkCore;
using QuestPDF.Infrastructure;
using Schedule.Api.Data;
using Schedule.Api.Endpoints;
using Schedule.Api.Services;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ScheduleDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=schedule.db"));

builder.Services.AddScoped<ConflictDetectionService>();
builder.Services.AddScoped<TimetableService>();
builder.Services.AddScoped<TimetablePdfService>();
builder.Services.AddScoped<ExcelService>();
builder.Services.AddScoped<DashboardService>();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()));

builder.Services.AddOpenApi();

var app = builder.Build();

// Auto-migrate and enable WAL
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
}

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "Schedule API"));
}

// Map all endpoints
app.MapSemesterEndpoints();
app.MapSchoolClassEndpoints();
app.MapSchoolDayEndpoints();
app.MapStaffTitleEndpoints();
app.MapTeacherEndpoints();
app.MapCourseEndpoints();
app.MapCourseAssignmentEndpoints();
app.MapPeriodEndpoints();
app.MapHomeroomEndpoints();
app.MapSpecialRoomEndpoints();
app.MapTimetableEndpoints();
app.MapDashboardEndpoints();

app.Run();

public partial class Program;

using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Infrastructure;
using Schedule.Api.Data;
using Schedule.Api.Endpoints;
using Schedule.Api.Services;

QuestPDF.Settings.License = LicenseType.Community;

// 「打包版」＝ 非 Development 環境（發佈後預設為 Production）。
// 提前判斷，才能在建立 builder 時就把內容根目錄錨定到 exe 所在資料夾，
// 確保靜態檔（wwwroot）與 appsettings 都以 exe 位置為準，不受「工作目錄」影響。
// 這些行為只在打包版生效，開發模式（dotnet run + npm run dev）完全不受影響。
var aspnetEnv = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
    ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");
var isPackaged = !string.Equals(aspnetEnv, "Development", StringComparison.OrdinalIgnoreCase);
const string AppUrl = "http://localhost:5041";

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = isPackaged ? AppContext.BaseDirectory : null,
});

Mutex? singleInstanceMutex = null;
if (isPackaged)
{
    // 防呆：若系統已在執行，再點一次只幫忙打開瀏覽器，不再開第二份、也不報錯。
    singleInstanceMutex = new Mutex(initiallyOwned: true, @"Global\Schedule_SingleInstance", out var createdNew);
    if (!createdNew)
    {
        OpenBrowser(AppUrl);
        return;
    }

    // 只綁 loopback：不對區網開放，且 Windows 防火牆通常不會跳詢問視窗。
    builder.WebHost.UseUrls(AppUrl);
}

// 資料庫路徑：打包版一律錨定在 exe 所在資料夾，schedule.db 不會因工作目錄不同而跑掉。
// 開發模式維持原本的相對路徑行為。
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? (isPackaged
        ? $"Data Source={Path.Combine(AppContext.BaseDirectory, "schedule.db")}"
        : "Data Source=schedule.db");

builder.Services.AddDbContext<ScheduleDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddScoped<ConflictDetectionService>();
builder.Services.AddScoped<TimetableService>();
builder.Services.AddScoped<TimetablePdfService>();
builder.Services.AddScoped<ExcelService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<CourseAssignmentService>();

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

// 提供前端畫面（打包時 wwwroot 由建置腳本填入 React 產物；開發模式 wwwroot 為空，前端走 Vite）。
app.UseDefaultFiles();
app.UseStaticFiles();

// Map all endpoints
app.MapSemesterEndpoints();
app.MapSchoolClassEndpoints();
app.MapSchoolDayEndpoints();
app.MapStaffTitleEndpoints();
app.MapTeacherEndpoints();
app.MapTeacherAvailabilityEndpoints();
app.MapCourseEndpoints();
app.MapCourseAssignmentEndpoints();
app.MapPeriodEndpoints();
app.MapHomeroomEndpoints();
app.MapSpecialRoomEndpoints();
app.MapTimetableEndpoints();
app.MapDashboardEndpoints();

// 前端路由 fallback（React Router）：非 /api 且找不到檔案時回 index.html。
app.MapFallbackToFile("index.html");

if (isPackaged)
{
    // 首次啟動時自動在桌面建立捷徑，之後可直接從桌面開啟。
    EnsureDesktopShortcut();

    // 伺服器開始接聽後，印出友善說明並自動開瀏覽器。
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        try { Console.Title = "排課系統"; } catch { /* 無主控台時忽略 */ }
        Console.WriteLine();
        Console.WriteLine("  ┌────────────────────────────────────────────┐");
        Console.WriteLine("  │                排課系統 執行中               │");
        Console.WriteLine("  └────────────────────────────────────────────┘");
        Console.WriteLine();
        Console.WriteLine("  ● 系統正在執行，請「不要關閉」這個黑色視窗。");
        Console.WriteLine("  ● 請在自動打開的瀏覽器中操作。");
        Console.WriteLine($"    若沒有自動打開，請手動開啟：{AppUrl}");
        Console.WriteLine("  ● 要「結束系統」：直接關閉這個黑色視窗即可。");
        Console.WriteLine();
        OpenBrowser(AppUrl);
    });
}

app.Run();

GC.KeepAlive(singleInstanceMutex);

static void OpenBrowser(string url)
{
    try
    {
        Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
    }
    catch
    {
        // 開啟瀏覽器失敗不影響伺服器運作；使用者仍可手動輸入網址。
    }
}

static void EnsureDesktopShortcut()
{
    // 本程式只發佈 Windows 版；GetTypeFromProgID 為 Windows 專用。
#pragma warning disable CA1416
    try
    {
        var exePath = Environment.ProcessPath;
        if (string.IsNullOrEmpty(exePath)) return;

        var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var linkPath = Path.Combine(desktop, "排課系統.lnk");
        if (File.Exists(linkPath)) return;

        var shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType is null) return;

        dynamic shell = Activator.CreateInstance(shellType)!;
        dynamic shortcut = shell.CreateShortcut(linkPath);
        shortcut.TargetPath = exePath;
        shortcut.WorkingDirectory = Path.GetDirectoryName(exePath);
        shortcut.IconLocation = exePath + ",0";
        shortcut.Description = "排課系統";
        shortcut.Save();
    }
    catch
    {
        // 建立桌面捷徑失敗不影響使用（例如被防毒攔截）。
    }
#pragma warning restore CA1416
}

public partial class Program;

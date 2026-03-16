using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Models;

namespace Schedule.Api.Services;

public record ImportResult(int Created, int Updated, int Skipped);

public class ExcelService(ScheduleDbContext db)
{
    public async Task<byte[]> ExportTeachersAsync()
    {
        var teachers = await db.Teachers
            .Include(t => t.StaffTitle)
            .OrderBy(t => t.Name)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("教師");

        ws.Cell(1, 1).Value = "姓名";
        ws.Cell(1, 2).Value = "職稱";
        ws.Cell(1, 3).Value = "每週節數上限";
        ws.Row(1).Style.Font.Bold = true;

        for (var i = 0; i < teachers.Count; i++)
        {
            ws.Cell(i + 2, 1).Value = teachers[i].Name;
            ws.Cell(i + 2, 2).Value = teachers[i].StaffTitle.Name;
            ws.Cell(i + 2, 3).Value = teachers[i].MaxWeeklyPeriods;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<ImportResult> ImportTeachersAsync(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheet(1);

        var staffTitles = await db.StaffTitles.ToListAsync();
        var existingTeachers = await db.Teachers.ToListAsync();

        int created = 0, updated = 0, skipped = 0;

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            var name = row.Cell(1).GetString().Trim();
            var titleName = row.Cell(2).GetString().Trim();
            var maxPeriods = (int)row.Cell(3).GetDouble();

            if (string.IsNullOrWhiteSpace(name))
            {
                skipped++;
                continue;
            }

            // Find or create staff title
            var title = staffTitles.FirstOrDefault(t => t.Name == titleName);
            if (title is null && !string.IsNullOrWhiteSpace(titleName))
            {
                title = new StaffTitle { Name = titleName };
                db.StaffTitles.Add(title);
                await db.SaveChangesAsync();
                staffTitles.Add(title);
            }

            if (title is null)
            {
                skipped++;
                continue;
            }

            var existing = existingTeachers.FirstOrDefault(t => t.Name == name);
            if (existing is not null)
            {
                existing.StaffTitleId = title.Id;
                existing.MaxWeeklyPeriods = maxPeriods;
                updated++;
            }
            else
            {
                var teacher = new Teacher
                {
                    Name = name,
                    StaffTitleId = title.Id,
                    MaxWeeklyPeriods = maxPeriods
                };
                db.Teachers.Add(teacher);
                existingTeachers.Add(teacher);
                created++;
            }
        }

        await db.SaveChangesAsync();
        return new ImportResult(created, updated, skipped);
    }

    public async Task<byte[]> ExportCoursesAsync()
    {
        var courses = await db.Courses.OrderBy(c => c.Name).ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("課程");

        ws.Cell(1, 1).Value = "名稱";
        ws.Cell(1, 2).Value = "色碼";
        ws.Cell(1, 3).Value = "需要專科教室";
        ws.Row(1).Style.Font.Bold = true;

        for (var i = 0; i < courses.Count; i++)
        {
            ws.Cell(i + 2, 1).Value = courses[i].Name;
            ws.Cell(i + 2, 2).Value = courses[i].ColorCode;
            ws.Cell(i + 2, 3).Value = courses[i].RequiresSpecialRoom ? "是" : "否";
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<ImportResult> ImportCoursesAsync(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheet(1);

        var existingCourses = await db.Courses.ToListAsync();

        int created = 0, updated = 0, skipped = 0;

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            var name = row.Cell(1).GetString().Trim();
            var colorCode = row.Cell(2).GetString().Trim();
            var requiresRoomText = row.Cell(3).GetString().Trim();

            if (string.IsNullOrWhiteSpace(name))
            {
                skipped++;
                continue;
            }

            if (string.IsNullOrWhiteSpace(colorCode))
                colorCode = "#6366f1";

            var requiresRoom = requiresRoomText == "是";

            var existing = existingCourses.FirstOrDefault(c => c.Name == name);
            if (existing is not null)
            {
                existing.ColorCode = colorCode;
                existing.RequiresSpecialRoom = requiresRoom;
                updated++;
            }
            else
            {
                var course = new Course
                {
                    Name = name,
                    ColorCode = colorCode,
                    RequiresSpecialRoom = requiresRoom
                };
                db.Courses.Add(course);
                existingCourses.Add(course);
                created++;
            }
        }

        await db.SaveChangesAsync();
        return new ImportResult(created, updated, skipped);
    }
}

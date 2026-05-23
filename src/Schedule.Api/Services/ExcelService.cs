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
        var courses = await db.Courses.OrderBy(c => c.SortOrder).ThenBy(c => c.Id).ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("課程");

        ws.Cell(1, 1).Value = "名稱";
        ws.Cell(1, 2).Value = "色碼";
        ws.Row(1).Style.Font.Bold = true;

        for (var i = 0; i < courses.Count; i++)
        {
            ws.Cell(i + 2, 1).Value = courses[i].Name;
            ws.Cell(i + 2, 2).Value = courses[i].ColorCode;
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
        var nextSortOrder = existingCourses.Count > 0 ? existingCourses.Max(c => c.SortOrder) + 1 : 0;

        int created = 0, updated = 0, skipped = 0;

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            var name = row.Cell(1).GetString().Trim();
            var colorCode = row.Cell(2).GetString().Trim();

            if (string.IsNullOrWhiteSpace(name))
            {
                skipped++;
                continue;
            }

            if (string.IsNullOrWhiteSpace(colorCode))
                colorCode = "#6366f1";

            var existing = existingCourses.FirstOrDefault(c => c.Name == name);
            if (existing is not null)
            {
                existing.ColorCode = colorCode;
                updated++;
            }
            else
            {
                var course = new Course
                {
                    Name = name,
                    ColorCode = colorCode,
                    SortOrder = nextSortOrder++,
                };
                db.Courses.Add(course);
                existingCourses.Add(course);
                created++;
            }
        }

        await db.SaveChangesAsync();
        return new ImportResult(created, updated, skipped);
    }

    public async Task<byte[]> ExportCourseAssignmentsAsync(int semesterId)
    {
        var assignments = await db.CourseAssignments
            .Include(ca => ca.Course)
            .Include(ca => ca.Teacher)
            .Include(ca => ca.Class)
            .Where(ca => ca.SemesterId == semesterId)
            .OrderBy(ca => ca.Class.GradeYear)
            .ThenBy(ca => ca.Class.Section)
            .ThenBy(ca => ca.Course.SortOrder)
            .ThenBy(ca => ca.Course.Name)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("配課");

        ws.Cell(1, 1).Value = "班級";
        ws.Cell(1, 2).Value = "課程";
        ws.Cell(1, 3).Value = "教師";
        ws.Cell(1, 4).Value = "每週節數";
        ws.Row(1).Style.Font.Bold = true;

        for (var i = 0; i < assignments.Count; i++)
        {
            ws.Cell(i + 2, 1).Value = assignments[i].Class.DisplayName;
            ws.Cell(i + 2, 2).Value = assignments[i].Course.Name;
            ws.Cell(i + 2, 3).Value = assignments[i].Teacher?.Name ?? "";
            ws.Cell(i + 2, 4).Value = assignments[i].WeeklyPeriods;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<ImportResult> ImportCourseAssignmentsAsync(int semesterId, Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheet(1);

        var classes = await db.SchoolClasses.Where(c => c.SemesterId == semesterId).ToListAsync();
        var courses = await db.Courses.ToListAsync();
        var teachers = await db.Teachers.ToListAsync();
        var existingAssignments = await db.CourseAssignments
            .Where(ca => ca.SemesterId == semesterId)
            .ToListAsync();

        int created = 0, updated = 0, skipped = 0;

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            var className = row.Cell(1).GetString().Trim();
            var courseName = row.Cell(2).GetString().Trim();
            var teacherName = row.Cell(3).GetString().Trim();
            var weeklyPeriods = (int)row.Cell(4).GetDouble();

            if (string.IsNullOrWhiteSpace(className) || string.IsNullOrWhiteSpace(courseName))
            {
                skipped++;
                continue;
            }

            var schoolClass = classes.FirstOrDefault(c => c.DisplayName == className);
            var course = courses.FirstOrDefault(c => c.Name == courseName);
            var teacher = string.IsNullOrWhiteSpace(teacherName)
                ? null
                : teachers.FirstOrDefault(t => t.Name == teacherName);

            if (schoolClass is null || course is null || (!string.IsNullOrWhiteSpace(teacherName) && teacher is null))
            {
                skipped++;
                continue;
            }

            // Distinguish rows already persisted (DB-tracked) from rows we created earlier in THIS import loop.
            // For unassigned-teacher rows, only the persisted ones should be merged — otherwise a second row
            // with the same (class, course, null teacher) would be silently folded into the first and lost.
            var existing = existingAssignments.FirstOrDefault(ca =>
                ca.CourseId == course.Id
                && ca.ClassId == schoolClass.Id
                && ca.TeacherId == teacher?.Id
                && db.Entry(ca).State != EntityState.Added);

            if (existing is not null)
            {
                existing.TeacherId = teacher?.Id;
                existing.WeeklyPeriods = weeklyPeriods;
                updated++;
            }
            else
            {
                var assignment = new CourseAssignment
                {
                    SemesterId = semesterId,
                    CourseId = course.Id,
                    TeacherId = teacher?.Id,
                    ClassId = schoolClass.Id,
                    WeeklyPeriods = weeklyPeriods
                };
                db.CourseAssignments.Add(assignment);
                existingAssignments.Add(assignment);
                created++;
            }
        }

        await db.SaveChangesAsync();
        return new ImportResult(created, updated, skipped);
    }

    public async Task<byte[]> ExportAllClassTimetablesAsync(int semesterId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var periods = await LoadPeriodsAsync(semesterId);
        var activeDays = await LoadActiveSchoolDaysAsync(semesterId);
        var classes = await db.SchoolClasses
            .Where(c => c.SemesterId == semesterId)
            .OrderBy(c => c.GradeYear)
            .ThenBy(c => c.Section)
            .ToListAsync();

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.Period)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId)
            .ToListAsync();

        using var workbook = new XLWorkbook();

        foreach (var schoolClass in classes)
        {
            var worksheet = workbook.Worksheets.Add(GetUniqueWorksheetName(workbook, schoolClass.DisplayName));
            var slotLookup = slots
                .Where(slot => slot.CourseAssignment.ClassId == schoolClass.Id)
                .ToDictionary(slot => (slot.DayOfWeek, slot.PeriodId));

            FillTimetableWorksheet(
                worksheet,
                $"{semester.SchoolName}{semester.AcademicYear}學年度第{semester.Term}學期班級課表",
                $"班級：{schoolClass.DisplayName}",
                periods,
                activeDays,
                slotLookup,
                slot => slot.CourseAssignment.Teacher is null
                    ? slot.CourseAssignment.Course.Name
                    : $"{slot.CourseAssignment.Course.Name}\n{slot.CourseAssignment.Teacher.Name}");
        }

        EnsureWorkbookHasSheet(workbook, "班級課表");
        return SaveWorkbook(workbook);
    }

    public async Task<byte[]> ExportAllTeacherTimetablesAsync(int semesterId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var periods = await LoadPeriodsAsync(semesterId);
        var activeDays = await LoadActiveSchoolDaysAsync(semesterId);
        var teachers = await db.Teachers
            .OrderBy(t => t.Name)
            .ToListAsync();

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Include(ts => ts.Period)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.TeacherId != null)
            .ToListAsync();

        using var workbook = new XLWorkbook();

        foreach (var teacher in teachers)
        {
            var worksheet = workbook.Worksheets.Add(GetUniqueWorksheetName(workbook, teacher.Name));
            var slotLookup = slots
                .Where(slot => slot.CourseAssignment.TeacherId == teacher.Id)
                .ToDictionary(slot => (slot.DayOfWeek, slot.PeriodId));

            FillTimetableWorksheet(
                worksheet,
                $"{semester.SchoolName}{semester.AcademicYear}學年度第{semester.Term}學期教師課表",
                $"教師：{teacher.Name}",
                periods,
                activeDays,
                slotLookup,
                slot => $"{slot.CourseAssignment.Course.Name}\n{slot.CourseAssignment.Class.DisplayName}");
        }

        EnsureWorkbookHasSheet(workbook, "教師課表");
        return SaveWorkbook(workbook);
    }

    private Task<List<Period>> LoadPeriodsAsync(int semesterId) =>
        db.Periods
            .Where(period => period.SemesterId == semesterId)
            .OrderBy(period => period.StartTime)
            .ToListAsync();

    private async Task<List<int>> LoadActiveSchoolDaysAsync(int semesterId)
    {
        var activeDays = await db.SchoolDays
            .Where(day => day.SemesterId == semesterId && day.IsActive)
            .OrderBy(day => day.DayOfWeek)
            .Select(day => day.DayOfWeek)
            .ToListAsync();

        return activeDays.Count > 0 ? activeDays : [1, 2, 3, 4, 5];
    }

    private static void FillTimetableWorksheet(
        IXLWorksheet worksheet,
        string title,
        string subtitle,
        List<Period> periods,
        List<int> activeDays,
        Dictionary<(int DayOfWeek, int PeriodId), TimetableSlot> slotLookup,
        Func<TimetableSlot, string> formatSlot)
    {
        var lastColumn = activeDays.Count + 2;

        worksheet.Cell(1, 1).Value = title;
        worksheet.Range(1, 1, 1, lastColumn).Merge();
        worksheet.Cell(1, 1).Style.Font.Bold = true;
        worksheet.Cell(1, 1).Style.Font.FontSize = 14;
        worksheet.Cell(1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        worksheet.Cell(2, 1).Value = subtitle;
        worksheet.Range(2, 1, 2, lastColumn).Merge();
        worksheet.Cell(2, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        worksheet.Cell(4, 1).Value = "時間";
        worksheet.Cell(4, 2).Value = "節次";
        for (var i = 0; i < activeDays.Count; i++)
        {
            worksheet.Cell(4, i + 3).Value = GetDayLabel(activeDays[i]);
        }

        worksheet.Range(4, 1, 4, lastColumn).Style.Font.Bold = true;
        worksheet.Range(4, 1, 4, lastColumn).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Range(4, 1, 4, lastColumn).Style.Fill.BackgroundColor = XLColor.FromHtml("#e0e7ff");

        var row = 5;
        foreach (var period in periods)
        {
            worksheet.Cell(row, 1).Value = $"{period.StartTime:HH:mm}-{period.EndTime:HH:mm}";
            worksheet.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            worksheet.Cell(row, 1).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            if (period.IsActivity)
            {
                worksheet.Cell(row, 2).Value = string.Empty;
                worksheet.Range(row, 3, row, lastColumn).Merge();
                worksheet.Cell(row, 3).Value = period.ActivityName ?? string.Empty;
                worksheet.Range(row, 1, row, lastColumn).Style.Fill.BackgroundColor = XLColor.FromHtml("#eef2ff");
            }
            else
            {
                worksheet.Cell(row, 2).Value = period.PeriodNumber;
                worksheet.Cell(row, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                for (var i = 0; i < activeDays.Count; i++)
                {
                    var cell = worksheet.Cell(row, i + 3);
                    if (slotLookup.TryGetValue((activeDays[i], period.Id), out var slot))
                    {
                        cell.Value = formatSlot(slot);
                    }
                }
            }

            worksheet.Range(row, 1, row, lastColumn).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            worksheet.Range(row, 1, row, lastColumn).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            worksheet.Range(row, 1, row, lastColumn).Style.Alignment.WrapText = true;
            worksheet.Range(row, 1, row, lastColumn).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            worksheet.Range(row, 1, row, lastColumn).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            worksheet.Row(row).Height = 42;
            row++;
        }

        worksheet.Columns().AdjustToContents();
        worksheet.Column(1).Width = 16;
        worksheet.Column(2).Width = 8;
        for (var i = 0; i < activeDays.Count; i++)
        {
            worksheet.Column(i + 3).Width = Math.Max(worksheet.Column(i + 3).Width, 16);
        }
    }

    private static byte[] SaveWorkbook(XLWorkbook workbook)
    {
        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static void EnsureWorkbookHasSheet(XLWorkbook workbook, string sheetName)
    {
        if (workbook.Worksheets.Count > 0) return;

        var worksheet = workbook.Worksheets.Add(sheetName);
        worksheet.Cell(1, 1).Value = "無資料";
    }

    private static string GetUniqueWorksheetName(XLWorkbook workbook, string name)
    {
        var invalidChars = Path.GetInvalidFileNameChars().Concat(['[', ']', ':', '*', '?', '/', '\\']).Distinct().ToArray();
        var sanitized = new string(name.Select(ch => invalidChars.Contains(ch) ? '_' : ch).ToArray()).Trim();
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            sanitized = "Sheet";
        }

        sanitized = sanitized.Length > 31 ? sanitized[..31] : sanitized;
        var candidate = sanitized;
        var suffix = 1;

        while (workbook.Worksheets.Any(ws => ws.Name.Equals(candidate, StringComparison.OrdinalIgnoreCase)))
        {
            var suffixText = $"_{suffix++}";
            var baseName = sanitized.Length > 31 - suffixText.Length
                ? sanitized[..(31 - suffixText.Length)]
                : sanitized;
            candidate = $"{baseName}{suffixText}";
        }

        return candidate;
    }

    private static string GetDayLabel(int dayOfWeek) => dayOfWeek switch
    {
        1 => "週一",
        2 => "週二",
        3 => "週三",
        4 => "週四",
        5 => "週五",
        _ => $"週{dayOfWeek}"
    };
}

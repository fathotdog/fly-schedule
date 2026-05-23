using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Schedule.Api.Data;
using Schedule.Api.Models;

namespace Schedule.Api.Services;

public class TimetablePdfService(ScheduleDbContext db)
{
    public async Task<byte[]> GenerateAllTeacherTimetablesPdfAsync(int semesterId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var teachers = await db.Teachers
            .OrderBy(t => t.Name)
            .ToListAsync();

        var periods = await LoadPeriods(semesterId);
        var activeDays = await LoadActiveSchoolDays(semesterId);

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Include(ts => ts.Period)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.TeacherId != null)
            .ToListAsync();

        var pages = teachers.Select(teacher => (Action<ColumnDescriptor>)(col =>
        {
            var slotLookup = slots
                .Where(slot => slot.CourseAssignment.TeacherId == teacher.Id)
                .ToDictionary(slot => (slot.DayOfWeek, slot.PeriodId));

            var title = $"{semester.SchoolName}{semester.AcademicYear}學年度第{semester.Term}學期教師課表";

            col.Item().PaddingBottom(4).AlignCenter().Text(title).FontSize(16).Bold();
            col.Item().PaddingBottom(8).AlignCenter().Text($"教師：{teacher.Name}").FontSize(12);
            col.Item().Table(table => BuildTimetableTable(table, periods, activeDays, slotLookup, (cell, slot) =>
            {
                var className = slot.CourseAssignment.Class?.DisplayName ?? "";
                cell.Padding(3).AlignCenter().Text(text =>
                {
                    text.Span(slot.CourseAssignment.Course.Name).Bold();
                    text.Span($"\n{className}").FontSize(8);
                });
            }));
        })).ToList();

        return CreateTimetableDocument(pages).GeneratePdf();
    }

    public async Task<byte[]> GenerateAllClassTimetablesPdfAsync(int semesterId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var classes = await db.SchoolClasses
            .Where(c => c.SemesterId == semesterId)
            .OrderBy(c => c.GradeYear)
            .ThenBy(c => c.Section)
            .ToListAsync();

        var homerooms = await db.HomeroomAssignments
            .Include(h => h.Teacher)
            .Where(h => h.SemesterId == semesterId)
            .ToListAsync();

        var periods = await LoadPeriods(semesterId);
        var activeDays = await LoadActiveSchoolDays(semesterId);

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.Period)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId)
            .ToListAsync();

        var pages = classes.Select(schoolClass => (Action<ColumnDescriptor>)(col =>
        {
            var classSlots = slots.Where(slot => slot.CourseAssignment.ClassId == schoolClass.Id).ToList();
            var slotLookup = classSlots.ToDictionary(slot => (slot.DayOfWeek, slot.PeriodId));
            var homeroom = homerooms.FirstOrDefault(h => h.ClassId == schoolClass.Id);
            var homeroomTeacherId = homeroom?.TeacherId;
            var subjectTeachers = classSlots
                .Where(slot => slot.CourseAssignment.TeacherId != null
                               && slot.CourseAssignment.TeacherId != homeroomTeacherId)
                .Select(slot => new { slot.CourseAssignment.Course.Name, TeacherName = slot.CourseAssignment.Teacher!.Name })
                .Distinct()
                .OrderBy(item => item.Name)
                .ToList();

            var title = $"{semester.SchoolName}{semester.AcademicYear}學年度第{semester.Term}學期班級課表";
            var homeroomTeacherName = homeroom?.Teacher.Name ?? "";

            col.Item().PaddingBottom(4).AlignCenter().Text(title).FontSize(16).Bold();
            col.Item().PaddingBottom(8).AlignCenter().Text(text =>
            {
                text.Span($"班級：{schoolClass.DisplayName}").FontSize(12);
                text.Span("　　").FontSize(12);
                text.Span($"級任導師：{homeroomTeacherName}").FontSize(12);
            });
            col.Item().Table(table => BuildTimetableTable(table, periods, activeDays, slotLookup, (cell, slot) =>
            {
                cell.Padding(3).AlignCenter().Text(slot.CourseAssignment.Course.Name);
            }));
            if (subjectTeachers.Count > 0)
            {
                col.Item().PaddingTop(10).Text(text =>
                {
                    text.Span("科任教師：").Bold();
                    var teacherStrings = subjectTeachers.Select(t => $"{t.Name}：{t.TeacherName} 老師");
                    text.Span(string.Join("　　", teacherStrings));
                });
            }
        })).ToList();

        return CreateTimetableDocument(pages).GeneratePdf();
    }

    public async Task<byte[]> GenerateTeacherTimetablePdfAsync(int semesterId, int teacherId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var teacher = await db.Teachers.FindAsync(teacherId)
            ?? throw new InvalidOperationException("Teacher not found");

        var periods = await LoadPeriods(semesterId);
        var activeDays = await LoadActiveSchoolDays(semesterId);

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Include(ts => ts.Period)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.TeacherId == teacherId)
            .ToListAsync();

        var slotLookup = slots.ToDictionary(s => (s.DayOfWeek, s.PeriodId));
        var title = $"{semester.SchoolName}{semester.AcademicYear}學年度第{semester.Term}學期教師課表";

        return CreateTimetablePage(col =>
        {
            col.Item().PaddingBottom(4).AlignCenter().Text(title).FontSize(16).Bold();
            col.Item().PaddingBottom(8).AlignCenter().Text($"教師：{teacher.Name}").FontSize(12);
            col.Item().Table(table => BuildTimetableTable(table, periods, activeDays, slotLookup, (cell, slot) =>
            {
                var className = slot.CourseAssignment.Class?.DisplayName ?? "";
                cell.Padding(3).AlignCenter().Text(text =>
                {
                    text.Span(slot.CourseAssignment.Course.Name).Bold();
                    text.Span($"\n{className}").FontSize(8);
                });
            }));
        }).GeneratePdf();
    }

    public async Task<byte[]> GenerateRoomTimetablePdfAsync(int semesterId, int roomId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var room = await db.SpecialRooms.FindAsync(roomId)
            ?? throw new InvalidOperationException("Room not found");

        var periods = await LoadPeriods(semesterId);
        var activeDays = await LoadActiveSchoolDays(semesterId);

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Class)
            .Include(ts => ts.Period)
            .Include(ts => ts.RoomBooking)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId
                         && ts.RoomBooking != null && ts.RoomBooking.SpecialRoomId == roomId)
            .ToListAsync();

        var slotLookup = slots.ToDictionary(s => (s.DayOfWeek, s.PeriodId));
        var title = $"{semester.SchoolName}{semester.AcademicYear}學年度第{semester.Term}學期專科教室課表";

        return CreateTimetablePage(col =>
        {
            col.Item().PaddingBottom(4).AlignCenter().Text(title).FontSize(16).Bold();
            col.Item().PaddingBottom(8).AlignCenter().Text($"教室：{room.Name}").FontSize(12);
            col.Item().Table(table => BuildTimetableTable(table, periods, activeDays, slotLookup, (cell, slot) =>
            {
                var className = slot.CourseAssignment.Class?.DisplayName ?? "";
                var teacherName = slot.CourseAssignment.Teacher?.Name ?? "";
                cell.Padding(3).AlignCenter().Text(text =>
                {
                    text.Span(slot.CourseAssignment.Course.Name).Bold();
                    text.Span($"\n{className}").FontSize(8);
                    if (!string.IsNullOrEmpty(teacherName))
                        text.Span($"\n{teacherName}").FontSize(8);
                });
            }));
        }).GeneratePdf();
    }

    public async Task<byte[]> GenerateClassTimetablePdfAsync(int semesterId, int classId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var schoolClass = await db.SchoolClasses.FindAsync(classId)
            ?? throw new InvalidOperationException("Class not found");

        var homeroom = await db.HomeroomAssignments
            .Include(h => h.Teacher)
            .FirstOrDefaultAsync(h => h.SemesterId == semesterId && h.ClassId == classId);

        var periods = await LoadPeriods(semesterId);
        var activeDays = await LoadActiveSchoolDays(semesterId);

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.Period)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.ClassId == classId)
            .ToListAsync();

        var slotLookup = slots.ToDictionary(s => (s.DayOfWeek, s.PeriodId));

        var homeroomTeacherId = homeroom?.TeacherId;
        var subjectTeachers = slots
            .Where(s => s.CourseAssignment.TeacherId != null
                        && s.CourseAssignment.TeacherId != homeroomTeacherId)
            .Select(s => new { s.CourseAssignment.Course.Name, TeacherName = s.CourseAssignment.Teacher!.Name })
            .Distinct()
            .OrderBy(x => x.Name)
            .ToList();

        var title = $"{semester.SchoolName}{semester.AcademicYear}學年度第{semester.Term}學期班級課表";
        var homeroomTeacherName = homeroom?.Teacher.Name ?? "";

        return CreateTimetablePage(col =>
        {
            col.Item().PaddingBottom(4).AlignCenter().Text(title).FontSize(16).Bold();
            col.Item().PaddingBottom(8).AlignCenter().Text(text =>
            {
                text.Span($"班級：{schoolClass.DisplayName}").FontSize(12);
                text.Span("　　").FontSize(12);
                text.Span($"級任導師：{homeroomTeacherName}").FontSize(12);
            });
            col.Item().Table(table => BuildTimetableTable(table, periods, activeDays, slotLookup, (cell, slot) =>
            {
                cell.Padding(3).AlignCenter().Text(slot.CourseAssignment.Course.Name);
            }));
            if (subjectTeachers.Count > 0)
            {
                col.Item().PaddingTop(10).Text(text =>
                {
                    text.Span("科任教師：").Bold();
                    var teacherStrings = subjectTeachers.Select(t => $"{t.Name}：{t.TeacherName} 老師");
                    text.Span(string.Join("　　", teacherStrings));
                });
            }
        }).GeneratePdf();
    }

    private Task<List<Period>> LoadPeriods(int semesterId) =>
        db.Periods.Where(p => p.SemesterId == semesterId).OrderBy(p => p.StartTime).ToListAsync();

    private async Task<List<int>> LoadActiveSchoolDays(int semesterId)
    {
        var activeDays = await db.SchoolDays
            .Where(day => day.SemesterId == semesterId && day.IsActive)
            .OrderBy(day => day.DayOfWeek)
            .Select(day => day.DayOfWeek)
            .ToListAsync();

        return activeDays.Count > 0 ? activeDays : [1, 2, 3, 4, 5];
    }

    private static IDocument CreateTimetablePage(Action<ColumnDescriptor> buildContent) =>
        CreateTimetableDocument([buildContent]);

    private static IDocument CreateTimetableDocument(IEnumerable<Action<ColumnDescriptor>> pages) =>
        Document.Create(container =>
        {
            var pageBuilders = pages.ToList();

            if (pageBuilders.Count == 0)
            {
                pageBuilders.Add(col =>
                {
                    col.Item().AlignCenter().Text("無資料").FontSize(14);
                });
            }

            foreach (var buildContent in pageBuilders)
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.MarginHorizontal(1.5f, Unit.Centimetre);
                    page.MarginVertical(1.2f, Unit.Centimetre);
                    // Use a Traditional-Chinese font with cross-platform fallbacks so Linux/macOS/Docker hosts
                    // (which lack Microsoft JhengHei) render CJK glyphs instead of tofu boxes.
                    page.DefaultTextStyle(x => x
                        .FontFamily(
                            "Microsoft JhengHei",
                            "Noto Sans CJK TC",
                            "Noto Sans TC",
                            "PingFang TC",
                            "WenQuanYi Zen Hei",
                            "Microsoft YaHei")
                        .FontSize(10));
                    page.Content().Column(buildContent);
                });
            }
        });

    private static void BuildTimetableTable(
        TableDescriptor table,
        List<Period> periods,
        List<int> activeDays,
        Dictionary<(int, int), TimetableSlot> slotLookup,
        Action<IContainer, TimetableSlot> renderSlotCell)
    {
        table.ColumnsDefinition(cd =>
        {
            cd.ConstantColumn(75);
            cd.ConstantColumn(35);
            foreach (var _ in activeDays)
                cd.RelativeColumn();
        });

        table.Header(header =>
        {
            header.Cell().Border(0.5f).Background("#4338ca").Padding(4).AlignCenter()
                .Text("時　間").FontColor(Colors.White).Bold();
            header.Cell().Border(0.5f).Background("#4338ca").Padding(4).AlignCenter()
                .Text("節次").FontColor(Colors.White).Bold();
            foreach (var day in activeDays.Select(GetDayLabel))
            {
                header.Cell().Border(0.5f).Background("#4338ca").Padding(4).AlignCenter()
                    .Text(day).FontColor(Colors.White).Bold();
            }
        });

        uint rowIndex = 1;
        foreach (var period in periods)
        {
            var timeStr = $"{period.StartTime:HH:mm}-{period.EndTime:HH:mm}";

            if (period.IsActivity)
            {
                table.Cell().Row(rowIndex).Column(1).Border(0.5f).Background("#eef2ff")
                    .Padding(3).AlignCenter().Text(timeStr).FontSize(8);
                table.Cell().Row(rowIndex).Column(2).Border(0.5f).Background("#eef2ff")
                    .Padding(3).AlignCenter().Text("");
                table.Cell().Row(rowIndex).Column(3).ColumnSpan((uint)activeDays.Count).Border(0.5f).Background("#eef2ff")
                    .Padding(3).AlignCenter().Text(period.ActivityName ?? "").FontSize(9).Italic();
            }
            else
            {
                table.Cell().Row(rowIndex).Column(1).Border(0.5f)
                    .Padding(3).AlignCenter().Text(timeStr).FontSize(8);
                table.Cell().Row(rowIndex).Column(2).Border(0.5f)
                    .Padding(3).AlignCenter().Text(period.PeriodNumber.ToString()).Bold();

                for (var dayIndex = 0; dayIndex < activeDays.Count; dayIndex++)
                {
                    var dayOfWeek = activeDays[dayIndex];
                    var cell = table.Cell().Row(rowIndex).Column((uint)(dayIndex + 3)).Border(0.5f);
                    if (slotLookup.TryGetValue((dayOfWeek, period.Id), out var slot))
                        renderSlotCell(cell, slot);
                    else
                        cell.Padding(3).Text("");
                }
            }

            rowIndex++;
        }
    }

    private static string GetDayLabel(int dayOfWeek) => dayOfWeek switch
    {
        1 => "一",
        2 => "二",
        3 => "三",
        4 => "四",
        5 => "五",
        6 => "六",
        7 => "日",
        _ => dayOfWeek.ToString()
    };
}

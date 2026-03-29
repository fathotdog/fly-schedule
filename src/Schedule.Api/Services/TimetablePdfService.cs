using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Schedule.Api.Data;
using Schedule.Api.Models;

namespace Schedule.Api.Services;

public class TimetablePdfService(ScheduleDbContext db)
{
    public async Task<byte[]> GenerateTeacherTimetablePdfAsync(int semesterId, int teacherId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var teacher = await db.Teachers.FindAsync(teacherId)
            ?? throw new InvalidOperationException("Teacher not found");

        var periods = await LoadPeriods(semesterId);

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
            col.Item().Table(table => BuildTimetableTable(table, periods, slotLookup, (cell, slot) =>
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
            col.Item().Table(table => BuildTimetableTable(table, periods, slotLookup, (cell, slot) =>
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

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.Period)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.ClassId == classId)
            .ToListAsync();

        var slotLookup = slots.ToDictionary(s => (s.DayOfWeek, s.PeriodId));

        var homeroomTeacherId = homeroom?.TeacherId;
        var subjectTeachers = slots
            .Where(s => s.CourseAssignment.TeacherId != homeroomTeacherId)
            .Select(s => new { s.CourseAssignment.Course.Name, TeacherName = s.CourseAssignment.Teacher?.Name ?? "未指定" })
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
            col.Item().Table(table => BuildTimetableTable(table, periods, slotLookup, (cell, slot) =>
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

    private static IDocument CreateTimetablePage(Action<ColumnDescriptor> buildContent) =>
        Document.Create(container => container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(1.5f, Unit.Centimetre);
            page.MarginVertical(1.2f, Unit.Centimetre);
            page.DefaultTextStyle(x => x.FontFamily("Microsoft JhengHei").FontSize(10));
            page.Content().Column(buildContent);
        }));

    private static void BuildTimetableTable(
        TableDescriptor table,
        List<Period> periods,
        Dictionary<(int, int), TimetableSlot> slotLookup,
        Action<IContainer, TimetableSlot> renderSlotCell)
    {
        table.ColumnsDefinition(cd =>
        {
            cd.ConstantColumn(75);
            cd.ConstantColumn(35);
            cd.RelativeColumn();
            cd.RelativeColumn();
            cd.RelativeColumn();
            cd.RelativeColumn();
            cd.RelativeColumn();
        });

        table.Header(header =>
        {
            header.Cell().Border(0.5f).Background("#4338ca").Padding(4).AlignCenter()
                .Text("時　間").FontColor(Colors.White).Bold();
            header.Cell().Border(0.5f).Background("#4338ca").Padding(4).AlignCenter()
                .Text("節次").FontColor(Colors.White).Bold();
            foreach (var day in new[] { "一", "二", "三", "四", "五" })
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
                table.Cell().Row(rowIndex).Column(3).ColumnSpan(5).Border(0.5f).Background("#eef2ff")
                    .Padding(3).AlignCenter().Text(period.ActivityName ?? "").FontSize(9).Italic();
            }
            else
            {
                table.Cell().Row(rowIndex).Column(1).Border(0.5f)
                    .Padding(3).AlignCenter().Text(timeStr).FontSize(8);
                table.Cell().Row(rowIndex).Column(2).Border(0.5f)
                    .Padding(3).AlignCenter().Text(period.PeriodNumber.ToString()).Bold();

                for (int d = 1; d <= 5; d++)
                {
                    var cell = table.Cell().Row(rowIndex).Column((uint)(d + 2)).Border(0.5f);
                    if (slotLookup.TryGetValue((d, period.Id), out var slot))
                        renderSlotCell(cell, slot);
                    else
                        cell.Padding(3).Text("");
                }
            }

            rowIndex++;
        }
    }
}

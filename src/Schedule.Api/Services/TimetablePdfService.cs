using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Schedule.Api.Data;

namespace Schedule.Api.Services;

public class TimetablePdfService(ScheduleDbContext db)
{
    public async Task<byte[]> GenerateClassTimetablePdfAsync(int semesterId, int classId)
    {
        var semester = await db.Semesters.FindAsync(semesterId)
            ?? throw new InvalidOperationException("Semester not found");

        var schoolClass = await db.SchoolClasses.FindAsync(classId)
            ?? throw new InvalidOperationException("Class not found");

        var homeroom = await db.HomeroomAssignments
            .Include(h => h.Teacher)
            .FirstOrDefaultAsync(h => h.SemesterId == semesterId && h.ClassId == classId);

        var periods = await db.Periods
            .Where(p => p.SemesterId == semesterId)
            .OrderBy(p => p.StartTime)
            .ToListAsync();

        var slots = await db.TimetableSlots
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Course)
            .Include(ts => ts.CourseAssignment).ThenInclude(ca => ca.Teacher)
            .Include(ts => ts.Period)
            .Where(ts => ts.CourseAssignment.SemesterId == semesterId && ts.CourseAssignment.ClassId == classId)
            .ToListAsync();

        // Build lookup: (dayOfWeek, periodId) → slot
        var slotLookup = slots.ToDictionary(s => (s.DayOfWeek, s.PeriodId));

        // Get non-homeroom teachers (科任教師)
        var homeroomTeacherId = homeroom?.TeacherId;
        var subjectTeachers = slots
            .Where(s => s.CourseAssignment.TeacherId != homeroomTeacherId)
            .Select(s => new { s.CourseAssignment.Course.Name, TeacherName = s.CourseAssignment.Teacher.Name })
            .Distinct()
            .OrderBy(x => x.Name)
            .ToList();

        var title = $"{semester.SchoolName}{semester.AcademicYear}學年度第{semester.Term}學期班級課表";
        var homeroomTeacherName = homeroom?.Teacher.Name ?? "";

        var dayNames = new[] { "一", "二", "三", "四", "五" };

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(1.5f, Unit.Centimetre);
                page.MarginVertical(1.2f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontFamily("Microsoft JhengHei").FontSize(10));

                page.Content().Column(col =>
                {
                    // Title
                    col.Item().PaddingBottom(4).AlignCenter().Text(title)
                        .FontSize(16).Bold();

                    // Subtitle
                    col.Item().PaddingBottom(8).AlignCenter().Text(text =>
                    {
                        text.Span($"班級：{schoolClass.DisplayName}").FontSize(12);
                        text.Span("　　").FontSize(12);
                        text.Span($"級任導師：{homeroomTeacherName}").FontSize(12);
                    });

                    // Timetable grid
                    col.Item().Table(table =>
                    {
                        // Define columns: Time | Period# | Mon | Tue | Wed | Thu | Fri
                        table.ColumnsDefinition(cd =>
                        {
                            cd.ConstantColumn(75); // Time
                            cd.ConstantColumn(35); // Period number
                            cd.RelativeColumn(); // Mon
                            cd.RelativeColumn(); // Tue
                            cd.RelativeColumn(); // Wed
                            cd.RelativeColumn(); // Thu
                            cd.RelativeColumn(); // Fri
                        });

                        // Header row
                        table.Header(header =>
                        {
                            header.Cell().Border(0.5f).Background("#4338ca").Padding(4).AlignCenter()
                                .Text("時　間").FontColor(Colors.White).Bold();
                            header.Cell().Border(0.5f).Background("#4338ca").Padding(4).AlignCenter()
                                .Text("節次").FontColor(Colors.White).Bold();
                            foreach (var day in dayNames)
                            {
                                header.Cell().Border(0.5f).Background("#4338ca").Padding(4).AlignCenter()
                                    .Text(day).FontColor(Colors.White).Bold();
                            }
                        });

                        // Data rows
                        uint rowIndex = 1;
                        foreach (var period in periods)
                        {
                            var timeStr = $"{period.StartTime:HH:mm}-{period.EndTime:HH:mm}";

                            if (period.IsActivity)
                            {
                                // Activity row: time | empty period# | activity name spanning 5 columns
                                table.Cell().Row(rowIndex).Column(1).Border(0.5f).Background("#eef2ff")
                                    .Padding(3).AlignCenter().Text(timeStr).FontSize(8);
                                table.Cell().Row(rowIndex).Column(2).Border(0.5f).Background("#eef2ff")
                                    .Padding(3).AlignCenter().Text("");
                                table.Cell().Row(rowIndex).Column(3).ColumnSpan(5).Border(0.5f).Background("#eef2ff")
                                    .Padding(3).AlignCenter().Text(period.ActivityName ?? "").FontSize(9).Italic();
                            }
                            else
                            {
                                // Normal period row
                                table.Cell().Row(rowIndex).Column(1).Border(0.5f)
                                    .Padding(3).AlignCenter().Text(timeStr).FontSize(8);
                                table.Cell().Row(rowIndex).Column(2).Border(0.5f)
                                    .Padding(3).AlignCenter().Text(period.PeriodNumber.ToString()).Bold();

                                for (int d = 1; d <= 5; d++)
                                {
                                    var cell = table.Cell().Row(rowIndex).Column((uint)(d + 2)).Border(0.5f);
                                    if (slotLookup.TryGetValue((d, period.Id), out var slot))
                                    {
                                        cell.Padding(3).AlignCenter().Text(slot.CourseAssignment.Course.Name);
                                    }
                                    else
                                    {
                                        cell.Padding(3).Text("");
                                    }
                                }
                            }

                            rowIndex++;
                        }
                    });

                    // Subject teachers section
                    if (subjectTeachers.Count > 0)
                    {
                        col.Item().PaddingTop(10).Text(text =>
                        {
                            text.Span("科任教師：").Bold();
                            var teacherStrings = subjectTeachers
                                .Select(t => $"{t.Name}：{t.TeacherName} 老師");
                            text.Span(string.Join("　　", teacherStrings));
                        });
                    }
                });
            });
        });

        return document.GeneratePdf();
    }
}

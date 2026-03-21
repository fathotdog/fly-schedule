using Microsoft.EntityFrameworkCore;
using Schedule.Api.Data;
using Schedule.Api.Dtos;

namespace Schedule.Api.Services;

public class DashboardService(ScheduleDbContext db)
{
    public async Task<DashboardResponse> GetDashboardAsync(int semesterId)
    {
        // --- Class progress ---
        var classes = await db.SchoolClasses
            .Where(c => c.SemesterId == semesterId)
            .OrderBy(c => c.GradeYear).ThenBy(c => c.Section)
            .Select(c => new
            {
                c.Id,
                c.DisplayName,
                c.GradeYear,
                c.Section,
                TotalWeeklyPeriods = c.CourseAssignments
                    .Where(ca => ca.SemesterId == semesterId)
                    .Sum(ca => ca.WeeklyPeriods),
                ScheduledPeriods = c.CourseAssignments
                    .Where(ca => ca.SemesterId == semesterId)
                    .SelectMany(ca => ca.TimetableSlots)
                    .Count(),
                HomeroomTeacherName = db.HomeroomAssignments
                    .Where(h => h.SemesterId == semesterId && h.ClassId == c.Id)
                    .Select(h => h.Teacher.Name)
                    .FirstOrDefault()
            })
            .ToListAsync();

        var classProgress = classes.Select(c =>
        {
            var rate = c.TotalWeeklyPeriods > 0
                ? Math.Round((double)c.ScheduledPeriods / c.TotalWeeklyPeriods * 100, 1)
                : 0;
            return new ClassProgressDto(
                c.Id, c.DisplayName, c.GradeYear, c.Section,
                c.TotalWeeklyPeriods, c.ScheduledPeriods, rate,
                c.HomeroomTeacherName != null, c.HomeroomTeacherName);
        }).ToList();

        // --- Teacher load ---
        var teachers = await db.Teachers
            .Where(t => t.CourseAssignments.Any(ca => ca.SemesterId == semesterId))
            .Include(t => t.StaffTitle)
            .OrderBy(t => t.Name)
            .Select(t => new
            {
                t.Id,
                t.Name,
                StaffTitleName = t.StaffTitle.Name,
                t.MaxWeeklyPeriods,
                AssignedPeriods = t.CourseAssignments
                    .Where(ca => ca.SemesterId == semesterId)
                    .Sum(ca => ca.WeeklyPeriods),
                ScheduledPeriods = t.CourseAssignments
                    .Where(ca => ca.SemesterId == semesterId)
                    .SelectMany(ca => ca.TimetableSlots)
                    .Count()
            })
            .ToListAsync();

        var teacherLoad = teachers.Select(t =>
        {
            var rate = t.MaxWeeklyPeriods > 0
                ? Math.Round((double)t.AssignedPeriods / t.MaxWeeklyPeriods * 100, 1)
                : 0;
            return new TeacherLoadDto(
                t.Id, t.Name, t.StaffTitleName,
                t.MaxWeeklyPeriods, t.AssignedPeriods, t.ScheduledPeriods, rate);
        }).ToList();

        // --- Summary ---
        var totalAssigned = classProgress.Sum(c => c.TotalWeeklyPeriods);
        var totalScheduled = classProgress.Sum(c => c.ScheduledPeriods);
        var overallRate = totalAssigned > 0
            ? Math.Round((double)totalScheduled / totalAssigned * 100, 1)
            : 0;
        var unscheduledPeriods = totalAssigned - totalScheduled;

        var summary = new DashboardSummary(
            classProgress.Count,
            teacherLoad.Count,
            totalAssigned,
            totalScheduled,
            overallRate);

        // --- Alerts ---
        var alerts = new List<DashboardAlert>();

        foreach (var c in classProgress)
        {
            if (c.TotalWeeklyPeriods == 0)
                alerts.Add(new DashboardAlert("error", "no_assignment", $"班級 {c.ClassDisplayName} 尚未配課", c.ClassId));
            else if (c.CompletionRate < 50)
                alerts.Add(new DashboardAlert("warning", "low_completion", $"班級 {c.ClassDisplayName} 排課進度偏低 ({c.CompletionRate}%)", c.ClassId));
            if (!c.HasHomeroomTeacher)
                alerts.Add(new DashboardAlert("warning", "no_homeroom", $"班級 {c.ClassDisplayName} 尚未設定導師", c.ClassId));
        }

        foreach (var t in teacherLoad)
        {
            if (t.LoadRate > 100)
                alerts.Add(new DashboardAlert("error", "overload", $"教師 {t.TeacherName} 配課超載 ({t.LoadRate}%)", t.TeacherId));
            else if (t.AssignedPeriods > 0 && t.ScheduledPeriods == 0)
                alerts.Add(new DashboardAlert("info", "teacher_unscheduled", $"教師 {t.TeacherName} 已配課但尚未排課", t.TeacherId));
        }

        // --- Slot-based extended alerts & heatmap data ---
        var allSlots = await db.TimetableSlots
            .Where(s => s.CourseAssignment.SemesterId == semesterId)
            .Select(s => new
            {
                s.DayOfWeek,
                s.PeriodId,
                PeriodNumber = s.Period.PeriodNumber,
                ClassId = s.CourseAssignment.ClassId,
                ClassDisplayName = s.CourseAssignment.Class.DisplayName,
                CourseId = s.CourseAssignment.CourseId,
                CourseName = s.CourseAssignment.Course.Name,
            })
            .ToListAsync();

        // course_unbalanced: same class + course + day > 2 slots
        foreach (var g in allSlots
            .GroupBy(s => (s.ClassId, s.CourseId, s.DayOfWeek))
            .Where(g => g.Count() > 2))
        {
            var sample = g.First();
            alerts.Add(new DashboardAlert("warning", "course_unbalanced",
                $"班級 {sample.ClassDisplayName} {DayName(g.Key.DayOfWeek)} {sample.CourseName} 排了 {g.Count()} 節",
                g.Key.ClassId));
        }

        // period_gap: class has non-consecutive period numbers in a day
        var gapAlerted = new HashSet<int>();
        foreach (var g in allSlots
            .GroupBy(s => (s.ClassId, s.DayOfWeek))
            .Where(g => g.Count() >= 2))
        {
            if (gapAlerted.Contains(g.Key.ClassId)) continue;
            var nums = g.Select(s => s.PeriodNumber).Distinct().OrderBy(n => n).ToList();
            var hasGap = false;
            for (int i = 1; i < nums.Count; i++)
                if (nums[i] - nums[i - 1] > 1) { hasGap = true; break; }
            if (!hasGap) continue;
            gapAlerted.Add(g.Key.ClassId);
            var sample = g.First();
            alerts.Add(new DashboardAlert("info", "period_gap",
                $"班級 {sample.ClassDisplayName} {DayName(g.Key.DayOfWeek)} 有空堂",
                g.Key.ClassId));
        }

        // --- Period distribution heatmap ---
        var periodDistribution = allSlots
            .GroupBy(s => (s.DayOfWeek, s.PeriodId, s.PeriodNumber))
            .Select(g => new PeriodDistributionDto(
                g.Key.DayOfWeek,
                g.Key.PeriodId,
                g.Key.PeriodNumber,
                g.Select(s => s.ClassId).Distinct().Count(),
                classProgress.Count,
                g.Select(s => s.ClassDisplayName).Distinct().Take(5).ToArray()))
            .OrderBy(d => d.DayOfWeek).ThenBy(d => d.PeriodNumber)
            .ToList();

        // --- Grade summary ---
        var gradeSummary = classProgress
            .GroupBy(c => c.GradeYear)
            .OrderBy(g => g.Key)
            .Select(g => new GradeSummaryDto(
                g.Key,
                g.Count(),
                g.Any() ? Math.Round(g.Average(c => c.CompletionRate), 1) : 0,
                g.Sum(c => c.TotalWeeklyPeriods),
                g.Sum(c => c.ScheduledPeriods)))
            .ToList();

        return new DashboardResponse(summary, classProgress, teacherLoad, alerts, periodDistribution, unscheduledPeriods, gradeSummary);
    }

    private static string DayName(int dayOfWeek) => dayOfWeek switch
    {
        1 => "週一", 2 => "週二", 3 => "週三", 4 => "週四", 5 => "週五",
        _ => $"週{dayOfWeek}"
    };
}

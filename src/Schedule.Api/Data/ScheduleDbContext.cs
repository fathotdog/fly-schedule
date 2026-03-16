using Microsoft.EntityFrameworkCore;
using Schedule.Api.Models;

namespace Schedule.Api.Data;

public class ScheduleDbContext(DbContextOptions<ScheduleDbContext> options) : DbContext(options)
{
    public DbSet<Semester> Semesters => Set<Semester>();
    public DbSet<SchoolClass> SchoolClasses => Set<SchoolClass>();
    public DbSet<SchoolDay> SchoolDays => Set<SchoolDay>();
    public DbSet<StaffTitle> StaffTitles => Set<StaffTitle>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseAssignment> CourseAssignments => Set<CourseAssignment>();
    public DbSet<Period> Periods => Set<Period>();
    public DbSet<HomeroomAssignment> HomeroomAssignments => Set<HomeroomAssignment>();
    public DbSet<SpecialRoom> SpecialRooms => Set<SpecialRoom>();
    public DbSet<TimetableSlot> TimetableSlots => Set<TimetableSlot>();
    public DbSet<RoomBooking> RoomBookings => Set<RoomBooking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Semester
        modelBuilder.Entity<Semester>(e =>
        {
            e.HasIndex(s => new { s.AcademicYear, s.Term }).IsUnique();
        });

        // SchoolClass
        modelBuilder.Entity<SchoolClass>(e =>
        {
            e.HasIndex(c => new { c.SemesterId, c.GradeYear, c.Section }).IsUnique();
            e.HasOne(c => c.Semester).WithMany(s => s.Classes).HasForeignKey(c => c.SemesterId);
        });

        // SchoolDay
        modelBuilder.Entity<SchoolDay>(e =>
        {
            e.HasIndex(d => new { d.SemesterId, d.DayOfWeek }).IsUnique();
            e.HasOne(d => d.Semester).WithMany(s => s.SchoolDays).HasForeignKey(d => d.SemesterId);
        });

        // Teacher
        modelBuilder.Entity<Teacher>(e =>
        {
            e.HasOne(t => t.StaffTitle).WithMany(st => st.Teachers).HasForeignKey(t => t.StaffTitleId);
        });

        // CourseAssignment — each class has one teacher per course per semester
        modelBuilder.Entity<CourseAssignment>(e =>
        {
            e.HasIndex(ca => new { ca.SemesterId, ca.CourseId, ca.ClassId }).IsUnique();
            e.HasOne(ca => ca.Semester).WithMany(s => s.CourseAssignments).HasForeignKey(ca => ca.SemesterId);
            e.HasOne(ca => ca.Course).WithMany(c => c.CourseAssignments).HasForeignKey(ca => ca.CourseId);
            e.HasOne(ca => ca.Teacher).WithMany(t => t.CourseAssignments).HasForeignKey(ca => ca.TeacherId);
            e.HasOne(ca => ca.Class).WithMany(c => c.CourseAssignments).HasForeignKey(ca => ca.ClassId);
        });

        // Period
        modelBuilder.Entity<Period>(e =>
        {
            e.HasIndex(p => new { p.SemesterId, p.PeriodNumber }).IsUnique().HasFilter("IsActivity = 0");
            e.HasOne(p => p.Semester).WithMany(s => s.Periods).HasForeignKey(p => p.SemesterId);
        });

        // HomeroomAssignment — 1:1 per semester
        modelBuilder.Entity<HomeroomAssignment>(e =>
        {
            e.HasIndex(h => new { h.SemesterId, h.ClassId }).IsUnique();
            e.HasIndex(h => new { h.SemesterId, h.TeacherId }).IsUnique();
            e.HasOne(h => h.Semester).WithMany(s => s.HomeroomAssignments).HasForeignKey(h => h.SemesterId);
            e.HasOne(h => h.Teacher).WithMany(t => t.HomeroomAssignments).HasForeignKey(h => h.TeacherId);
            e.HasOne(h => h.Class).WithMany().HasForeignKey(h => h.ClassId);
        });

        // TimetableSlot
        modelBuilder.Entity<TimetableSlot>(e =>
        {
            e.HasIndex(ts => new { ts.CourseAssignmentId, ts.DayOfWeek, ts.PeriodId }).IsUnique();
            e.HasOne(ts => ts.CourseAssignment).WithMany(ca => ca.TimetableSlots).HasForeignKey(ts => ts.CourseAssignmentId);
            e.HasOne(ts => ts.Period).WithMany(p => p.TimetableSlots).HasForeignKey(ts => ts.PeriodId);
        });

        // RoomBooking
        modelBuilder.Entity<RoomBooking>(e =>
        {
            e.HasIndex(rb => rb.TimetableSlotId).IsUnique();
            e.HasOne(rb => rb.TimetableSlot).WithOne(ts => ts.RoomBooking).HasForeignKey<RoomBooking>(rb => rb.TimetableSlotId);
            e.HasOne(rb => rb.SpecialRoom).WithMany(sr => sr.RoomBookings).HasForeignKey(rb => rb.SpecialRoomId);
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        // Default staff titles
        modelBuilder.Entity<StaffTitle>().HasData(
            new StaffTitle { Id = 1, Name = "專任教師" },
            new StaffTitle { Id = 2, Name = "代理教師" },
            new StaffTitle { Id = 3, Name = "代課教師" }
        );

        // Default courses
        modelBuilder.Entity<Course>().HasData(
            new Course { Id = 1, Name = "國文", ColorCode = "#ef4444" },
            new Course { Id = 2, Name = "英語", ColorCode = "#3b82f6" },
            new Course { Id = 3, Name = "數學", ColorCode = "#22c55e" },
            new Course { Id = 4, Name = "社會", ColorCode = "#f59e0b" },
            new Course { Id = 5, Name = "自然科學", ColorCode = "#8b5cf6" },
            new Course { Id = 6, Name = "科技", ColorCode = "#06b6d4" },
            new Course { Id = 7, Name = "藝術", ColorCode = "#ec4899" },
            new Course { Id = 8, Name = "健康與體育", ColorCode = "#14b8a6", RequiresSpecialRoom = true },
            new Course { Id = 9, Name = "綜合活動", ColorCode = "#f97316" },
            new Course { Id = 10, Name = "彈性學習", ColorCode = "#64748b" }
        );
    }
}

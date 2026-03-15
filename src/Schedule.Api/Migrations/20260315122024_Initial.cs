using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Schedule.Api.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Courses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    ColorCode = table.Column<string>(type: "TEXT", nullable: false),
                    RequiresSpecialRoom = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Courses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Semesters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AcademicYear = table.Column<int>(type: "INTEGER", nullable: false),
                    Term = table.Column<int>(type: "INTEGER", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    IsCurrent = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Semesters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SpecialRooms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Capacity = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpecialRooms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StaffTitles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffTitles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Periods",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SemesterId = table.Column<int>(type: "INTEGER", nullable: false),
                    PeriodNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "TEXT", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Periods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Periods_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SchoolDays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SemesterId = table.Column<int>(type: "INTEGER", nullable: false),
                    DayOfWeek = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolDays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolDays_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Teachers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    StaffTitleId = table.Column<int>(type: "INTEGER", nullable: false),
                    MaxWeeklyPeriods = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Teachers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Teachers_StaffTitles_StaffTitleId",
                        column: x => x.StaffTitleId,
                        principalTable: "StaffTitles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CourseAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SemesterId = table.Column<int>(type: "INTEGER", nullable: false),
                    CourseId = table.Column<int>(type: "INTEGER", nullable: false),
                    TeacherId = table.Column<int>(type: "INTEGER", nullable: false),
                    ClassId = table.Column<int>(type: "INTEGER", nullable: false),
                    WeeklyPeriods = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseAssignments_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseAssignments_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseAssignments_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TimetableSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CourseAssignmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    DayOfWeek = table.Column<int>(type: "INTEGER", nullable: false),
                    PeriodId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimetableSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimetableSlots_CourseAssignments_CourseAssignmentId",
                        column: x => x.CourseAssignmentId,
                        principalTable: "CourseAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimetableSlots_Periods_PeriodId",
                        column: x => x.PeriodId,
                        principalTable: "Periods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoomBookings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TimetableSlotId = table.Column<int>(type: "INTEGER", nullable: false),
                    SpecialRoomId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomBookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoomBookings_SpecialRooms_SpecialRoomId",
                        column: x => x.SpecialRoomId,
                        principalTable: "SpecialRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RoomBookings_TimetableSlots_TimetableSlotId",
                        column: x => x.TimetableSlotId,
                        principalTable: "TimetableSlots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HomeroomAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SemesterId = table.Column<int>(type: "INTEGER", nullable: false),
                    TeacherId = table.Column<int>(type: "INTEGER", nullable: false),
                    ClassId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HomeroomAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HomeroomAssignments_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HomeroomAssignments_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SchoolClasses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SemesterId = table.Column<int>(type: "INTEGER", nullable: false),
                    GradeYear = table.Column<int>(type: "INTEGER", nullable: false),
                    Section = table.Column<int>(type: "INTEGER", nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", nullable: false),
                    HomeroomAssignmentId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolClasses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolClasses_HomeroomAssignments_HomeroomAssignmentId",
                        column: x => x.HomeroomAssignmentId,
                        principalTable: "HomeroomAssignments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SchoolClasses_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Courses",
                columns: new[] { "Id", "ColorCode", "Name", "RequiresSpecialRoom" },
                values: new object[,]
                {
                    { 1, "#ef4444", "國文", false },
                    { 2, "#3b82f6", "英語", false },
                    { 3, "#22c55e", "數學", false },
                    { 4, "#f59e0b", "社會", false },
                    { 5, "#8b5cf6", "自然科學", false },
                    { 6, "#06b6d4", "科技", false },
                    { 7, "#ec4899", "藝術", false },
                    { 8, "#14b8a6", "健康與體育", true },
                    { 9, "#f97316", "綜合活動", false },
                    { 10, "#64748b", "彈性學習", false }
                });

            migrationBuilder.InsertData(
                table: "StaffTitles",
                columns: new[] { "Id", "Name" },
                values: new object[,]
                {
                    { 1, "專任教師" },
                    { 2, "代理教師" },
                    { 3, "代課教師" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_ClassId",
                table: "CourseAssignments",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_CourseId",
                table: "CourseAssignments",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId",
                table: "CourseAssignments",
                columns: new[] { "SemesterId", "CourseId", "ClassId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_TeacherId",
                table: "CourseAssignments",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_HomeroomAssignments_ClassId",
                table: "HomeroomAssignments",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_HomeroomAssignments_SemesterId_ClassId",
                table: "HomeroomAssignments",
                columns: new[] { "SemesterId", "ClassId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HomeroomAssignments_SemesterId_TeacherId",
                table: "HomeroomAssignments",
                columns: new[] { "SemesterId", "TeacherId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HomeroomAssignments_TeacherId",
                table: "HomeroomAssignments",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_Periods_SemesterId_PeriodNumber",
                table: "Periods",
                columns: new[] { "SemesterId", "PeriodNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoomBookings_SpecialRoomId",
                table: "RoomBookings",
                column: "SpecialRoomId");

            migrationBuilder.CreateIndex(
                name: "IX_RoomBookings_TimetableSlotId",
                table: "RoomBookings",
                column: "TimetableSlotId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SchoolClasses_HomeroomAssignmentId",
                table: "SchoolClasses",
                column: "HomeroomAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolClasses_SemesterId_GradeYear_Section",
                table: "SchoolClasses",
                columns: new[] { "SemesterId", "GradeYear", "Section" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SchoolDays_SemesterId_DayOfWeek",
                table: "SchoolDays",
                columns: new[] { "SemesterId", "DayOfWeek" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Semesters_AcademicYear_Term",
                table: "Semesters",
                columns: new[] { "AcademicYear", "Term" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Teachers_StaffTitleId",
                table: "Teachers",
                column: "StaffTitleId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableSlots_CourseAssignmentId_DayOfWeek_PeriodId",
                table: "TimetableSlots",
                columns: new[] { "CourseAssignmentId", "DayOfWeek", "PeriodId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TimetableSlots_PeriodId",
                table: "TimetableSlots",
                column: "PeriodId");

            migrationBuilder.AddForeignKey(
                name: "FK_CourseAssignments_SchoolClasses_ClassId",
                table: "CourseAssignments",
                column: "ClassId",
                principalTable: "SchoolClasses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_HomeroomAssignments_SchoolClasses_ClassId",
                table: "HomeroomAssignments",
                column: "ClassId",
                principalTable: "SchoolClasses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_HomeroomAssignments_SchoolClasses_ClassId",
                table: "HomeroomAssignments");

            migrationBuilder.DropTable(
                name: "RoomBookings");

            migrationBuilder.DropTable(
                name: "SchoolDays");

            migrationBuilder.DropTable(
                name: "SpecialRooms");

            migrationBuilder.DropTable(
                name: "TimetableSlots");

            migrationBuilder.DropTable(
                name: "CourseAssignments");

            migrationBuilder.DropTable(
                name: "Periods");

            migrationBuilder.DropTable(
                name: "Courses");

            migrationBuilder.DropTable(
                name: "SchoolClasses");

            migrationBuilder.DropTable(
                name: "HomeroomAssignments");

            migrationBuilder.DropTable(
                name: "Semesters");

            migrationBuilder.DropTable(
                name: "Teachers");

            migrationBuilder.DropTable(
                name: "StaffTitles");
        }
    }
}

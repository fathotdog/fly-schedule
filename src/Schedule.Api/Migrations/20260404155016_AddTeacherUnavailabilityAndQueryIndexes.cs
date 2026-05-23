using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedule.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherUnavailabilityAndQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TeacherUnavailabilities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SemesterId = table.Column<int>(type: "INTEGER", nullable: false),
                    TeacherId = table.Column<int>(type: "INTEGER", nullable: false),
                    DayOfWeek = table.Column<int>(type: "INTEGER", nullable: false),
                    PeriodId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeacherUnavailabilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeacherUnavailabilities_Periods_PeriodId",
                        column: x => x.PeriodId,
                        principalTable: "Periods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeacherUnavailabilities_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeacherUnavailabilities_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimetableSlots_DayOfWeek_PeriodId",
                table: "TimetableSlots",
                columns: new[] { "DayOfWeek", "PeriodId" });

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_SemesterId_ClassId",
                table: "CourseAssignments",
                columns: new[] { "SemesterId", "ClassId" });

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_SemesterId_TeacherId",
                table: "CourseAssignments",
                columns: new[] { "SemesterId", "TeacherId" });

            migrationBuilder.CreateIndex(
                name: "IX_TeacherUnavailabilities_PeriodId",
                table: "TeacherUnavailabilities",
                column: "PeriodId");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherUnavailabilities_TeacherId",
                table: "TeacherUnavailabilities",
                column: "TeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherUnavailabilities_SemesterId_TeacherId",
                table: "TeacherUnavailabilities",
                columns: new[] { "SemesterId", "TeacherId" });

            migrationBuilder.CreateIndex(
                name: "IX_TeacherUnavailabilities_SemesterId_TeacherId_DayOfWeek_PeriodId",
                table: "TeacherUnavailabilities",
                columns: new[] { "SemesterId", "TeacherId", "DayOfWeek", "PeriodId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeacherUnavailabilities");

            migrationBuilder.DropIndex(
                name: "IX_TimetableSlots_DayOfWeek_PeriodId",
                table: "TimetableSlots");

            migrationBuilder.DropIndex(
                name: "IX_CourseAssignments_SemesterId_ClassId",
                table: "CourseAssignments");

            migrationBuilder.DropIndex(
                name: "IX_CourseAssignments_SemesterId_TeacherId",
                table: "CourseAssignments");
        }
    }
}

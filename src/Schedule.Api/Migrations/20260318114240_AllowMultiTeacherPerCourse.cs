using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedule.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowMultiTeacherPerCourse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId",
                table: "CourseAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId_TeacherId",
                table: "CourseAssignments",
                columns: new[] { "SemesterId", "CourseId", "ClassId", "TeacherId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId_TeacherId",
                table: "CourseAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId",
                table: "CourseAssignments",
                columns: new[] { "SemesterId", "CourseId", "ClassId" },
                unique: true);
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedule.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSchoolNameToSemesterKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Semesters_AcademicYear_Term",
                table: "Semesters");

            migrationBuilder.CreateIndex(
                name: "IX_Semesters_AcademicYear_Term_SchoolName",
                table: "Semesters",
                columns: new[] { "AcademicYear", "Term", "SchoolName" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Semesters_AcademicYear_Term_SchoolName",
                table: "Semesters");

            migrationBuilder.CreateIndex(
                name: "IX_Semesters_AcademicYear_Term",
                table: "Semesters",
                columns: new[] { "AcademicYear", "Term" },
                unique: true);
        }
    }
}

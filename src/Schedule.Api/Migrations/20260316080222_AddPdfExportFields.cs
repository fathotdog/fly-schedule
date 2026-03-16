using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedule.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPdfExportFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Periods_SemesterId_PeriodNumber",
                table: "Periods");

            migrationBuilder.AddColumn<string>(
                name: "SchoolName",
                table: "Semesters",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ActivityName",
                table: "Periods",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActivity",
                table: "Periods",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Periods_SemesterId_PeriodNumber",
                table: "Periods",
                columns: new[] { "SemesterId", "PeriodNumber" },
                unique: true,
                filter: "IsActivity = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Periods_SemesterId_PeriodNumber",
                table: "Periods");

            migrationBuilder.DropColumn(
                name: "SchoolName",
                table: "Semesters");

            migrationBuilder.DropColumn(
                name: "ActivityName",
                table: "Periods");

            migrationBuilder.DropColumn(
                name: "IsActivity",
                table: "Periods");

            migrationBuilder.CreateIndex(
                name: "IX_Periods_SemesterId_PeriodNumber",
                table: "Periods",
                columns: new[] { "SemesterId", "PeriodNumber" },
                unique: true);
        }
    }
}

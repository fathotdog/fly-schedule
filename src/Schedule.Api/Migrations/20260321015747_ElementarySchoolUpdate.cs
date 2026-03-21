using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedule.Api.Migrations
{
    /// <inheritdoc />
    public partial class ElementarySchoolUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Courses",
                keyColumn: "Id",
                keyValue: 1,
                column: "Name",
                value: "國語");

            migrationBuilder.UpdateData(
                table: "Courses",
                keyColumn: "Id",
                keyValue: 5,
                column: "Name",
                value: "自然");

            migrationBuilder.UpdateData(
                table: "Courses",
                keyColumn: "Id",
                keyValue: 6,
                column: "Name",
                value: "本土語言");

            migrationBuilder.Sql(
                "INSERT OR IGNORE INTO Courses (Id, ColorCode, Name, RequiresSpecialRoom) VALUES (11, '#84cc16', '生活', 0)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Courses",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.UpdateData(
                table: "Courses",
                keyColumn: "Id",
                keyValue: 1,
                column: "Name",
                value: "國文");

            migrationBuilder.UpdateData(
                table: "Courses",
                keyColumn: "Id",
                keyValue: 5,
                column: "Name",
                value: "自然科學");

            migrationBuilder.UpdateData(
                table: "Courses",
                keyColumn: "Id",
                keyValue: 6,
                column: "Name",
                value: "科技");
        }
    }
}

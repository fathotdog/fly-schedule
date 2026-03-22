using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedule.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseSortOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Courses",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            // Initialize all existing rows: SortOrder = Id - 1 gives 0-based index in creation order
            migrationBuilder.Sql("UPDATE Courses SET SortOrder = Id - 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Courses");
        }
    }
}

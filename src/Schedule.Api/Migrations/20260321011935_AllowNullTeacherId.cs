using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Schedule.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowNullTeacherId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CourseAssignments_Teachers_TeacherId",
                table: "CourseAssignments");

            migrationBuilder.DropIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId_TeacherId",
                table: "CourseAssignments");

            migrationBuilder.AlterColumn<int>(
                name: "TeacherId",
                table: "CourseAssignments",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId_TeacherId",
                table: "CourseAssignments",
                columns: new[] { "SemesterId", "CourseId", "ClassId", "TeacherId" },
                unique: true,
                filter: "\"TeacherId\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_CourseAssignments_Teachers_TeacherId",
                table: "CourseAssignments",
                column: "TeacherId",
                principalTable: "Teachers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CourseAssignments_Teachers_TeacherId",
                table: "CourseAssignments");

            migrationBuilder.DropIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId_TeacherId",
                table: "CourseAssignments");

            migrationBuilder.AlterColumn<int>(
                name: "TeacherId",
                table: "CourseAssignments",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseAssignments_SemesterId_CourseId_ClassId_TeacherId",
                table: "CourseAssignments",
                columns: new[] { "SemesterId", "CourseId", "ClassId", "TeacherId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CourseAssignments_Teachers_TeacherId",
                table: "CourseAssignments",
                column: "TeacherId",
                principalTable: "Teachers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

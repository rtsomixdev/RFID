using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateModelsForIoT : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "current_mode",
                table: "readers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "from_location",
                table: "linen_logs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "to_location",
                table: "linen_logs",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "special_tags",
                columns: table => new
                {
                    tag_id = table.Column<string>(type: "text", nullable: false),
                    command_type = table.Column<string>(type: "text", nullable: false),
                    target_status = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_special_tags", x => x.tag_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "special_tags");

            migrationBuilder.DropColumn(
                name: "current_mode",
                table: "readers");

            migrationBuilder.DropColumn(
                name: "from_location",
                table: "linen_logs");

            migrationBuilder.DropColumn(
                name: "to_location",
                table: "linen_logs");
        }
    }
}

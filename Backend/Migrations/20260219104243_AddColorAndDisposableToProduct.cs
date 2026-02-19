using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddColorAndDisposableToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "color",
                table: "products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_disposable",
                table: "products",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "color",
                table: "products");

            migrationBuilder.DropColumn(
                name: "is_disposable",
                table: "products");
        }
    }
}

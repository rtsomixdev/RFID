using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateRequirements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "arrival_date",
                table: "requests",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "dispatch_date",
                table: "requests",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "note",
                table: "requests",
                type: "text",
                nullable: true);

            // ❌ ปิดส่วนนี้เพราะ Database จริงมี linen_id อยู่แล้ว
            /* migrationBuilder.AddColumn<int>(
                name: "linen_id",
                table: "request_items",
                type: "integer",
                nullable: true);
            */

            migrationBuilder.AddColumn<string>(
                name: "reader_function",
                table: "readers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "current_location",
                table: "linens",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "max_wash_count",
                table: "linens",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            /*migrationBuilder.AddColumn<string>(
                name: "description",
                table: "linen_logs",
                type: "text",
                nullable: true);
            */

            migrationBuilder.CreateTable(
                name: "settings",
                columns: table => new
                {
                    setting_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    setting_key = table.Column<string>(type: "text", nullable: false),
                    setting_value = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settings", x => x.setting_id);
                });

            // ❌ ปิด Index ของ linen_id ด้วย (กัน error ซ้ำซ้อน)
            /*
            migrationBuilder.CreateIndex(
                name: "IX_request_items_linen_id",
                table: "request_items",
                column: "linen_id");

            migrationBuilder.AddForeignKey(
                name: "FK_request_items_linens_linen_id",
                table: "request_items",
                column: "linen_id",
                principalTable: "linens",
                principalColumn: "linen_id");
            */
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ส่วน Down เก็บไว้เหมือนเดิม หรือจะ comment ออกด้วยก็ได้ถ้าต้องการ rollback
            
            /*
            migrationBuilder.DropForeignKey(
                name: "FK_request_items_linens_linen_id",
                table: "request_items");
            */

            migrationBuilder.DropTable(
                name: "settings");

            /*
            migrationBuilder.DropIndex(
                name: "IX_request_items_linen_id",
                table: "request_items");
            */

            migrationBuilder.DropColumn(
                name: "arrival_date",
                table: "requests");

            migrationBuilder.DropColumn(
                name: "dispatch_date",
                table: "requests");

            migrationBuilder.DropColumn(
                name: "note",
                table: "requests");

            /*
            migrationBuilder.DropColumn(
                name: "linen_id",
                table: "request_items");
            */

            migrationBuilder.DropColumn(
                name: "reader_function",
                table: "readers");

            migrationBuilder.DropColumn(
                name: "current_location",
                table: "linens");

            migrationBuilder.DropColumn(
                name: "max_wash_count",
                table: "linens");

            migrationBuilder.DropColumn(
                name: "description",
                table: "linen_logs");
        }
    }
}
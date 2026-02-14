using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDescriptionToLinenLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ✅ ลบคำสั่ง DropForeignKey ของ request_items ออกเพราะ Constraint ไม่มีอยู่จริงใน DB
            // ✅ ลบคำสั่ง DropColumn ของ request_items ออกเพราะคอลัมน์ไม่มีอยู่จริงใน DB

            // 1. เพิ่มคอลัมน์ description ในตาราง linen_logs (จุดประสงค์หลักของเรา)
            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "linen_logs",
                type: "text",
                nullable: true);

            // 2. จัดการส่วนของ Rooms และ Readers ตามที่ Scaffold มา
            migrationBuilder.AlterColumn<int>(
                name: "ward_id",
                table: "rooms",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "rooms",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "room_id",
                table: "readers",
                type: "integer",
                nullable: true);

            // 3. สร้างตาราง permissions และ role_permissions
            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    permission_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    permission_code = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permissions", x => x.permission_id);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    role_id = table.Column<int>(type: "integer", nullable: false),
                    permission_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => new { x.role_id, x.permission_id });
                    table.ForeignKey(
                        name: "FK_role_permissions_permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "permissions",
                        principalColumn: "permission_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_role_permissions_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "role_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_permission_id",
                table: "role_permissions",
                column: "permission_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ส่วนของ Down สามารถปล่อยไว้ตามเดิมหรือลบส่วนที่ลบใน Up ออกให้สอดคล้องกันได้ครับ
            migrationBuilder.DropTable(name: "role_permissions");
            migrationBuilder.DropTable(name: "permissions");
            migrationBuilder.DropColumn(name: "description", table: "linen_logs");
            migrationBuilder.DropColumn(name: "description", table: "rooms");
            migrationBuilder.DropColumn(name: "room_id", table: "readers");
        }
    }
}
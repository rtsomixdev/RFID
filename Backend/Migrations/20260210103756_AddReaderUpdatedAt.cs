using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddReaderUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ❌ ใส่เครื่องหมาย /* และ */ ครอบไว้ เพื่อปิดการทำงานส่วนนี้ชั่วคราว
            // เพราะใน Database มีคอลัมน์นี้อยู่แล้ว ไม่ต้องสร้างซ้ำ
            /* migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "readers",
                type: "timestamp without time zone",
                nullable: true);
            */
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "readers");
        }
    }
}
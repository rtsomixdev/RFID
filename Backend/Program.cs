using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization; // ✅ สำคัญมาก: สำหรับแก้ JSON Loop
using Backend.Services;
using Backend.Hubs; // ✅ เพิ่ม: ถ้าคุณสร้างไฟล์ DbInitializer ตามที่คุยกัน

var builder = WebApplication.CreateBuilder(args);

// --- 1. System Config ---
// แก้ปัญหาวันที่ของ PostgreSQL (timestamp issue)
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// --- 2. Services Registration ---

// ✅ แก้ Error 500 (JSON Loop) ที่นี่
// สั่งให้ JSON Serializer ข้าม object ที่มีความสัมพันธ์วนลูป (Circular Reference)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true; // (Optional) ให้อ่านง่ายขึ้น
    });

// Database Connection
builder.Services.AddDbContext<LinenDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Real-time (SignalR)
builder.Services.AddSignalR();

// MQTT Background Services
builder.Services.AddHostedService<MqttListenerService>();
builder.Services.AddSingleton<MqttPublisherService>();

// Swagger / API Explorer
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS (Allow Frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy
            .WithOrigins("http://localhost:5173") // เปลี่ยน Port ตาม Frontend จริง
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()); // ✅ สำคัญ: SignalR ต้องการ Credentials
});

// --- 3. Build App ---
var app = builder.Build();

// ✅✅✅ 4. Auto-Initialize Database (ส่วนสำคัญที่เพิ่มมา)
// ส่วนนี้จะทำงานทุกครั้งที่รัน Backend เพื่อเช็คว่า DB พร้อมไหม
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<LinenDbContext>();
        
        // สร้าง Database ถ้ายังไม่มี
        context.Database.EnsureCreated();

        // ถ้าคุณสร้างไฟล์ DbInitializer.cs ไว้ ให้ uncomment บรรทัดนี้
        // DbInitializer.Initialize(context); 
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "เกิดข้อผิดพลาดขณะสร้างฐานข้อมูล");
    }
}
// -----------------------------------------------------------

// --- 5. Middleware Pipeline ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notification"); // Endpoint สำหรับ SignalR

app.Run();
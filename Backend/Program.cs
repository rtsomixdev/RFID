using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using Backend.Services; 
using Backend.Hubs; // ✅ 1. เพิ่มบรรทัดนี้ (ต้องสร้างโฟลเดอร์ Hubs และไฟล์ NotificationHub.cs ก่อนนะ)

var builder = WebApplication.CreateBuilder(args);

// ✅✅✅ แก้ Error DateTime
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Add services to the container.

// Config ป้องกัน JSON Loop
builder.Services.AddControllers().AddJsonOptions(x =>
    x.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

// Connect Database
builder.Services.AddDbContext<LinenDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ✅ 2. ลงทะเบียน SignalR Service (สำหรับ Real-time Notification)
builder.Services.AddSignalR();

// ✅ 3. ลงทะเบียน MQTT Background Service
// (ตอนนี้ MqttListenerService จะสามารถเรียกใช้ IHubContext ได้แล้ว)
builder.Services.AddHostedService<MqttListenerService>();
builder.Services.AddSingleton<MqttPublisherService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS Config
builder.Services.AddCors(options => {
    options.AddPolicy("AllowReactApp",
        builder => builder
            .WithOrigins("http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()); // ✅ 4. เพิ่มบรรทัดนี้ (สำคัญ! SignalR ต้องการ Credentials)
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

app.UseAuthorization();

app.MapControllers();

// ✅ 5. สร้าง Endpoint สำหรับ SignalR Hub
app.MapHub<NotificationHub>("/hubs/notification");

app.Run();
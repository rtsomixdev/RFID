using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization; 
using Backend.Services;
using Backend.Hubs; 
using Microsoft.AspNetCore.Authentication.Cookies; // ✅ เพิ่มบรรทัดนี้

var builder = WebApplication.CreateBuilder(args);

// --- 1. System Config ---
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// --- 2. Services Registration ---

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true; 
    });

// Database Connection
builder.Services.AddDbContext<LinenDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ✅ เพิ่ม Authentication แบบ Cookie-Based (Session)
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "LinenAuthSession"; // ชื่อคุกกี้
        options.Cookie.HttpOnly = true; // ป้องกัน XSS
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; 
        options.ExpireTimeSpan = TimeSpan.FromHours(8); // กำหนดเวลา Session
        options.SlidingExpiration = true; 
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = 401; // ถ้าไม่มีสิทธิ์ ให้ตอบกลับ 401 Unauthorized
            return Task.CompletedTask;
        };
    });

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
            .WithOrigins("http://localhost:5173") 
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()); 
});

// --- 3. Build App ---
var app = builder.Build();

// --- 4. Auto-Initialize Database ---
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<LinenDbContext>();
        context.Database.EnsureCreated();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "เกิดข้อผิดพลาดขณะสร้างฐานข้อมูล");
    }
}

// --- 5. Middleware Pipeline ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

// ✅ เปิดใช้งานระบบ Auth
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notification"); 

app.Run();
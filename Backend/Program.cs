using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization; 
using Backend.Services;
using Backend.Hubs; 
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides; 
// ✅ เพิ่ม Using 2 ตัวนี้สำหรับทำ Rate Limiting สายโหด
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// --- 1. System Config ---
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// --- 2. Services Registration ---

// 🚀 [แก้ไขสำเร็จ] ป้องกัน JSON วนลูปไม่รู้จบ (Infinite Loop)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true; 
    });

// Database Connection
builder.Services.AddDbContext<LinenDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- 2.1 Register Services (DI) ---
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IDamageReasonService, DamageReasonService>();
builder.Services.AddScoped<IHospitalService, HospitalService>();
builder.Services.AddScoped<ILaundryService, LaundryService>();
builder.Services.AddScoped<ILinenLogService, LinenLogService>();
builder.Services.AddScoped<ILinenService, LinenService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IVendorService, VendorService>();
builder.Services.AddScoped<IWardService, WardService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<ITitleService, TitleService>();
builder.Services.AddScoped<IReaderService, ReaderService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISettingService, SettingService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ISpecialTagService, SpecialTagService>();
builder.Services.AddScoped<IRequestStatusService, RequestStatusService>();
builder.Services.AddScoped<ITransportService, TransportService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IRequestService, RequestService>();
builder.Services.AddScoped<IRequestItemService, RequestItemService>();

// Authentication แบบ Cookie-Based (Session)
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "LinenAuthSession"; 
        options.Cookie.HttpOnly = true; 
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always; 
        
        options.Cookie.SameSite = SameSiteMode.None; 
        options.Cookie.Domain = ".rfidtracking.space"; 
        
        options.ExpireTimeSpan = TimeSpan.FromHours(8); 
        options.SlidingExpiration = true; 
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = 401; 
            return Task.CompletedTask;
        };
    });

// ตั้งค่า Forwarded Headers ให้ .NET รู้จักข้อมูลที่ส่งมาจาก Cloudflare Tunnel
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// 🔥🔥🔥 เพิ่มระบบเกราะป้องกัน Rate Limiting 2 ชั้น 🔥🔥🔥
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync("{\"message\": \"ตรวจพบพฤติกรรมน่าสงสัยหรือใช้งานถี่เกินไป ระบบได้ทำการบล็อก IP ของคุณชั่วคราว\"}", token);
    };

    // 🛡️ ชั้นที่ 1: โหมด Login สายโหด (อนุญาตแค่ 3 ครั้ง ภายใน 15 นาที)
    options.AddPolicy("StrictLogin", httpContext =>
    {
        var ip = httpContext.Request.Headers["CF-Connecting-IP"].FirstOrDefault() ??
                 httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault() ??
                 httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ip,
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5, 
                QueueLimit = 0,  
                Window = TimeSpan.FromMinutes(15) 
            });
    });

    // 🛡️ ชั้นที่ 2: โหมดกัน Spam/DDoS ระดับแอป (ห้ามยิง API รัวเกิน 50 ครั้ง ใน 10 วินาที)
    options.AddPolicy("GlobalSpam", httpContext =>
    {
        var ip = httpContext.Request.Headers["CF-Connecting-IP"].FirstOrDefault() ??
                 httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault() ??
                 httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ip,
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 50, 
                QueueLimit = 0,
                Window = TimeSpan.FromSeconds(10) 
            });
    });
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
            .WithOrigins(
                "http://localhost:5173",        
                "http://localhost:3000",        
                "https://rfidtracking.space",   
                "https://www.rfidtracking.space",
                "https://api.rfidtracking.space" 
            ) 
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()); 
});

// --- 3. Build App ---
var app = builder.Build();

// เรียกใช้ Forwarded Headers (ต้องอยู่บนสุดของ Middleware Pipeline)
app.UseForwardedHeaders();

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

// จัดลำดับ Routing และ CORS ให้ถูกต้อง
app.UseRouting();
app.UseCors("AllowReactApp");

// ✅ เปิดใช้งานเกราะป้องกัน Rate Limiter (ต้องวางตรงนี้! หลัง UseRouting แต่ก่อน UseAuthentication)
app.UseRateLimiter(); 

// เปิดใช้งานระบบ Auth
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notification"); 

app.Run();
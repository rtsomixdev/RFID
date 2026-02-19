using Microsoft.EntityFrameworkCore;
using Backend.Models; 

namespace Backend.Models;

public partial class LinenDbContext : DbContext
{
    public LinenDbContext(DbContextOptions<LinenDbContext> options)
        : base(options)
    {
    }

    // --- DbSets (All tables in the system) ---
    public virtual DbSet<Category> Categories { get; set; }
    public virtual DbSet<DamageReason> DamageReasons { get; set; }
    public virtual DbSet<Hospital> Hospitals { get; set; }
    public virtual DbSet<Linen> Linens { get; set; }
    public virtual DbSet<LinenLog> LinenLogs { get; set; }
    public virtual DbSet<Product> Products { get; set; }
    public virtual DbSet<Reader> Readers { get; set; }
    public virtual DbSet<Request> Requests { get; set; }
    public virtual DbSet<RequestItem> RequestItems { get; set; }
    public virtual DbSet<RequestStatus> RequestStatuses { get; set; }
    public virtual DbSet<Role> Roles { get; set; }
    public virtual DbSet<Room> Rooms { get; set; }
    public virtual DbSet<SystemLog> SystemLogs { get; set; }
    public virtual DbSet<Title> Titles { get; set; }
    public virtual DbSet<User> Users { get; set; }
    public virtual DbSet<Vendor> Vendors { get; set; }
    public virtual DbSet<Ward> Wards { get; set; }

    // ✅ Setting (Existing)
    public virtual DbSet<Setting> Settings { get; set; }

    // ✅ Notification
    public virtual DbSet<Notification> Notifications { get; set; }

    // ✅ SpecialTag (New, for IoT command cards)
    public virtual DbSet<SpecialTag> SpecialTags { get; set; }

    // ✅ Permissions & RolePermissions (New, for Dynamic Roles)
    public virtual DbSet<Permission> Permissions { get; set; }
    public virtual DbSet<RolePermission> RolePermissions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 1. Category
        modelBuilder.Entity<Category>(entity => {
            entity.ToTable("categories");
            entity.HasKey(e => e.CategoryId);
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CategoryName).HasColumnName("category_name");
        });

        // 2. DamageReason
        modelBuilder.Entity<DamageReason>(entity => {
            entity.ToTable("damage_reasons");
            entity.HasKey(e => e.ReasonId);
            entity.Property(e => e.ReasonId).HasColumnName("reason_id");
            entity.Property(e => e.ReasonName).HasColumnName("reason_name"); 
        });

        // 3. Hospital
        modelBuilder.Entity<Hospital>(entity => {
            entity.ToTable("hospitals");
            entity.HasKey(e => e.HospitalId);
            entity.Property(e => e.HospitalId).HasColumnName("hospital_id");
            entity.Property(e => e.HospitalName).HasColumnName("hospital_name");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.ContactInfo).HasColumnName("contact_info");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // 4. Linen
        modelBuilder.Entity<Linen>(entity => {
            entity.ToTable("linens");
            entity.HasKey(e => e.LinenId);
            entity.Property(e => e.LinenId).HasColumnName("linen_id");
            entity.Property(e => e.RfidCode).HasColumnName("rfid_code");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.VendorId).HasColumnName("vendor_id");
            entity.Property(e => e.HospitalId).HasColumnName("hospital_id");
            entity.Property(e => e.RegisteredAt).HasColumnName("registered_at");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.WashCount).HasColumnName("wash_count");
            entity.Property(e => e.LastWashDate).HasColumnName("last_wash_date");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CurrentLocation).HasColumnName("current_location");
            entity.Property(e => e.MaxWashCount).HasColumnName("max_wash_count");
        });

        // 5. LinenLog
        modelBuilder.Entity<LinenLog>(entity => {
            entity.ToTable("linen_logs");
            entity.HasKey(e => e.LogId);
            entity.Property(e => e.LogId).HasColumnName("log_id");
            entity.Property(e => e.LinenId).HasColumnName("linen_id");
            entity.Property(e => e.ReaderId).HasColumnName("reader_id");
            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.ActivityType).HasColumnName("activity_type");
            entity.Property(e => e.Timestamp).HasColumnName("timestamp"); 
            entity.Property(e => e.FromLocation).HasColumnName("from_location");
            entity.Property(e => e.ToLocation).HasColumnName("to_location");
            entity.Property(e => e.StatusAfter).HasColumnName("status_after");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // 6. Product
        modelBuilder.Entity<Product>(entity => {
            entity.ToTable("products");
            entity.HasKey(e => e.ProductId);
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ProductCode).HasColumnName("product_code");
            entity.Property(e => e.ProductName).HasColumnName("product_name");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.SizeSpec).HasColumnName("size_spec");
            entity.Property(e => e.UnitName).HasColumnName("unit_name");
            entity.Property(e => e.StandardWeightKg).HasColumnName("standard_weight_kg");
            entity.Property(e => e.DefaultRoomId).HasColumnName("default_room_id");
            
            // ✅ แมปคอลัมน์ใหม่ 2 ตัวที่เพิ่งเพิ่มเข้ามา
            entity.Property(e => e.Color).HasColumnName("color");
            entity.Property(e => e.IsDisposable).HasColumnName("is_disposable");

            entity.Property(e => e.MaxLifespanDays).HasColumnName("MaxLifespanDays");
            entity.Property(e => e.MaxWashCount).HasColumnName("MaxWashCount");

            entity.Ignore("MinStockLevel"); 
        });

        // 7. Reader
        modelBuilder.Entity<Reader>(entity => {
            entity.ToTable("readers");
            entity.HasKey(e => e.ReaderId);
            entity.Property(e => e.ReaderId).HasColumnName("reader_id");
            entity.Property(e => e.ReaderName).HasColumnName("reader_name");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address");
            entity.Property(e => e.ReaderType).HasColumnName("reader_type");
            entity.Property(e => e.ReaderFunction).HasColumnName("reader_function"); 
            entity.Property(e => e.Location).HasColumnName("location");
            entity.Property(e => e.InstalledAtRoomId).HasColumnName("installed_at_room_id");
            entity.Property(e => e.OperatingDays).HasColumnName("operating_days");
            entity.Property(e => e.OperatingStartTime).HasColumnName("operating_start_time");
            entity.Property(e => e.OperatingEndTime).HasColumnName("operating_end_time");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CurrentMode).HasColumnName("current_mode");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.RoomId).HasColumnName("room_id");
        });

        // 8. Request
        modelBuilder.Entity<Request>(entity => {
            entity.ToTable("requests");
            entity.HasKey(e => e.RequestId);
            entity.Property(e => e.RequestId).HasColumnName("request_id");
            entity.Property(e => e.RequestCode).HasColumnName("request_code");
            entity.Property(e => e.RequestType).HasColumnName("request_type");
            entity.Property(e => e.RequestedByUserId).HasColumnName("requested_by_user_id");
            entity.Property(e => e.TargetWardId).HasColumnName("target_ward_id");
            entity.Property(e => e.CurrentStatusId).HasColumnName("current_status_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.ArrivalDate).HasColumnName("arrival_date");
            entity.Property(e => e.DispatchDate).HasColumnName("dispatch_date");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.Status).HasColumnName("status");
        });

        // 9. RequestItem
        modelBuilder.Entity<RequestItem>(entity => {
            entity.ToTable("request_items");
            entity.HasKey(e => e.ItemId);
            entity.Property(e => e.ItemId).HasColumnName("item_id");
            entity.Property(e => e.RequestId).HasColumnName("request_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.QuantityRequested).HasColumnName("quantity_requested");
            entity.Property(e => e.DamageReasonId).HasColumnName("damage_reason_id");
        });

        // 10. RequestStatus
        modelBuilder.Entity<RequestStatus>(entity => {
            entity.ToTable("request_statuses");
            entity.HasKey(e => e.StatusId);
            entity.Property(e => e.StatusId).HasColumnName("status_id");
            entity.Property(e => e.StatusName).HasColumnName("status_name");
        });

        // 11. Role
        modelBuilder.Entity<Role>(entity => {
            entity.ToTable("roles");
            entity.HasKey(e => e.RoleId);
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.RoleName).HasColumnName("role_name");
        });

        // 12. Room
        modelBuilder.Entity<Room>(entity => {
            entity.ToTable("rooms");
            entity.HasKey(e => e.RoomId);
            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.RoomName).HasColumnName("room_name");
            entity.Property(e => e.WardId).HasColumnName("ward_id");
            entity.Property(e => e.Description).HasColumnName("description");
        });

        // 13. SystemLog
        modelBuilder.Entity<SystemLog>(entity => {
            entity.ToTable("system_logs");
            entity.HasKey(e => e.LogId);
            entity.Property(e => e.LogId).HasColumnName("log_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ActionType).HasColumnName("action_type");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // 14. Title
        modelBuilder.Entity<Title>(entity => {
            entity.ToTable("titles");
            entity.HasKey(e => e.TitleId);
            entity.Property(e => e.TitleId).HasColumnName("title_id");
            entity.Property(e => e.TitleNameTh).HasColumnName("title_name_th");
            entity.Property(e => e.TitleNameEn).HasColumnName("title_name_en");
        });

        // 15. User
        modelBuilder.Entity<User>(entity => {
            entity.ToTable("users");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Username).HasColumnName("username");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash"); 
            entity.Property(e => e.TitleId).HasColumnName("title_id");
            entity.Property(e => e.FirstName).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasColumnName("last_name");
            entity.Property(e => e.PhoneNumber).HasColumnName("phone_number");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.HospitalId).HasColumnName("hospital_id");
            entity.Property(e => e.WardId).HasColumnName("ward_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            
            entity.Property(e => e.OtpCode).HasColumnName("otp_code").HasMaxLength(6);
            entity.Property(e => e.OtpExpiry).HasColumnName("otp_expiry");
        });

        // 16. Vendor
        modelBuilder.Entity<Vendor>(entity => {
            entity.ToTable("vendors");
            entity.HasKey(e => e.VendorId);
            entity.Property(e => e.VendorId).HasColumnName("vendor_id");
            entity.Property(e => e.VendorName).HasColumnName("vendor_name");
            entity.Property(e => e.RegistrationNumber).HasColumnName("registration_number");
        });

        // 17. Ward
        modelBuilder.Entity<Ward>(entity => {
            entity.ToTable("wards");
            entity.HasKey(e => e.WardId);
            entity.Property(e => e.WardId).HasColumnName("ward_id");
            entity.Property(e => e.WardName).HasColumnName("ward_name");
            entity.Property(e => e.HospitalId).HasColumnName("hospital_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        // ✅ Mapping สำหรับ Setting
        modelBuilder.Entity<Setting>(entity => {
            entity.ToTable("settings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("setting_id");
            entity.Property(e => e.Key).HasColumnName("setting_key");
            entity.Property(e => e.Value).HasColumnName("setting_value");
            entity.Property(e => e.Description).HasColumnName("description");
        });

        // ✅ Mapping สำหรับ Notification
        modelBuilder.Entity<Notification>(entity => {
            entity.ToTable("notifications");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("notification_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.Message).HasColumnName("message");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.IsRead).HasColumnName("is_read");
            entity.Property(e => e.LinkUrl).HasColumnName("link_url");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // ✅ Mapping สำหรับ SpecialTag (เพิ่มใหม่)
        modelBuilder.Entity<SpecialTag>(entity => {
            entity.ToTable("special_tags");
            entity.HasKey(e => e.TagId);
            entity.Property(e => e.TagId).HasColumnName("tag_id");
            entity.Property(e => e.CommandType).HasColumnName("command_type");
            entity.Property(e => e.TargetStatus).HasColumnName("target_status");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        // ✅ Mapping สำหรับ Permission (เพิ่มใหม่)
        modelBuilder.Entity<Permission>(entity => {
            entity.ToTable("permissions");
            entity.HasKey(e => e.PermissionId);
            entity.Property(e => e.PermissionId).HasColumnName("permission_id");
            entity.Property(e => e.PermissionCode).HasColumnName("permission_code");
            entity.Property(e => e.Description).HasColumnName("description");
        });

        // ✅ Mapping สำหรับ RolePermission (เพิ่มใหม่ - Many to Many)
        modelBuilder.Entity<RolePermission>(entity => {
            entity.ToTable("role_permissions");
            
            // Set Composite Key
            entity.HasKey(e => new { e.RoleId, e.PermissionId });

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.PermissionId).HasColumnName("permission_id");

            // Relationships
            entity.HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId);

            entity.HasOne(rp => rp.Permission)
                .WithMany()
                .HasForeignKey(rp => rp.PermissionId);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
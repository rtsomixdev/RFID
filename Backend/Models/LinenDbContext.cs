using Microsoft.EntityFrameworkCore;

namespace Backend.Models;

public partial class LinenDbContext : DbContext
{
    public LinenDbContext(DbContextOptions<LinenDbContext> options)
        : base(options)
    {
    }

    // --- DbSets (ตารางทั้งหมดในระบบ) ---
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
    public virtual DbSet<SystemLog> SystemLogs { get; set; } // ✅ เพิ่มตาราง Log
    public virtual DbSet<Title> Titles { get; set; }
    public virtual DbSet<User> Users { get; set; }
    public virtual DbSet<Vendor> Vendors { get; set; }
    public virtual DbSet<Ward> Wards { get; set; }

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

        // 4. Linen (✅ Clean Code: ใช้ Attribute ใน Model แทน)
        modelBuilder.Entity<Linen>(entity => {
            entity.HasKey(e => e.LinenId);
        });

        // 5. LinenLog (✅ Clean Code: ใช้ Attribute ใน Model แทน)
        modelBuilder.Entity<LinenLog>(entity => {
            entity.HasKey(e => e.LogId);
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
        });

        // 7. Reader
        modelBuilder.Entity<Reader>(entity => {
            entity.ToTable("readers");
            entity.HasKey(e => e.ReaderId);
            entity.Property(e => e.ReaderId).HasColumnName("reader_id");
            entity.Property(e => e.ReaderName).HasColumnName("reader_name");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address");
            entity.Property(e => e.ReaderType).HasColumnName("reader_type");
            entity.Property(e => e.InstalledAtRoomId).HasColumnName("installed_at_room_id");
            entity.Property(e => e.OperatingDays).HasColumnName("operating_days");
            entity.Property(e => e.OperatingStartTime).HasColumnName("operating_start_time");
            entity.Property(e => e.OperatingEndTime).HasColumnName("operating_end_time");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        // 8. Request (✅ Clean Code: ใช้ Attribute ใน Model แทน)
        modelBuilder.Entity<Request>(entity => {
            entity.HasKey(e => e.RequestId);
        });

        // 9. RequestItem (✅ Clean Code: ใช้ Attribute ใน Model แทน)
        modelBuilder.Entity<RequestItem>(entity => {
            entity.HasKey(e => e.ItemId);
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
        });

        // 13. SystemLog (✅ เพิ่ม Mapping ใหม่)
        modelBuilder.Entity<SystemLog>(entity => {
            entity.HasKey(e => e.LogId);
            // เชื่อม FK อัตโนมัติจาก Attribute ใน Model
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

        // 17. Ward (✅ Clean Code: ใช้ Attribute ใน Model แทน)
        modelBuilder.Entity<Ward>(entity => {
            entity.HasKey(e => e.WardId);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
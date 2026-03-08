using System.Net;
using System.Net.Mail;

namespace Backend.Services;

/// <summary>
/// บริการสำหรับการส่งอีเมลในระบบ (เช่น OTP)
/// </summary>
public class EmailService
{
    private readonly string _senderEmail = "hospitalrfidtracking@gmail.com";
    // ข้อควรระวัง: รหัสแอปควรถูกจัดเก็บไว้ในลักษณะกำหนดตัวแปรภายนอก (appsettings) เพื่อความปลอดภัย
    private readonly string _appPassword = "qzls jdhm lrzq pabv"; 

    /// <summary>
    /// สั่งการส่งข้อความรหัสยืนยัน OTP ไปยังเป้าหมายปลายทาง
    /// </summary>
    /// <param name="toEmail">ที่อยู่อีเมลเป้าหมาย</param>
    /// <param name="otpCode">รหัสยืนยันความยาว 6 ตัวอักษร</param>
    public async Task SendOtpEmailAsync(string toEmail, string otpCode)
    {
        try
        {
            var smtpClient = new SmtpClient("smtp.gmail.com")
            {
                Port = 587,
                Credentials = new NetworkCredential(_senderEmail, _appPassword),
                EnableSsl = true,
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_senderEmail, "Smart RFID System"),
                Subject = "รหัสยืนยัน (OTP) สำหรับรีเซ็ตรหัสผ่าน",
                Body = $@"
                    <h2>รหัส OTP ของคุณคือ</h2>
                    <h1 style='color: #2563eb; letter-spacing: 5px;'>{otpCode}</h1>
                    <p>รหัสนี้จะหมดอายุใน 5 นาที</p>
                    <p>หากคุณไม่ได้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
                ",
                IsBodyHtml = true,
            };

            mailMessage.To.Add(toEmail);

            await smtpClient.SendMailAsync(mailMessage);
        }
        catch (Exception ex)
        {
            // ทำการบันทึกเมื่อมีจุดบกพร่อง หรือสะท้อนความผิดพลาดส่วนนอกการทำงาน
            Console.WriteLine($"Error sending email: {ex.Message}");
            throw;
        }
    }
}
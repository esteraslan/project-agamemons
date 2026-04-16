using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// --- 1. REGISTRASI SERVICES ---
builder.Services.AddControllers(); 
// Tambahkan CORS agar frontend bisa akses API tanpa diblokir
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// --- 2. KONFIGURASI MIDDLEWARE ---
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseCors();

// --- 3. ENDPOINT MAPPING ---
app.MapControllers(); // Wajib agar StoryController.cs aktif

// Minimal API untuk stats tetap dipertahankan
app.MapGet("/api/status", () => new {
    SystemName = "Agamemons Core",
    Uptime = "99.9%",
    Environment = "Kali Linux WSL",
    GameEngineReady = true
});

app.MapGet("/api/game-stats", () => {
    var rng = new Random();
    return new {
        Character = "Agamemons",
        Class = "DevTechOps Knight",
        HP = rng.Next(80, 100),
        Mana = rng.Next(50, 100),
        Level = 10,
        IsOnline = true
    };
});

// Menggunakan port 80 di dalam container agar standar, 
// nanti di Docker kamu mapping ke 8080 (misal: -p 8080:80)
app.Run("http://0.0.0.0:80");
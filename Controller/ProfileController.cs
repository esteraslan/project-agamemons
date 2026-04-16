using Google.Cloud.Firestore;
using Google.Cloud.Firestore.V1;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace agamemons_web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfileController : ControllerBase
{
    private readonly FirestoreDb _db;
    private const string CollectionName = "user_stats";
    private const string DocumentId = "agamemons";

    public ProfileController()
    {
        // Pastikan file firebase-key.json ada di root project
        Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", Path.Combine(Directory.GetCurrentDirectory(), "firebase-key.json"));
        _db = FirestoreDb.Create("agamemons-portal");
        
        
        
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            DocumentSnapshot snapshot = await _db.Collection(CollectionName).Document(DocumentId).GetSnapshotAsync();
            
            if (!snapshot.Exists)
            {
                return NotFound(new { message = "Hero Agamemons tidak ditemukan di Cloud." });
            }

            return Ok(snapshot.ToDictionary());
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Portal Error: {ex.Message}");
        }
    }

    [HttpGet("generate-quest-ai")]
    public async Task<IActionResult> GenerateQuestAI()
    {
        // Ambil dari Environment Variable, bukan hardcoded
        string? apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
    
        if (string.IsNullOrEmpty(apiKey)) 
            return GenerateQuestManual();

        string requestUri = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";
       

        using var client = new HttpClient();
        var requestData = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = "Buat satu quest RPG harian sangat pendek untuk Deny. Persona: IT Service Desk, mahir Docker/K8s, 3D Artist (Blender), YouTube Creator Neo WordPress. Format output WAJIB JSON MURNI: {\"task\": \"isi quest\", \"exp\": 250, \"hp\": 10}. Bahasa Indonesia, tema Fantasy Tech Knight. Jangan berikan teks penjelasan lain." }
                    }
                }
            }
        };

        string jsonRequest = JsonSerializer.Serialize(requestData);
        var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");

        try
        {
            var response = await client.PostAsync(requestUri, content);
            string responseString = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(responseString);
            string? rawText = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrEmpty(rawText)) return GenerateQuestManual();

            int startIndex = rawText.IndexOf('{');
            int endIndex = rawText.LastIndexOf('}');

            if (startIndex == -1 || endIndex == -1) return Content(rawText, "application/json");

            string cleanedJson = rawText.Substring(startIndex, endIndex - startIndex + 1);
            return Content(cleanedJson, "application/json");
        }
        catch
        {
            return GenerateQuestManual();
        }
    }

    [HttpPost("complete-quest")]
    public async Task<IActionResult> CompleteQuest([FromBody] QuestClaim claim)
    {
        try
        {
            DocumentReference profileRef = _db.Collection(CollectionName).Document(DocumentId);
            DocumentSnapshot snapshot = await profileRef.GetSnapshotAsync();

            if (!snapshot.Exists) return NotFound();

            var data = snapshot.ToDictionary();
            long currentExp = Convert.ToInt64(data["currentExp"]);
            long nextLevelExp = Convert.ToInt64(data["nextLevelExp"]);
            long level = Convert.ToInt64(data["level"]);
            long hp = Convert.ToInt64(data["hp"]);
            long mana = data.ContainsKey("mana") ? Convert.ToInt64(data["mana"]) : 100L;

            currentExp += claim.RewardExp;
            hp = Math.Min(100L, hp + claim.RewardHp);
            bool levelUp = false;

            if (currentExp >= nextLevelExp)
            {
                level++;
                currentExp = 0;
                nextLevelExp = (long)(nextLevelExp * 1.5);
                levelUp = true;
            }

            await profileRef.UpdateAsync(new Dictionary<string, object>
            {
                { "currentExp", currentExp },
                { "nextLevelExp", nextLevelExp },
                { "level", level },
                { "hp", hp },
                { "mana", mana }
            });

            return Ok(new
            {
                message = levelUp ? $"LEVEL UP! Kamu sekarang Level {level}" : "Quest Selesai!",
                level = level,
                levelUp = levelUp
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal Error: {ex.Message}");
        }
    }

    [HttpPost("reset-stats")]
    public async Task<IActionResult> ResetStats()
    {
        await _db.Collection(CollectionName).Document(DocumentId).UpdateAsync(new Dictionary<string, object>
        {
            { "level", 1 },
            { "currentExp", 0 },
            { "nextLevelExp", 1000 },
            { "hp", 100 },
            { "mana", 100 },
            { "heroName", "Agamemons" },
            { "className", "Script Novice" }
        });

        return Ok(new { message = "Stats telah di-reset ke awal waktu." });
    }

    [HttpGet("generate-quest")]
    public IActionResult GenerateQuestManual()
    {
        var quests = new List<object>
        {
            new { task = "Optimasi Docker Image dengan Multi-stage build.", exp = 300, hp = 15 },
            new { task = "Deploy manifest Kubernetes ke namespace baru.", exp = 450, hp = 10 },
            new { task = "Lakukan ritual backup pada volume database.", exp = 200, hp = 20 }
        };

        return Ok(quests[new Random().Next(quests.Count)]);
    }

    public class QuestClaim
    {
        [JsonPropertyName("rewardExp")]
        public int RewardExp { get; set; }

        [JsonPropertyName("rewardHp")]
        public int RewardHp { get; set; }
    }
  
}
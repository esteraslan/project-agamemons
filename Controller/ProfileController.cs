using Google.Cloud.Firestore;
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
    private const string StatsCol = "user_stats";
    private const string StoryCol = "grimoire_stories";
    private const string DocumentId = "agamemons";
    
    // HttpClient statis untuk performa stabil
    private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };

    public ProfileController()
    {
        string keyPath = Path.Combine(Directory.GetCurrentDirectory(), "firebase-key.json");
        if (System.IO.File.Exists(keyPath))
        {
            Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", keyPath);
        }
        _db = FirestoreDb.Create("agamemons-portal");
    }

    // ==========================================
    // 1. CORE PROFILE & STATS
    // ==========================================

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            DocumentSnapshot snapshot = await _db.Collection(StatsCol).Document(DocumentId).GetSnapshotAsync();
            if (!snapshot.Exists) return NotFound(new { message = "Hero tidak ditemukan." });
            return Ok(snapshot.ToDictionary());
        }
        catch (Exception ex) { return StatusCode(500, ex.Message); }
    }

    [HttpPost("reset-stats")]
    public async Task<IActionResult> ResetStats()
    {
        var initial = new Dictionary<string, object> {
            { "level", 1 }, { "currentExp", 0 }, { "nextLevelExp", 1000 },
            { "hp", 100 }, { "mana", 100 }, { "maxHp", 120 }, { "maxMana", 115 },
            { "heroName", "Agamemons Zarek Zevan" }, { "inventory", new List<object>() }
        };
        await _db.Collection(StatsCol).Document(DocumentId).SetAsync(initial, SetOptions.Overwrite);
        return Ok(new { message = "Jiwa Hero telah dilahirkan kembali!" });
    }

    // ==========================================
    // 2. AI QUEST SYSTEM (THE VOID)
    // ==========================================

    [HttpGet("generate-quest-ai")]
    public async Task<IActionResult> GenerateQuestAI()
    {
        string? apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        if (string.IsNullOrEmpty(apiKey)) return GenerateQuestManual();

        string[] modelChain = { "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.1-flash-lite-preview" };

        var requestData = new {
            contents = new[] {
                new { parts = new[] { 
                    new { text = @"
                ROLEPLAY: Kamu adalah 'The Void', entitas tanpa wajah yang mengatur realitas digital dan mistis.
                TARGET: 'The Wanderer'.
                Tugas: Buat 1 Daily Quest pendek bertema IT-Eldritch (DevOps, Server, 3D Modeling, Glitch Art).
                
                STRICT RULES (BAHASA JEPANG):
                Jika memilih Bahasa Jepang (Prioritas 50%):
                - Gunakan Hiragana/Kanji asli.
                - WAJIB sertakan Romaji di bawahnya.
                - WAJIB sertakan Terjemahan Indonesia di paling bawah.
                Format task untuk Jepang: ""[Kanji/Kana]\n[Romaji]\n[Terjemahan]""

                RULES LAIN:
                1. GAYA BAHASA: Dingin, penuh teka-teki, dan bernuansa kehampaan (The Void).
                2. ITEM REWARD (30% Chance): 
                   - Buat item unik IT-Fantasy. Jika beruntung, sertakan objek item. Jika tidak, set 'item' menjadi null.
                
                OUTPUT FORMAT (JSON ONLY):
                { ""task"": ""isi quest"", ""exp"": 300, ""hp"": 10, ""mana"": 15,
                  ""item"": { ""name"": ""Nama"", ""desc"": ""Lore"", ""rarity"": ""Artifact"" } 
                }" } 
                }}
            }
        };

        var jsonRequest = JsonSerializer.Serialize(requestData);

        foreach (var modelName in modelChain)
        {
            try {
                string uri = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}";
                var response = await _httpClient.PostAsync(uri, new StringContent(jsonRequest, Encoding.UTF8, "application/json"));
                if (response.IsSuccessStatusCode) {
                    string resString = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(resString);
                    string? rawText = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                    if (!string.IsNullOrEmpty(rawText)) {
                        int start = rawText.IndexOf('{'); int end = rawText.LastIndexOf('}');
                        if (start != -1 && end != -1) return Content(rawText.Substring(start, end - start + 1), "application/json");
                    }
                }
            } catch { continue; }
        }
        return GenerateQuestManual();
    }

    [HttpPost("complete-quest")]
    public async Task<IActionResult> CompleteQuest([FromBody] QuestClaim claim)
    {
        try {
            DocumentReference profileRef = _db.Collection(StatsCol).Document(DocumentId);
            DocumentSnapshot snapshot = await profileRef.GetSnapshotAsync();
            if (!snapshot.Exists) return NotFound();

            var data = snapshot.ToDictionary();
            long level = Convert.ToInt64(data["level"]), hp = Convert.ToInt64(data["hp"]), currentExp = Convert.ToInt64(data["currentExp"]), nextLevelExp = Convert.ToInt64(data["nextLevelExp"]);
            long mana = data.ContainsKey("mana") ? Convert.ToInt64(data["mana"]) : 100L;

            long maxHp = 100 + (level * 20), maxMana = 100 + (level * 15);
            currentExp += claim.RewardExp;
            hp = Math.Min(maxHp, hp + claim.RewardHp);
            mana = Math.Min(maxMana, mana + (claim.RewardMana ?? 0));

            bool levelUp = false;
            if (currentExp >= nextLevelExp) {
                level++; currentExp = 0; nextLevelExp = (long)(nextLevelExp * 1.5); levelUp = true;
                maxHp = 100 + (level * 20); maxMana = 100 + (level * 15); hp = maxHp; mana = maxMana;
            }

            object? itemToSave = null;
            if (claim.ItemReward != null && !string.IsNullOrEmpty(claim.ItemReward.Name)) {
                itemToSave = new Dictionary<string, object> {
                    { "name", claim.ItemReward.Name }, { "desc", claim.ItemReward.Desc },
                    { "rarity", claim.ItemReward.Rarity }, { "obtainedAt", DateTime.Now.ToString("yyyy-MM-dd") }
                };
            }

            var updates = new Dictionary<string, object> {
                { "currentExp", currentExp }, { "nextLevelExp", nextLevelExp }, { "level", level },
                { "hp", hp }, { "mana", mana }, { "maxHp", maxHp }, { "maxMana", maxMana }
            };
            if (itemToSave != null) updates.Add("inventory", FieldValue.ArrayUnion(itemToSave));

            await profileRef.UpdateAsync(updates);
            return Ok(new { message = levelUp ? "LEVEL UP!" : "Quest Selesai!", level, levelUp });
        } catch (Exception ex) { return StatusCode(500, ex.Message); }
    }

    public IActionResult GenerateQuestManual() => Ok(new { task = "Fixing broken Docker pipes.", exp = 200, hp = 10, mana = 10 });

    // ==========================================
    // 3. GRIMOIRE SYSTEM (FOR ADMIN & TAB)
    // ==========================================

    [HttpGet("story")]
    public async Task<IActionResult> GetStories()
    {
        try {
            Query query = _db.Collection(StoryCol).OrderByDescending("CreatedAt");
            QuerySnapshot snap = await query.GetSnapshotAsync();
            var list = snap.Documents.Select(d => {
                var dict = d.ToDictionary(); dict["id"] = d.Id; return dict;
            }).ToList();
            return Ok(list);
        } catch (Exception ex) { return StatusCode(500, ex.Message); }
    }

    [HttpPost("story")]
    public async Task<IActionResult> AddStory([FromBody] StoryModel model)
    {
        try {
            var data = new Dictionary<string, object> {
                { "title", model.Title },
                { "excerpt", model.Excerpt },
                { "category", model.Category },
                { "rarity", model.Rarity }, // <-- Tambahkan ini agar tersimpan
                { "content", model.Content },
                { "date", DateTime.Now.ToString("MMMM yyyy") }, // <-- Tambahkan ini untuk info tanggal
                { "CreatedAt", Timestamp.GetCurrentTimestamp() }
            };
            await _db.Collection(StoryCol).AddAsync(data);
            return Ok(new { message = "Fragment Casted!" });
        } catch (Exception ex) { return StatusCode(500, ex.Message); }
    }

    [HttpPut("story/{id}")]
    public async Task<IActionResult> UpdateStory(string id, [FromBody] StoryModel model)
    {
        try {
            DocumentReference doc = _db.Collection(StoryCol).Document(id);
            var data = new Dictionary<string, object> {
                { "title", model.Title },
                { "excerpt", model.Excerpt },
                { "category", model.Category },
                { "rarity", model.Rarity }, // <-- Tambahkan ini agar saat edit bisa berubah warnanya
                { "content", model.Content }
            };
            await doc.UpdateAsync(data);
            return Ok(new { message = "Fragment Updated!" });
        } catch (Exception ex) { return StatusCode(500, ex.Message); }
    }

    [HttpDelete("story/{id}")]
    public async Task<IActionResult> DeleteStory(string id)
    {
        try 
        {
            DocumentReference doc = _db.Collection(StoryCol).Document(id);
            await doc.DeleteAsync();
            return Ok(new { message = "Fragment Destroyed!" });
        } 
        catch (Exception ex) 
        { 
            return StatusCode(500, ex.Message); 
        }
    }
    
    // ==========================================
    // MODELS
    // ==========================================

    public class QuestClaim {
        [JsonPropertyName("rewardExp")] public int RewardExp { get; set; }
        [JsonPropertyName("rewardHp")] public int RewardHp { get; set; }
        [JsonPropertyName("rewardMana")] public int? RewardMana { get; set; }
        [JsonPropertyName("itemReward")] public ItemRewardData? ItemReward { get; set; }
    }

    public class ItemRewardData {
        [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
        [JsonPropertyName("desc")] public string Desc { get; set; } = string.Empty;
        [JsonPropertyName("rarity")] public string Rarity { get; set; } = "Artifact";
    }
   
}
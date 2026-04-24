using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;

namespace agamemons_web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StoryController : ControllerBase
{
    private readonly FirestoreDb _db;
    private const string CollectionName = "grimoire"; // Sudah sesuai dengan Firebase

    public StoryController()
    {
        // Pastikan path firebase-key.json sudah benar di root project
        var credentialPath = Path.Combine(Directory.GetCurrentDirectory(), "firebase-key.json");
        if (System.IO.File.Exists(credentialPath))
        {
            Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credentialPath);
        }
        
        _db = FirestoreDb.Create("agamemons-portal");
    }
    
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            // Mengambil dokumen dan mengurutkan berdasarkan 'order' jika ada
            Query query = _db.Collection(CollectionName).OrderByDescending("date");
            QuerySnapshot snapshot = await query.GetSnapshotAsync();
        
            var list = snapshot.Documents.Select(doc =>
            {
                var data = doc.ToDictionary();
                return new StoryModel
                {
                    Id = doc.Id, // Mengambil ID dari tingkat dokumen (D2J2DWr...)
                    Title = data.GetValueOrDefault("title", "").ToString(),
                    Excerpt = data.GetValueOrDefault("excerpt", "").ToString(),
                    Content = data.GetValueOrDefault("content", "").ToString(),
                    Category = data.GetValueOrDefault("category", "LORE").ToString(),
                    Rarity = data.GetValueOrDefault("rarity", "Common").ToString(),
                    Date = data.GetValueOrDefault("date", "Unknown Date").ToString()
                };
            }).ToList();

            return Ok(list);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Portal Firebase Gagal!", message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> AddStory([FromBody] StoryModel newStory)
    {
        try
        {
            if (string.IsNullOrEmpty(newStory.Title)) return BadRequest("Title wajib diisi!");

            var data = new Dictionary<string, object>
            {
                { "title", newStory.Title },
                { "excerpt", newStory.Excerpt ?? "" },
                { "content", newStory.Content ?? "" },
                { "category", newStory.Category ?? "LORE" },
                { "rarity", newStory.Rarity ?? "Common" },
                { "date", string.IsNullOrEmpty(newStory.Date) ? DateTime.Now.ToString("dd MMMM yyyy") : newStory.Date },
                { "order", 1 } // Default order untuk sorting
            };

            DocumentReference docRef = await _db.Collection(CollectionName).AddAsync(data);
            return Ok(new { message = "Fragment successfully forged!", id = docRef.Id });
        }
        catch (Exception ex) { return StatusCode(500, $"Cloud Error: {ex.Message}"); }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateStory(string id, [FromBody] StoryModel updatedStory)
    {
        try
        {
            // PERBAIKAN: Masukkan semua field agar data Rarity/Date tidak terhapus saat update
            var data = new Dictionary<string, object>
            {
                { "title", updatedStory.Title },
                { "excerpt", updatedStory.Excerpt ?? "" },
                { "content", updatedStory.Content ?? "" },
                { "category", updatedStory.Category ?? "LORE" },
                { "rarity", updatedStory.Rarity ?? "Common" },
                { "date", updatedStory.Date ?? "Unknown Date" }
            };

            await _db.Collection(CollectionName).Document(id).UpdateAsync(data);
            return Ok(new { message = "Cloud Fragment updated!" });
        }
        catch (Exception ex) { return StatusCode(500, $"Cloud Error: {ex.Message}"); }
    }
}

// Helper Extension untuk mempermudah pembacaan data
public static class FirestoreExtension 
{
    public static object GetValueOrDefault(this IDictionary<string, object> dict, string key, object defaultValue)
    {
        return dict.ContainsKey(key) ? dict[key] ?? defaultValue : defaultValue;
    }
}
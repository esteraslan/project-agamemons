using Google.Cloud.Firestore;
using Google.Cloud.Firestore.V1;
using Microsoft.AspNetCore.Mvc;

namespace agamemons_web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StoryController : ControllerBase
{
    private readonly FirestoreDb _db;
    private const string CollectionName = "stories";

    public StoryController()
    {
        Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", Path.Combine(Directory.GetCurrentDirectory(), "firebase-key.json"));
        _db = FirestoreDb.Create("agamemons-portal");
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            QuerySnapshot snapshot = await _db.Collection(CollectionName).GetSnapshotAsync();
            
            var list = snapshot.Documents.Select(doc =>
            {
                var data = doc.ToDictionary();
                return new StoryModel
                {
                    Id = doc.Id,
                    Title = data.ContainsKey("title") ? data["title"]?.ToString() ?? "" : "",
                    Excerpt = data.ContainsKey("excerpt") ? data["excerpt"]?.ToString() ?? "" : "",
                    Content = data.ContainsKey("content") ? data["content"]?.ToString() ?? "" : "",
                    Category = data.ContainsKey("category") ? data["category"]?.ToString() ?? "LORE" : "LORE"
                };
            }).ToList();

            return Ok(list);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                error = "Portal Firebase Gagal!",
                message = ex.Message
            });
        }
    }

    [HttpPost]
    public async Task<IActionResult> AddStory([FromBody] StoryModel newStory)
    {
        try
        {
            if (newStory == null || string.IsNullOrEmpty(newStory.Title))
                return BadRequest("Data fragment tidak lengkap!");

            var data = new Dictionary<string, object>
            {
                { "title", newStory.Title },
                { "excerpt", newStory.Excerpt ?? "" },
                { "content", newStory.Content ?? "" },
                { "category", newStory.Category ?? "LORE" }
            };

            DocumentReference docRef = await _db.Collection(CollectionName).AddAsync(data);
            
            return Ok(new
            {
                message = "Fragment successfully forged in Cloud!",
                id = docRef.Id
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Cloud Error: {ex.Message}");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateStory(string id, [FromBody] StoryModel updatedStory)
    {
        try
        {
            var data = new Dictionary<string, object>
            {
                { "title", updatedStory.Title },
                { "excerpt", updatedStory.Excerpt ?? "" },
                { "content", updatedStory.Content ?? "" },
                { "category", updatedStory.Category ?? "LORE" }
            };

            await _db.Collection(CollectionName).Document(id).UpdateAsync(data);
            
            return Ok(new { message = "Cloud Fragment updated!" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Cloud Error: {ex.Message}");
        }
    }
}
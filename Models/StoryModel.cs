public class StoryModel
{
    // Id biasanya diisi dari DocumentId Firestore saat ditarik (GET)
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Excerpt { get; set; } = "";
    public string Content { get; set; } = "";
    public string Category { get; set; } = "LORE";
    
    // Properti Krusial untuk Warna (Emas/Biru)
    public string Rarity { get; set; } = "Common"; 
    
    // Properti Tambahan untuk Info Tanggal
    public string Date { get; set; } = DateTime.Now.ToString("MMMM yyyy");
}
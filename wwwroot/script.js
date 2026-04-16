/* =========================================
   1. GLOBAL DATABASE & STATE
   ========================================= */
const API_BASE = "http://localhost:8080/api/story";

// Data Statis Cadangan
const grimoireDatabase = [
    { id: 'kabut-hitam', title: 'Fragmen: Meniti Kabut Hitam', excerpt: 'Seorang Knight menantang kabut abadi...', category: 'Lore', content: `<p class="story-text">"Dunia ini tidak lagi mengenal cahaya matahari," bisik sang Knight...</p><p class="story-text">Di hadapannya, sebuah <strong>K8s Cluster</strong> raksasa sedang berdenyut di tengah kabut hitam.</p>` },
    { id: 'dunia-paralel', title: 'Fragmen: Gerbang Vmware', excerpt: 'Membuka portal antar dimensi server...', category: 'Tech', content: `<p class="story-text">Membuka portal antar dimensi server bukanlah perkara mudah bagi seorang Tech Knight.</p>` }
];

window.allStories = [...grimoireDatabase];
window.filteredStories = [...window.allStories];
let currentPage = 1;
const itemsPerPage = 10;

/* =========================================
   2. AUDIO ENGINE
   ========================================= */
function playClick() {
    const sfx = new Audio('audio/click.wav');
    sfx.play().catch(() => { }); // Catch agar tidak error jika interaksi belum ada
}

function toggleMusic() {
    const music = document.getElementById('bg-music');
    const status = document.getElementById('music-status');
    if (!music || !status) return;

    if (music.paused) {
        music.play().then(() => {
            status.innerText = "ON";
            status.style.color = "var(--accent)";
        }).catch(err => {
            alert("Klik area mana saja di halaman dulu, baru nyalakan musik.");
        });
    } else {
        music.pause();
        status.innerText = "OFF";
        status.style.color = "#fff";
    }
}

/* =========================================
   3. MYSTIC EVOLUTION & PROFILE SYNC
   ========================================= */
function getFantasyClass(level) {
    if (level <= 10) return "Script Novice";
    if (level <= 20) return "Terminal Acolyte";
    if (level <= 30) return "Scroll Custodian";
    if (level <= 40) return "Kernel Alchemist";
    if (level <= 50) return "Virtualization Warden";
    if (level <= 60) return "Container Warlock";
    if (level <= 70) return "Pipeline Druid";
    if (level <= 80) return "Cluster Archmage";
    if (level <= 90) return "Cloud Ascendant";
    return "DevTechOps Demi-God";
}

function fetchProfileStats() {
    fetch('api/profile')
        .then(r => r.json())
        .then(data => {
            const box = document.getElementById('game-stats-box');
            if (!box) return;

            const fantasyClass = getFantasyClass(data.level);
            const expPercent = (data.currentExp / data.nextLevelExp) * 100;

            // Ambil HP dari data Firebase (Pastikan di Firestore field 'hp' sudah ada)
            const hpValue = data.hp || 0;

            box.innerHTML = `
                <h3><i class="fas fa-scroll"></i> Mystic Profile</h3>
                <p><strong>Hero:</strong> ${data.heroName} | <strong>Level:</strong> ${data.level}</p>
                <p><strong>Class:</strong> <span class="fantasy-glow" style="color: var(--accent); font-weight: bold; text-shadow: 0 0 10px var(--accent);">${fantasyClass}</span></p>
                
                <p style="margin-top: 15px; font-size: 13px;"><strong>HP:</strong> ${hpValue} / 100</p>
                <div class="progress-bg"><div class="progress-fill hp" style="width: ${hpValue}%; background: #ff7b72; box-shadow: 0 0 10px rgba(255, 123, 114, 0.5);"></div></div>
 <p style="margin-top: 10px; font-size: 13px;"><strong>Mana:</strong> ${data.mana} / 100</p>
                <div class="progress-bg"><div class="progress-fill mana" style="width: ${data.mana}%"></div></div>
                <div class="stat-label" style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 10px;">
                    <span>EXP: ${data.currentExp} / ${data.nextLevelExp}</span>
                    <span>${Math.floor(expPercent)}%</span>
                </div>
                <div class="progress-bg"><div class="progress-fill exp" style="width: ${expPercent}%"></div></div>

               
            `;
        })
        .catch(err => console.log("Failed to summon profile stats:", err));
}

/* =========================================
   4. GRIMOIRE CORE (API & RENDERING)
   ========================================= */
async function loadGrimoire() {
    try {
        const response = await fetch(API_BASE);
        if (response.ok) {
            const apiData = await response.json();
            const apiIds = new Set(apiData.map(s => s.id));
            window.allStories = [...grimoireDatabase.filter(s => !apiIds.has(s.id)), ...apiData];
            window.filteredStories = [...window.allStories];
            renderStories();
        }
    } catch (err) {
        console.log("Portal Offline: Using Static Grimoire.");
    }
}

function renderStories() {
    const container = document.getElementById('story-container');
    if (!container) return;

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = window.filteredStories.slice(start, start + itemsPerPage);

    container.innerHTML = paginatedItems.map(s => `
           <div class="quest-item" onclick="readStory('${s.id || s.Id}')" style="cursor: pointer;">
               <div class="quest-info">
                   <strong>${s.title || s.Title || 'Tanpa Judul'}</strong>
                   <span>${s.excerpt || s.Excerpt || 'Tidak ada deskripsi...'}</span>
               </div>
               <div class="quest-status ongoing">${s.category || s.Category || 'LORE'}</div>
           </div>`).join('');

    const info = document.getElementById('page-info');
    if (info) {
        const total = Math.ceil(window.filteredStories.length / itemsPerPage);
        info.innerText = `Page ${currentPage} of ${total || 1}`;
    }
}

function readStory(id) {
    const story = window.allStories.find(s => (s.id === id || s.Id === id));
    if (!story) return;

    const content = story.content || story.Content || "";
    const pages = content.split('[NEXT]');

    window.changeStoryPage = (index) => {
        const contentContainer = document.getElementById('full-story-content');
        if (!contentContainer) return;

        contentContainer.innerHTML = `
               <h2 style="color: var(--accent); text-align: center; margin-bottom: 20px;">${story.title || story.Title}</h2>
               <div class="story-body">${pages[index]}</div>
               <div class="story-pagination" style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #30363d;">
                   ${index > 0 ? `<button class="ambient-btn" onclick="window.changeStoryPage(${index - 1})">← Prev</button>` : ''}
                   <span style="font-size: 13px; color: #8b949e;">Halaman ${index + 1} dari ${pages.length}</span>
                   ${index < pages.length - 1 ? `<button class="ambient-btn" onclick="window.changeStoryPage(${index + 1})">Next →</button>` : ''}
               </div>`;
    };

    document.getElementById('story-list').style.display = 'none';
    document.getElementById('story-reader').style.display = 'block';

    setTimeout(() => {
        const editBtn = document.getElementById('quick-edit-btn');
        if (editBtn) {
            editBtn.onclick = () => { window.location.href = `admin.html?edit=${id}`; };
        }
    }, 50);

    window.changeStoryPage(0);
    window.scrollTo(0, 0);
}

/* =========================================
   5. NAVIGATION & UTILITIES
   ========================================= */
function openTab(evt, tabName) {
    document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    const target = document.getElementById(tabName);
    if (target) target.style.display = "block";
    if (evt) evt.currentTarget.classList.add("active");
    if (tabName !== 'story') backToStoryList();
}

function backToStoryList() {
    const list = document.getElementById('story-list');
    const reader = document.getElementById('story-reader');
    if (list) list.style.display = 'block';
    if (reader) reader.style.display = 'none';
}

function showStatus(msg) {
    const t = document.getElementById('status-toast');
    if (t) {
        t.innerText = msg;
        t.style.display = 'block';
        // Hilangkan otomatis setelah 3 detik
        setTimeout(() => {
            t.style.display = 'none';
        }, 3000);
    } else {
        // Jika elemen toast tidak ada, pakai alert biasa biar tidak error
        console.log("Notif: " + msg);
    }
}

/* =========================================
   QUEST SYSTEM ENGINE
   ========================================= */
function completeDailyQuest(exp, hpReward) {
    playClick();

    // Sembunyikan card quest agar terasa seperti "hilang"
    const questCard = document.querySelector('.daily-quest-card');
    questCard.style.opacity = '0.5';
    questCard.style.pointerEvents = 'none';

    fetch('api/profile/complete-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardExp: exp, rewardHp: hpReward })
    })
        .then(res => res.json())
        .then(data => {
            showStatus(data.message);
            fetchProfileStats(); // Refresh Stats

            // Panggil Quest Baru dari "AI" Backend
            summonNewQuest();
        });
}

function summonNewQuest() {
    const questCard = document.querySelector('.daily-quest-card');
    const btn = questCard.querySelector('button');
    const textEl = document.getElementById('daily-quest-text');
    const rewardEl = document.querySelector('.quest-reward');

    // Efek loading
    questCard.style.opacity = '0.5';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Summoning...';

    fetch('api/profile/generate-quest-ai')
        .then(r => r.json())
        .then(quest => {
            // 1. Update Teks Quest & Reward
            textEl.innerText = `"${quest.task}"`;
            rewardEl.innerText = `+${quest.exp} XP / +${quest.hp} HP`;

            // 2. RE-BINDING: Pasang ulang fungsi klik ke tombol
            // Kita gunakan properti onclick secara langsung agar menimpa yang lama
            btn.onclick = function () {
                completeDailyQuest(quest.exp, quest.hp);
            };

            // 3. Kembalikan tampilan
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Mark as Completed';
            questCard.style.opacity = '1';
        })
        .catch(err => {
            console.error("Gagal ritual summon:", err);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo"></i> Retry Summon';
            questCard.style.opacity = '1';
        });
}

function resetHeroStats() {
    if (confirm("Yakin ingin mengulang ritual dari awal (Level 1)?")) {
        fetch('api/profile/reset-stats', { method: 'POST' })
            .then(() => {
                showStatus("Stats Reset!");
                fetchProfileStats();
            });
    }
}
/* =========================================
   6. INITIALIZATION
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
    // Sync Profile & Grimoire
    fetchProfileStats();
    loadGrimoire();

    // Global Click SFX
    document.addEventListener('click', (e) => {
        if (e.target.closest('.tab-btn, .ambient-btn, .quest-item, button')) {
            playClick();
        }
    });

    // Terminal Init
    const termInput = document.getElementById('term-input');
    if (termInput) {
        termInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                termInput.value = '';
            }
        });
    }
});
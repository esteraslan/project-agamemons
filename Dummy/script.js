/* =========================================
   1. GLOBAL DATABASE & STATE
   ========================================= */
const API_BASE = "http://localhost:8080/api/story";

// Data Statis Cadangan (Jika API Offline)
const grimoireDatabase = [
    { id: 'kabut-hitam', title: 'Fragmen: Meniti Kabut Hitam', excerpt: 'Seorang Knight menantang kabut abadi...', category: 'Lore', content: `<p class="story-text">"Dunia ini tidak lagi mengenal cahaya matahari," bisik sang Knight...</p><p class="story-text">Di hadapannya, sebuah <strong>K8s Cluster</strong> raksasa sedang berdenyut di tengah kabut hitam.</p><blockquote class="story-quote">"Satu kesalahan konfigurasi, dan seluruh dunia akan kehilangan datanya."</blockquote><p class="story-text">Ia menarik nafas, lalu mengetikkan mantra terakhir: <code>kubectl apply -f salvation.yaml</code>.</p>` },
    { id: 'dunia-paralel', title: 'Fragmen: Gerbang Vmware', excerpt: 'Membuka portal antar dimensi server...', category: 'Tech', content: `<p class="story-text">Membuka portal antar dimensi server bukanlah perkara mudah bagi seorang Tech Knight.</p>` },
    { id: 'shadow-code', title: 'Fragmen: Shadow Code', excerpt: 'Mantra terlarang C# yang menghancurkan bug...', category: 'Dark Fantasy', content: `<p class="story-text">Mantra terlarang C# yang mampu menghancurkan bug paling ganas sekalipun di dalam kernel.</p>` }
];

let allStories = [...grimoireDatabase];
let filteredStories = [...allStories];
let currentPage = 1;
const itemsPerPage = 2;

/* =========================================
   2. CORE ENGINES (API & DATA SYNC)
   ========================================= */

// Mengambil data Stats HP/Mana dari Docker Backend
function fetchGameStats() {
    fetch('api/game-stats')
        .then(r => r.json())
        .then(data => {
            const box = document.getElementById('game-stats-box');
            if (box) {
                box.innerHTML = `
                    <h3>Character Stats (Live)</h3>
                    <p><strong>Hero:</strong> ${data.character} | <strong>Level:</strong> ${data.level}</p>
                    <p><strong>Class:</strong> ${data.class || 'DevTechOps Knight'}</p>
                    <p><strong>HP:</strong> <span style="color: #ff7b72">${data.hp}</span> / 100</p>
                    <div class="progress-bg"><div class="progress-fill hp" style="width: ${data.hp}%"></div></div>
                    <p><strong>Mana:</strong> <span style="color: #58a6ff">${data.mana}</span> / 100</p>
                    <div class="progress-bg"><div class="progress-fill mana" style="width: ${data.mana}%"></div></div>`;
                showStatus("Stats Synced!");
            }
        }).catch(() => console.log("Stats API Offline"));
}

// Mengambil data Cerita dari Docker Backend
async function loadGrimoire() {
    try {
        const response = await fetch(API_BASE);
        if (response.ok) {
            const apiData = await response.json();
            const apiIds = new Set(apiData.map(s => s.id));
            // Gabungkan data unik dari API dengan data statis cadangan
            allStories = [...grimoireDatabase.filter(s => !apiIds.has(s.id)), ...apiData];
            showStatus("Grimoire Synced!");
        }
    } catch (err) {
        console.log("Portal Offline: Using Static Grimoire.");
    } finally {
        filteredStories = [...allStories];
        renderStories();
    }
}

/* =========================================
   3. RENDERING & UI LOGIC
   ========================================= */

function renderStories() {
    const container = document.getElementById('story-container');
    if (!container) return;

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredStories.slice(start, start + itemsPerPage);

    container.innerHTML = paginatedItems.map(s => `
        <div class="quest-item" onclick="readStory('${s.id}')" style="cursor: pointer;">
            <div class="quest-info">
                <strong>${s.title}</strong>
                <span>${s.excerpt}</span>
            </div>
            <div class="quest-status ongoing">${s.category || 'LORE'}</div>
        </div>`).join('');

    updatePaginationInfo();
}

function readStory(id) {
    const story = allStories.find(s => s.id === id);
    if (story) {
        // 1. Pecah Konten [NEXT]
        const pages = story.content.split('[NEXT]');

        // 2. Definisi Render Halaman
        window.changeStoryPage = (index) => {
            const contentContainer = document.getElementById('full-story-content');
            if (!contentContainer) return;

            contentContainer.innerHTML = `
                <h2 style="color: var(--accent); text-align: center; margin-bottom: 20px;">${story.title}</h2>
                <div class="story-body">${pages[index]}</div>
                <div class="story-pagination" style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #30363d;">
                    ${index > 0 ? `<button class="ambient-btn" onclick="window.changeStoryPage(${index - 1})">← Prev</button>` : ''}
                    <span style="font-size: 13px; color: #8b949e;">Halaman ${index + 1} dari ${pages.length}</span>
                    ${index < pages.length - 1 ? `<button class="ambient-btn" onclick="window.changeStoryPage(${index + 1})">Next →</button>` : ''}
                </div>`;
        };

        // 3. Tampilkan Container Reader Terlebih Dahulu
        document.getElementById('story-list').style.display = 'none';
        document.getElementById('story-reader').style.display = 'block';

        // 4. BINDING TOMBOL EDIT (Setelah Reader tampil)
        // Kita beri sedikit delay agar DOM benar-benar ter-update
        setTimeout(() => {
            const editBtn = document.getElementById('quick-edit-btn');
            if (editBtn) {
                // Pastikan listener bersih sebelum dipasang
                editBtn.onclick = null;
                editBtn.onclick = (e) => {
                    e.preventDefault();
                    console.log("Portal Admin Terbuka untuk ID:", id);
                    window.location.href = `admin.html?edit=${id}`;
                };
            } else {
                console.error("Mantra Gagal: Tombol quick-edit-btn tidak ditemukan di DOM!");
            }
        }, 50); // Delay 50ms sudah cukup untuk browser bernafas

        // 5. Render halaman pertama & Scroll ke atas
        window.changeStoryPage(0);
        window.scrollTo(0, 0);
    }
}

/* =========================================
   4. NAVIGATION & SEARCH
   ========================================= */

function openTab(evt, tabName) {
    document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));

    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";
    if (evt) evt.currentTarget.classList.add("active");

    if (tabName !== 'story') backToStoryList();
}

function filterStories() {
    const query = document.getElementById('story-search').value.toLowerCase();
    filteredStories = allStories.filter(s =>
        s.title.toLowerCase().includes(query) || s.excerpt.toLowerCase().includes(query)
    );
    currentPage = 1;
    renderStories();
}

function updatePaginationInfo() {
    const totalPages = Math.ceil(filteredStories.length / itemsPerPage);
    const info = document.getElementById('page-info');
    if (info) info.innerText = `Page ${currentPage} of ${totalPages || 1}`;
}

function nextPage() {
    if (currentPage * itemsPerPage < filteredStories.length) {
        currentPage++;
        renderStories();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderStories();
    }
}

function backToStoryList() {
    document.getElementById('story-list').style.display = 'block';
    document.getElementById('story-reader').style.display = 'none';
}

/* =========================================
   5. UTILITIES (Terminal & Quests)
   ========================================= */

function initTerminal() {
    const termInput = document.getElementById('term-input');
    if (!termInput) return;
    termInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const cmd = this.value.toLowerCase().trim();
            const body = document.getElementById('terminal-body');
            let response = (cmd === 'help') ? "Available: about, level, clear, secret, sudo" :
                (cmd === 'about') ? "IT Specialist & DevOps Explorer." :
                    (cmd === 'level') ? "Current Level: 10 (DevTechOps Knight)" :
                        (cmd === 'sudo') ? "Access Denied: You are not Agamemons." :
                            `Command not found: ${cmd}`;

            const newLine = document.createElement('p');
            newLine.className = 'term-text';
            newLine.innerHTML = `<span class="prompt">>></span> ${cmd}<br>${response}`;
            body.insertBefore(newLine, termInput.parentElement);
            this.value = '';
            body.scrollTop = body.scrollHeight;
        }
    });
}

function initDailyQuest() {
    const randomQuests = ["Compile the ancient C# Runeblade.", "Secure the K8s perimeter.", "Fix 5 broken containers."];
    const el = document.getElementById('daily-quest-text');
    if (el) el.innerText = `"${randomQuests[Math.floor(Math.random() * randomQuests.length)]}"`;
}

function showStatus(msg) {
    const t = document.getElementById('status-toast');
    if (t) {
        t.innerText = msg; t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 3000);
    }
}

/* =========================================
   6. INITIALIZATION (On Load)
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
    // Set Beranda Aktif secara visual
    const homeBtn = document.querySelector('.tab-btn');
    if (homeBtn) homeBtn.classList.add("active");

    // Jalankan semua engine
    fetchGameStats()// Contoh di fungsi fetchGameStats
        .catch(() => {
            console.log("Portal Offline: Tampilan statis diaktifkan.");
            // Biarkan HP/Mana diisi angka manual khusus untuk versi web statis
            const box = document.getElementById('game-stats-box');
            if (box) {
                box.innerHTML = `<h3>Character Stats (Preview)</h3>...`;
            }
        });;
    loadGrimoire();
    initTerminal();
    initDailyQuest();
});
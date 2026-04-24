"use strict";

/* ============================================================
   1. GLOBAL STATE & CONSTANTS
   ============================================================ */
const ITEMS_PER_PAGE = 4;
let   currentPage    = 1;

window.allStories      = [];
window.filteredStories = [];

const grimoireDatabase = [
    {
        id:       "static-1",
        title:    "Fragmen: Meniti Kabut Hitam",
        excerpt:  "Seorang Knight menantang kabut abadi...",
        category: "LORE",
        rarity:   "Common",
        date:     "Unknown Date",
        content:  `<p class="story-text">"Dunia ini tidak lagi mengenal cahaya matahari," bisik sang Knight...</p>
                   <p class="story-text">Di hadapannya, sebuah <strong>K8s Cluster</strong> raksasa sedang berdenyut di tengah kabut hitam.</p>`
    },
    {
        id:       "static-2",
        title:    "Fragmen: Gerbang Vmware",
        excerpt:  "Membuka portal antar dimensi server...",
        category: "TECH",
        rarity:   "Common",
        date:     "Unknown Date",
        content:  `<p class="story-text">Membuka portal antar dimensi server bukanlah perkara mudah bagi seorang Tech Knight.</p>`
    }
];

const activityLogs = [
    { date: '2026-04-19', msg: 'Gemini-3.1-Flash integrated as Core Quest Summoner.' },
    { date: '2026-04-18', msg: 'Ritual of Reset: Success. Soul data synchronized.' },
    { date: '2026-04-17', msg: 'Portal Grimoire upgraded with Local API.' }
];

let typewriterInterval   = null;
let currentStoryChapters = [];
let currentChapterIndex  = 0;


/* ============================================================
   2. TERMINAL ENGINE
   ============================================================ */

/**
 * Appends a styled log line to the terminal body.
 * Supports tags: [SYSTEM], [REWARD], [STATS], [INFO]
 */
function writeToTerminal(message) {
    const termBody = document.getElementById('terminal-body');
    if (!termBody) return;

    const line = document.createElement('div');
    line.className          = 'term-line';
    line.style.marginBottom = '4px';
    line.innerHTML = message
        .replace('[SYSTEM]', '<span style="color:#00ff00;font-weight:bold;">[SYSTEM]</span>')
        .replace('[REWARD]', '<span style="color:#ffcc00;font-weight:bold;">[REWARD]</span>')
        .replace('[STATS]',  '<span style="color:#00ccff;font-weight:bold;">[STATS]</span>')
        .replace('[INFO]',   '<span style="color:#aaaaaa;">[INFO]</span>');

    termBody.appendChild(line);
    termBody.scrollTop = termBody.scrollHeight;
}


/* ============================================================
   3. AUDIO ENGINE
   ============================================================ */

function playClick() {
    const sfx = new Audio('audio/click.wav');
    sfx.play().catch(() => {});
}

function toggleMusic() {
    const music  = document.getElementById('bg-music');
    const status = document.getElementById('music-status');
    if (!music || !status) return;

    if (music.paused) {
        music.play()
            .then(() => {
                status.innerText   = 'ON';
                status.style.color = 'var(--accent)';
                writeToTerminal('[INFO] Ambient music initiated.');
            })
            .catch(() => {
                alert('Klik area mana saja di halaman dulu, baru nyalakan musik.');
            });
    } else {
        music.pause();
        status.innerText   = 'OFF';
        status.style.color = '#fff';
        writeToTerminal('[INFO] Ambient music silenced.');
    }
}


/* ============================================================
   4. PROFILE & STATS
   ============================================================ */

/**
 * Maps a level number to a fantasy class object { name, color, icon }.
 */
function getClassData(level) {
    const classes = [
        { min: 0,   max: 10,  name: 'Script Novice',         color: '#8b949e', icon: 'fa-baby' },
        { min: 11,  max: 20,  name: 'Terminal Acolyte',      color: '#58a6ff', icon: 'fa-terminal' },
        { min: 21,  max: 30,  name: 'Scroll Custodian',      color: '#3fb950', icon: 'fa-scroll' },
        { min: 31,  max: 40,  name: 'Kernel Alchemist',      color: '#d29922', icon: 'fa-flask' },
        { min: 41,  max: 50,  name: 'Virtualization Warden', color: '#a371f7', icon: 'fa-server' },
        { min: 51,  max: 60,  name: 'Container Warlock',     color: '#f778ba', icon: 'fa-box-open' },
        { min: 61,  max: 70,  name: 'Pipeline Druid',        color: '#ffa657', icon: 'fa-infinity' },
        { min: 71,  max: 80,  name: 'Cluster Archmage',      color: '#79c0ff', icon: 'fa-dharmachakra' },
        { min: 81,  max: 90,  name: 'Cloud Ascendant',       color: '#ff7b72', icon: 'fa-cloud-upload-alt' },
        { min: 91,  max: 999, name: 'DevTechOps Demi-God',   color: '#f0883e', icon: 'fa-shiva' }
    ];
    return classes.find(c => level >= c.min && level <= c.max) || classes[0];
}

/**
 * Fetches profile data and updates all stat UI elements.
 * @param {boolean} showLoading - Triggers visual summoning effect when true.
 */
function fetchProfileStats(showLoading = false) {
    const loadingEl = document.getElementById('stats-loading');
    const contentEl = document.getElementById('stats-content');
    const box       = document.getElementById('game-stats-box');

    if (showLoading) {
        if (loadingEl) loadingEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
    }

    fetch('api/profile')
        .then(r => { if (!r.ok) throw new Error('Network error'); return r.json(); })
        .then(data => {
            setTimeout(() => {
                if (loadingEl) loadingEl.style.display = 'none';
                if (contentEl) contentEl.style.display = 'flex';

                const classData   = getClassData(data.level);
                const maxHp       = data.maxHp   || 100;
                const maxMana     = data.maxMana  || 100;
                const hpPercent   = (data.hp         / maxHp)             * 100;
                const manaPercent = (data.mana        / maxMana)           * 100;
                const expPercent  = (data.currentExp  / data.nextLevelExp) * 100;

                // Sync About tab
                const aboutExpBar = document.getElementById('about-exp-bar');
                const aboutClass  = document.getElementById('about-class');
                if (aboutExpBar) aboutExpBar.style.width = expPercent + '%';
                if (aboutClass)  aboutClass.innerText    = classData.name;

                // Render stats box
                if (box) {
                    box.innerHTML = `
                        <h3><i class="fas fa-scroll"></i> Mystic Profile</h3>
                        <p><strong>Hero:</strong> ${data.heroName} | <strong>Level:</strong> ${data.level}</p>
                        <p><strong>Class:</strong>
                            <span class="fantasy-glow" style="color:${classData.color};font-weight:bold;text-shadow:0 0 10px ${classData.color};">
                                <i class="fas ${classData.icon}"></i> ${classData.name}
                            </span>
                        </p>

                        <p style="margin-top:15px;font-size:13px;"><strong>HP:</strong> <span id="hp-val">0</span> / ${maxHp}</p>
                        <div class="progress-bg"><div class="progress-fill hp" style="width:${hpPercent}%;"></div></div>

                        <p style="margin-top:10px;font-size:13px;"><strong>Mana:</strong> <span id="mana-val">0</span> / ${maxMana}</p>
                        <div class="progress-bg"><div class="progress-fill mana" style="width:${manaPercent}%;"></div></div>

                        <div class="stat-label" style="display:flex;justify-content:space-between;font-size:11px;margin-top:10px;">
                            <span>EXP: <span id="exp-val">0</span> / ${data.nextLevelExp}</span>
                            <span><span id="exp-percent-val">0</span>%</span>
                        </div>
                        <div class="progress-bg"><div class="progress-fill exp" style="width:${expPercent}%;"></div></div>
                    `;

                    // Run counter animations after innerHTML is set
                    animateValue('hp-val',          0, data.hp,           1500);
                    animateValue('mana-val',         0, data.mana,         1500);
                    animateValue('exp-val',          0, data.currentExp,   1500);
                    animateValue('exp-percent-val',  0, Math.floor(expPercent), 1500);
                }

                renderInventory(data.inventory);
            }, 500);
        })
        .catch(err => {
            console.error('Critical Sync Error:', err);
            writeToTerminal('[SYSTEM] Critical Error: Unable to sync soul data from cloud.');
            if (loadingEl) loadingEl.innerHTML = "<span style='color:red;'>Link Severed.</span>";
        });
}

function resetHeroStats() {
    if (!confirm('Yakin ingin mengulang ritual dari awal (Level 1)?')) return;

    fetch('/api/profile/reset-stats', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => {
            if (res.ok) {
                writeToTerminal('[SYSTEM] Character Wiped. Starting new cycle...');
                showStatus('Stats Reset!');
                fetchProfileStats();
            } else {
                writeToTerminal('[SYSTEM] Error: Ritual Reset failed at the altar.');
            }
        })
        .catch(err => console.error('Fetch Error:', err));
}


/* ============================================================
   5. GRIMOIRE (STORY) ENGINE
   ============================================================ */

/**
 * Merges static fallback with API data (deduped by ID), then renders.
 */
async function loadGrimoire() {
    try {
        const response = await fetch('/api/profile/story');
        const apiData  = response.ok ? await response.json() : [];
        const apiIds   = new Set(apiData.map(s => s.id || s.Id));

        window.allStories      = [...grimoireDatabase.filter(s => !apiIds.has(s.id)), ...apiData];
        window.filteredStories = [...window.allStories];

        writeToTerminal('[SYSTEM] Grimoire Berhasil Disinkronkan dengan Void.');
        renderStories();
    } catch (err) {
        console.error('Gagal load API, menggunakan data statis saja:', err);
        window.allStories      = [...grimoireDatabase];
        window.filteredStories = [...window.allStories];
        renderStories();
    }
}

/**
 * Renders the current page of stories into #story-container.
 */
function renderStories() {
    const container = document.getElementById('story-container');
    const info      = document.getElementById('page-info');
    if (!container) return;

    const stories = window.filteredStories || [];

    if (stories.length === 0) {
        container.innerHTML = "<p style='text-align:center;color:#8b949e;padding:20px;'>Mencari fragmen di dalam Void...</p>";
        if (info) info.innerText = 'Page 1 of 1';
        return;
    }

    const start     = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = stories.slice(start, start + ITEMS_PER_PAGE);

    container.innerHTML = paginated.map(s => {
        const id        = s.id       || s.Id;
        const title     = s.title    || s.Title    || 'Tanpa Judul';
        const excerpt   = s.excerpt  || s.Excerpt  || 'Tidak ada deskripsi...';
        const category  = s.category || s.Category || 'LORE';
        const date      = s.date     || s.Date     || 'April 2026';
        const rawRarity = (s.rarity  || s.Rarity   || 'common').toString().toLowerCase().trim();

        let titleColor  = '#58a6ff';
        let rarityClass = '';
        if (rawRarity === 'mythic')   { titleColor = '#e3b341'; rarityClass = 'rarity-legendary'; }
        if (rawRarity === 'artifact') { titleColor = '#a371f7'; rarityClass = 'rarity-artifact';  }

        return `
<div class="quest-item ${rarityClass}" onclick="readStory('${id}')" style="cursor:pointer;margin-bottom:12px;">
    <div class="quest-info">
        <strong style="color:${titleColor};font-family:'Cinzel',serif;font-size:15px;">
            <i class="fas fa-scroll"></i> ${title}
        </strong>
        <span style="font-size:10px;color:#8b949e;display:block;margin-top:4px;font-family:'Courier New',monospace;">
            ${date} | <span style="color:${titleColor};font-weight:bold;">Rarity: ${rawRarity.toUpperCase()}</span>
        </span>
        <p style="margin:10px 0 0 0;font-size:12.5px;font-style:italic;color:#acb6c0;line-height:1.5;border-left:2px solid ${titleColor};padding-left:10px;">
            "${excerpt}"
        </p>
    </div>
    <div class="quest-status category" style="font-size:9px;border:1px solid ${titleColor};padding:4px 10px;border-radius:4px;color:${titleColor};background:rgba(0,0,0,0.2);font-weight:bold;">
        ${category}
    </div>
</div>`;
    }).join('');

    if (info) {
        const total = Math.ceil(stories.length / ITEMS_PER_PAGE);
        info.innerText = `Page ${currentPage} of ${total || 1}`;
    }
}

/**
 * Strips HTML tags and returns plain text.
 */
function stripHtml(html) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * Opens the Archive View for a given story ID.
 */
function readStory(id) {
    const story = (window.allStories || []).find(s => s.id === id || s.Id === id);
    if (!story) return;

    writeToTerminal(`[SYSTEM] Accessing Archive: ${story.title || story.Title}`);

    // Toggle views
    const storyListArea = document.getElementById('story-list');
    const storyReader   = document.getElementById('story-reader');
    if (storyListArea) storyListArea.style.display = 'none';
    if (storyReader)   storyReader.style.display   = 'block';

    // Populate archive header
    document.getElementById('archive-title').innerText = story.title || story.Title;

    // Use stripped HTML for synopsis preview
    const rawContent   = story.content || story.Content || '';
    const cleanExcerpt = stripHtml(rawContent).substring(0, 160) + '...';
    document.getElementById('archive-synopsis').innerText = cleanExcerpt;

    const categoryEl = document.getElementById('stat-category');
    if (categoryEl) categoryEl.innerText = story.category || story.Category || 'LORE';

    const dateText = document.getElementById('archive-date');
    if (dateText) dateText.innerText = `Sync Date: ${story.date || story.Date || 'Unknown'}`;

    // Split chapters — flexible regex handles spaces/newlines around [NEXT]
    currentStoryChapters = rawContent.split(/\[\s*NEXT\s*\]/i);

    const statChapters = document.getElementById('stat-chapters');
    if (statChapters) statChapters.innerText = currentStoryChapters.length;

    // Stripped preview of first chapter
    const previewEl = document.getElementById('archive-preview');
    if (previewEl && currentStoryChapters.length > 0) {
        previewEl.innerText = stripHtml(currentStoryChapters[0]).substring(0, 180) + '...';
    }

    // Rarity color
    const rar   = (story.rarity || story.Rarity || 'common').toLowerCase().trim();
    const color = rar === 'mythic' ? '#e3b341' : (rar === 'artifact' ? '#a371f7' : '#58a6ff');

    const badge = document.getElementById('archive-rarity-badge');
    if (badge) {
        badge.innerText         = rar.toUpperCase();
        badge.style.borderColor = color;
        badge.style.color       = color;
    }

    const totemIcon = document.querySelector('.totem-icon');
    if (totemIcon) totemIcon.style.color = color;

    // Build chapter grid
    const grid = document.getElementById('chapter-grid');
    if (grid) {
        grid.innerHTML = currentStoryChapters.map((c, i) => `
            <div class="chapter-card" onclick="openChapter(${i})"
                 style="background:rgba(255,255,255,0.03);border:1px solid #30363d;padding:15px;text-align:center;cursor:pointer;transition:0.3s;border-radius:8px;">
                <span style="font-size:10px;color:#8b949e;display:block;margin-bottom:5px;font-family:'Courier New',monospace;">FRAG</span>
                <strong style="color:${color};font-family:'Cinzel',serif;font-size:18px;">${i + 1}</strong>
            </div>
        `).join('');
    }

    // Edit button
    const editBtn = document.getElementById('quick-edit-btn');
    if (editBtn) editBtn.onclick = () => window.location.href = `admin.html?edit=${id}`;

    toggleArchiveTab('synopsis');
    window.scrollTo(0, 0);
}

/**
 * Re-renders the chapter grid (used when Index tab is opened).
 */
function renderChapterGrid() {
    const grid = document.getElementById('chapter-grid');
    if (!grid || currentStoryChapters.length === 0) return;

    grid.innerHTML = currentStoryChapters.map((c, i) => `
        <div class="chapter-card" onclick="openChapter(${i})">
            <small style="display:block;color:#8b949e;font-size:10px;margin-bottom:5px;font-family:'Courier New';">FRAGMENT</small>
            <strong style="font-family:'Cinzel';font-size:18px;color:var(--accent);">${i + 1}</strong>
        </div>
    `).join('');
}

/**
 * Toggles between Synopsis and Index tabs in the Archive View.
 */
function toggleArchiveTab(tab) {
    const syn    = document.getElementById('tab-synopsis');
    const idx    = document.getElementById('tab-index');
    const btnSyn = document.getElementById('btn-synopsis');
    const btnIdx = document.getElementById('btn-index');
    if (!syn || !idx || !btnSyn || !btnIdx) return;

    if (tab === 'synopsis') {
        syn.style.display = 'block'; idx.style.display = 'none';
        btnSyn.classList.add('active');    btnIdx.classList.remove('active');
    } else {
        syn.style.display = 'none';  idx.style.display = 'block';
        btnSyn.classList.remove('active'); btnIdx.classList.add('active');
        renderChapterGrid();
    }
}

/**
 * Opens the full-screen text reader overlay for a chapter.
 */
function openChapter(index) {
    currentChapterIndex = index;

    const overlay       = document.getElementById('text-reader-overlay');
    const contentTarget = document.getElementById('actual-content');
    const indicator     = document.getElementById('reader-page-indicator');
    const footer        = document.getElementById('reader-footer');

    if (!overlay || !contentTarget) return;

    // Show overlay
    overlay.style.display        = 'block';
    //document.body.style.overflow = 'hidden';

    // Stop any running typewriter
    if (typewriterInterval) clearInterval(typewriterInterval);

    // Render chapter content as HTML
    contentTarget.innerHTML     = currentStoryChapters[index].trim();
    contentTarget.style.opacity = '1';
    contentTarget.style.display = 'block';

    // Update indicator
    if (indicator) {
        indicator.innerText = `FRAGMENT PART: ${index + 1} OF ${currentStoryChapters.length}`;
    }

    // Navigation buttons
    if (footer) {
        footer.innerHTML = `
            ${index > 0
                ? `<button class="ritual-btn" onclick="openChapter(${index - 1})">← Previous</button>`
                : ''}
            <button class="ritual-btn" onclick="closeTextReader()" style="border-color:#ff7b72;color:#ff7b72;">Close</button>
            ${index < currentStoryChapters.length - 1
                ? `<button class="ritual-btn" onclick="openChapter(${index + 1})">Next Part →</button>`
                : ''}
        `;
    }

    overlay.scrollTo(0, 0);
}

function closeTextReader() {
    const overlay = document.getElementById('text-reader-overlay');
    if (overlay) {
        overlay.style.display        = 'none';
        document.body.style.overflow = 'auto';
    }
    if (typewriterInterval) clearInterval(typewriterInterval);
}

function backToStoryList() {
    const storyList   = document.getElementById('story-list');
    const storyReader = document.getElementById('story-reader');
    if (storyList)   storyList.style.display   = 'block';
    if (storyReader) storyReader.style.display = 'none';
    window.scrollTo(0, 0);
}

// --- Pagination & Search ---

function nextPage() {
    const total = Math.ceil((window.filteredStories || []).length / ITEMS_PER_PAGE);
    if (currentPage < total) {
        currentPage++;
        renderStories();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        writeToTerminal(`[INFO] Advancing to page ${currentPage}...`);
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderStories();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        writeToTerminal(`[INFO] Returning to page ${currentPage}...`);
    }
}

function filterStories() {
    const term = document.getElementById('story-search').value.toLowerCase();
    window.filteredStories = (window.allStories || []).filter(s => {
        const title   = (s.title   || s.Title   || '').toLowerCase();
        const excerpt = (s.excerpt || s.Excerpt || '').toLowerCase();
        return title.includes(term) || excerpt.includes(term);
    });
    currentPage = 1;
    renderStories();
}


/* ============================================================
   6. QUEST SYSTEM
   ============================================================ */

/**
 * Submits the current daily quest as completed and triggers rewards.
 */
function completeDailyQuest(exp, hpReward, manaReward, itemName = null, itemDesc = null) {
    playClick();

    const questTextEl = document.getElementById('daily-quest-text');
    const questText   = questTextEl ? questTextEl.innerText : 'Daily Quest Completed';
    const questCard   = document.querySelector('.daily-quest-card');

    // Log to activity feed
    activityLogs.unshift({
        date: new Date().toISOString().split('T')[0],
        msg:  `[QUEST] Completed: "${questText}". Rewards synced.`
    });
    if (activityLogs.length > 5) activityLogs.pop();
    renderActivityLogs();

    // Lock UI
    if (questCard) { questCard.style.opacity = '0.5'; questCard.style.pointerEvents = 'none'; }

    const requestBody = {
        rewardExp:  parseInt(exp)        || 0,
        rewardHp:   parseInt(hpReward)   || 0,
        rewardMana: parseInt(manaReward) || 0
    };
    if (itemName && itemName !== 'null') requestBody.itemReward = { name: itemName, desc: itemDesc };

    fetch('api/profile/complete-quest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(requestBody)
    })
        .then(res => { if (!res.ok) throw new Error('Server issues'); return res.json(); })
        .then(() => {
            showQuestToast(questText, exp);
            addQuestToLog(questText);
            writeToTerminal(`[REWARD] Quest Completed: ${questText}`);
            if (itemName && itemName !== 'null') {
                writeToTerminal(`[REWARD] Artifact Found: <span style="color:var(--accent);font-weight:bold;">[${itemName}]</span>`);
            }
            writeToTerminal(`[STATS] +${exp} EXP, +${hpReward} HP, & +${manaReward} Mana.`);
            writeToTerminal('[SYSTEM] Quest data uploaded. Re-syncing soul...');
            fetchProfileStats(true);
            summonNewQuest();
        })
        .catch(err => {
            console.error('Error Detail:', err);
            writeToTerminal('[SYSTEM] Error: Connection lost during ritual completion.');
            if (questCard) { questCard.style.opacity = '1'; questCard.style.pointerEvents = 'auto'; }
        });
}

/**
 * Fetches a new AI-generated quest and updates the daily quest card.
 */
function summonNewQuest() {
    const questCard = document.querySelector('.daily-quest-card');
    const btn       = questCard.querySelector('button');
    const textEl    = document.getElementById('daily-quest-text');
    const rewardEl  = document.querySelector('.quest-reward');

    questCard.style.opacity       = '0.5';
    btn.disabled                  = true;
    btn.innerHTML                 = '<i class="fas fa-spinner fa-spin"></i> Summoning AI...';

    fetch('api/profile/generate-quest-ai')
        .then(r => r.json())
        .then(quest => {
            writeToTerminal('[SYSTEM] Connecting to Gemini-3.1-Flash... Connected.');
            writeToTerminal(`[SYSTEM] New Quest: "${quest.task.substring(0, 45)}..."`);

            // Store or clear item attributes
            if (quest.item) {
                btn.setAttribute('data-item-name', quest.item.name);
                btn.setAttribute('data-item-desc', quest.item.desc);
            } else {
                btn.removeAttribute('data-item-name');
                btn.removeAttribute('data-item-desc');
            }

            const randomMana = Math.floor(Math.random() * 15) + 5;
            btn.setAttribute('data-xp',   quest.exp  || 0);
            btn.setAttribute('data-hp',   quest.hp   || 0);
            btn.setAttribute('data-mana', randomMana);

            const itemText     = quest.item ? ` / Item: ${quest.item.name}` : '';
            rewardEl.innerText = `+${quest.exp} XP / +${quest.hp} HP / +${randomMana} MP${itemText}`;

            textEl.style.whiteSpace = 'pre-line';
            textEl.innerText        = `"${quest.task}"`;

            btn.onclick = function () {
                completeDailyQuest(
                    this.getAttribute('data-xp'),
                    this.getAttribute('data-hp'),
                    this.getAttribute('data-mana'),
                    this.getAttribute('data-item-name'),
                    this.getAttribute('data-item-desc')
                );
            };

            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Mark as Completed';

            questCard.style.opacity       = '1';
            questCard.style.pointerEvents = 'auto';
        })
        .catch(err => {
            console.error('Summon Error:', err);
            writeToTerminal('[SYSTEM] Summoning failed. Gemini is in high demand.');
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-redo"></i> Retry Summon';

            questCard.style.opacity       = '1';
            questCard.style.pointerEvents = 'auto';
        });
}

/**
 * Shows an RPG-style toast notification in the bottom-right corner.
 */
function showQuestToast(title, exp) {
    const toast = document.createElement('div');
    toast.className = 'quest-toast';
    toast.innerHTML = `
        <div class="toast-header"><i class="fas fa-medal"></i> QUEST COMPLETED!</div>
        <div class="toast-body">${title}</div>
        <div class="toast-reward">+${exp} XP Gained</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

/**
 * Prepends a completed quest entry to #quest-completed-list.
 */
function addQuestToLog(title) {
    const logDisplay = document.getElementById('quest-completed-list');
    if (!logDisplay) { console.warn('[SYSTEM] Element #quest-completed-list missing.'); return; }

    if (logDisplay.innerText.includes('History quest akan muncul')) logDisplay.innerHTML = '';

    const entry            = document.createElement('div');
    entry.className        = 'quest-card done';
    entry.style.marginBottom = '12px';
    entry.innerHTML = `
        <div class="quest-header">
            <span class="quest-title"><i class="fas fa-check-circle" style="color:#2ea043;"></i> ${title}</span>
            <span style="font-size:10px;color:#8b949e;">${new Date().toLocaleDateString('id-ID')}</span>
        </div>
    `;
    logDisplay.prepend(entry);
}

/**
 * Syncs animated progress bars in the Quest Log tab.
 */
function syncQuestLog() {
    const updates = [
        { id: 'q1', val: 1, reward: 500 },
        { id: 'q2', val: 1, reward: 300 },
        { id: 'q3', val: 1, label: 'Efficiency' }
    ];

    updates.forEach(q => {
        const bar  = document.getElementById(`${q.id}-progress`);
        const meta = document.getElementById(`${q.id}-meta`);
        if (!bar || !meta) return;

        bar.style.width = '0%';

        let current   = 0;
        const step    = q.val / (1500 / 16);
        const counter = setInterval(() => {
            current += step;
            if (current >= q.val) { current = q.val; clearInterval(counter); }
            meta.innerText = q.label
                ? `${q.label}: ${Math.floor(current)}% | Status: Stable`
                : `Progress: ${Math.floor(current)}% | Reward: +${q.reward} XP`;
        }, 16);

        setTimeout(() => {
            bar.style.transition = 'width 1.5s cubic-bezier(0.1, 0.5, 0.1, 1)';
            bar.style.width      = q.val + '%';
        }, 50);
    });
}


/* ============================================================
   7. INVENTORY
   ============================================================ */

/**
 * Returns icon and color based on item name keywords.
 */
function getArtifactVisual(itemName) {
    const name = (itemName || '').toLowerCase();
    if (name.includes('docker')     || name.includes('container') || name.includes('image'))     return { icon: 'fa-box-open',         color: '#2496ed' };
    if (name.includes('kubernetes') || name.includes('k8s')       || name.includes('cluster'))   return { icon: 'fa-dharmachakra',     color: '#326ce5' };
    if (name.includes('ssd')        || name.includes('disk')      || name.includes('ram')        || name.includes('memory'))   return { icon: 'fa-microchip',        color: '#f0883e' };
    if (name.includes('gpu')        || name.includes('render')    || name.includes('nvidia')     || name.includes('obsidian')) return { icon: 'fa-gem',              color: '#ff7b72' };
    if (name.includes('void')       || name.includes('cursed')    || name.includes('abyssal')    || name.includes('shadow'))   return { icon: 'fa-skull-crossbones', color: '#a371f7' };
    if (name.includes('key')        || name.includes('access')    || name.includes('root')       || name.includes('amulet'))   return { icon: 'fa-key',              color: '#ffcc00' };
    return { icon: 'fa-microchip', color: 'var(--accent)' };
}

/**
 * Renders the inventory grid into #inventory-container.
 */
function renderInventory(items) {
    const container = document.getElementById('inventory-container');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:#8b949e;border:1px dashed rgba(88,166,255,0.2);border-radius:12px;">
                <i class="fas fa-box-open" style="font-size:48px;margin-bottom:15px;opacity:0.5;"></i>
                <p style="font-size:13px;font-style:italic;">No artifacts found in the void yet...</p>
                <p style="font-size:11px;margin-top:5px;">Complete AI Quests to gather sacred loot.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        let name, desc;
        if (typeof item === 'object' && item !== null) {
            name = item.name || item.Name || 'Unknown Artifact';
            desc = item.desc || item.Desc || 'A mysterious object from the server depths.';
        } else {
            name = item;
            desc = 'A legacy artifact recovered from the old archives.';
        }
        const visual = getArtifactVisual(name);
        return `
            <div class="inventory-item" title="${desc}">
                <i class="fas ${visual.icon}" style="color:${visual.color};filter:drop-shadow(0 0 8px ${visual.color}66);"></i>
                <span>${name}</span>
            </div>
        `;
    }).join('');
}


/* ============================================================
   8. ACTIVITY LOG
   ============================================================ */

/**
 * Renders activityLogs array into #updates-container.
 */
function renderActivityLogs() {
    const container = document.getElementById('updates-container');
    if (!container) { console.warn('Target #updates-container tidak ditemukan!'); return; }

    container.innerHTML = activityLogs.map(log => `
        <div class="update-item" style="border-left:2px solid var(--accent);padding-left:15px;margin-bottom:15px;animation:fadeInLeft 0.5s ease;">
            <span style="font-size:10px;color:#8b949e;">${log.date}</span>
            <p style="margin:5px 0;font-size:13px;color:#acb6c0;">${log.msg}</p>
        </div>
    `).join('');
}


/* ============================================================
   9. NAVIGATION
   ============================================================ */

/**
 * Switches the visible tab and fires tab-specific side-effects.
 */
function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(tabName);
    if (target) {
        target.style.display   = 'block';
        target.style.animation = 'fadeInUp 0.4s ease forwards';
    }

    if (evt?.currentTarget) evt.currentTarget.classList.add('active');
    writeToTerminal(`[INFO] Navigating to ${tabName.toUpperCase()}...`);

    if (tabName === 'quests') syncQuestLog();
    if (tabName === 'story')  renderStories();
    if (tabName === 'home') {
        // Reset bars then re-fill with animation
        document.querySelectorAll('.progress-fill').forEach(bar => bar.style.width = '0%');
        fetchProfileStats();
    } else {
        backToStoryList();
    }
}

/**
 * Shows a brief status toast in the top-left corner.
 */
function showStatus(msg) {
    const t = document.getElementById('status-toast');
    if (!t) return;
    t.innerText     = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
}


/* ============================================================
   10. INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    // Boot sequence
    syncQuestLog();
    fetchProfileStats();
    loadGrimoire();
    renderActivityLogs();

    // Terminal greeting
    writeToTerminal('[INFO] Agamemons OS v2.6.0-stable initialized.');
    writeToTerminal('[INFO] Environment: Docker Container [Agamemons_LINK]');
    writeToTerminal('[INFO] System: Firestore & Gemini AI Link Active.');

    // Global click SFX
    document.addEventListener('click', e => {
        if (e.target.closest('.tab-btn, .ambient-btn, .quest-item, button')) playClick();
    });

    // Build version string from today's date
    const now       = new Date();
    const version   = now.getFullYear()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0');
    const versionEl = document.getElementById('sys-version');
    if (versionEl) versionEl.innerText = version;
});


/* ============================================================
   11. ANIMATION ENGINE
   ============================================================ */

/**
 * Animates a numeric counter from start to end over duration ms.
 * @param {string} id        - Element ID to update
 * @param {number} start     - Start value
 * @param {number} end       - End value
 * @param {number} duration  - Duration in milliseconds
 */
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;

        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerText  = Math.floor(progress * (end - start) + start);

        if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}
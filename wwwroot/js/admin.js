let editingId = null;
const API_URL = '/api/profile/story';

// 1. Fungsi Load Daftar Fragment
async function loadAdminList() {
    try {
        const res = await fetch(API_URL);
        let stories = await res.json();
        const container = document.getElementById('admin-story-list');
        if (!container) return;

        if (!Array.isArray(stories)) {
            stories = stories.data || stories.value || [];
        }

        if (stories.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 30px; border: 1px dashed #30363d; border-radius: 8px;">
                <p style="color: #8b949e; font-size: 13px;">The Grimoire is empty.</p>
            </div>`;
            return;
        }

        container.innerHTML = stories.map(s => {
            const id = s.id || s.Id || s._id;
            const title = s.title || s.Title || 'Untitled';
            const cat = s.category || s.Category || 'LORE';
            const rar = s.rarity || s.Rarity || 'Common';

            const rarColor = rar.toLowerCase() === 'mythic' ? '#e3b341' : (rar.toLowerCase() === 'artifact' ? '#a371f7' : '#58a6ff');

            return `
            <div class="edit-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(22, 27, 34, 0.5); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #30363d;">
                <div class="item-info">
                    <span class="item-title" style="display: block; font-weight: bold; color: #adbac7; font-size: 14px;">${title}</span>
                    <span style="color: var(--accent); font-size: 10px; text-transform: uppercase;">
                        <i class="fas fa-tag"></i> ${cat}
                    </span>
                    <span style="color: ${rarColor}; font-size: 10px; text-transform: uppercase; margin-left: 10px; font-weight: bold;">
                        <i class="fas fa-gem"></i> ${rar}
                    </span>
                </div>
                <div class="item-actions" style="display: flex; gap: 8px;">
                    <button class="btn-edit-small" onclick="prepareEdit('${id}')" style="background: rgba(35, 134, 54, 0.2); color: #3fb950; border: 1px solid rgba(46, 160, 67, 0.4); padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-pen-nib"></i>
                    </button>
                    <button class="btn-delete-small" onclick="deleteStory('${id}')" style="background: rgba(248, 81, 73, 0.1); color: #f85149; border: 1px solid rgba(248, 81, 73, 0.4); padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error("Gagal memuat daftar:", err);
    }
}

// 2. Fungsi Ambil Data ke Form (Mode Edit)
async function prepareEdit(id) {
    try {
        const res = await fetch(API_URL);
        const stories = await res.json();
        const story = stories.find(s => (s.id || s.Id) === id);

        if (story) {
            editingId = id;
            document.getElementById('title').value = story.title || story.Title || "";
            document.getElementById('excerpt').value = story.excerpt || story.Excerpt || "";
            document.getElementById('category').value = story.category || story.Category || "LORE";
            document.getElementById('rarity').value = story.rarity || story.Rarity || "Common";
            document.getElementById('content').value = story.content || story.Content || "";

            document.getElementById('editor-title').innerHTML = '<i class="fas fa-pen-nib"></i> Edit Fragment';
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Fragment';
            submitBtn.classList.add('update-mode');
            document.getElementById('cancelBtn').style.display = 'inline-block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (err) { console.error("Ritual pengambilan data gagal:", err); }
}

// 3. Fungsi Hapus
async function deleteStory(id) {
    // Pengganti confirm() bawaan browser
    Swal.fire({
        title: 'Destroy Fragment?',
        text: "This lore will be lost in the digital void forever!",
        icon: 'warning',
        showCancelButton: true,
        background: '#161b22', // Warna dark sesuai tema kamu
        color: '#adbac7',
        confirmButtonColor: '#f85149',
        cancelButtonColor: '#30363d',
        confirmButtonText: 'Yes, Erase it!',
        cancelButtonText: 'Keep it',
        backdrop: `rgba(0,0,0,0.8)`
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

                if (res.ok) {
                    Swal.fire({
                        title: 'Erased!',
                        text: 'The fragment has been returned to the void.',
                        icon: 'success',
                        background: '#161b22',
                        color: '#adbac7',
                        confirmButtonColor: '#58a6ff'
                    });
                    loadAdminList();
                } else {
                    Swal.fire('Error', 'The Void refused the destruction.', 'error');
                }
            } catch (err) {
                Swal.fire('Error', 'Portal Connection Error.', 'error');
            }
        }
    });
}

// 4. Reset Form
function resetForm() {
    editingId = null;
    document.getElementById('adminStoryForm').reset();
    document.getElementById('editor-title').innerHTML = '<i class="fas fa-scroll"></i> Grimoire Editor';
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<i class="fas fa-wand-sparkles"></i> Cast Fragment';
    submitBtn.classList.remove('update-mode');
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('msg-status').style.display = 'none';
}

// 5. Handle Submit (Update & Create)
// Pindahkan Event Listener ke dalam DOMContentLoaded agar lebih aman
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminStoryForm');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const msg = document.getElementById('msg-status');

            const data = {
                Title: document.getElementById('title').value,
                Excerpt: document.getElementById('excerpt').value,
                Category: document.getElementById('category').value,
                Rarity: document.getElementById('rarity').value,
                Content: document.getElementById('content').value
            };

            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `${API_URL}/${editingId}` : API_URL;

            btn.disabled = true;
            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                // --- UBAH BAGIAN INI ---
                if (res.ok) {
                    // Notifikasi Popup yang Lebih Menarik
                    Swal.fire({
                        icon: 'success',
                        title: editingId ? 'Fragment Updated' : 'Fragment Casted',
                        text: 'The Grimoire has been synchronized with the void.',
                        background: '#161b22',
                        color: '#adbac7',
                        showConfirmButton: false,
                        timer: 1500
                    });

                    // Teks status di bawah tombol (opsional, tetap dipertahankan agar UI tidak kosong)
                    msg.style.display = 'block';
                    msg.className = 'success';
                    msg.innerHTML = '<i class="fas fa-check-circle"></i> Sync Success.';

                    if (editingId) setTimeout(resetForm, 1500); else resetForm();
                    loadAdminList();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Ritual Failed',
                        text: 'The Void refused to sync your data.',
                        background: '#161b22',
                        color: '#adbac7'
                    });
                }
                // -----------------------

            } catch (err) {
                msg.style.display = 'block';
                msg.className = 'error';
                msg.innerText = "Connection lost to the Void.";
            } finally { btn.disabled = false; }
        });
    }

    // --- INISIALISASI & PENANGKAP URL ---
    loadAdminList().then(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const directEditId = urlParams.get('edit');

        if (directEditId) {
            setTimeout(() => {
                prepareEdit(directEditId);
            }, 400);
        }
    });
});
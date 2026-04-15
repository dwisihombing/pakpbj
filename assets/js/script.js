/**
 * SCRIPT.JS - PROYEK PAK PBJ BPS 2026
 * Fitur: Security API, Multi-language, Theme Support, GForm Style Entry
 */

// 1. DATA PENGGUNA & KONFIGURASI API
const userData = JSON.parse(sessionStorage.getItem('userData')) || { role: 'User', name: 'Guest', email: '', picture: '' };
const API_URL = "https://script.google.com/macros/s/AKfycbysA8l0_2ooZ2DxYdvmOQH9W2MvfuqvynPI_ExvaE6RtMXbU3NPdKuTrQUdrhaqxu8u/exec";

// 2. STATE APLIKASI
let state = {
    role: sessionStorage.getItem('activeRole') || userData.role,
    lang: localStorage.getItem('lang') || 'id',
    theme: localStorage.getItem('theme') || 'light'
};

let cachedProfileData = null; // Penyimpanan data agar loading cepat
let allUsersData = []; // Cache daftar semua user (untuk admin)
let viewingEmail = userData.email; // Email user yang sedang dilihat profilnya
let viewingName = userData.name;   // Nama user yang sedang dilihat profilnya

// 3. KAMUS BAHASA (i18n)
const i18n = {
    id: { 
        nav_dash: "Beranda", nav_profile: "Profil", nav_analitik: "Analitik", nav_pengguna: "Pengguna", nav_set: "Pengaturan", nav_entry: "Usulan AK",
        sub_pak: "Data pribadi", sub_training: "Pelatihan dan Ujikom", sub_experience: "Pengalaman", 
        welcome: "Selamat Datang", loading: "Memuat data...", dev_mode: "Fitur masih dalam pengembangan", btn_save: "Simpan"
    },
    en: { 
        nav_dash: "Home", nav_profile: "Profile", nav_analitik: "Analytics", nav_pengguna: "Users", nav_set: "Settings", nav_entry: "Usulan AK",
        sub_pak: "Personal Details", sub_training: "Training & Competence", sub_experience: "Experience", 
        welcome: "Welcome", loading: "Fetching data...", dev_mode: "Under development", btn_save: "Save"
    }
};

const t = (k) => i18n[state.lang][k] || k;

// 4. KONFIGURASI KOLOM GOOGLE SHEET (Mapping Index)
const customProfileFields = {
    pak: [
        { idx: 1, label: "Nama Lengkap" },
        { idx: 3, label: "NIP" },
        { idx: 4, label: "Nomor Karpeg" },
        { idx: 5, label: "Golongan" },
        { idx: 6, label: "Pangkat" },
        { idx: 12, label: "Unit Kerja"},
        { idx: 13, label: "Jabatan Fungsional" },
        { idx: 14, label: "Status" },
        { idx: 19, label: "Pengangkatan" },
        { idx: 20, label: "Tahun PJL / Penerimaan" },
        { idx: 21, label: "TMT Jabatan" },
        { idx: 22, label: "Tanggal Pelantikan" }
    ],
    training: [
        { section: "Penjenjangan Pertama", fields: [{ idx: 23, label: "Pelatihan" }, { idx: 24, label: "Hasil" }] },
        { section: "Penjenjangan Muda", fields: [{ idx: 25, label: "Pelatihan" }, { idx: 26, label: "Ujikom" }, { idx: 27, label: "Hasil" }] },
        { section: "Penjenjangan Madya", fields: [{ idx: 28, label: "Pelatihan" }, { idx: 29, label: "Ujikom" }, { idx: 30, label: "Hasil" }] }
    ],
    experience: [
        { section: "Paket Konstruksi 2022-2024", fields: [{ idx: 23, label: "Seleksi" }, { idx: 24, label: "Tender" }, { idx: 25, label: "Pendampingan" }] },
        { section: "Portofolio", fields: [{ idx: 26, label: "Portofolio Madya JK" }] }
    ]
};

// 5. INISIALISASI SAAT START
document.addEventListener('DOMContentLoaded', () => {
    // Cek Sidebar Collapsed State
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed && window.innerWidth >= 992) {
        document.body.classList.add('collapsed-sidebar');
        updateToggleIcon(true);
    }

    initApp();
    setupEntryForm();
});

function initApp() {
    applyTheme();
    renderSidebar();
    
    document.getElementById('welcomeText').innerText = `${t('welcome')}, ${userData.name}! 👋`;
    document.getElementById('topRoleBadge').innerText = state.role;
    document.getElementById('topRoleBadge').className = `badge-role ${state.role === 'Admin' ? 'admin-pill' : 'user-pill'}`;
    document.getElementById('langTop').value = state.lang;
    
    if (userData.picture) document.getElementById('userPic').src = userData.picture;
    if (state.role === 'Admin') {
        const rs = document.getElementById('roleSelect');
        if(rs) rs.value = state.role;
        fetchUsersToTable(); 
    }
    
    showPage('dashboard');
    checkSimulationStatus();

    // Pre-fetch Data Profil di Background
    if (!cachedProfileData) {
        fetch(`${API_URL}?action=getProfile&email=${viewingEmail}`)
            .then(res => res.json())
            .then(result => { 
                if (result.status === "success") {
                    cachedProfileData = result.data;
                    renderDashboardCards(); // Update card setelah data masuk
                }
            });
    }
}

// 6. SIDEBAR & NAVIGATION
function renderSidebar() {
    const menu = document.getElementById('sidebarMenu');
    const isAdmin = state.role === 'Admin';
    
    const adminProfileSelector = isAdmin ? `
        <div class="px-3 pb-2" id="profileSelectorWrap">
            <label class="small text-muted fw-bold" style="font-size:10px; letter-spacing:0.5px;">LIHAT PROFIL</label>
            <select id="adminUserSelector" class="form-select form-select-sm mt-1" onchange="adminSwitchUser(this.value)" style="font-size:12px; border-radius:8px;">
                <option value="">-- Memuat daftar... --</option>
            </select>
        </div>
    ` : '';

    menu.innerHTML = `
        <a class="nav-link" id="nav-dashboard" onclick="showPage('dashboard')"><i class="bi bi-house-door-fill"></i> <span>${t('nav_dash')}</span></a>
        
        <div class="nav-item">
            <a class="nav-link d-flex align-items-center" id="nav-profile" onclick="toggleSub('subProfil')">
                <i class="bi bi-person-circle"></i> <span>${t('nav_profile')}</span><i class="bi bi-chevron-down ms-auto small"></i>
            </a>
            <div id="subProfil" class="submenu shadow-sm" style="display:none">
                ${adminProfileSelector}
                <a href="javascript:void(0)" id="sub-pak" onclick="loadProfileData('pak')">${t('sub_pak')}</a>
                <a href="javascript:void(0)" id="sub-training" onclick="loadProfileData('training')">${t('sub_training')}</a>
                <a href="javascript:void(0)" id="sub-experience" onclick="loadProfileData('experience')">${t('sub_experience')}</a>
            </div>
        </div>

        <a class="nav-link" id="nav-entry" onclick="showPage('entry')"><i class="bi bi-plus-circle-fill"></i> <span>${t('nav_entry')}</span></a>

        ${isAdmin ? `
            <a class="nav-link" id="nav-analitik" onclick="showAnalitikDev()"><i class="bi bi-bar-chart-fill"></i> <span>${t('nav_analitik')}</span></a>
            <a class="nav-link" id="nav-pengguna" onclick="showPage('pengguna')"><i class="bi bi-people-fill"></i> <span>${t('nav_pengguna')}</span></a>
            <a class="nav-link" id="nav-pengaturan" onclick="showPage('pengaturan')"><i class="bi bi-gear-fill"></i> <span>${t('nav_set')}</span></a>
        ` : ''}
    `;

    // Jika Admin, langsung populate dropdown user
    if (isAdmin) {
        populateAdminUserSelector();
    }
}

// 6b. ADMIN: POPULATE USER SELECTOR & SWITCH USER
async function populateAdminUserSelector() {
    const sel = document.getElementById('adminUserSelector');
    if (!sel) return;

    // Gunakan cache jika sudah ada
    if (allUsersData.length > 0) {
        buildUserSelectorOptions(sel);
        return;
    }

    try {
        const res = await fetch(`${API_URL}?action=getAllUsers`);
        const result = await res.json();
        if (result.data && result.data.length > 1) {
            const headers = result.data[0];
            const namaIdx = headers.indexOf('Nama');
            const emailIdx = headers.indexOf('Email');
            allUsersData = result.data.slice(1).map(r => ({ nama: r[namaIdx], email: r[emailIdx] }));
        }
    } catch (e) {
        sel.innerHTML = `<option value="">Gagal memuat</option>`;
        return;
    }
    buildUserSelectorOptions(sel);
}

function buildUserSelectorOptions(sel) {
    sel.innerHTML = allUsersData.map(u =>
        `<option value="${u.email}" ${u.email === viewingEmail ? 'selected' : ''}>${u.nama}</option>`
    ).join('');
}

function adminSwitchUser(email) {
    const user = allUsersData.find(u => u.email === email);
    if (!user) return;
    viewingEmail = email;
    viewingName = user.nama;
    cachedProfileData = null; // Reset cache agar data user baru dimuat ulang
    
    // Jika profil sedang ditampilkan, refresh tampilan
    const profilePage = document.getElementById('page-profile');
    if (profilePage && profilePage.style.display !== 'none') {
        // Cek sub menu mana yang aktif
        const activeSub = document.querySelector('.submenu a.active');
        const activeType = activeSub ? activeSub.id.replace('sub-', '') : 'pak';
        loadProfileData(activeType);
    }
}

// 7. DATA RENDERING (PROFILE)
async function loadProfileData(type) {
    showPage('profile');
    const area = document.getElementById('profileDetailArea');
    
    // UI Feedback
    document.querySelectorAll('.submenu a').forEach(a => a.classList.remove('active'));
    document.getElementById(`sub-${type}`)?.classList.add('active');
    document.getElementById('nav-profile').classList.add('active');

    if (!cachedProfileData) {
        area.innerHTML = `<div class="p-5 text-center"><div class="spinner-border text-primary"></div><p class="mt-2">${t('loading')}</p></div>`;
        const res = await fetch(`${API_URL}?action=getProfile&email=${viewingEmail}`);
        const result = await res.json();
        if (result.status === "success") cachedProfileData = result.data;
        else { area.innerHTML = `<div class="alert alert-warning">Data tidak ditemukan.</div>`; return; }
    }
    renderProfileUI(type);
}

function renderProfileUI(type) {
    const area = document.getElementById('profileDetailArea');
    const specificData = cachedProfileData[type]; 
    const d = (specificData && specificData.values) ? specificData.values : [];
    const fieldsToShow = customProfileFields[type] || [];

    let labelExtra = type === 'training' ? `<div class="p-3 border-bottom"><h6 class="fw-800 mb-0"><i class="bi bi-award-fill me-2 text-success"></i>Keikutsertaan Pelatihan dan Uji Kompetensi</h6></div>` : "";

    let html = `
        <div class="card border-0 shadow-sm overflow-hidden mb-4" style="border-radius:20px;">
            <div class="card-header bg-primary text-white p-4 border-0">
                <h5 class="mb-0 fw-bold text-uppercase">${t('sub_' + type)}</h5>
                <small class="opacity-75">${viewingName}</small>
            </div>
            <div class="card-body p-0">${labelExtra}<div class="list-group list-group-flush">`;

    fieldsToShow.forEach(item => {
        if (item.section) {
            html += `<div class="bg-light p-2 px-3 fw-bold small text-primary border-bottom border-top" style="letter-spacing:1px; font-size: 11px;">
                        <i class="bi bi-layers-fill me-1"></i> ${item.section.toUpperCase()}
                     </div>`;
            item.fields.forEach(f => { html += renderRow(f.label, d[f.idx]); });
        } else {
            html += renderRow(item.label, d[item.idx]);
        }
    });

    area.innerHTML = html + `</div></div></div><p class="text-center text-muted small">Update: 2026</p>`;
}

function renderRow(label, value) {
    // Fungsi pembantu untuk mengubah format tanggal di dalam baris
    const formatTanggal = (val) => {
        if (!val || val === '-') return '-';

        // Deteksi apakah value adalah format tanggal ISO (seperti 2023-11-26T17:00...)
        const isDate = typeof val === 'string' && val.includes('T') && val.includes(':') && !isNaN(Date.parse(val));

        if (isDate) {
            const d = new Date(val);
            // Menggunakan format Indonesia (dd MMMM yyyy)
            return d.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
        return val; // Kembalikan nilai asli jika bukan tanggal
    };

    const cleanValue = formatTanggal(value);

    return `<div class="list-group-item p-3 border-light border-0 border-bottom">
                <div class="row align-items-center">
                    <div class="col-5 text-muted fw-bold text-uppercase" style="font-size:13px; letter-spacing: 0.5px;">
                        ${label}
                    </div>
                    <div class="col-7 fw-bold" style="font-size:15px; color: var(--text-main)!important;">
                        ${cleanValue}
                    </div>
                </div>
            </div>`;
}

// 8. FORM USULAN AK LOGIC
function setupEntryForm() {
    const form = document.getElementById('entryForm');
    const inputNama = document.getElementById('entNama');
    if(inputNama) inputNama.value = userData.name;

    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitForm');
            const statusDiv = document.getElementById('entStatus');

            const dataToSubmit = [
                new Date().toLocaleString('id-ID'), 
                userData.email,
                userData.name,
                document.getElementById('entNip').value,
                document.querySelector('input[name="entUbahPangkat"]:checked').value,
                document.querySelector('input[name="entAdaAk"]:checked').value,
                document.getElementById('entPredikat').value,
                document.getElementById('entLinkFile').value
            ];

            btn.disabled = true;
            btn.innerHTML = 'Processing...';

            try {
                const encodedData = encodeURIComponent(JSON.stringify(dataToSubmit));
                const res = await fetch(`${API_URL}?action=addEntry&sheet=Usulan+AK&data=${encodedData}`);
                const result = await res.json();

                if (result.status === "success") {
                    statusDiv.innerHTML = `<div class="card border-0 shadow-sm p-5 text-center mt-3"><i class="bi bi-check-circle-fill fs-1 text-success mb-3"></i><h4>Sukses!</h4><p>Jawaban Anda telah direkam.</p><button onclick="location.reload()" class="btn btn-primary btn-sm px-4">Kirim Lainnya</button></div>`;
                    form.style.display = 'none';
                }
            } catch (err) { alert("Error koneksi."); }
            finally { btn.disabled = false; btn.innerHTML = 'Submit'; }
        });
    }
}

// 9. SIDEBAR TOGGLE & CORE UTILS
function handleSidebarToggle() {
    const body = document.body;
    if (window.innerWidth < 992) {
        body.classList.toggle('sidebar-open');
    } else {
        body.classList.toggle('collapsed-sidebar');
        const isCollapsed = body.classList.contains('collapsed-sidebar');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        updateToggleIcon(isCollapsed);
    }
}

function updateToggleIcon(isCollapsed) {
    const icon = document.querySelector('.btn-toggle-custom i');
    if(icon) icon.className = isCollapsed ? 'bi bi-list fs-3' : 'bi bi-text-indent-left fs-3';
}

function showPage(id) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`page-${id}`);
    if(target) target.style.display = 'block';

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${id}`);
    if(activeNav) activeNav.classList.add('active');

    // TAMBAHKAN INI: Jika yang dibuka adalah halaman entry, jalankan auto-fill
    if (id === 'entry') {
        autoFillUsulanForm();
    }

    // Jika dashboard dibuka, render card data AK
    if (id === 'dashboard') {
        if (cachedProfileData) renderDashboardCards();
    }

    if(window.innerWidth < 992) document.body.classList.remove('sidebar-open');
}

function toggleSub(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function applyTheme() { document.body.classList.toggle('dark', state.theme === 'dark'); }
function toggleTheme() { 
    state.theme = state.theme === 'light' ? 'dark' : 'light'; 
    localStorage.setItem('theme', state.theme); 
    applyTheme(); 
}
function changeLang(v) { localStorage.setItem('lang', v); location.reload(); }
function logout() { sessionStorage.clear(); window.location.href = 'login.html'; }
function saveAdminSettings() { sessionStorage.setItem('activeRole', document.getElementById('roleSelect').value); location.reload(); }

function checkSimulationStatus() {
    const btnBack = document.getElementById('btnBackToAdmin');
    if (userData.role === 'Admin' && state.role === 'User') btnBack.style.display = 'inline-block';
    else if (btnBack) btnBack.style.display = 'none';
}
function backToAdmin() { sessionStorage.setItem('activeRole', 'Admin'); location.reload(); }

async function fetchUsersToTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    try {
        const res = await fetch(`${API_URL}?action=getAllUsers`);
        const result = await res.json();
        const h = result.data[0];
        tbody.innerHTML = result.data.slice(1).map(r => `<tr><td><b>${r[h.indexOf('Nama')]}</b></td><td>${r[h.indexOf('Email')]}</td><td><span class="badge-role ${r[h.indexOf('Role')] === 'Admin' ? 'admin-pill' : 'user-pill'}">${r[h.indexOf('Role')]}</span></td></tr>`).join('');
    } catch (e) { }
}

// DASHBOARD CARDS — isi dari cachedProfileData jika tersedia
function renderDashboardCards() {
    // Mapping field indices (sesuaikan dengan kolom Google Sheet Anda)
    // Contoh mapping — update idx sesuai kolom aktual di sheet
    const dashFields = {
        'dash-ak-pengangkatan':  { sheet: 'pak', idx: 30 },
        'dash-ak-dasar':         { sheet: 'pak', idx: 31 },
        'dash-ak-dupak':         { sheet: 'pak', idx: 32 },
        'dash-ak-integrasi':     { sheet: 'pak', idx: 33 },
        'dash-predikat-2023':    { sheet: 'pak', idx: 34 },
        'dash-konversi-2023':    { sheet: 'pak', idx: 35 },
        'dash-predikat-2024':    { sheet: 'pak', idx: 36 },
        'dash-akumulasi-2024':   { sheet: 'pak', idx: 37 },
        'dash-predikat-2025':    { sheet: 'pak', idx: 38 },
        'dash-akumulasi-2025':   { sheet: 'pak', idx: 39 },
        'dash-predikat-2026':    { sheet: 'pak', idx: 40 },
        'dash-akumulasi-2026':   { sheet: 'pak', idx: 41 },
    };

    for (const [elId, cfg] of Object.entries(dashFields)) {
        const el = document.getElementById(elId);
        if (!el) continue;
        const val = cachedProfileData?.[cfg.sheet]?.values?.[cfg.idx];
        el.textContent = (val !== undefined && val !== null && val !== '') ? val : '—';
    }
}

function showAnalitikDev() { 
    showPage('analitik'); 
    document.getElementById('analitikDataDisplay').innerHTML = `<div class="alert alert-info p-5 text-center" style="border-radius:20px"><h4>${t('nav_analitik')}</h4>${t('dev_mode')}</div>`; 
}

function formatAuto(val) {
    if (!val || val === '-') return '-';
    // Jika formatnya tanggal ISO (ada huruf T dan Z)
    if (typeof val === 'string' && val.includes('T') && val.includes('Z')) {
        const d = new Date(val);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return val;
}

async function autoFillUsulanForm() {
    const inputNama = document.getElementById('entNama');
    const inputNip = document.getElementById('entNip');

    if (inputNama) inputNama.value = userData.name;

    // Cek apakah data profil sudah ada di memori (cache)
    if (cachedProfileData && cachedProfileData.pak && cachedProfileData.pak.values) {
        // Berdasarkan mapping Anda: NIP ada di Index 3
        const nipVal = cachedProfileData.pak.values[3];
        if (inputNip) inputNip.value = nipVal || "";
    } else {
        // Jika belum ada di cache (misal user baru login langsung ke menu usulan)
        // Kita tarik datanya secara manual
        try {
            const res = await fetch(`${API_URL}?action=getProfile&email=${userData.email}`);
            const result = await res.json();
            if (result.status === "success") {
                cachedProfileData = result.data;
                const nipVal = cachedProfileData.pak.values[3];
                if (inputNip) inputNip.value = nipVal || "";
            }
        } catch (e) {
            console.log("Auto-fill NIP gagal: Koneksi bermasalah");
        }
    }
}


// 1. Fungsi memunculkan/menyembunyikan pertanyaan tambahan
function toggleConditionalQuestions(value) {
    const div = document.getElementById('conditionalQuestions');
    if (value === 'Belum ada') {
        div.style.display = 'block';
        // Tambahkan atribut required secara dinamis agar validasi jalan
        document.getElementById('entPredikat2023').required = true;
        document.getElementById('entLink2023').required = true;
        document.getElementById('entPredikat2024').required = true;
        document.getElementById('entLink2024').required = true;
    } else {
        div.style.display = 'none';
        document.getElementById('entPredikat2023').required = false;
        document.getElementById('entLink2023').required = false;
        document.getElementById('entPredikat2024').required = false;
        document.getElementById('entLink2024').required = false;
    }
}

const dataToSubmit = [
    new Date().toLocaleString('id-ID'),                // A: Timestamp
    userData.email,                                   // B: Email
    userData.name,                                    // C: Nama
    document.getElementById('entNip').value,          // D: NIP Baru
    document.querySelector('input[name="entUbahPangkat"]:checked').value, // E: Perubahan Pangkat
    
    // KOLOM BARU (F): Link SK Pangkat
    document.getElementById('entLinkSkPangkat').value || "-", 
    
    document.querySelector('input[name="entAdaAk"]:checked').value,      // G: Dokumen AK sd 2024
    
    // Pertanyaan Tambahan (H s/d K)
    document.getElementById('entPredikat2023').value || "-",
    document.getElementById('entLink2023').value || "-",
    document.getElementById('entPredikat2024').value || "-",
    document.getElementById('entLink2024').value || "-"
];


// 1. Fungsi pemicu untuk SK Pangkat
function togglePangkatConditional(value) {
    const area = document.getElementById('pangkatConditionalArea');
    const input = document.getElementById('entLinkSkPangkat');
    
    if (value === 'Ya') {
        area.style.display = 'block';
        input.required = true;
    } else {
        area.style.display = 'none';
        input.required = false;
        input.value = ""; // Reset jika user berubah pikiran ke 'Tidak'
    }
}
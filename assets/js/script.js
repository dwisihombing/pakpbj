/**
 * SCRIPT.JS - CLEAN & SECURE VERSION
 */

const API_URL = "https://script.google.com/macros/s/AKfycbwtU6TY5K4Fc_Kt9vRbkwr2P9CKyb5t4GbOf5AVhN5p_rlz3kSK3BbNJxlOOgLhGtWi/exec";
const userData = JSON.parse(sessionStorage.getItem('userData')) || { role: 'User', name: 'Guest', email: '', picture: '' };

let state = {
    role: sessionStorage.getItem('activeRole') || userData.role,
    lang: localStorage.getItem('lang') || 'id',
    theme: localStorage.getItem('theme') || 'light'
};

let cachedProfileData = null;

const i18n = {
    id: { 
        nav_dash: "Beranda", nav_profile: "Profil", nav_analitik: "Analitik", nav_pengguna: "Pengguna", nav_set: "Pengaturan", 
        sub_pak: "Penetapan Angka Kredit", sub_training: "Pelatihan dan Ujikom", sub_experience: "Pengalaman", 
        welcome: "Selamat Datang", loading: "Memuat data...", dev_mode: "Fitur masih dalam pengembangan", btn_save: "Simpan"
    },
    en: { 
        nav_dash: "Home", nav_profile: "Profile", nav_analitik: "Analytics", nav_pengguna: "Users", nav_set: "Settings", 
        sub_pak: "PAK PBJ", sub_training: "Training & Competence", sub_experience: "Experience", 
        welcome: "Welcome", loading: "Fetching data...", dev_mode: "Under development", btn_save: "Save"
    }
};

const t = (k) => i18n[state.lang][k] || k;

// MAPPING KOLOM (Sesuaikan Indexnya A=0, B=1, dst)
const customProfileFields = {
    pak: [
        { idx: 1, label: "Nama Lengkap" },
        { idx: 3, label: "Nomor Induk Pegawai (NIP)" },
        { idx: 4, label: "Nomor Karpeg" },
        { idx: 5, label: "Golongan" },
        { idx: 6, label: "Pangkat " },
        { idx: 12, label: "Unit Kerja"},
        { idx: 13, label: "Jabatan Fungsional" },
        { idx: 14, label: "Status" },
        { idx: 19, label: "Pengangkatan" },
        { idx: 20, label: "Tahun PJL / Penerimaan" },
        { idx: 21, label: "TMT Jabatan" },
        { idx: 22, label: "Tanggal Pelantikan" },
    ],
    training: [
        { idx: 23, label: "Nama Pelatihan Teknis" },
        { idx: 24, label: "Tahun Kelulusan" },
        { idx: 25, label: "Penyelenggara Diklat" }
    ],
    experience: [
        { idx: 23, label: "Nama Paket Pekerjaan" },
        { idx: 30, label: "Nilai Pagu Anggaran" }
    ]
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Sidebar State (Collapsed/Besar)
    const wasCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (wasCollapsed && window.innerWidth >= 992) {
        document.body.classList.add('collapsed-sidebar');
        updateToggleIcon(true);
    }

    initApp();
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
}

// --- SIDEBAR & NAVIGASI ---
function renderSidebar() {
    const menu = document.getElementById('sidebarMenu');
    const isAdmin = state.role === 'Admin';
    menu.innerHTML = `
        <a class="nav-link" id="nav-dashboard" onclick="showPage('dashboard')"><i class="bi bi-house"></i> <span>${t('nav_dash')}</span></a>
        <div class="nav-item">
            <a class="nav-link d-flex align-items-center" id="nav-profile" onclick="toggleSub('subProfil')">
                <i class="bi bi-person-circle"></i> <span>${t('nav_profile')}</span>
                <i class="bi bi-chevron-down ms-auto small"></i>
            </a>
            <div id="subProfil" class="submenu shadow-sm" style="display:none">
                <a href="javascript:void(0)" id="sub-pak" onclick="loadProfileData('pak')">${t('sub_pak')}</a>
                <a href="javascript:void(0)" id="sub-training" onclick="loadProfileData('training')">${t('sub_training')}</a>
                <a href="javascript:void(0)" id="sub-experience" onclick="loadProfileData('experience')">${t('sub_experience')}</a>
            </div>
        </div>
        ${isAdmin ? `
            <a class="nav-link" id="nav-analitik" onclick="showAnalitikDev()"><i class="bi bi-bar-chart"></i> <span>${t('nav_analitik')}</span></a>
            <a class="nav-link" id="nav-pengguna" onclick="showPage('pengguna')"><i class="bi bi-people"></i> <span>${t('nav_pengguna')}</span></a>
            <a class="nav-link" id="nav-pengaturan" onclick="showPage('pengaturan')"><i class="bi bi-gear"></i> <span>${t('nav_set')}</span></a>
        ` : ''}
    `;
}

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

    if(window.innerWidth < 992) document.body.classList.remove('sidebar-open');
}

function toggleSub(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// --- DATA FETCHING (API) ---
async function loadProfileData(type) {
    showPage('profile');
    const area = document.getElementById('profileDetailArea');
    
    document.querySelectorAll('.submenu a').forEach(a => a.classList.remove('active'));
    const activeSub = document.getElementById(`sub-${type}`);
    if(activeSub) activeSub.classList.add('active');
    document.getElementById('nav-profile').classList.add('active');

    if (!cachedProfileData) {
        area.innerHTML = `<div class="p-5 text-center"><div class="spinner-border text-primary"></div><p class="mt-2">${t('loading')}</p></div>`;
        try {
            const res = await fetch(`${API_URL}?action=getProfile&email=${userData.email}`);
            const result = await res.json();
            if (result.status === "success") {
                cachedProfileData = { headers: result.headers, data: result.data };
            } else {
                area.innerHTML = `<div class="alert alert-warning">Data email <b>${userData.email}</b> tidak ditemukan.</div>`;
                return;
            }
        } catch (e) {
            area.innerHTML = `<div class="alert alert-danger">Gagal terhubung ke Server API.</div>`;
            return;
        }
    }
    renderProfileUI(type);
}

function renderProfileUI(type) {
    const area = document.getElementById('profileDetailArea');
    const d = cachedProfileData.data;
    const fieldsToShow = customProfileFields[type] || [];

    let html = `
        <div class="card border-0 shadow-sm overflow-hidden mb-4" style="border-radius:20px;">
            <div class="card-header bg-primary text-white p-4 border-0">
                <h5 class="mb-0 fw-bold text-uppercase">${t('sub_' + type)}</h5>
                <small class="opacity-75">${userData.name}</small>
            </div>
            <div class="list-group list-group-flush bg-white">
    `;

    fieldsToShow.forEach(field => {
        const val = d[field.idx] || '-';
        html += `
            <div class="list-group-item p-3 border-light">
                <div class="row align-items-center">
                    <div class="col-5 text-muted small fw-bold text-uppercase" style="font-size:10px">${field.label}</div>
                    <div class="col-7 fw-bold" style="font-size:14px">${val}</div>
                </div>
            </div>`;
    });

    area.innerHTML = html + `</div></div><p class="text-center text-muted small">Update: 2026</p>`;
}

// --- ADMIN & UTILS ---
async function fetchUsersToTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    try {
        const res = await fetch(`${API_URL}?action=getAllUsers`);
        const result = await res.json();
        const data = result.data;
        const h = data[0];
        tbody.innerHTML = data.slice(1).map(r => `
            <tr>
                <td><b>${r[h.indexOf('Nama')]}</b></td>
                <td>${r[h.indexOf('Email')]}</td>
                <td><span class="badge-role ${r[h.indexOf('Role')] === 'Admin' ? 'admin-pill' : 'user-pill'}">${r[h.indexOf('Role')]}</span></td>
            </tr>
        `).join('');
    } catch (e) { console.log("Users fetch error"); }
}

function saveAdminSettings() {
    sessionStorage.setItem('activeRole', document.getElementById('roleSelect').value);
    location.reload();
}

function checkSimulationStatus() {
    const btnBack = document.getElementById('btnBackToAdmin');
    if (userData.role === 'Admin' && state.role === 'User') btnBack.style.display = 'inline-block';
    else if (btnBack) btnBack.style.display = 'none';
}

function backToAdmin() {
    sessionStorage.setItem('activeRole', 'Admin');
    location.reload();
}

function applyTheme() { document.body.classList.toggle('dark', state.theme === 'dark'); }
function toggleTheme() { state.theme = state.theme === 'light' ? 'dark' : 'light'; localStorage.setItem('theme', state.theme); applyTheme(); }
function changeLang(v) { localStorage.setItem('lang', v); location.reload(); }
function logout() { sessionStorage.clear(); window.location.href = 'login.html'; }
function toggleSidebar() { document.body.classList.toggle('sidebar-open'); }
function showAnalitikDev() { showPage('analitik'); document.getElementById('analitikDataDisplay').innerHTML = `<div class="alert alert-info p-5 text-center" style="border-radius:20px"><h4>${t('nav_analitik')}</h4>${t('dev_mode')}</div>`; }
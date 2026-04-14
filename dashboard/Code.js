// Database simulasi (Bisa diganti dengan data dari Google Sheets)
const USERS = [
  { username: "admin", password: "123", role: "ADMIN", name: "Administrator" },
  { username: "user", password: "456", role: "USER", name: "Regular User" }
];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Dashboard GAS Modular')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Fungsi helper untuk menyertakan file HTML lain (Modular)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Fungsi Login
function checkLogin(username, password) {
  const user = USERS.find(u => u.username === username && u.password === password);
  if (user) {
    // Jangan kirim password kembali ke client
    const { password, ...userSafeData } = user;
    return { success: true, user: userSafeData };
  }
  return { success: false, message: "Username atau password salah!" };
}

// Fungsi untuk mengambil konten halaman berdasarkan role
function getPageContent(pageName, userRole) {
  const accessControl = {
    'AdminPage': ['ADMIN'],
    'UserPage': ['ADMIN', 'USER'],
    'DashboardHome': ['ADMIN', 'USER']
  };

  // Cek apakah role memiliki izin
  if (accessControl[pageName] && accessControl[pageName].includes(userRole)) {
    return HtmlService.createTemplateFromFile(pageName).evaluate().getContent();
  } else {
    return "<h3>Error 403: Anda tidak memiliki akses ke halaman ini.</h3>";
  }
}
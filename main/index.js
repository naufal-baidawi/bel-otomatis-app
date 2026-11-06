const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, powerSaveBlocker } = require('electron');
const path = require('path');
const db = require('./db');
const {
  getPrayerTimesWithKemenag,
  setLocation,
  getLocation,
  getMonthlyCalendar,
  convertHijriToMasehi,
  convertMasehiToHijri
} = require('./falakEngine');

let mainWindow;
let tray = null;
let isQuitting = false;
let lastTriggeredMinute = ''; // Variabel pengunci agar audio hanya diputar sekali per menit
let powerSaveId = null;

// Menjamin hanya ada 1 instance aplikasi yang berjalan (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Muat lokasi tersimpan dari SQLite saat startup
function initSavedLocation() {
  try {
    const settings = db.prepare('SELECT * FROM prayer_settings WHERE id = 1').get();
    if (settings) {
      setLocation(
        settings.latitude,
        settings.longitude,
        settings.location_name || 'Paiton Probolinggo East Java Indonesia',
        settings.elevation || 0
      );
    }
  } catch (e) {
    console.error('Gagal memuat pengaturan lokasi awal:', e);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Membuka akses file lokal MP3 agar tidak diblokir renderer
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  // Fitur 24 Jam: Jika tombol Close (X) diklik, jangan matikan aplikasi, tapi sembunyikan ke System Tray (Background)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray && process.platform === 'win32') {
        tray.displayBalloon({
          icon: iconPath,
          title: 'Bel Otomatis eNJe Berjalan di Latar Belakang',
          content: 'Aplikasi tetap aktif 24 jam untuk membunyikan bel kegiatan & shalat tepat waktu.'
        });
      }
    }
  });
}

function createTray() {
  // Buat context menu untuk System Tray di pojok kanan bawah Windows
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Buka Bel Otomatis eNJe',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Status: Berjalan 24 Jam Aktif',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Keluar Sepenuhnya',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  try {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    tray = new Tray(iconPath);
  } catch (e) {
    try {
      const nativeImage = require('electron').nativeImage;
      const emptyIcon = nativeImage.createEmpty();
      tray = new Tray(emptyIcon);
    } catch (err) {}
  }

  if (tray) {
    tray.setToolTip('Bel Otomatis eNJe (Aktif 24 Jam)');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
}

// Konfigurasi agar aplikasi otomatis jalan saat komputer Windows dinyalakan (Auto-start on Boot)
function setupAutoLaunch() {
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false
    });
  } catch (e) {
    console.warn('Gagal mengatur auto launch:', e);
  }
}

app.whenReady().then(() => {
  initSavedLocation();
  createWindow();
  createTray();
  setupAutoLaunch();
  startScheduler();

  // Mencegah komputer Windows masuk mode Sleep saat aplikasi sedang standby membunyikan bel
  try {
    powerSaveId = powerSaveBlocker.start('prevent-app-suspension');
  } catch (e) {}
});

app.on('before-quit', () => {
  isQuitting = true;
  if (powerSaveId !== null && powerSaveBlocker.isStarted(powerSaveId)) {
    powerSaveBlocker.stop(powerSaveId);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

// Helper penjumlahan menit pada string "HH:mm"
function addMinutesToTimeStr(timeStr, offsetMinutes) {
  if (!timeStr || !timeStr.includes(':')) return '';
  const [h, m] = timeStr.split(':').map(Number);
  let totalMin = h * 60 + m + (parseInt(offsetMinutes, 10) || 0);
  totalMin = ((totalMin % 1440) + 1440) % 1440;
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ==================== SCHEDULER ENGINE ====================
function startScheduler() {
  setInterval(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`; // Format: "HH:mm"

    const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = daysMap[now.getDay()];

    // Jalankan hanya sekali ketika memasuki menit baru
    if (lastTriggeredMinute !== currentTime) {
      lastTriggeredMinute = currentTime;

      // 1. Cek Bel Kegiatan Harian
      const activeRoutines = db.prepare('SELECT * FROM routine_bells WHERE is_active = 1 AND time = ?').all(currentTime);
      activeRoutines.forEach(bell => {
        try {
          let days = [];
          try { days = JSON.parse(bell.days || '[]'); } catch (e) {}

          // Validasi hari aktif (harus memiliki hari yang dicentang dan mencakup hari ini)
          if (days.length > 0 && days.includes(currentDay)) {
            console.log(`[ALARM KEGIATAN] Memutar bel: ${bell.title} | Path: ${bell.audio_path}`);
            triggerAudioAndLog(bell.title, bell.audio_path, 'ROUTINE');
          }
        } catch (e) {
          console.error('Error mengeksekusi bel routine:', e);
        }
      });

      // 2. Cek Bel Waktu Shalat & Pre-Shalat (Digital Falak)
      try {
        const activePrayerBells = db.prepare('SELECT * FROM prayer_bells WHERE is_active = 1').all();
        if (activePrayerBells.length > 0) {
          const settings = db.prepare('SELECT * FROM prayer_settings WHERE id = 1').get();
          const prayerData = getPrayerTimesWithKemenag(now, settings);

          const prayerTimeMap = {
            imsak: prayerData.imsak,
            subuh: prayerData.subuh,
            shubuh: prayerData.subuh,
            terbit: prayerData.terbit,
            thulu: prayerData.terbit,
            dhuha: prayerData.dhuha,
            dluha: prayerData.dhuha,
            dzuhur: prayerData.dzuhur,
            dhuhur: prayerData.dzuhur,
            ashar: prayerData.ashar,
            maghrib: prayerData.maghrib,
            isya: prayerData.isya
          };

          activePrayerBells.forEach(pBell => {
            const key = String(pBell.prayer_name || '').toLowerCase().replace(/[^a-z]/g, '');
            const baseTime = prayerTimeMap[key];
            if (baseTime) {
              const triggerTime = addMinutesToTimeStr(baseTime, pBell.offset_minutes || 0);
              if (triggerTime === currentTime) {
                const label = pBell.title || `Bel ${pBell.prayer_name}`;
                console.log(`[ALARM SHALAT FALAK] Memutar bel: ${label} (${triggerTime})`);
                triggerAudioAndLog(label, pBell.audio_path, 'PRAYER');
              }
            }
          });
        }
      } catch (e) {
        console.error('Error mengeksekusi bel shalat:', e);
      }
    }
  }, 1000);
}

function triggerAudioAndLog(title, audioPath, source) {
  db.prepare('INSERT INTO bell_logs (title, source) VALUES (?, ?)').run(title, source);
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Jika window sedang disembunyikan di tray, otomatis tampilkan ke layar agar pop-up stop/pause terlihat oleh user
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.webContents.send('play-audio', { title, audioPath, source });
  }
}

// ==================== IPC HANDLERS ====================
ipcMain.handle('get-prayer-data', async (event, targetDateStr = null) => {
  const settings = db.prepare('SELECT * FROM prayer_settings WHERE id = 1').get();
  let targetDate = new Date();
  if (targetDateStr) {
    const parts = String(targetDateStr).split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      targetDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    } else {
      const parsed = new Date(targetDateStr);
      if (!isNaN(parsed)) targetDate = parsed;
    }
  }
  return getPrayerTimesWithKemenag(targetDate, settings);
});

ipcMain.handle('get-monthly-calendar', async (event, { year, month }) => {
  return getMonthlyCalendar(year, month);
});

ipcMain.handle('convert-hijri-to-masehi', async (event, { year, month, day }) => {
  return convertHijriToMasehi(year, month, day);
});

ipcMain.handle('convert-masehi-to-hijri', async (event, { year, month, day }) => {
  return convertMasehiToHijri(new Date(year, month - 1, day, 12, 0, 0));
});

// Routine Bells IPC
ipcMain.handle('get-routine-bells', () => db.prepare('SELECT * FROM routine_bells ORDER BY time ASC').all());
ipcMain.handle('save-routine-bell', (event, data) => {
  const stmt = db.prepare('INSERT INTO routine_bells (title, time, days, audio_path, is_active) VALUES (?, ?, ?, ?, ?)');
  return stmt.run(data.title, data.time, JSON.stringify(data.days || []), data.audio_path, data.isActive ? 1 : 0);
});
ipcMain.handle('update-routine-bell', (event, data) => {
  const stmt = db.prepare('UPDATE routine_bells SET title = ?, time = ?, days = ?, audio_path = ?, is_active = ? WHERE id = ?');
  return stmt.run(data.title, data.time, JSON.stringify(data.days || []), data.audio_path, data.isActive ? 1 : 0, data.id);
});
ipcMain.handle('toggle-routine-bell', (event, data) => {
  const stmt = db.prepare('UPDATE routine_bells SET is_active = ? WHERE id = ?');
  return stmt.run(data.isActive ? 1 : 0, data.id);
});
ipcMain.handle('delete-routine-bell', (event, id) => db.prepare('DELETE FROM routine_bells WHERE id = ?').run(id));

// Prayer Settings & Bells IPC
ipcMain.handle('get-prayer-settings', () => db.prepare('SELECT * FROM prayer_settings WHERE id = 1').get());
ipcMain.handle('update-prayer-settings', (event, data) => {
  const stmt = db.prepare('UPDATE prayer_settings SET offset_subuh = ?, offset_dzuhur = ?, offset_ashar = ?, offset_maghrib = ?, offset_isya = ? WHERE id = 1');
  return stmt.run(data.subuh || 0, data.dzuhur || 0, data.ashar || 0, data.maghrib || 0, data.isya || 0);
});
ipcMain.handle('get-prayer-bells', () => db.prepare('SELECT * FROM prayer_bells').all());
ipcMain.handle('save-prayer-bell', (event, data) => {
  const stmt = db.prepare('INSERT INTO prayer_bells (prayer_name, title, offset_minutes, audio_path, is_active) VALUES (?, ?, ?, ?, ?)');
  return stmt.run(data.prayerName, data.title, data.offsetMinutes || 0, data.audio_path || 'default', data.isActive ? 1 : 0);
});
ipcMain.handle('update-prayer-bell', (event, data) => {
  const stmt = db.prepare('UPDATE prayer_bells SET prayer_name = ?, title = ?, offset_minutes = ?, audio_path = ?, is_active = ? WHERE id = ?');
  return stmt.run(data.prayerName, data.title, data.offsetMinutes || 0, data.audio_path || 'default', data.isActive ? 1 : 0, data.id);
});
ipcMain.handle('toggle-prayer-bell', (event, data) => {
  const stmt = db.prepare('UPDATE prayer_bells SET is_active = ? WHERE id = ?');
  return stmt.run(data.isActive ? 1 : 0, data.id);
});
ipcMain.handle('delete-prayer-bell', (event, id) => db.prepare('DELETE FROM prayer_bells WHERE id = ?').run(id));

// Logs & Dialog IPC
ipcMain.handle('get-logs', () => db.prepare('SELECT * FROM bell_logs ORDER BY id DESC LIMIT 50').all());
ipcMain.handle('clear-logs', () => db.prepare('DELETE FROM bell_logs').run());
ipcMain.handle('dialog-open-audio', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

// IPC handler untuk set kustom koordinat lokasi & simpan permanen ke SQLite
ipcMain.handle('set-custom-location', async (event, { lat, lon, name, elevation }) => {
  setLocation(lat, lon, name, elevation);
  const current = getLocation();
  db.prepare(`
    UPDATE prayer_settings
    SET latitude = ?, longitude = ?, location_name = ?, elevation = ?
    WHERE id = 1
  `).run(current.lat, current.lon, current.name, current.elevation);
  return current;
});

// IPC Handler untuk Cek Update Aplikasi (Online Version Check)
ipcMain.handle('check-for-updates', async () => {
  const currentVersion = app.getVersion();
  // Anda dapat mengarahkan URL ini ke file JSON di GitHub Releases atau server Anda
  // Contoh: https://raw.githubusercontent.com/naufal-baidawi/bel-otomatis-app/main/version.json
  const checkUrl = 'https://raw.githubusercontent.com/naufal-baidawi/bel-otomatis-app/main/version.json';

  try {
    const https = require('https');
    const fetchJson = (url) => new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'User-Agent': 'Bel-Otomatis-eNJe' }, timeout: 5000 }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) return resolve(null);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });

    const remoteData = await fetchJson(checkUrl);
    if (remoteData && remoteData.version) {
      const isNewer = compareVersions(remoteData.version, currentVersion) > 0;
      return {
        hasUpdate: isNewer,
        currentVersion,
        latestVersion: remoteData.version,
        changelog: remoteData.changelog || 'Pembaruan fitur terbaru dan peningkatan performa.',
        downloadUrl: remoteData.downloadUrl || 'https://github.com/naufal-baidawi/bel-otomatis-app/releases'
      };
    }
  } catch (e) {}

  return {
    hasUpdate: false,
    currentVersion,
    latestVersion: currentVersion
  };
});

// Helper pembanding semver (misal "1.1.0" > "1.0.0")
function compareVersions(v1, v2) {
  const p1 = String(v1).split('.').map(Number);
  const p2 = String(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

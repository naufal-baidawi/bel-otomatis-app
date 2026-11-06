const { ipcRenderer, shell } = require('electron');
const routineModule = require('./modules/routineBell');
const prayerModule = require('./modules/prayerBell');
const calendarModule = require('./modules/calendarModule');
const historyModule = require('./modules/historyLog');

let currentAudio = null;
let currentPlayButton = null;
let isAudioPaused = false;
let updateDownloadUrl = '';

window.addEventListener('DOMContentLoaded', () => {
  routineModule.init();
  prayerModule.init();
  historyModule.init();
  updateTopBannerStatus();
  setInterval(updateTopBannerStatus, 1000);

  // Otomatis cek update 5 detik setelah aplikasi dibuka
  setTimeout(() => {
    checkForAppUpdates(false);
  }, 5000);
});

function switchTab(tabName) {
  ['routine', 'prayer', 'history', 'calendar'].forEach(t => {
    const viewEl = document.getElementById(`view-${t}`);
    if (viewEl) viewEl.classList.add('hidden');
    
    const btn = document.getElementById(`nav-${t}`);
    if (btn) btn.className = "px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 flex items-center space-x-2 transition";
  });

  const targetView = document.getElementById(`view-${tabName}`);
  if (targetView) targetView.classList.remove('hidden');

  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) {
    activeBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white flex items-center space-x-2 transition shadow";
  }

  if (tabName === 'routine' && routineModule.load) routineModule.load();
  if (tabName === 'prayer' && prayerModule.load) prayerModule.load();
  if (tabName === 'history' && historyModule.load) historyModule.load();
  if (tabName === 'calendar' && calendarModule.init) calendarModule.init();
}

function playTestAudio() {
  triggerActiveBellPopup('Pengujian Suara Bel Sistem', 'TEST');
  playAudioFile('default');
}

function playAudioFile(audioPath, buttonElement = null) {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}

    if (currentPlayButton) {
      currentPlayButton.innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
    }

    if (currentPlayButton === buttonElement) {
      currentAudio = null;
      currentPlayButton = null;
      isAudioPaused = false;
      hideActiveBellPopup();
      return;
    }
  }

  isAudioPaused = false;

  if (audioPath && audioPath !== 'default') {
    const formattedPath = audioPath.replace(/\\/g, '/');
    const audioUrl = formattedPath.startsWith('file://') ? formattedPath : `file:///${formattedPath}`;
    
    try {
      currentAudio = new Audio(audioUrl);
      currentPlayButton = buttonElement;

      if (currentPlayButton) {
        currentPlayButton.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
      }

      currentAudio.play().then(() => {
        console.log('Memutar audio:', audioUrl);
      }).catch(err => {
        console.warn('Gagal memutar file audio, beralih ke chime synthesizer:', err);
        playChimeSound();
        resetAudioState();
      });

      currentAudio.onended = () => {
        resetAudioState();
        hideActiveBellPopup();
      };
    } catch (e) {
      playChimeSound();
      resetAudioState();
      hideActiveBellPopup();
    }
  } else {
    playChimeSound();
    resetAudioState();
    // Tutup popup otomatis setelah chime selesai (~2 detik)
    setTimeout(hideActiveBellPopup, 2000);
  }
}

function resetAudioState() {
  if (currentPlayButton) {
    currentPlayButton.innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
  }
  currentAudio = null;
  currentPlayButton = null;
  isAudioPaused = false;
}

function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    console.error('AudioContext tidak didukung:', e);
  }
}

// =========================================================================
// POP-UP KONTROL KETIKA BEL BERBUNYI (PAUSE / RESUME / STOP)
// =========================================================================
function triggerActiveBellPopup(title, source = 'ROUTINE') {
  const modal = document.getElementById('active-bell-modal');
  const titleEl = document.getElementById('active-bell-title');
  const timeEl = document.getElementById('active-bell-time-info');
  const badgeEl = document.getElementById('active-bell-source-badge');

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (titleEl) titleEl.innerText = title;
  if (timeEl) timeEl.innerText = `Waktu Eksekusi: ${timeStr} WIB`;
  if (badgeEl) {
    const isPrayer = source === 'PRAYER';
    badgeEl.innerText = isPrayer ? 'WAKTU SHALAT / PRE-SHALAT' : 'BEL KEGIATAN HARIAN';
    badgeEl.className = isPrayer
      ? 'px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider'
      : 'px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider';
  }

  // Reset tombol pause ke kondisi awal
  const pauseIcon = document.getElementById('active-bell-pause-icon');
  const pauseText = document.getElementById('active-bell-pause-text');
  if (pauseIcon) pauseIcon.className = 'fa-solid fa-pause';
  if (pauseText) pauseText.innerText = 'Jeda (Pause)';

  if (modal) modal.classList.remove('hidden');
}

function hideActiveBellPopup() {
  const modal = document.getElementById('active-bell-modal');
  if (modal) modal.classList.add('hidden');
}

function toggleActiveBellPause() {
  if (!currentAudio) return;

  const pauseIcon = document.getElementById('active-bell-pause-icon');
  const pauseText = document.getElementById('active-bell-pause-text');

  if (isAudioPaused) {
    currentAudio.play();
    isAudioPaused = false;
    if (pauseIcon) pauseIcon.className = 'fa-solid fa-pause';
    if (pauseText) pauseText.innerText = 'Jeda (Pause)';
  } else {
    currentAudio.pause();
    isAudioPaused = true;
    if (pauseIcon) pauseIcon.className = 'fa-solid fa-play';
    if (pauseText) pauseText.innerText = 'Lanjutkan (Resume)';
  }
}

function stopActiveBell() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
  }
  resetAudioState();
  hideActiveBellPopup();
}

// =========================================================================
// SISTEM CEK & NOTIFIKASI UPDATE DARI GITHUB / SERVER
// =========================================================================
async function checkForAppUpdates(showToastIfLatest = true) {
  const btn = document.getElementById('btn-check-update');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-emerald-400"></i><span>Mengecek...</span>';

  try {
    const updateInfo = await ipcRenderer.invoke('check-for-updates');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down text-emerald-400"></i><span>Cek Update</span>';

    if (updateInfo && updateInfo.hasUpdate) {
      updateDownloadUrl = updateInfo.downloadUrl || '';
      document.getElementById('update-version-label').innerText = `Versi terbaru v${updateInfo.latestVersion} tersedia (Versi Anda: v${updateInfo.currentVersion})`;
      document.getElementById('update-changelog').innerHTML = updateInfo.changelog || 'Pembaruan stabilitas dan penambahan fitur terbaru.';
      document.getElementById('update-modal').classList.remove('hidden');
    } else {
      if (showToastIfLatest) {
        alert(`Aplikasi sudah dalam versi terbaru (v${updateInfo?.currentVersion || '1.0.0'}).`);
      }
    }
  } catch (err) {
    if (btn) btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down text-emerald-400"></i><span>Cek Update</span>';
    if (showToastIfLatest) {
      alert('Tidak dapat terhubung ke server update. Pastikan koneksi internet aktif.');
    }
  }
}

function closeUpdateModal() {
  document.getElementById('update-modal').classList.add('hidden');
}

function downloadAndApplyUpdate() {
  if (updateDownloadUrl) {
    shell.openExternal(updateDownloadUrl);
  } else {
    alert('Mengunduh installer versi terbaru...');
  }
  closeUpdateModal();
}

// Banner Atas Cerdas: Menghitung Bel Berikutnya (Gabungan Bel Harian & Bel Shalat Digital Falak)
async function updateTopBannerStatus() {
  try {
    const now = new Date();
    
    // 1. Tanggal Lengkap & Jam Real-time
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', options);
    const dateEl = document.getElementById('live-date-header');
    if (dateEl) dateEl.innerText = dateStr;

    const hoursStr = String(now.getHours()).padStart(2, '0');
    const minutesStr = String(now.getMinutes()).padStart(2, '0');
    const secondsStr = String(now.getSeconds()).padStart(2, '0');
    const clockEl = document.getElementById('live-clock-header');
    if (clockEl) clockEl.innerText = `${hoursStr}:${minutesStr}:${secondsStr}`;

    const titleEl = document.getElementById('top-status-title');
    const timeEl = document.getElementById('top-status-time');
    const countdownEl = document.getElementById('top-countdown');

    const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = daysMap[now.getDay()];
    const currentTotalSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // 2. Kumpulkan semua jadwal aktif (Routine Bells & Prayer Bells)
    const [routines, prayerBells, prayerData] = await Promise.all([
      ipcRenderer.invoke('get-routine-bells'),
      ipcRenderer.invoke('get-prayer-bells'),
      ipcRenderer.invoke('get-prayer-data')
    ]);

    const allTriggers = [];

    // Tambah Bel Rutin
    routines.filter(r => r.is_active === 1).forEach(r => {
      let days = [];
      try { days = JSON.parse(r.days || '[]'); } catch (e) {}
      if (days.length > 0 && days.includes(currentDay)) {
        const [h, m] = r.time.split(':').map(Number);
        allTriggers.push({
          title: r.title,
          time: r.time,
          sec: h * 3600 + m * 60,
          source: 'Kegiatan'
        });
      }
    });

    // Tambah Bel Shalat
    const prayerMap = {
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

    prayerBells.filter(pb => pb.is_active === 1).forEach(pb => {
      const key = String(pb.prayer_name || '').toLowerCase().replace(/[^a-z]/g, '');
      const baseTime = prayerMap[key];
      if (baseTime && baseTime.includes(':')) {
        const [bh, bm] = baseTime.split(':').map(Number);
        let totalMin = bh * 60 + bm + (parseInt(pb.offset_minutes, 10) || 0);
        totalMin = ((totalMin % 1440) + 1440) % 1440;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        allTriggers.push({
          title: pb.title || `Bel ${pb.prayer_name}`,
          time: timeStr,
          sec: h * 3600 + m * 60,
          source: 'Shalat'
        });
      }
    });

    if (allTriggers.length === 0) {
      if (titleEl) titleEl.innerText = 'Tidak ada bel aktif hari ini';
      if (timeEl) timeEl.innerText = 'Pukul --:-- WIB';
      if (countdownEl) countdownEl.innerText = '--:--:--';
      return;
    }

    let nextBell = null;
    let minDiff = Infinity;

    for (const bell of allTriggers) {
      const diff = bell.sec - currentTotalSec;
      if (diff > 0 && diff < minDiff) {
        minDiff = diff;
        nextBell = bell;
      }
    }

    if (!nextBell) {
      let earliest = allTriggers[0];
      for (const bell of allTriggers) {
        if (bell.sec < earliest.sec) {
          earliest = bell;
        }
      }
      nextBell = earliest;
      minDiff = (86400 - currentTotalSec) + earliest.sec;
    }

    const h = Math.floor(minDiff / 3600);
    const m = Math.floor((minDiff % 3600) / 60);
    const s = minDiff % 60;

    if (titleEl) titleEl.innerText = `${nextBell.title} (${nextBell.source})`;
    if (timeEl) timeEl.innerText = `Pukul ${nextBell.time} WIB`;
    if (countdownEl) countdownEl.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  } catch (e) {
    console.error('Error updating top banner:', e);
  }
}

// Tangkap event saat scheduler membunyikan audio
ipcRenderer.on('play-audio', (event, data) => {
  // Munculkan pop-up kontrol audio
  triggerActiveBellPopup(data.title, data.source);
  playAudioFile(data.audioPath);
});

// Ekspos fungsi dan modul secara global
window.switchTab = switchTab;
window.playTestAudio = playTestAudio;
window.playAudioFile = playAudioFile;
window.toggleActiveBellPause = toggleActiveBellPause;
window.stopActiveBell = stopActiveBell;
window.checkForAppUpdates = checkForAppUpdates;
window.closeUpdateModal = closeUpdateModal;
window.downloadAndApplyUpdate = downloadAndApplyUpdate;
window.routineModule = routineModule;
window.prayerModule = prayerModule;
window.calendarModule = calendarModule;
window.historyModule = historyModule;

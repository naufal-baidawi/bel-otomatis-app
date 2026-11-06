const { ipcRenderer } = require('electron');

let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth() + 1; // 1-12
let selectedDateStr = '';

function init() {
  const now = new Date();
  currentCalYear = now.getFullYear();
  currentCalMonth = now.getMonth() + 1;
  selectedDateStr = `${currentCalYear}-${String(currentCalMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  renderLayout();
  loadCalendarData();
  renderMonthlyGrid();
}

function renderLayout() {
  const container = document.getElementById('view-calendar') || createViewContainer();
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header Kontrol Lokasi, LT/BT Manual & Date Picker -->
      <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow space-y-4">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 class="text-base font-bold text-slate-100 flex items-center space-x-2">
              <i class="fa-solid fa-compass text-blue-400"></i>
              <span>Digital Falak, Kalender Masehi-Hijriah & Koordinat Wilayah</span>
            </h3>
            <p id="location-status" class="text-xs text-slate-400 mt-0.5">Lokasi aktif: Paiton Probolinggo East Java Indonesia (-7.71105, 113.49556)</p>
          </div>
          <div class="flex items-center flex-wrap gap-2">
            <button onclick="calendarModule.fetchGPSLocation()" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow">
              <i class="fa-solid fa-location-crosshairs"></i>
              <span>Sinkron GPS/Maps</span>
            </button>
            <button onclick="calendarModule.resetPaitonLocation()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow">
              <i class="fa-solid fa-mosque"></i>
              <span>Nurul Jadid (Paiton)</span>
            </button>
            <input type="date" id="cal-date-picker" value="${selectedDateStr}" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none">
            <button onclick="calendarModule.checkDate()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition">Hitung Tanggal</button>
          </div>
        </div>

        <!-- Baris Input Manual LT / BT (Mendukung Desimal & Derajat-Menit-Detik seperti Digital Falak) -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          <div>
            <label class="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Nama Lokasi</label>
            <input type="text" id="input-loc-name" placeholder="Paiton Probolinggo" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Lintang Tempat (LT)</label>
            <input type="text" id="input-loc-lat" placeholder="-7.71105 atau -7°42'39.78&quot;" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Bujur Tempat (BT)</label>
            <input type="text" id="input-loc-lon" placeholder="113.49556 atau 113°29'44&quot;" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-blue-500">
          </div>
          <div class="flex items-end">
            <button onclick="calendarModule.saveManualLocation()" class="w-full px-4 py-2 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition">
              Simpan Koordinat LT/BT
            </button>
          </div>
        </div>
      </div>

      <!-- Grid Info Penanggalan, Detail Hisab & Jadwal Shalat Tanggal Terpilih -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Kiri: Informasi Penanggalan & Detail Hisab 6 Langkah -->
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow">
          <h4 class="text-xs font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800 pb-2">Informasi Penanggalan & Parameter Hisab</h4>
          <div class="space-y-2.5 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">Tanggal Masehi:</span>
              <span id="res-masehi" class="font-mono font-bold text-white">-</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">Hari & Pasaran Jawa (Selapan):</span>
              <span id="res-pasaran" class="font-mono font-bold text-amber-400">-</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">Tanggal Hijriah (Digital Falak):</span>
              <span id="res-hijriah" class="font-mono font-bold text-emerald-400">-</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">Awal Tahun Masehi:</span>
              <span id="res-year-start" class="font-mono text-slate-300">-</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">Koordinat (LT / BT):</span>
              <span id="res-coords" class="font-mono text-slate-200">-7.71105, 113.49556</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">1. Darojatu Al-Syamsi (M):</span>
              <span id="res-darojat" class="font-mono text-slate-200">-</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">2. Mail Awal (D):</span>
              <span id="res-mail" class="font-mono text-slate-200">-</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">3. Bu'dul Quthri (X):</span>
              <span id="res-quthri" class="font-mono text-slate-200">-</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">4. Ashlul Muthlaq (Y):</span>
              <span id="res-muthlaq" class="font-mono text-slate-200">-</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/50">
              <span class="text-slate-400">5. Irtifa' 'Ashar:</span>
              <span id="res-irtifa-ashar" class="font-mono text-slate-200">-</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-400">6. Daqoiqu al-Tafawut & Selisih:</span>
              <span id="res-daqoiq" class="font-mono text-blue-400">-</span>
            </div>
          </div>
        </div>

        <!-- Kanan: Hasil Hisab Waktu Shalat (WIB & WIS) -->
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow">
          <div class="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-blue-400">Hasil Hisab Waktu Shalat (Digital Falak)</h4>
            <span class="text-[10px] font-mono text-slate-400">Format HH:mm & HH:mm:ss</span>
          </div>
          <div id="res-prayer-list" class="grid grid-cols-2 gap-3 text-xs">
            <!-- Diisi dinamis -->
          </div>
        </div>
      </div>

      <!-- Kalender Bulanan Masehi + Hijriah + Pasaran Jawa (Gaya Digital Falak) -->
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-center gap-3 pb-3 border-b border-slate-800">
          <div class="flex items-center space-x-3">
            <button onclick="calendarModule.changeMonth(-1)" class="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 text-xs transition">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="text-center min-w-[180px]">
              <h4 id="cal-month-title" class="text-sm font-bold text-white">November 2026</h4>
              <p id="cal-hijri-subtitle" class="text-[11px] text-emerald-400 font-medium">Jumadal Ula - Jumadal Akhirah 1448 H</p>
            </div>
            <button onclick="calendarModule.changeMonth(1)" class="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 text-xs transition">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
          <span class="text-[11px] text-slate-400">Klik tanggal pada kalender untuk melihat jadwal shalat & detail hisabnya</span>
        </div>

        <!-- Header Hari Ahad - Sabtu -->
        <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold">
          <div class="text-red-400 py-1">Ahad</div>
          <div class="text-slate-300 py-1">Senin</div>
          <div class="text-slate-300 py-1">Selasa</div>
          <div class="text-slate-300 py-1">Rabu</div>
          <div class="text-slate-300 py-1">Kamis</div>
          <div class="text-emerald-400 py-1">Jum'at</div>
          <div class="text-slate-300 py-1">Sabtu</div>
        </div>

        <!-- Grid Tanggal Bulanan -->
        <div id="cal-monthly-grid" class="grid grid-cols-7 gap-2">
          <!-- Diisi dinamis -->
        </div>
      </div>
    </div>
  `;
}

function createViewContainer() {
  const mainContent = document.querySelector('main') || document.body;
  const div = document.createElement('div');
  div.id = 'view-calendar';
  div.className = 'p-6 hidden';
  mainContent.appendChild(div);
  return div;
}

async function saveManualLocation() {
  const name = document.getElementById('input-loc-name')?.value?.trim() || 'Lokasi Kustom';
  const lat = document.getElementById('input-loc-lat')?.value?.trim();
  const lon = document.getElementById('input-loc-lon')?.value?.trim();

  if (!lat || !lon) {
    return alert('Masukkan Lintang Tempat (LT) dan Bujur Tempat (BT) terlebih dahulu!');
  }

  await ipcRenderer.invoke('set-custom-location', { lat, lon, name });
  await loadCalendarData();
  if (window.prayerModule) window.prayerModule.load();
}

async function resetPaitonLocation() {
  await ipcRenderer.invoke('set-custom-location', {
    lat: -7.710508,
    lon: 113.496974,
    name: "Pondok Pesantren Nurul Jadid, Paiton, Probolinggo",
    elevation: 10
  });
  await loadCalendarData();
  if (window.prayerModule) window.prayerModule.load();
  alert("Lokasi berhasil disetel ke:\nPondok Pesantren Nurul Jadid, Paiton\nKoordinat: -7.710508, 113.496974");
}

async function fetchGPSLocation() {
  const statusEl = document.getElementById('location-status');
  if (statusEl) statusEl.innerText = 'Mencari koordinat presisi perangkat...';

  // Prioritas 1: Gunakan Geolocation Sensor Perangkat Komputer (Akurat sesuai letak fisik)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const locName = `Paiton / GPS (${lat.toFixed(6)}, ${lon.toFixed(6)})`;
        await ipcRenderer.invoke('set-custom-location', { lat, lon, name: locName });
        await loadCalendarData();
        if (window.prayerModule) window.prayerModule.load();
        alert(`Berhasil mendapatkan lokasi GPS presisi!\nKoordinat: ${lat}, ${lon}`);
      },
      async (err) => {
        console.warn('Geolocation lokal ditolak atau gagal, fallback ke IP ISP:', err);
        await fallbackIPLocation();
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  } else {
    await fallbackIPLocation();
  }
}

async function fallbackIPLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    if (data && data.latitude && data.longitude) {
      const lat = data.latitude;
      const lon = data.longitude;
      const locName = `${data.city}, ${data.region}, ${data.country_name} (IP ISP)`;
      await ipcRenderer.invoke('set-custom-location', { lat, lon, name: locName });
      await loadCalendarData();
      if (window.prayerModule) window.prayerModule.load();
      alert(`Catatan: Geolocation perangkat tidak aktif. Lokasi terdeteksi dari server IP Provider internet Anda:\nLokasi: ${locName}\nKoordinat: ${lat}, ${lon}\n\nTip: Jika lokasi IP berbeda dari posisi Anda sebenarnya, silakan klik tombol "Nurul Jadid (Paiton)" atau ketik koordinat presisi di kolom LT/BT.`);
    }
  } catch (e) {
    alert('Gagal mendeteksi koordinat otomatis. Silakan gunakan tombol "Nurul Jadid (Paiton)" atau masukkan LT dan BT secara manual.');
  }
}

async function loadCalendarData() {
  const dp = document.getElementById('cal-date-picker');
  const dateStr = (dp && dp.value) ? dp.value : selectedDateStr;
  selectedDateStr = dateStr;

  const parts = dateStr.split('-').map(Number);
  const targetDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0) : new Date();

  const prayerData = await ipcRenderer.invoke('get-prayer-data', dateStr);
  const zone = prayerData.zoneLabel || 'WIB';

  const masehiEl = document.getElementById('res-masehi');
  if (masehiEl) {
    masehiEl.innerText = targetDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  const pasaranEl = document.getElementById('res-pasaran');
  if (pasaranEl) {
    pasaranEl.innerText = `${prayerData.hariPasaran || '-'} (Nilai Us: ${prayerData.usValue || '-'})`;
  }

  const hijriEl = document.getElementById('res-hijriah');
  if (hijriEl) {
    hijriEl.innerText = prayerData.hijriah || '-';
  }

  if (prayerData.yearStartInfo) {
    const ys = prayerData.yearStartInfo;
    const ysEl = document.getElementById('res-year-start');
    if (ysEl) {
      ysEl.innerText = `1 Jan ${ys.year}: ${ys.dayName} ${ys.pasaranName} (Us ${ys.usValue}) - ${ys.jenisTahun}`;
    }
  }

  if (prayerData.coordinates) {
    const coordsEl = document.getElementById('res-coords');
    if (coordsEl) coordsEl.innerText = `${prayerData.coordinates} (${prayerData.coordinatesDMS || ''})`;
  }

  if (prayerData.location) {
    const locStatus = document.getElementById('location-status');
    if (locStatus) locStatus.innerText = `Lokasi aktif: ${prayerData.location} (${prayerData.coordinates})`;
    const nameInput = document.getElementById('input-loc-name');
    const latInput = document.getElementById('input-loc-lat');
    const lonInput = document.getElementById('input-loc-lon');
    if (nameInput && !nameInput.value) nameInput.value = prayerData.location;
    if (latInput && !latInput.value && prayerData.latitude !== undefined) latInput.value = prayerData.latitude;
    if (lonInput && !lonInput.value && prayerData.longitude !== undefined) lonInput.value = prayerData.longitude;
  }

  if (prayerData.hisabDetail) {
    const h = prayerData.hisabDetail;
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };
    setTxt('res-darojat', h.darojatuSyamsi);
    setTxt('res-mail', `${h.mailAwal} (${h.arahMail})`);
    setTxt('res-quthri', `${h.budulQuthri} (${h.statusQuthri})`);
    setTxt('res-muthlaq', h.ashlulMuthlaq);
    setTxt('res-irtifa-ashar', `${h.irtifaAshar} (F: ${h.busurF})`);
    setTxt('res-daqoiq', `${h.daqoiquTafawut} | Selisih: ${h.selisihWIB_WIS}`);
  }

  const prayers = [
    { name: 'Dhuhur',           time: prayerData.dzuhur,  full: prayerData.fullTimes?.dzuhur,  wis: prayerData.wisTimes?.dzuhur },
    { name: 'Ashar',            time: prayerData.ashar,   full: prayerData.fullTimes?.ashar,   wis: prayerData.wisTimes?.ashar },
    { name: 'Maghrib',          time: prayerData.maghrib, full: prayerData.fullTimes?.maghrib, wis: prayerData.wisTimes?.maghrib },
    { name: "Isya'",            time: prayerData.isya,    full: prayerData.fullTimes?.isya,    wis: prayerData.wisTimes?.isya },
    { name: 'Imsak',            time: prayerData.imsak,   full: prayerData.fullTimes?.imsak,   wis: prayerData.wisTimes?.imsak },
    { name: 'Shubuh',           time: prayerData.subuh,   full: prayerData.fullTimes?.subuh,   wis: prayerData.wisTimes?.subuh },
    { name: "Thulu' (Terbit)",  time: prayerData.terbit,  full: prayerData.fullTimes?.terbit,  wis: prayerData.wisTimes?.terbit },
    { name: 'Dluha',            time: prayerData.dhuha,   full: prayerData.fullTimes?.dhuha,   wis: prayerData.wisTimes?.dhuha }
  ];

  const listEl = document.getElementById('res-prayer-list');
  if (listEl) {
    listEl.innerHTML = prayers.map(p => `
      <div class="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between shadow">
        <div class="flex justify-between items-center">
          <span class="text-slate-400 font-medium">${p.name}</span>
          <span class="font-mono font-bold text-sm text-white">${p.time} ${zone}</span>
        </div>
        <div class="flex justify-between items-center mt-1.5 pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-500">
          <span>Detik: ${p.full || p.time}</span>
          <span>WIS: ${p.wis || '-'}</span>
        </div>
      </div>
    `).join('');
  }
}

async function renderMonthlyGrid() {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const calData = await ipcRenderer.invoke('get-monthly-calendar', { year: currentCalYear, month: currentCalMonth });

  const titleEl = document.getElementById('cal-month-title');
  if (titleEl) titleEl.innerText = `${monthNames[currentCalMonth - 1]} ${currentCalYear}`;

  const subEl = document.getElementById('cal-hijri-subtitle');
  if (subEl) subEl.innerText = calData.hijriHeader || '';

  const gridEl = document.getElementById('cal-monthly-grid');
  if (!gridEl || !calData.days) return;

  const firstDayOffset = calData.days[0]?.dayOfWeek || 0;
  let cellsHtml = '';

  for (let i = 0; i < firstDayOffset; i++) {
    cellsHtml += `<div class="p-2 rounded-xl bg-slate-950/30 border border-transparent"></div>`;
  }

  for (const d of calData.days) {
    const isSelected = d.dateStr === selectedDateStr;
    const isSunday = d.dayOfWeek === 0;
    const isFriday = d.dayOfWeek === 5;
    const numColor = isSunday ? 'text-red-400' : (isFriday ? 'text-emerald-400' : 'text-white');

    cellsHtml += `
      <button onclick="calendarModule.selectCalendarDate('${d.dateStr}')"
        class="${isSelected ? 'bg-slate-800 border-amber-500/80 ring-1 ring-amber-500/40' : 'bg-slate-950 hover:bg-slate-800/60 border-slate-800/80'} border p-2.5 rounded-xl flex flex-col items-center justify-center transition cursor-pointer">
        <div class="flex items-baseline space-x-1.5">
          <span class="text-[11px] font-mono text-emerald-400/90">${d.hijriDayArabic}</span>
          <span class="text-base font-bold ${numColor}">${d.masehiDay}</span>
        </div>
        <span class="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5 font-semibold">${d.pasaran}</span>
      </button>
    `;
  }

  gridEl.innerHTML = cellsHtml;
}

async function selectCalendarDate(dateStr) {
  selectedDateStr = dateStr;
  const dp = document.getElementById('cal-date-picker');
  if (dp) dp.value = dateStr;
  await loadCalendarData();
  await renderMonthlyGrid();
}

async function changeMonth(delta) {
  currentCalMonth += delta;
  if (currentCalMonth > 12) {
    currentCalMonth = 1;
    currentCalYear += 1;
  } else if (currentCalMonth < 1) {
    currentCalMonth = 12;
    currentCalYear -= 1;
  }
  await renderMonthlyGrid();
}

async function checkDate() {
  const dp = document.getElementById('cal-date-picker');
  if (dp && dp.value) {
    selectedDateStr = dp.value;
    const [y, m] = dp.value.split('-').map(Number);
    if (y && m) {
      currentCalYear = y;
      currentCalMonth = m;
    }
  }
  await loadCalendarData();
  await renderMonthlyGrid();
}

module.exports = {
  init,
  checkDate,
  fetchGPSLocation,
  saveManualLocation,
  resetPaitonLocation,
  changeMonth,
  selectCalendarDate
};

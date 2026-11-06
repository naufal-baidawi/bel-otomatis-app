const { ipcRenderer } = require('electron');

let currentPrayerData = null;
let prayerBells = [];
let showHisabDetail = false;

async function init() {
  renderLayout();
  await load();
}

function renderLayout() {
  const container = document.getElementById('view-prayer') || createViewContainer();
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Panel Utama Jadwal Shalat Digital Falak -->
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-lg uppercase tracking-wider">Digital Falak Method</span>
              <span id="prayer-pasaran-badge" class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg">-</span>
            </div>
            <h3 id="prayer-location-title" class="text-base font-bold text-slate-100 mt-2">Paiton Probolinggo East Java Indonesia</h3>
            <p id="prayer-hijri-info" class="text-xs text-slate-400 mt-0.5">Memuat penanggalan Hijriah & Masehi...</p>
          </div>

          <div class="flex items-center space-x-3">
            <!-- Box Countdown Waktu Shalat Berikutnya (Gaya Digital Falak) -->
            <div class="bg-slate-950 border border-amber-500/30 px-4 py-2 rounded-xl text-right">
              <div class="text-[10px] text-slate-400">Waktu Shalat Berikutnya</div>
              <div id="prayer-next-countdown" class="text-xs font-mono font-bold text-amber-400">-- -00:00</div>
            </div>

            <button onclick="prayerModule.toggleHisabDetail()" id="btn-toggle-hisab" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-2 border border-slate-700">
              <i class="fa-solid fa-square-root-variable text-amber-400"></i>
              <span>Detail Hisab</span>
            </button>

            <button onclick="prayerModule.load()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-2 border border-slate-700">
              <i class="fa-solid fa-rotate text-blue-400"></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <!-- Grid 8 Waktu Shalat & Ibadah (Urutan Digital Falak) -->
        <div id="prayer-times-grid" class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <!-- Diisi dinamis oleh fungsi load -->
        </div>

        <!-- Panel 6 Langkah Detail Hisab Digital Falak (Collapsible) -->
        <div id="prayer-hisab-detail-panel" class="hidden mt-6 pt-5 border-t border-slate-800">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <i class="fa-solid fa-compass-drafting"></i>
              <span>6 Langkah Perhitungan Awal Waktu Shalat (Metode Kitab & Daqoiqu al-Tafawut)</span>
            </h4>
            <span id="hisab-coords-dms" class="text-[11px] font-mono text-slate-400"></span>
          </div>
          <div id="hisab-steps-grid" class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <!-- Diisi dinamis -->
          </div>
        </div>
      </div>

      <!-- Panel Pengaturan Bel Shalat & Pre-Shalat -->
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 class="text-base font-bold text-slate-100">Pengaturan Bel Shalat & Pre-Shalat Otomatis</h3>
            <p class="text-xs text-slate-400 mt-0.5">Atur bel pengingat sebelum waktu shalat (misal -10 menit Tarhim/Persiapan) atau tepat saat masuk waktu shalat (0 menit).</p>
          </div>
          <button onclick="prayerModule.openModal()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow">
            <i class="fa-solid fa-plus"></i><span>Tambah Bel Shalat</span>
          </button>
        </div>

        <div id="prayer-bells-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Daftar bel shalat dimuat di sini -->
        </div>
      </div>
    </div>

    <!-- Modal Form Bel Shalat / Pre-Shalat -->
    <div id="prayer-bell-modal" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden flex justify-center items-center z-50">
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
        <div class="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 id="pb-modal-title" class="text-sm font-bold text-slate-100">Tambah Bel Shalat / Pre-Shalat</h3>
          <button onclick="prayerModule.closeModal()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <input type="hidden" id="pb-id">
        <div>
          <label class="block text-xs text-slate-400 mb-1.5 font-medium">Nama Pengingat / Kegiatan</label>
          <input type="text" id="pb-title" placeholder="Contoh: Persiapan Jamaah Dzuhur / Tarhim Shubuh" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1.5 font-medium">Waktu Shalat Acuan</label>
            <select id="pb-prayer-name" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none">
              <option value="Dhuhur">Dhuhur</option>
              <option value="Ashar">Ashar</option>
              <option value="Maghrib">Maghrib</option>
              <option value="Isya">Isya'</option>
              <option value="Imsak">Imsak</option>
              <option value="Shubuh">Shubuh</option>
              <option value="Thulu">Thulu' (Terbit)</option>
              <option value="Dluha">Dluha</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1.5 font-medium">Offset Menit (- / 0 / +)</label>
            <input type="number" id="pb-offset" value="-10" placeholder="-10" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none">
            <span class="text-[10px] text-slate-500">Misal: -10 (10 mnt sebelum), 0 (tepat)</span>
          </div>
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1.5 font-medium">Audio Bel / MP3 File</label>
          <div class="flex space-x-2 items-center">
            <button onclick="prayerModule.selectAudio()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-blue-400">Choose File</button>
            <span id="pb-audio-label" class="text-xs text-slate-400 truncate">Default Chime</span>
          </div>
          <input type="hidden" id="pb-audio-path" value="default">
        </div>
        <div class="flex items-center space-x-2 pt-1">
          <input type="checkbox" id="pb-active" checked class="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 w-4 h-4">
          <label for="pb-active" class="text-xs text-slate-300 font-medium">Aktifkan Bel Shalat Ini</label>
        </div>
        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button onclick="prayerModule.closeModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 font-medium">Batal</button>
          <button onclick="prayerModule.save()" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white shadow">Simpan</button>
        </div>
      </div>
    </div>
  `;
}

function toggleHisabDetail() {
  showHisabDetail = !showHisabDetail;
  const panel = document.getElementById('prayer-hisab-detail-panel');
  if (panel) {
    panel.classList.toggle('hidden', !showHisabDetail);
  }
}

function computeNextPrayer(data) {
  const now = new Date();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const order = [
    { key: 'dzuhur',  label: 'Dhuhur',  time: data.dzuhur,  full: data.fullTimes?.dzuhur  || `${data.dzuhur}:00`,  wis: data.wisTimes?.dzuhur },
    { key: 'ashar',   label: 'Ashar',   time: data.ashar,   full: data.fullTimes?.ashar   || `${data.ashar}:00`,   wis: data.wisTimes?.ashar },
    { key: 'maghrib', label: 'Maghrib', time: data.maghrib, full: data.fullTimes?.maghrib || `${data.maghrib}:00`, wis: data.wisTimes?.maghrib },
    { key: 'isya',    label: "Isya'",   time: data.isya,    full: data.fullTimes?.isya    || `${data.isya}:00`,    wis: data.wisTimes?.isya },
    { key: 'imsak',   label: 'Imsak',   time: data.imsak,   full: data.fullTimes?.imsak   || `${data.imsak}:00`,   wis: data.wisTimes?.imsak },
    { key: 'subuh',   label: 'Shubuh',  time: data.subuh,   full: data.fullTimes?.subuh   || `${data.subuh}:00`,   wis: data.wisTimes?.subuh },
    { key: 'terbit',  label: "Thulu'",  time: data.terbit,  full: data.fullTimes?.terbit  || `${data.terbit}:00`,  wis: data.wisTimes?.terbit },
    { key: 'dhuha',   label: 'Dluha',   time: data.dhuha,   full: data.fullTimes?.dhuha   || `${data.dhuha}:00`,   wis: data.wisTimes?.dhuha }
  ];

  let best = null;
  let minDiff = Infinity;

  for (const item of order) {
    const parts = item.full.split(':').map(Number);
    const itemSec = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    let diff = itemSec - nowSec;
    if (diff <= 0) diff += 86400;
    if (diff < minDiff) {
      minDiff = diff;
      best = item;
    }
  }

  const hh = String(Math.floor(minDiff / 3600)).padStart(2, '0');
  const mm = String(Math.floor((minDiff % 3600) / 60)).padStart(2, '0');
  return { order, nextKey: best?.key, nextLabel: best?.label, countdownStr: `${best?.label || ''} -${hh}:${mm}` };
}

function addMinutesStr(timeStr, offsetMin) {
  if (!timeStr || !timeStr.includes(':')) return '--:--';
  const [h, m] = timeStr.split(':').map(Number);
  let total = h * 60 + m + (parseInt(offsetMin, 10) || 0);
  total = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

async function load() {
  try {
    const data = await ipcRenderer.invoke('get-prayer-data');
    currentPrayerData = data;
    const zone = data.zoneLabel || 'WIB';

    const locTitle = document.getElementById('prayer-location-title');
    if (locTitle) locTitle.innerText = data.location || 'Paiton Probolinggo East Java Indonesia';

    const pasaranBadge = document.getElementById('prayer-pasaran-badge');
    if (pasaranBadge) {
      pasaranBadge.innerText = `${data.hariPasaran || '-'} (Us: ${data.usValue || '-'})`;
    }

    const hijriEl = document.getElementById('prayer-hijri-info');
    if (hijriEl) {
      hijriEl.innerText = `Tanggal Hijriah: ${data.hijriah || '-'} | Koordinat: ${data.coordinates || '-'} | ${data.source}`;
    }

    const { order, nextKey, countdownStr } = computeNextPrayer(data);

    const nextCdEl = document.getElementById('prayer-next-countdown');
    if (nextCdEl) nextCdEl.innerText = countdownStr;

    const grid = document.getElementById('prayer-times-grid');
    if (grid) {
      grid.innerHTML = order.map(p => {
        const isNext = p.key === nextKey;
        return `
          <div class="${isNext ? 'bg-slate-800/90 border-amber-500/60 ring-1 ring-amber-500/30' : 'bg-slate-950 border-slate-800/80'} border p-4 rounded-xl flex flex-col justify-between shadow transition">
            <div class="flex justify-between items-center">
              <span class="text-xs ${isNext ? 'text-amber-300 font-bold' : 'text-slate-400 font-medium'}">${p.label}</span>
              ${isNext ? '<span class="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold uppercase">Selanjutnya</span>' : ''}
            </div>
            <span class="text-lg font-mono font-bold ${isNext ? 'text-amber-300' : 'text-white'} mt-2">
              ${isNext ? p.full : p.time} <span class="text-xs font-normal">${zone}</span>
            </span>
            <div class="flex justify-between items-center mt-1 text-[10px] font-mono text-slate-500">
              <span>Full: ${p.full}</span>
              <span>WIS: ${p.wis || '-'}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Isi detail langkah hisab
    if (data.hisabDetail) {
      const dmsEl = document.getElementById('hisab-coords-dms');
      if (dmsEl) dmsEl.innerText = data.coordinatesDMS || '';
      const h = data.hisabDetail;
      const stepsEl = document.getElementById('hisab-steps-grid');
      if (stepsEl) {
        stepsEl.innerHTML = `
          <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
            <div class="text-[10px] text-slate-400">1. Darojatu Al-Syamsi (M)</div>
            <div class="font-mono font-bold text-slate-100 mt-0.5">${h.darojatuSyamsi}</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
            <div class="text-[10px] text-slate-400">2. Mail Awal (D)</div>
            <div class="font-mono font-bold text-emerald-400 mt-0.5">${h.mailAwal} <span class="text-[10px] text-slate-400">(${h.arahMail})</span></div>
          </div>
          <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
            <div class="text-[10px] text-slate-400">3. Bu'dul Quthri (X)</div>
            <div class="font-mono font-bold text-blue-400 mt-0.5">${h.budulQuthri} <span class="text-[10px] text-slate-400">(${h.statusQuthri})</span></div>
          </div>
          <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
            <div class="text-[10px] text-slate-400">4. Ashlul Muthlaq (Y)</div>
            <div class="font-mono font-bold text-slate-100 mt-0.5">${h.ashlulMuthlaq}</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
            <div class="text-[10px] text-slate-400">5. Irtifa' 'Ashar (F = ${h.busurF})</div>
            <div class="font-mono font-bold text-amber-400 mt-0.5">${h.irtifaAshar}</div>
          </div>
          <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
            <div class="text-[10px] text-slate-400">6. Daqoiq (${h.daqoiquTafawut}) & Selisih WIB-WIS</div>
            <div class="font-mono font-bold text-purple-400 mt-0.5">${h.selisihWIB_WIS}</div>
          </div>
        `;
      }
    }

    await loadPrayerBells();
  } catch (e) {
    console.error('Gagal memuat jadwal shalat falak:', e);
  }
}

async function loadPrayerBells() {
  prayerBells = await ipcRenderer.invoke('get-prayer-bells');
  const container = document.getElementById('prayer-bells-grid');
  if (!container) return;

  if (prayerBells.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 bg-slate-950 border border-slate-800/80 p-6 rounded-2xl text-center text-xs text-slate-500">
        Belum ada bel shalat / pre-shalat. Klik <b>"Tambah Bel Shalat"</b> untuk membuat pengingat otomatis (misal 10 menit sebelum waktu shalat).
      </div>
    `;
    return;
  }

  const timeLookup = {
    imsak: currentPrayerData?.imsak,
    subuh: currentPrayerData?.subuh,
    shubuh: currentPrayerData?.subuh,
    terbit: currentPrayerData?.terbit,
    thulu: currentPrayerData?.terbit,
    dhuha: currentPrayerData?.dhuha,
    dluha: currentPrayerData?.dhuha,
    dzuhur: currentPrayerData?.dzuhur,
    dhuhur: currentPrayerData?.dzuhur,
    ashar: currentPrayerData?.ashar,
    maghrib: currentPrayerData?.maghrib,
    isya: currentPrayerData?.isya
  };

  container.innerHTML = prayerBells.map(item => {
    const key = String(item.prayer_name || '').toLowerCase().replace(/[^a-z]/g, '');
    const baseTime = timeLookup[key] || '--:--';
    const triggerTime = addMinutesStr(baseTime, item.offset_minutes || 0);
    const offsetNum = parseInt(item.offset_minutes, 10) || 0;
    const offsetText = offsetNum === 0
      ? `Tepat waktu ${item.prayer_name} (${baseTime})`
      : (offsetNum < 0 ? `${Math.abs(offsetNum)} menit sebelum ${item.prayer_name} (${baseTime})` : `${offsetNum} menit sesudah ${item.prayer_name} (${baseTime})`);
    const fileName = item.audio_path && item.audio_path !== 'default'
      ? item.audio_path.split('\\').pop().split('/').pop()
      : 'Default Chime';

    return `
      <div class="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center shadow">
        <div class="flex items-center space-x-4">
          <div class="bg-emerald-600/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl font-mono text-base font-bold text-emerald-400">${triggerTime}</div>
          <div>
            <h4 class="text-sm font-bold text-slate-200">${item.title || `Bel ${item.prayer_name}`}</h4>
            <p class="text-[10px] text-emerald-400 font-medium mt-0.5"><i class="fa-solid fa-mosque mr-1"></i> ${offsetText}</p>
            <p class="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]"><i class="fa-solid fa-music mr-1"></i> ${fileName}</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <button onclick="prayerModule.toggleActive(${item.id}, ${item.is_active ? 0 : 1})" class="text-[11px] px-2.5 py-1 rounded-full font-semibold cursor-pointer ${item.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}">
            ${item.is_active ? 'Aktif' : 'Non-aktif'}
          </button>
          <div class="flex space-x-1 border-l border-slate-800 pl-3">
            <button onclick="prayerModule.previewAudio(${item.id}, this)" class="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition" title="Play / Pause"><i class="fa-solid fa-play text-xs"></i></button>
            <button onclick="prayerModule.openModal(${item.id})" class="p-2 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition" title="Edit"><i class="fa-solid fa-pen text-xs"></i></button>
            <button onclick="prayerModule.remove(${item.id})" class="p-2 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition" title="Hapus"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function previewAudio(id, btnEl) {
  const item = prayerBells.find(p => p.id === id);
  if (item && window.playAudioFile) {
    window.playAudioFile(item.audio_path, btnEl);
  }
}

async function toggleActive(id, newState) {
  await ipcRenderer.invoke('toggle-prayer-bell', { id, isActive: newState });
  await loadPrayerBells();
}

function openModal(id = null) {
  const modal = document.getElementById('prayer-bell-modal');
  if (modal) modal.classList.remove('hidden');

  if (id) {
    const item = prayerBells.find(p => p.id === id);
    if (!item) return;
    document.getElementById('pb-modal-title').innerText = 'Edit Bel Shalat / Pre-Shalat';
    document.getElementById('pb-id').value = item.id;
    document.getElementById('pb-title').value = item.title || '';
    document.getElementById('pb-prayer-name').value = item.prayer_name || 'Dhuhur';
    document.getElementById('pb-offset').value = item.offset_minutes ?? 0;
    document.getElementById('pb-audio-path').value = item.audio_path || 'default';
    document.getElementById('pb-audio-label').innerText = item.audio_path && item.audio_path !== 'default'
      ? item.audio_path.split('\\').pop().split('/').pop()
      : 'Default Chime';
    document.getElementById('pb-active').checked = item.is_active === 1;
  } else {
    document.getElementById('pb-modal-title').innerText = 'Tambah Bel Shalat / Pre-Shalat';
    document.getElementById('pb-id').value = '';
    document.getElementById('pb-title').value = '';
    document.getElementById('pb-prayer-name').value = 'Dhuhur';
    document.getElementById('pb-offset').value = -10;
    document.getElementById('pb-audio-path').value = 'default';
    document.getElementById('pb-audio-label').innerText = 'Default Chime';
    document.getElementById('pb-active').checked = true;
  }
}

function closeModal() {
  const modal = document.getElementById('prayer-bell-modal');
  if (modal) modal.classList.add('hidden');
}

async function selectAudio() {
  const file = await ipcRenderer.invoke('dialog-open-audio');
  if (file) {
    document.getElementById('pb-audio-path').value = file;
    document.getElementById('pb-audio-label').innerText = file.split('\\').pop().split('/').pop();
  }
}

async function save() {
  const id = document.getElementById('pb-id').value;
  const prayerName = document.getElementById('pb-prayer-name').value;
  const title = document.getElementById('pb-title').value.trim() || `Bel ${prayerName}`;
  const offsetMinutes = parseInt(document.getElementById('pb-offset').value, 10) || 0;
  const audio_path = document.getElementById('pb-audio-path').value || 'default';
  const isActive = document.getElementById('pb-active').checked;

  if (id) {
    await ipcRenderer.invoke('update-prayer-bell', { id: parseInt(id, 10), prayerName, title, offsetMinutes, audio_path, isActive });
  } else {
    await ipcRenderer.invoke('save-prayer-bell', { prayerName, title, offsetMinutes, audio_path, isActive });
  }
  closeModal();
  await loadPrayerBells();
}

async function remove(id) {
  if (confirm('Hapus pengingat bel shalat ini?')) {
    await ipcRenderer.invoke('delete-prayer-bell', id);
    await loadPrayerBells();
  }
}

function createViewContainer() {
  const mainContent = document.querySelector('main') || document.body;
  const div = document.createElement('div');
  div.id = 'view-prayer';
  div.className = 'p-6 hidden';
  mainContent.appendChild(div);
  return div;
}

module.exports = {
  init,
  load,
  toggleHisabDetail,
  openModal,
  closeModal,
  selectAudio,
  save,
  remove,
  toggleActive,
  previewAudio
};

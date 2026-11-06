const { ipcRenderer } = require('electron');

let routines = [];
const allDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function init() {
  renderLayout();
  load();
}

function renderLayout() {
  document.getElementById('view-routine').innerHTML = `
    <div class="space-y-6">
      <div class="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow">
        <div>
          <h3 class="text-base font-bold text-slate-100">Pengaturan Bel Kegiatan Harian</h3>
          <p class="text-xs text-slate-400 mt-0.5">Atur jadwal bel rutin beserta hari aktif (libur otomatis jika tidak dicentang).</p>
        </div>
        <button onclick="routineModule.openModal()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow">
          <i class="fa-solid fa-plus"></i><span>Tambah Bel Harian</span>
        </button>
      </div>

      <div id="routine-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Card item dimuat di sini -->
      </div>
    </div>

    <!-- Modal Form (Tambah / Edit) -->
    <div id="routine-modal" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden flex justify-center items-center z-50">
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
        <div class="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 id="routine-modal-title" class="text-sm font-bold text-slate-100">Tambah Bel Harian</h3>
          <button onclick="routineModule.closeModal()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <input type="hidden" id="r-id">
        <div>
          <label class="block text-xs text-slate-400 mb-1.5 font-medium">Nama Kegiatan</label>
          <input type="text" id="r-title" placeholder="Contoh: Bel Masuk Kelas / Istirahat" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1.5 font-medium">Waktu Alarm (HH:mm)</label>
          <input type="time" id="r-time" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none">
        </div>
        
        <!-- Pilihan Ceklis Hari Aktif -->
        <div>
          <label class="block text-xs text-slate-400 mb-1.5 font-medium">Hari Aktif (Ceklis hari di mana bel berbunyi)</label>
          <div class="grid grid-cols-4 gap-2 pt-1">
            ${allDays.map(d => `
              <label class="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 p-2 rounded-xl cursor-pointer text-xs">
                <input type="checkbox" value="${d}" name="r-day" checked class="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-0 w-3.5 h-3.5">
                <span class="text-slate-300">${d}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="block text-xs text-slate-400 mb-1.5 font-medium">Audio Bel / MP3 File</label>
          <div class="flex space-x-2 items-center">
            <button onclick="routineModule.selectAudio()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-blue-400">Choose File</button>
            <span id="r-audio-label" class="text-xs text-slate-400 truncate">Default Chime</span>
          </div>
          <input type="hidden" id="r-audio-path" value="default">
        </div>
        <div class="flex items-center space-x-2 pt-2">
          <input type="checkbox" id="r-active" checked class="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 w-4 h-4">
          <label for="r-active" class="text-xs text-slate-300 font-medium">Aktifkan Bel Ini</label>
        </div>
        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button onclick="routineModule.closeModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 font-medium">Batal</button>
          <button onclick="routineModule.save()" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white shadow">Simpan Bel</button>
        </div>
      </div>
    </div>
  `;
}

async function load() {
  routines = await ipcRenderer.invoke('get-routine-bells');
  const container = document.getElementById('routine-grid');
  if (!container) return;

  if (routines.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 bg-slate-950 border border-slate-800/80 p-8 rounded-2xl text-center text-xs text-slate-500">
        Belum ada bel kegiatan harian. Klik <b>"Tambah Bel Harian"</b> untuk menambahkan jadwal rutin.
      </div>
    `;
    return;
  }

  container.innerHTML = routines.map(item => {
    let daysArr = [];
    try { daysArr = JSON.parse(item.days || '[]'); } catch(e) {}
    const daysStr = daysArr.length === 7 ? 'Setiap Hari' : (daysArr.length > 0 ? daysArr.join(', ') : 'Tidak ada hari aktif');
    const audioName = item.audio_path && item.audio_path !== 'default'
      ? item.audio_path.split('\\').pop().split('/').pop()
      : 'Default Chime';

    return `
      <div class="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex justify-between items-center shadow">
        <div class="flex items-center space-x-4">
          <div class="bg-blue-600/10 border border-blue-500/20 px-3.5 py-2.5 rounded-xl font-mono text-base font-bold text-blue-400">${item.time}</div>
          <div>
            <h4 class="text-sm font-bold text-slate-200">${item.title}</h4>
            <p class="text-[10px] text-blue-400 font-medium mt-0.5"><i class="fa-solid fa-calendar-days mr-1"></i> ${daysStr}</p>
            <p class="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]"><i class="fa-solid fa-music mr-1"></i> ${audioName}</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <button onclick="routineModule.toggleActive(${item.id}, ${item.is_active ? 0 : 1})" class="text-[11px] px-2.5 py-1 rounded-full font-semibold cursor-pointer ${item.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}">
            ${item.is_active ? 'Aktif' : 'Non-aktif'}
          </button>
          <div class="flex space-x-1 border-l border-slate-800 pl-3">
            <button onclick="routineModule.previewAudio(${item.id}, this)" class="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition" title="Play / Pause"><i class="fa-solid fa-play text-xs"></i></button>
            <button onclick="routineModule.openModal(${item.id})" class="p-2 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition" title="Edit"><i class="fa-solid fa-pen text-xs"></i></button>
            <button onclick="routineModule.remove(${item.id})" class="p-2 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition" title="Hapus"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function previewAudio(id, btnEl) {
  const item = routines.find(r => r.id === id);
  if (item && window.playAudioFile) {
    window.playAudioFile(item.audio_path, btnEl);
  }
}

async function toggleActive(id, newState) {
  await ipcRenderer.invoke('toggle-routine-bell', { id, isActive: newState });
  await load();
}

function openModal(id = null) {
  document.getElementById('routine-modal').classList.remove('hidden');
  const dayCheckboxes = document.querySelectorAll('input[name="r-day"]');

  if (id) {
    const item = routines.find(r => r.id === id);
    if (!item) return;
    document.getElementById('routine-modal-title').innerText = 'Edit Bel Harian';
    document.getElementById('r-id').value = item.id;
    document.getElementById('r-title').value = item.title;
    document.getElementById('r-time').value = item.time;
    document.getElementById('r-audio-path').value = item.audio_path || 'default';
    document.getElementById('r-audio-label').innerText = item.audio_path && item.audio_path !== 'default'
      ? item.audio_path.split('\\').pop().split('/').pop()
      : 'Default Chime';
    document.getElementById('r-active').checked = item.is_active === 1;

    let activeDays = [];
    try { activeDays = JSON.parse(item.days || '[]'); } catch(e) {}
    dayCheckboxes.forEach(cb => {
      cb.checked = activeDays.includes(cb.value);
    });
  } else {
    document.getElementById('routine-modal-title').innerText = 'Tambah Bel Harian';
    document.getElementById('r-id').value = '';
    document.getElementById('r-title').value = '';
    document.getElementById('r-time').value = '';
    document.getElementById('r-audio-path').value = 'default';
    document.getElementById('r-audio-label').innerText = 'Default Chime';
    document.getElementById('r-active').checked = true;
    dayCheckboxes.forEach(cb => cb.checked = true); // Default semua hari tercentang
  }
}

function closeModal() {
  document.getElementById('routine-modal').classList.add('hidden');
}

async function selectAudio() {
  const file = await ipcRenderer.invoke('dialog-open-audio');
  if (file) {
    document.getElementById('r-audio-path').value = file;
    document.getElementById('r-audio-label').innerText = file.split('\\').pop().split('/').pop();
  }
}

async function save() {
  const id = document.getElementById('r-id').value;
  const title = document.getElementById('r-title').value.trim();
  const time = document.getElementById('r-time').value;
  const audio_path = document.getElementById('r-audio-path').value || 'default';
  const isActive = document.getElementById('r-active').checked;

  const selectedDays = [];
  document.querySelectorAll('input[name="r-day"]:checked').forEach(cb => {
    selectedDays.push(cb.value);
  });

  if (!title || !time) return alert('Nama dan Waktu wajib diisi!');
  if (selectedDays.length === 0) return alert('Pilih minimal satu hari aktif!');

  if (id) {
    await ipcRenderer.invoke('update-routine-bell', { id: parseInt(id, 10), title, time, days: selectedDays, audio_path, isActive });
  } else {
    await ipcRenderer.invoke('save-routine-bell', { title, time, days: selectedDays, audio_path, isActive });
  }
  closeModal();
  await load();
}

async function remove(id) {
  if (confirm('Hapus kegiatan ini?')) {
    await ipcRenderer.invoke('delete-routine-bell', id);
    await load();
  }
}

module.exports = {
  init,
  load,
  openModal,
  closeModal,
  selectAudio,
  save,
  remove,
  toggleActive,
  previewAudio
};

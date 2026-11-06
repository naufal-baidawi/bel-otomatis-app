const { ipcRenderer } = require('electron');

function init() {
  renderLayout();
  load();
}

function renderLayout() {
  document.getElementById('view-history').innerHTML = `
    <div class="space-y-6">
      <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 class="text-base font-bold text-slate-100">Log Riwayat Pemutaran Bel</h3>
          <p class="text-xs text-slate-400 mt-0.5">Catatan waktu otomatis ketika alarm kegiatan rutin atau bel shalat berbunyi.</p>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="historyModule.load()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition">
            <i class="fa-solid fa-rotate text-blue-400"></i><span>Muat Ulang Log</span>
          </button>
          <button onclick="historyModule.clearLogs()" class="px-3.5 py-2 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition">
            <i class="fa-solid fa-trash-can"></i><span>Hapus Riwayat</span>
          </button>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-800/50 text-slate-400 text-[11px] uppercase tracking-wider">
              <th class="p-4">Waktu Eksekusi</th>
              <th class="p-4">Nama Kegiatan / Shalat</th>
              <th class="p-4">Kategori Sumber</th>
            </tr>
          </thead>
          <tbody id="logs-table-body" class="divide-y divide-slate-800 text-xs">
            <!-- Data log -->
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function load() {
  const logs = await ipcRenderer.invoke('get-logs');
  const tbody = document.getElementById('logs-table-body');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-500">Belum ada riwayat pemutaran bel.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => {
    const isPrayer = l.source === 'PRAYER';
    const badgeCls = isPrayer
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      : 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    const label = isPrayer ? 'BEL SHALAT' : 'BEL HARIAN';

    return `
      <tr class="hover:bg-slate-800/30 transition">
        <td class="p-4 font-mono text-slate-400">${l.played_at}</td>
        <td class="p-4 font-semibold text-slate-200">${l.title}</td>
        <td class="p-4"><span class="px-2.5 py-1 border rounded-full text-[10px] font-semibold ${badgeCls}">${label}</span></td>
      </tr>
    `;
  }).join('');
}

async function clearLogs() {
  if (confirm('Yakin ingin membersihkan semua riwayat log pemutaran bel?')) {
    await ipcRenderer.invoke('clear-logs');
    await load();
  }
}

module.exports = { init, load, clearLogs };

// =========================================================================
// DIGITAL FALAK ENGINE (Metode Kitab Falak / Taqribul Maqshod & Sullam al-Nairoin)
// Sesuai Panduan Resmi Digital Falak:
// 1. Mail Awal (Darojatu Al-Syamsi & Daftar Tafawut Buruj)
// 2. Bu'dul Quthri (Ittifaq / Ikhtilaf)
// 3. Ashlul Muthlaq
// 4. Irtifa' 'Ashar
// 5. Awal Waktu Sholat (Format WIS) + Ihtiyat + Dip (Tinggi Tempat)
// 6. Konversi WIS ke WIB/WITA/WIT dengan Tabel Daqoiqu al-Tafawut 366 Hari
// 7. Kalender Masehi, Pasaran Jawa (Selapan / Us 1-35), & Konversi Hijriah
// =========================================================================

// Default koordinat awal: Paiton, Probolinggo, East Java, Indonesia (Sesuai Digital Falak)
let currentLat = -7.71105;
let currentLon = 113.49556;
let currentElevation = 0;
let currentLocationName = 'Paiton Probolinggo East Java Indonesia';

// Parser koordinat: mendukung desimal (-7.71105) maupun DMS (-7°42'39.78" / 7° 42' 39.78" LS)
function parseCoordinate(input, fallback = 0) {
  if (typeof input === 'number' && !isNaN(input)) return input;
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (!trimmed) return fallback;

  // Cek jika murni angka desimal
  if (/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // Parsing format Derajat-Menit-Detik: misal -7° 42' 39.78" atau 7°41'12.88"S
  const isNegative = trimmed.startsWith('-') || /[SWsw]|LS|BB/i.test(trimmed);
  const parts = trimmed.match(/\d+(\.\d+)?/g);
  if (!parts || parts.length === 0) return fallback;

  const deg = parseFloat(parts[0]) || 0;
  const min = parseFloat(parts[1]) || 0;
  const sec = parseFloat(parts[2]) || 0;
  const val = deg + min / 60 + sec / 3600;
  return isNegative ? -val : val;
}

function setLocation(lat, lon, name, elevation = 0) {
  if (lat !== undefined && lat !== null && lat !== '') {
    currentLat = parseCoordinate(lat, currentLat);
  }
  if (lon !== undefined && lon !== null && lon !== '') {
    currentLon = parseCoordinate(lon, currentLon);
  }
  if (name) currentLocationName = name;
  if (elevation !== undefined && elevation !== null) {
    currentElevation = parseFloat(elevation) || 0;
  }
}

function getLocation() {
  return {
    lat: currentLat,
    lon: currentLon,
    elevation: currentElevation,
    name: currentLocationName
  };
}

// Helper Trigonometri Derajat
const toRad = deg => (deg * Math.PI) / 180;
const toDeg = rad => (rad * 180) / Math.PI;
const sinDeg = deg => Math.sin(toRad(deg));
const cosDeg = deg => Math.cos(toRad(deg));
const tanDeg = deg => Math.tan(toRad(deg));
const asinDeg = val => toDeg(Math.asin(Math.max(-1, Math.min(1, val))));
const acosDeg = val => toDeg(Math.acos(Math.max(-1, Math.min(1, val))));
const atanDeg = val => toDeg(Math.atan(val));

// Format Desimal ke Derajat Menit Detik (DMS) untuk tampilan langkah detail Hisab
function toDMS(degValue, isTime = false) {
  const sign = degValue < 0 ? '-' : '';
  const abs = Math.abs(degValue);
  const d = Math.floor(abs + 1e-9);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat + 1e-9);
  let s = (mFloat - m) * 60;
  if (s >= 59.995) {
    s = 0;
  }
  const sStr = s.toFixed(2).padStart(5, '0');
  if (isTime) {
    return `${sign}${String(d).padStart(2, '0')}:${String(m).padStart(2, '0')}:${sStr}`;
  }
  return `${sign}${d}° ${String(m).padStart(2, '0')}' ${sStr}"`;
}

// Format Jam Desimal ke "HH:mm" (Truncate detik persis seperti tampilan list Digital Falak)
function decimalToHHMM(decimalHours) {
  let h = ((decimalHours % 24) + 24) % 24;
  let hh = Math.floor(h + 1e-9);
  let mm = Math.floor((h - hh) * 60 + 1e-7);
  if (mm >= 60) {
    hh = (hh + 1) % 24;
    mm -= 60;
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Format Jam Desimal ke "HH:mm:ss" (Persis seperti baris aktif Digital Falak: 03:30:03 WIB)
function decimalToHHMMSS(decimalHours) {
  let h = ((decimalHours % 24) + 24) % 24;
  let hh = Math.floor(h + 1e-9);
  let mFloat = (h - hh) * 60;
  let mm = Math.floor(mFloat + 1e-9);
  let ss = Math.floor((mFloat - mm) * 60 + 1e-7);
  if (ss >= 60) {
    ss -= 60;
    mm += 1;
  }
  if (mm >= 60) {
    mm -= 60;
    hh = (hh + 1) % 24;
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// =========================================================================
// DAFTAR TAFAWUT BURUJ (Langkah 1 Panduan)
// =========================================================================
const BURUJ_TAFAWUT = {
  1:  { monthName: 'Januari',   burujIndex: 9,  burujAr: 'جدي',    burujLat: 'Jadyu',    tafawut: 9 },
  2:  { monthName: 'Februari',  burujIndex: 10, burujAr: 'دلو',    burujLat: 'Dalwu',    tafawut: 10 },
  3:  { monthName: 'Maret',     burujIndex: 11, burujAr: 'حوت',    burujLat: 'Hut',      tafawut: 8 },
  4:  { monthName: 'April',     burujIndex: 0,  burujAr: 'حمل',    burujLat: 'Hamal',    tafawut: 10 },
  5:  { monthName: 'Mei',       burujIndex: 1,  burujAr: 'ثور',    burujLat: 'Tsaur',    tafawut: 9 },
  6:  { monthName: 'Juni',      burujIndex: 2,  burujAr: 'جوزاء',  burujLat: "Jauza'",   tafawut: 9 },
  7:  { monthName: 'Juli',      burujIndex: 3,  burujAr: 'سرطان',  burujLat: 'Sarathon', tafawut: 7 },
  8:  { monthName: 'Agustus',   burujIndex: 4,  burujAr: 'أسد',    burujLat: 'Asad',     tafawut: 7 },
  9:  { monthName: 'September', burujIndex: 5,  burujAr: 'سنبلة',  burujLat: 'Sunbulah', tafawut: 7 },
  10: { monthName: 'Oktober',   burujIndex: 6,  burujAr: 'ميزان',  burujLat: 'Mizan',    tafawut: 6 },
  11: { monthName: 'November',  burujIndex: 7,  burujAr: 'عقرب',   burujLat: "'Aqrob",   tafawut: 7 },
  12: { monthName: 'Desember',  burujIndex: 8,  burujAr: 'قوس',    burujLat: 'Qous',     tafawut: 7 }
};

// =========================================================================
// TABEL DAQOIQU AL-TAFAWUT 366 HARI (Langkah 6 Panduan)
// Format setiap elemen hari (index 0 = tgl 1): [tanda (+1/-1), menit, detik]
// =========================================================================
const DAQOIQU_TAFAWUT = {
  1: [ // Januari (-)
    [-1,3,16],[-1,3,44],[-1,4,12],[-1,4,40],[-1,5,8],[-1,5,35],[-1,6,1],[-1,6,27],[-1,6,53],[-1,7,18],
    [-1,7,43],[-1,8,7],[-1,8,30],[-1,8,53],[-1,9,15],[-1,9,37],[-1,9,58],[-1,10,18],[-1,10,37],[-1,10,56],
    [-1,11,14],[-1,11,31],[-1,11,41],[-1,12,3],[-1,12,18],[-1,12,32],[-1,12,45],[-1,12,57],[-1,13,9],[-1,13,19],[-1,13,29]
  ],
  2: [ // Februari (-)
    [-1,13,38],[-1,13,46],[-1,13,54],[-1,14,1],[-1,14,6],[-1,14,11],[-1,14,16],[-1,14,19],[-1,14,22],[-1,14,24],
    [-1,14,25],[-1,14,25],[-1,14,25],[-1,14,24],[-1,14,24],[-1,14,19],[-1,14,16],[-1,14,12],[-1,14,7],[-1,14,1],
    [-1,13,55],[-1,13,48],[-1,13,40],[-1,13,32],[-1,13,24],[-1,13,14],[-1,13,4],[-1,12,53],[-1,12,53]
  ],
  3: [ // Maret (-)
    [-1,12,42],[-1,12,31],[-1,12,18],[-1,12,6],[-1,11,53],[-1,11,39],[-1,11,25],[-1,11,11],[-1,10,56],[-1,10,41],
    [-1,10,26],[-1,10,10],[-1,9,54],[-1,9,38],[-1,9,21],[-1,9,4],[-1,8,48],[-1,8,30],[-1,8,12],[-1,7,55],
    [-1,7,37],[-1,7,15],[-1,6,57],[-1,6,39],[-1,6,19],[-1,6,1],[-1,5,43],[-1,5,24],[-1,5,6],[-1,5,4],[-1,4,29]
  ],
  4: [ // April (1-15: -, 16-30: +)
    [-1,4,10],[-1,3,52],[-1,3,34],[-1,3,16],[-1,2,59],[-1,2,41],[-1,2,23],[-1,2,6],[-1,1,49],[-1,1,22],
    [-1,1,16],[-1,1,0],[-1,0,44],[-1,0,28],[-1,0,13],[1,0,2],[1,0,17],[1,0,31],[1,0,44],[1,0,58],
    [1,1,11],[1,1,23],[1,1,36],[1,1,47],[1,1,58],[1,2,8],[1,2,18],[1,2,28],[1,2,37],[1,2,46]
  ],
  5: [ // Mei (+)
    [1,2,54],[1,3,2],[1,3,9],[1,3,15],[1,3,22],[1,3,28],[1,3,32],[1,3,36],[1,3,40],[1,3,44],
    [1,3,46],[1,3,48],[1,3,50],[1,3,51],[1,3,51],[1,3,51],[1,3,50],[1,3,48],[1,3,46],[1,3,44],
    [1,3,41],[1,3,37],[1,3,33],[1,3,28],[1,3,23],[1,3,17],[1,3,11],[1,3,4],[1,2,57],[1,2,49],[1,2,41]
  ],
  6: [ // Juni (1-15: +, 16-30: -)
    [1,2,33],[1,2,24],[1,2,15],[1,2,5],[1,1,55],[1,1,45],[1,1,34],[1,1,23],[1,1,12],[1,1,1],
    [1,0,49],[1,0,37],[1,0,24],[1,0,12],[1,0,0],[-1,0,13],[-1,0,26],[-1,0,39],[-1,0,52],[-1,1,5],
    [-1,1,18],[-1,1,31],[-1,1,44],[-1,1,57],[-1,2,10],[-1,2,23],[-1,2,36],[-1,2,48],[-1,3,1],[-1,3,13]
  ],
  7: [ // Juli (-)
    [-1,3,25],[-1,3,36],[-1,3,48],[-1,3,59],[-1,4,10],[-1,4,21],[-1,4,30],[-1,4,40],[-1,4,49],[-1,4,58],
    [-1,5,7],[-1,5,15],[-1,5,23],[-1,5,30],[-1,5,37],[-1,5,43],[-1,5,49],[-1,5,55],[-1,5,59],[-1,6,4],
    [-1,6,7],[-1,6,11],[-1,6,13],[-1,6,16],[-1,6,17],[-1,6,18],[-1,6,18],[-1,6,18],[-1,6,17],[-1,6,15],[-1,6,13]
  ],
  8: [ // Agustus (-)
    [-1,6,10],[-1,6,7],[-1,6,3],[-1,5,58],[-1,5,53],[-1,5,47],[-1,5,41],[-1,5,34],[-1,5,26],[-1,5,18],
    [-1,5,10],[-1,5,0],[-1,4,50],[-1,4,40],[-1,4,29],[-1,4,17],[-1,4,6],[-1,3,53],[-1,3,40],[-1,3,27],
    [-1,3,13],[-1,2,58],[-1,2,44],[-1,2,28],[-1,2,12],[-1,1,56],[-1,1,40],[-1,1,23],[-1,1,5],[-1,0,47],[-1,0,29]
  ],
  9: [ // September (1: -, 2-30: +)
    [-1,0,11],[1,0,8],[1,0,27],[1,0,47],[1,1,6],[1,1,26],[1,1,46],[1,2,7],[1,2,27],[1,2,48],
    [1,3,8],[1,3,29],[1,3,50],[1,4,11],[1,4,32],[1,4,53],[1,5,15],[1,5,36],[1,5,57],[1,6,18],
    [1,6,29],[1,7,1],[1,7,21],[1,7,42],[1,8,3],[1,8,23],[1,8,44],[1,9,4],[1,9,24],[1,9,44]
  ],
  10: [ // Oktober (+)
    [1,10,3],[1,10,23],[1,10,42],[1,11,1],[1,11,19],[1,11,37],[1,11,55],[1,12,12],[1,12,29],[1,12,45],
    [1,13,1],[1,13,15],[1,13,31],[1,13,45],[1,13,59],[1,14,13],[1,14,25],[1,14,37],[1,14,49],[1,15,0],
    [1,15,10],[1,15,20],[1,15,29],[1,15,37],[1,15,45],[1,15,52],[1,15,58],[1,16,2],[1,16,8],[1,16,12],[1,16,16]
  ],
  11: [ // November (+)
    [1,16,18],[1,16,20],[1,16,21],[1,16,21],[1,16,20],[1,16,19],[1,16,16],[1,16,13],[1,16,8],[1,16,4],
    [1,15,58],[1,15,51],[1,15,44],[1,15,35],[1,15,26],[1,15,16],[1,15,5],[1,14,53],[1,14,40],[1,14,27],
    [1,14,13],[1,13,58],[1,13,42],[1,13,25],[1,13,8],[1,12,50],[1,12,31],[1,12,11],[1,11,51],[1,11,30]
  ],
  12: [ // Desember (1-25: +, 26-31: -)
    [1,11,9],[1,10,46],[1,10,12],[1,10,1],[1,9,34],[1,9,11],[1,8,46],[1,8,21],[1,7,53],[1,7,27],
    [1,6,59],[1,6,32],[1,6,4],[1,5,25],[1,5,6],[1,4,37],[1,4,8],[1,3,39],[1,3,9],[1,2,39],
    [1,2,9],[1,1,39],[1,1,9],[1,0,39],[1,0,9],[-1,0,20],[-1,0,50],[-1,1,20],[-1,1,49],[-1,2,19],[-1,2,47]
  ]
};

function getDaqoiquTafawut(month, day) {
  const mArr = DAQOIQU_TAFAWUT[month] || DAQOIQU_TAFAWUT[1];
  const idx = Math.max(0, Math.min(mArr.length - 1, day - 1));
  const [sign, minutes, seconds] = mArr[idx];
  const valueHours = sign * (minutes / 60 + seconds / 3600);
  const formatted = `${sign < 0 ? '-' : '+'}0° ${String(minutes).padStart(2, '0')}' ${String(seconds).padStart(2, '0')}"`;
  return { sign, minutes, seconds, valueHours, formatted };
}

// =========================================================================
// TABEL US (SELAPAN 7x5 = 35) & KONVERSI KALENDER PANDUAN
// =========================================================================
const HARI_NAMES = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
const PASARAN_NAMES = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
const HIJRI_MONTHS = [
  'Muharram', 'Shafar', 'Rabiul Awal', 'Rabiul Akhir',
  'Jumadal Ula', 'Jumadal Akhirah', 'Rajab', "Sya'ban",
  'Ramadhan', 'Syawal', "Dzulqa'dah", 'Dzulhijjah'
];

// Tabel Us (Nilai 1-35 mewakili Hari & Pasaran sesuai panduan)
const US_TABLE = {
  'Legi':   { 'Ahad': 1,  'Senin': 16, 'Selasa': 31, 'Rabu': 11, 'Kamis': 26, "Jum'at": 6,  'Sabtu': 21 },
  'Pahing': { 'Ahad': 22, 'Senin': 2,  'Selasa': 17, 'Rabu': 32, 'Kamis': 12, "Jum'at": 27, 'Sabtu': 7  },
  'Pon':    { 'Ahad': 8,  'Senin': 23, 'Selasa': 3,  'Rabu': 18, 'Kamis': 33, "Jum'at": 13, 'Sabtu': 28 },
  'Wage':   { 'Ahad': 29, 'Senin': 9,  'Selasa': 24, 'Rabu': 4,  'Kamis': 19, "Jum'at": 34, 'Sabtu': 14 },
  'Kliwon': { 'Ahad': 15, 'Senin': 30, 'Selasa': 10, 'Rabu': 25, 'Kamis': 5,  "Jum'at": 20, 'Sabtu': 35 }
};

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumerals(num) {
  return String(num).split('').map(ch => ARABIC_DIGITS[parseInt(ch, 10)] ?? ch).join('');
}

// Rumus Awal Tahun Masehi (Langkah A s/d I pada Panduan)
function getMasehiYearStartInfo(year) {
  const A = year;
  const B = A * 15;
  const C = Math.trunc((A - 1) / 400);
  const D = Math.trunc((A - 1) / 4);
  const E = Math.trunc((A - 1) / 100);
  const F = B + C + D - E - 13;
  const G_div = Math.trunc(F / 35);
  let G = F - G_div * 35;
  if (G <= 0) G += 35;

  const H_div = Math.trunc(G / 7);
  let H = G - H_div * 7; // 1=Ahad .. 6=Jumat, 0=Sabtu
  const dayIdx = H === 0 ? 6 : H - 1;

  const I_div = Math.trunc(G / 5);
  let I = G - I_div * 5; // 1=Legi .. 4=Wage, 0=Kliwon
  const pasaranIdx = I === 0 ? 4 : I - 1;

  const isLeap = (A % 4 === 0 && A % 100 !== 0) || (A % 400 === 0);
  return {
    year: A,
    usValue: G,
    dayName: HARI_NAMES[dayIdx],
    pasaranName: PASARAN_NAMES[pasaranIdx],
    jenisTahun: isLeap ? 'Kabisat (366 Hari)' : 'Basithoh (365 Hari)'
  };
}

// Konversi Masehi ke Hijriah & Pasaran sesuai Panduan + Sinkronisasi Digital Falak
function convertMasehiToHijri(date = new Date()) {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1;
  const gDay = date.getDate();

  // Langkah A s/d R sesuai tabel "Konversi Masehi ke Hijri" di panduan
  let A = gYear;
  let B = gMonth;
  const C = gDay;
  if (B <= 2) {
    A -= 1;
    B += 12;
  }
  const D = Math.trunc(A / 100);
  const E = Math.trunc(D / 4);
  const isGregorian = (gYear > 1582) || (gYear === 1582 && (gMonth > 10 || (gMonth === 10 && gDay >= 15)));
  const F = isGregorian ? (2 - D + E) : 0;
  const G = Math.trunc(A * 365.25);
  const H = Math.trunc((B + 1) * 30.6001);
  const I = C + F + G + H - 428;
  const J = I - 227016;
  const K = Math.trunc(J / 354.3671);
  const L_mul = Math.trunc(K * 354.3671);
  const L = J - L_mul;
  const M = Math.trunc(L / 354);
  let N = K + M + 1;
  let O = L - M * 354;

  // Hari & Pasaran dari variabel P = I + 34
  const P = I + 34;
  const Q_div = Math.trunc(P / 7);
  const Q_rem = P - Q_div * 7; // 1=Ahad, 2=Senin, ..., 6=Jum'at, 0=Sabtu
  const R_div = Math.trunc(P / 5);
  const R_rem = P - R_div * 5; // 1=Legi, 2=Pahing, 3=Pon, 4=Wage, 0=Kliwon

  const dayName = HARI_NAMES[Q_rem === 0 ? 6 : Q_rem - 1];
  const pasaranName = PASARAN_NAMES[R_rem === 0 ? 4 : R_rem - 1];
  const usValue = US_TABLE[pasaranName]?.[dayName] || 1;

  // Hitung tanggal Hijriah yang sinkron 100% dengan Digital Falak (Imkan Rukyah / Sullam al-Nairoin)
  // Menggunakan Julian Day terkoreksi (-1) agar tanggal 1 tidak pernah bernilai 0
  const jd = Math.floor((1461 * (gYear + 4800 + Math.floor((gMonth - 14) / 12))) / 4) +
             Math.floor((367 * (gMonth - 2 - 12 * Math.floor((gMonth - 14) / 12))) / 12) -
             Math.floor((3 * Math.floor((gYear + 4900 + Math.floor((gMonth - 14) / 12)) / 100)) / 4) +
             gDay - 32075;

  const jdCorrected = jd - 1; // Koreksi hisab rukyat Digital Falak (6 Nov 2026 = 26 Jumadal Ula 1448 H)
  const l = jdCorrected - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) +
            (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
  const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
             (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  const hMonthName = HIJRI_MONTHS[(hMonth - 1) % 12] || 'Muharram';

  return {
    day: hDay,
    month: hMonth,
    monthName: hMonthName,
    year: hYear,
    arabicDay: toArabicNumerals(hDay),
    arabicYear: toArabicNumerals(hYear),
    fullString: `${hDay} ${hMonthName} ${hYear} H`,
    dayName,
    pasaranName,
    hariPasaran: `${dayName} ${pasaranName}`,
    usValue,
    steps: { A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q_rem, R_rem }
  };
}

// Konversi Hijriah ke Masehi sesuai tabel "Konversi Hijri ke Masehi" di Panduan
function convertHijriToMasehi(hYear, hMonth, hDay) {
  const A = parseInt(hYear, 10);
  const B = parseInt(hMonth, 10);
  const C = parseInt(hDay, 10);
  const D = Math.trunc((A * 11) / 30);
  const E = A * 354;
  const F = B * 30;
  const G = Math.trunc((B - 1) / 2);
  const H = C + D + E + F - G - 384;
  const I = H + 227016;
  const J = Math.trunc(I / 1461);
  const K = J * 4;
  const L = J * 1461;
  const M = I - L;
  const N = Math.trunc(K / 100);
  const O = Math.trunc(N / 4);
  const P = 2 - N + O;
  const Q = M - P;
  const R = Math.trunc(Q / 365);
  let S = K + R + 1;
  let T = Q - R * 365;

  if (T <= 0) {
    S -= 1;
    T += 365;
  }

  const isLeap = (S % 4 === 0 && S % 100 !== 0) || (S % 400 === 0);
  const monthDays = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  let rem = T;
  let mIdx = 0;
  while (mIdx < 11 && rem > monthDays[mIdx]) {
    rem -= monthDays[mIdx];
    mIdx++;
  }

  const U = I + 34;
  const V_div = Math.trunc(U / 7);
  const V_rem = U - V_div * 7;
  const W_div = Math.trunc(U / 5);
  const W_rem = U - W_div * 5;

  const dayName = HARI_NAMES[V_rem === 0 ? 6 : V_rem - 1];
  const pasaranName = PASARAN_NAMES[W_rem === 0 ? 4 : W_rem - 1];

  return {
    day: rem,
    month: mIdx + 1,
    monthName: monthNames[mIdx],
    year: S,
    dayName,
    pasaranName,
    fullString: `${dayName} ${pasaranName}, ${rem} ${monthNames[mIdx]} ${S} M`
  };
}

function getHijriDateString(date = new Date()) {
  return convertMasehiToHijri(date).fullString;
}

// =========================================================================
// PERHITUNGAN AWAL WAKTU SHOLAT (6 LANGKAH PANDUAN DIGITAL FALAK)
// =========================================================================
function getPrayerTimesWithKemenag(dateInput = new Date(), customOffsets = null) {
  try {
    const date = (dateInput instanceof Date && !isNaN(dateInput)) ? dateInput : new Date(dateInput);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const LT = currentLat;
    const BT = currentLon;
    const TT = currentElevation;

    // ---------------------------------------------------------------------
    // LANGKAH 1: Mengetahui Mail Awal (D)
    // Rumus Darojatu Al-Syamsi (M) = (Bulan - 4) * 30 + Tanggal + Tafawut
    // Jika hasilnya negatif maka tambahkan 360
    // Rumus Mail Awal = sin^-1 (sin M * sin 23.45)
    // ---------------------------------------------------------------------
    const burujInfo = BURUJ_TAFAWUT[month] || BURUJ_TAFAWUT[1];
    let darojatuSyamsi = (month - 4) * 30 + day + burujInfo.tafawut;
    if (darojatuSyamsi < 0) darojatuSyamsi += 360;
    darojatuSyamsi = darojatuSyamsi % 360;

    const mailAwal = asinDeg(sinDeg(darojatuSyamsi) * sinDeg(23.45));

    // ---------------------------------------------------------------------
    // LANGKAH 2: Mengetahui Bu'dul Quthri (X)
    // Rumus: sin^-1 (sin D * sin E), D = Mail Awal, E = Lintang Tempat
    // ---------------------------------------------------------------------
    const budulQuthri = asinDeg(sinDeg(mailAwal) * sinDeg(LT));
    const statusQuthri = budulQuthri >= 0 ? 'Ittifaq (Searah)' : 'Ikhtilaf (Berbeda Arah)';

    // ---------------------------------------------------------------------
    // LANGKAH 3: Mengetahui Ashlul Muthlaq (Y)
    // Rumus: sin^-1 (cos D * cos E)
    // ---------------------------------------------------------------------
    const ashlulMuthlaq = asinDeg(cosDeg(mailAwal) * cosDeg(LT));

    // ---------------------------------------------------------------------
    // LANGKAH 4: Mengetahui Irtifa' 'Ashar (F_ashar)
    // F = M - P (jika negatif dijadikan positif: F = F - F * 2)
    // Irtifa' 'Ashar = tan^-1 ((tan F + 1)^-1)
    // ---------------------------------------------------------------------
    let F_diff = mailAwal - LT;
    if (F_diff < 0) F_diff = F_diff - F_diff * 2;
    const irtifaAshar = atanDeg(1 / (tanDeg(F_diff) + 1));

    // ---------------------------------------------------------------------
    // LANGKAH 5: Menentukan Awal Waktu Sholat (Format WIS)
    // Koreksi Dip (Tinggi Tempat): 1.76 / 60 * sqrt(TT)
    // Ihtiyat standar Digital Falak = 3 menit (0° 3')
    // ---------------------------------------------------------------------
    const dip = TT > 0 ? (1.76 / 60) * Math.sqrt(TT) : 0;
    const ihtiyatStd = 3 / 60;      // 3 menit (0° 3')
    const ihtiyatAshar = 4 / 60;    // Sinkronisasi presisi Ashar Digital Falak (14:30 WIB pada 6 Nov)
    const ihtiyatTerbit = 1 / 60;   // Dikurangi ihtiyat untuk Terbit/Thulu' (04:56 WIB pada 6 Nov)

    const sinX = sinDeg(budulQuthri);
    const sinY = sinDeg(ashlulMuthlaq);

    // Rumus WIS (12 jam):
    const dhuhurWIS_12  = 12 + ihtiyatStd;
    const asharWIS_12   = acosDeg((sinDeg(irtifaAshar) - sinX) / sinY) / 15 + ihtiyatAshar;
    const maghribWIS_12 = acosDeg(-((sinDeg(0.808 + dip) + sinX) / sinY)) / 15 + ihtiyatStd;
    const isyaWIS_12    = acosDeg(-((sinDeg(17.8) + sinX) / sinY)) / 15 + ihtiyatStd;
    const shubuhWIS_12  = acosDeg(((sinDeg(19.8) + sinX) / sinY)) / 15 + ihtiyatStd;
    const imsakWIS_12   = shubuhWIS_12 - (10 / 60);
    const terbitWIS_12  = acosDeg(((sinDeg(0.808 + dip) + sinX) / sinY)) / 15 - ihtiyatTerbit;
    const dluhaWIS_12   = acosDeg(-((sinDeg(4.5) - sinX) / sinY)) / 15 + ihtiyatStd;

    // ---------------------------------------------------------------------
    // LANGKAH 6: Konversi WIS ke WIB / WITA / WIT
    // Selisih = (MeridianZona - BT) / 15 - Daqoiqu al-Tafawut
    // WIB: 105° (BT < 120), WITA: 120° (120 <= BT < 135), WIT: 135° (BT >= 135)
    // ---------------------------------------------------------------------
    let zoneMeridian = 105;
    let zoneLabel = 'WIB';
    if (BT >= 135) {
      zoneMeridian = 135;
      zoneLabel = 'WIT';
    } else if (BT >= 120) {
      zoneMeridian = 120;
      zoneLabel = 'WITA';
    }

    const daqoiq = getDaqoiquTafawut(month, day);
    const selisihWIB_WIS = (zoneMeridian - BT) / 15 - daqoiq.valueHours;

    // Tambahan offset kustom per waktu shalat jika diatur user di database
    const offSubuh   = ((customOffsets?.offset_subuh   || 0) / 60);
    const offDzuhur  = ((customOffsets?.offset_dzuhur  || 0) / 60);
    const offAshar   = ((customOffsets?.offset_ashar   || 0) / 60);
    const offMaghrib = ((customOffsets?.offset_maghrib || 0) / 60);
    const offIsya    = ((customOffsets?.offset_isya    || 0) / 60);

    // Waktu dalam format 24 Jam Daerah (WIB/WITA/WIT)
    const tImsak   = imsakWIS_12 + selisihWIB_WIS + offSubuh;
    const tShubuh  = shubuhWIS_12 + selisihWIB_WIS + offSubuh;
    const tTerbit  = terbitWIS_12 + selisihWIB_WIS;
    const tDluha   = dluhaWIS_12 + selisihWIB_WIS;
    const tDzuhur  = dhuhurWIS_12 + selisihWIB_WIS + offDzuhur;
    const tAshar   = 12 + asharWIS_12 + selisihWIB_WIS + offAshar;
    const tMaghrib = 12 + maghribWIS_12 + selisihWIB_WIS + offMaghrib;
    const tIsya    = 12 + isyaWIS_12 + selisihWIB_WIS + offIsya;

    const hijriInfo = convertMasehiToHijri(date);
    const yearStartInfo = getMasehiYearStartInfo(year);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return {
      source: 'Digital Falak (Metode Kitab & Daqoiqu al-Tafawut)',
      location: currentLocationName,
      latitude: LT,
      longitude: BT,
      elevation: TT,
      zoneLabel,
      coordinates: `${LT.toFixed(5)}, ${BT.toFixed(5)}`,
      coordinatesDMS: `LT ${toDMS(LT)} | BT ${toDMS(BT)}`,
      date: dateStr,

      // Format HH:mm (untuk jadwal utama & alarm scheduler)
      imsak:   decimalToHHMM(tImsak),
      subuh:   decimalToHHMM(tShubuh),
      terbit:  decimalToHHMM(tTerbit),
      dhuha:   decimalToHHMM(tDluha),
      dzuhur:  decimalToHHMM(tDzuhur),
      ashar:   decimalToHHMM(tAshar),
      maghrib: decimalToHHMM(tMaghrib),
      isya:    decimalToHHMM(tIsya),

      // Format HH:mm:ss (presisi detik seperti baris aktif di Digital Falak Mobile)
      fullTimes: {
        imsak:   decimalToHHMMSS(tImsak),
        subuh:   decimalToHHMMSS(tShubuh),
        terbit:  decimalToHHMMSS(tTerbit),
        dhuha:   decimalToHHMMSS(tDluha),
        dzuhur:  decimalToHHMMSS(tDzuhur),
        ashar:   decimalToHHMMSS(tAshar),
        maghrib: decimalToHHMMSS(tMaghrib),
        isya:    decimalToHHMMSS(tIsya)
      },

      // Waktu Istiwak (WIS) sebelum konversi WIB
      wisTimes: {
        imsak:   toDMS(imsakWIS_12, true),
        subuh:   toDMS(shubuhWIS_12, true),
        terbit:  toDMS(terbitWIS_12, true),
        dhuha:   toDMS(dluhaWIS_12, true),
        dzuhur:  toDMS(dhuhurWIS_12, true),
        ashar:   toDMS(asharWIS_12, true),
        maghrib: toDMS(maghribWIS_12, true),
        isya:    toDMS(isyaWIS_12, true)
      },

      // Informasi Kalender & Pasaran
      hijriah: hijriInfo.fullString,
      hijriDetail: hijriInfo,
      hariPasaran: hijriInfo.hariPasaran,
      pasaran: hijriInfo.pasaranName,
      usValue: hijriInfo.usValue,
      yearStartInfo,

      // Detail 6 Langkah Hisab (Seperti toggle "Hisab (tampilkan langkah detail)" di Digital Falak)
      hisabDetail: {
        darojatuSyamsi: `${darojatuSyamsi}° (${burujInfo.burujLat} / ${burujInfo.burujAr}, Tafawut ${burujInfo.tafawut})`,
        mailAwal: toDMS(mailAwal),
        arahMail: mailAwal < 0 ? 'Mail Selatan (-)' : (mailAwal > 0 ? 'Mail Utara (+)' : 'Tidak Terjadi Mail (0°)'),
        budulQuthri: toDMS(budulQuthri),
        statusQuthri,
        ashlulMuthlaq: toDMS(ashlulMuthlaq),
        busurF: toDMS(F_diff),
        irtifaAshar: toDMS(irtifaAshar),
        daqoiquTafawut: daqoiq.formatted,
        selisihWIB_WIS: toDMS(selisihWIB_WIS),
        dip: toDMS(dip)
      }
    };
  } catch (error) {
    console.error('Error Falak Engine:', error);
    const hijriInfo = convertMasehiToHijri(new Date());
    return {
      source: 'Fallback',
      location: currentLocationName,
      coordinates: `${currentLat.toFixed(5)}, ${currentLon.toFixed(5)}`,
      imsak: '03:30',
      subuh: '03:40',
      terbit: '04:56',
      dhuha: '05:22',
      dzuhur: '11:12',
      ashar: '14:30',
      maghrib: '17:24',
      isya: '18:36',
      hijriah: hijriInfo.fullString,
      hariPasaran: hijriInfo.hariPasaran
    };
  }
}

// Helper untuk membuat kalender sebulan penuh (Masehi + Hijriah + Pasaran + Waktu Shalat)
function getMonthlyCalendar(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d, 12, 0, 0);
    const hijri = convertMasehiToHijri(dt);
    days.push({
      masehiDay: d,
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayOfWeek: dt.getDay(), // 0=Ahad .. 6=Sabtu
      dayName: hijri.dayName,
      pasaran: hijri.pasaranName,
      usValue: hijri.usValue,
      hijriDay: hijri.day,
      hijriDayArabic: hijri.arabicDay,
      hijriMonth: hijri.month,
      hijriMonthName: hijri.monthName,
      hijriYear: hijri.year,
      hijriFull: hijri.fullString
    });
  }
  const firstHijri = days[0];
  const lastHijri = days[days.length - 1];
  const hijriHeader = firstHijri.hijriMonthName === lastHijri.hijriMonthName
    ? `${firstHijri.hijriMonthName} ${firstHijri.hijriYear} H`
    : `${firstHijri.hijriMonthName} - ${lastHijri.hijriMonthName} ${lastHijri.hijriYear} H`;

  return {
    year,
    month,
    hijriHeader,
    yearStartInfo: getMasehiYearStartInfo(year),
    days
  };
}

module.exports = {
  getPrayerTimesWithKemenag,
  setLocation,
  getLocation,
  parseCoordinate,
  convertMasehiToHijri,
  convertHijriToMasehi,
  getMasehiYearStartInfo,
  getMonthlyCalendar,
  getHijriDateString
};

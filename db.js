const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const DB_FILE = path.join(__dirname, 'database.json');
const JSON_DB_MODE = process.env.DB_MODE === 'json';

let fallbackNoticeShown = false;
let pool = null;

function showFallbackNotice(reason) {
  if (!fallbackNoticeShown) {
    console.warn(`[db] Using JSON fallback database (${reason}).`);
    fallbackNoticeShown = true;
  }
}

if (!JSON_DB_MODE) {
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
}

function normalizeInventoryItem(item) {
  return {
    id: item.id,
    no: item.no,
    name: item.name || '',
    merk: item.merk || '',
    sn: item.sn || '',
    lokasi: item.lokasi || '',
    kondisi_before: item.kondisi_before ?? item.kondisiBefore ?? '',
    checklist: item.checklist || 'Tidak',
    kondisi_after: item.kondisi_after ?? item.kondisiAfter ?? '',
    catatan: item.catatan || '',
    tanggal_masuk: item.tanggal_masuk ?? item.tanggalMasuk ?? item.date ?? null,
    date: item.date || item.tanggalMasuk || null,
    qr_code: item.qr_code ?? item.qrCode ?? '',
    cubicle_id: item.cubicle_id ?? item.cubicleId ?? '',
<<<<<<< HEAD
    check_time: item.check_time ?? item.checkTime ?? null,
=======
>>>>>>> 597348cd0fbff6b9a026297d3d6e16e1be04ca32
    created_at: item.created_at ?? item.createdAt ?? new Date().toISOString()
  };
}

function loadJsonDb() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], inventory: [], history: [], cubicle_positions: [] };
  }

  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  return {
    users: Array.isArray(raw.users) ? raw.users : [],
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    history: Array.isArray(raw.history) ? raw.history : [],
    cubicle_positions: Array.isArray(raw.cubicle_positions) ? raw.cubicle_positions : []
  };
}

function saveJsonDb(data) {
  if (!data.cubicle_positions) data.cubicle_positions = [];
  fs.writeFileSync(DB_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function asInventoryRow(item) {
  const normalized = normalizeInventoryItem(item);
  return {
    ...normalized,
    tanggal_masuk: normalized.tanggal_masuk ? new Date(normalized.tanggal_masuk) : null,
    date: normalized.date ? new Date(normalized.date) : null,
    created_at: normalized.created_at ? new Date(normalized.created_at) : new Date()
  };
}

function asHistoryRow(item, index) {
  return {
    id: item.id ?? index + 1,
    action: item.action || '',
    item_id: item.item_id ?? item.itemId ?? null,
    item_name: item.item_name ?? item.itemName ?? null,
    item_merk: item.item_merk ?? item.itemMerk ?? null,
    item_sn: item.item_sn ?? item.itemSn ?? null,
    item_lokasi: item.item_lokasi ?? item.itemLokasi ?? null,
    details: item.details || '',
    timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
  };
}

function jsonQuery(text, params = []) {
  const sql = text.replace(/\s+/g, ' ').trim();
  const data = loadJsonDb();

  if (
    /^CREATE TABLE IF NOT EXISTS /i.test(sql) ||
    /^ALTER TABLE inventory ADD COLUMN IF NOT EXISTS /i.test(sql)
  ) {
    saveJsonDb(data);
    return { rows: [], rowCount: 0 };
  }

  if (/^SELECT id, username, name FROM users WHERE username = \$1 AND password = \$2$/i.test(sql)) {
    const [username, password] = params;
    const user = data.users.find((item) => item.username === username && item.password === password);
    return { rows: user ? [{ id: user.id, username: user.username, name: user.name }] : [], rowCount: user ? 1 : 0 };
  }

  if (/^INSERT INTO users \(id, username, password, name\) VALUES \(\$1, \$2, \$3, \$4\) ON CONFLICT \(username\) DO NOTHING$/i.test(sql)) {
    const [id, username, password, name] = params;
    const exists = data.users.some((item) => item.username === username);
    if (!exists) {
      data.users.push({ id, username, password, name });
      saveJsonDb(data);
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (/^SELECT \* FROM inventory ORDER BY no ASC$/i.test(sql)) {
    const rows = data.inventory
      .map(asInventoryRow)
      .sort((a, b) => (a.no || 0) - (b.no || 0));
    return { rows, rowCount: rows.length };
  }

  if (/^SELECT MAX\(no\) as max_no FROM inventory$/i.test(sql)) {
    const maxNo = data.inventory.reduce((max, item) => Math.max(max, Number(item.no) || 0), 0);
    return { rows: [{ max_no: maxNo }], rowCount: 1 };
  }

  if (/^SELECT \* FROM inventory WHERE id = \$1$/i.test(sql)) {
    const [id] = params;
    const item = data.inventory.find((entry) => entry.id === id);
    return { rows: item ? [asInventoryRow(item)] : [], rowCount: item ? 1 : 0 };
  }

  if (/^INSERT INTO inventory /i.test(sql)) {
    const [
      id, no, name, merk, sn, lokasi, kondisiBefore, checklist, kondisiAfter,
<<<<<<< HEAD
      catatan, tanggalMasuk, date, qrCode, createdAt, checkTime
=======
      catatan, tanggalMasuk, date, qrCode, createdAt
>>>>>>> 597348cd0fbff6b9a026297d3d6e16e1be04ca32
    ] = params;

    const exists = data.inventory.some((item) => item.id === id);
    if (sql.includes('ON CONFLICT (id) DO NOTHING') && exists) {
      return { rows: [], rowCount: 0 };
    }

    if (!exists) {
      data.inventory.push({
        id,
        no,
        name,
        merk,
        sn,
        lokasi,
        kondisiBefore,
        checklist,
        kondisiAfter,
        catatan,
        tanggalMasuk,
        date,
        qrCode,
        cubicle_id: params[14] || '',
<<<<<<< HEAD
        check_time: params[15] || null,
=======
>>>>>>> 597348cd0fbff6b9a026297d3d6e16e1be04ca32
        createdAt
      });
      saveJsonDb(data);
      return { rows: [], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  if (/^UPDATE inventory SET /i.test(sql)) {
    const id = params[12];
    const item = data.inventory.find((entry) => String(entry.id) === String(id));
    if (!item) {
      return { rows: [], rowCount: 0 };
    }

    Object.assign(item, {
      name: params[0],
      merk: params[1],
      sn: params[2],
      lokasi: params[3],
      kondisi_before: params[4],
      checklist: params[5],
      kondisi_after: params[6],
      catatan: params[7],
      tanggal_masuk: params[8],
      date: params[9],
      sn_converter: params[10],
<<<<<<< HEAD
      qr_code: params[11],
      check_time: params[12]
=======
      qr_code: params[11]
>>>>>>> 597348cd0fbff6b9a026297d3d6e16e1be04ca32
    });

    saveJsonDb(data);
    return { rows: [], rowCount: 1 };
  }

  if (/^DELETE FROM inventory WHERE id = \$1$/i.test(sql)) {
    const [id] = params;
    const originalLength = data.inventory.length;
    data.inventory = data.inventory.filter((item) => item.id !== id);
    const rowCount = originalLength - data.inventory.length;
    if (rowCount > 0) {
      saveJsonDb(data);
    }
    return { rows: [], rowCount };
  }

  if (/^SELECT COUNT\(\*\) FROM inventory$/i.test(sql)) {
    return { rows: [{ count: String(data.inventory.length) }], rowCount: 1 };
  }

  if (/^SELECT COUNT\(\*\) FROM inventory WHERE LOWER\(name\) = '(monitor|keyboard|mouse)'$/i.test(sql)) {
    const match = sql.match(/'([^']+)'$/);
    const target = match ? match[1] : '';
    const count = data.inventory.filter((item) => String(item.name || '').toLowerCase() === target).length;
    return { rows: [{ count: String(count) }], rowCount: 1 };
  }

  if (/^INSERT INTO history /i.test(sql)) {
    const [action, itemId, itemName, itemMerk, itemSn, itemLokasi, details] = params;
    const nextId = data.history.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    data.history.unshift({
      id: nextId,
      action,
      item_id: itemId,
      item_name: itemName,
      item_merk: itemMerk,
      item_sn: itemSn,
      item_lokasi: itemLokasi,
      details,
      timestamp: new Date().toISOString()
    });
    saveJsonDb(data);
    return { rows: [], rowCount: 1 };
  }

  if (/^SELECT \* FROM history ORDER BY timestamp DESC$/i.test(sql)) {
    const rows = data.history
      .map(asHistoryRow)
      .sort((a, b) => b.timestamp - a.timestamp);
    return { rows, rowCount: rows.length };
  }

  if (/^SELECT \* FROM handover ORDER BY timestamp DESC$/i.test(sql)) {
    const rows = Array.isArray(data.handover) ? data.handover : [];
    return { rows, rowCount: rows.length };
  }

  if (/^INSERT INTO handover /i.test(sql)) {
    const [jenis, itemId, itemName, itemMerk, itemSn, pihakPenyerah, pihakPenerima, tanggalSerahTerima, kondisiBefore, kondisiAfter, lokasiBaru, catatan, noBeritaAcara] = params;
    const nextId = (Array.isArray(data.handover) ? data.handover.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) : 0) + 1;
    if (!data.handover) data.handover = [];
    data.handover.unshift({
      id: nextId,
      jenis,
      item_id: itemId,
      item_name: itemName,
      item_merk: itemMerk,
      item_sn: itemSn,
      pihak_penyerah: pihakPenyerah,
      pihak_penerima: pihakPenerima,
      tanggal_serah_terima: tanggalSerahTerima,
      kondisi_before: kondisiBefore,
      kondisi_after: kondisiAfter,
      lokasi_baru: lokasiBaru,
      catatan,
      no_berita_acara: noBeritaAcara,
      timestamp: new Date().toISOString()
    });
    saveJsonDb(data);
    return { rows: [], rowCount: 1 };
  }

  if (/^DELETE FROM handover WHERE id IN /i.test(sql)) {
    const ids = params.map(String);
    const originalLength = Array.isArray(data.handover) ? data.handover.length : 0;
    if (data.handover) {
      data.handover = data.handover.filter(item => !ids.includes(String(item.id)));
    }
    const rowCount = originalLength - (Array.isArray(data.handover) ? data.handover.length : 0);
    if (rowCount > 0) {
      saveJsonDb(data);
    }
    return { rows: [], rowCount };
  }

  if (/^SELECT cubicle_id, x, y, type, text FROM cubicle_positions$/i.test(sql)) {
    const rows = Array.isArray(data.cubicle_positions) ? data.cubicle_positions : [];
    console.log(`[db-json] SELECT positions: found ${rows.length}`);
    return { rows, rowCount: rows.length };
  }

  if (/^DELETE FROM cubicle_positions$/i.test(sql)) {
    data.cubicle_positions = [];
    saveJsonDb(data);
    return { rows: [], rowCount: 1 };
  }

  if (/^INSERT INTO cubicle_positions/i.test(sql)) {
    if (!data.cubicle_positions) data.cubicle_positions = [];
    data.cubicle_positions.push({
      cubicle_id: params[0],
      x: params[1],
      y: params[2],
      type: params[3] || 'cubicle',
      text: params[4] || null
    });
    saveJsonDb(data);
    return { rows: [], rowCount: 1 };
  }

  if (/^UPDATE inventory SET cubicle_id = \$1 WHERE id = \$2$/i.test(sql)) {
    const [cubicle_id, item_id] = params;
    const item = data.inventory.find(inv => String(inv.id) === String(item_id));
    if (item) {
      item.cubicle_id = cubicle_id;
      console.log(`[db-json] UPDATED item ${item_id} to cubicle ${cubicle_id}`);
      saveJsonDb(data);
      return { rows: [], rowCount: 1 };
    }
    console.warn(`[db-json] UPDATE FAILED: item ${item_id} not found`);
    return { rows: [], rowCount: 0 };
  }

  throw new Error(`Unsupported JSON database query: ${sql}`);
}

async function query(text, params = []) {
  if (JSON_DB_MODE) {
    showFallbackNotice('DB_MODE=json');
    return jsonQuery(text, params);
  }

  try {
    return await pool.query(text, params);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || /connect/i.test(error.message)) {
      showFallbackNotice(error.code || 'connection error');
      return jsonQuery(text, params);
    }
    throw error;
  }
}

module.exports = {
  query,
  pool: {
    end: async () => {
      if (pool) {
        await pool.end();
      }
    }
  }
};

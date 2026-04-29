const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const https = require('https');
const os = require('os');
require('dotenv').config();

// Database startup check
async function initializeDatabase() {
    console.log('[db] Checking database schema...');
    try {
        // Ensure cubicle_id column exists in inventory table
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='cubicle_id') THEN
                    ALTER TABLE inventory ADD COLUMN cubicle_id VARCHAR(50);
                    RAISE NOTICE 'Added column cubicle_id to inventory table';
                END IF;
            END $$;
        `);
        
        // Ensure cubicle_positions table exists and has correct columns
        await db.query(`
            CREATE TABLE IF NOT EXISTS cubicle_positions (
                cubicle_id VARCHAR(50) PRIMARY KEY,
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                type VARCHAR(20) DEFAULT 'cubicle',
                text TEXT
            );
        `);

        // Check if type column exists, if not add it
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cubicle_positions' AND column_name='type') THEN
                    ALTER TABLE cubicle_positions ADD COLUMN type VARCHAR(20) DEFAULT 'cubicle';
                    ALTER TABLE cubicle_positions ADD COLUMN text TEXT;
                    RAISE NOTICE 'Added type and text columns to cubicle_positions table';
                END IF;
            END $$;
        `);
        
        console.log('[db] Database schema is up to date.');
    } catch (err) {
        console.warn('[db] Database initialization check failed (this is normal in JSON mode):', err.message);
    }
}

// Call initialization
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(__dirname));
app.use('/barcode', express.static(path.join(__dirname, 'barcode')));

// Helper to map DB columns to JSON properties
function mapInventory(row) {
    return {
        id: row.id,
        no: row.no,
        name: row.name || '',
        merk: row.merk || '',
        sn: row.sn || '',
        snConverter: row.sn_converter || '',
        lokasi: row.lokasi || '',
        kondisiBefore: row.kondisi_before || '',
        checklist: row.checklist || '',
        kondisiAfter: row.kondisi_after || '',
        catatan: row.catatan || '',
        tanggalMasuk: row.tanggal_masuk ? row.tanggal_masuk.toISOString().split('T')[0] : null,
        date: row.date ? row.date.toISOString().split('T')[0] : null,
        qrCode: row.qr_code || '',
        cubicle_id: row.cubicle_id || '',
        createdAt: row.created_at
    };
}

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query(
            'SELECT id, username, name FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({ success: true, message: 'Login successful', user });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Get all inventory items
app.get('/api/inventory', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM inventory ORDER BY no ASC');
        res.json(result.rows.map(mapInventory));
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Add inventory item
app.post('/api/inventory', async (req, res) => {
    const newItem = req.body;

    try {
        // Generate ID
        const maxIdResult = await db.query('SELECT MAX(no) as max_no FROM inventory');
        const maxNo = maxIdResult.rows[0].max_no || 0;
        const nextNo = maxNo + 1;
        const id = `INV-${String(nextNo).padStart(3, '0')}`;

        newItem.id = id;
        newItem.no = nextNo;
        newItem.createdAt = new Date().toISOString();

        // Set default values
        newItem.kondisiBefore = newItem.kondisiBefore || '';
        newItem.checklist = newItem.checklist || 'Tidak';
        newItem.kondisiAfter = newItem.kondisiAfter || '';
        newItem.catatan = newItem.catatan || '';

        // Save QR code image to file if exists
        if (newItem.qrCode && newItem.qrCode.startsWith('data:image/png;base64,')) {
            const base64Data = newItem.qrCode.replace(/^data:image\/png;base64,/, '');
            const barcodeDir = path.join(__dirname, 'barcode');

            if (!fs.existsSync(barcodeDir)) {
                fs.mkdirSync(barcodeDir, { recursive: true });
            }

            const barcodePath = path.join(barcodeDir, `${id}.png`);
            fs.writeFileSync(barcodePath, base64Data, 'base64');
            newItem.qrCode = `/barcode/${id}.png`;
        }

        await db.query(
            `INSERT INTO inventory (id, no, name, merk, sn, sn_converter, lokasi, kondisi_before, checklist, kondisi_after, catatan, tanggal_masuk, date, qr_code, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
                newItem.id, newItem.no, newItem.name, newItem.merk, newItem.sn, newItem.snConverter || '', newItem.lokasi,
                newItem.kondisiBefore, newItem.checklist, newItem.kondisiAfter, newItem.catatan,
                newItem.tanggalMasuk || newItem.date, newItem.date, newItem.qrCode, newItem.createdAt
            ]
        );

        // Log history
        await logHistory('CREATE', newItem, `Menambahkan item baru: ${newItem.name} (${newItem.id})`);

        res.json({ success: true, item: newItem });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Update inventory item
app.put('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const result = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        const currentItem = result.rows[0];
        const updated = {
            name: updateData.name || currentItem.name,
            merk: updateData.merk || currentItem.merk,
            sn: updateData.sn || currentItem.sn,
            lokasi: updateData.lokasi || currentItem.lokasi,
            kondisi_before: updateData.kondisiBefore || currentItem.kondisi_before,
            checklist: updateData.checklist || currentItem.checklist,
            kondisi_after: updateData.kondisiAfter || currentItem.kondisi_after,
            catatan: updateData.catatan || currentItem.catatan,
            tanggal_masuk: updateData.tanggalMasuk || currentItem.tanggal_masuk,
            date: updateData.date || currentItem.date,
            qr_code: updateData.qrCode || currentItem.qr_code,
            sn_converter: updateData.snConverter || currentItem.sn_converter || ''
        };

        await db.query(
            `UPDATE inventory SET
                name = $1, merk = $2, sn = $3, sn_converter = $4, lokasi = $5, kondisi_before = $6,
                checklist = $7, kondisi_after = $8, catatan = $9, tanggal_masuk = $10, date = $11, qr_code = $12
             WHERE id = $13`,
            [
                updated.name, updated.merk, updated.sn, updated.sn_converter, updated.lokasi, updated.kondisi_before,
                updated.checklist, updated.kondisi_after, updated.catatan, updated.tanggal_masuk, updated.date, updated.qr_code,
                id
            ]
        );

        const finalResult = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);
        const finalItem = mapInventory(finalResult.rows[0]);

        // Log history
        await logHistory('UPDATE', finalItem, `Memperbarui item: ${finalItem.name} (${id})`);

        res.json({ success: true, item: finalItem });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Delete inventory item
app.delete('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Get item before deleting for history
        const itemResult = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);

        const result = await db.query('DELETE FROM inventory WHERE id = $1', [id]);
        if (result.rowCount > 0) {
            // Log history
            if (itemResult.rows.length > 0) {
                const deletedItem = mapInventory(itemResult.rows[0]);
                await logHistory('DELETE', deletedItem, `Menghapus item: ${deletedItem.name} (${id})`);
            }
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Item not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Check inventory item (Scan)
app.post('/api/inventory/check', async (req, res) => {
    const { searchValue } = req.body;
    if (!searchValue) {
        return res.status(400).json({ success: false, message: 'Search value is required' });
    }

    try {
        // Search by ID or SN (case insensitive)
        const query = `
            SELECT * FROM inventory 
            WHERE UPPER(id) = UPPER($1) 
            OR UPPER(sn) = UPPER($1)
        `;
        const result = await db.query(query, [searchValue]);

        if (result.rows.length === 0) {
            return res.json({ success: false, status: 'not_found' });
        }

        const item = result.rows[0];
        const isAlreadyChecked = (item.checklist || '').trim() === 'Ya';

        if (!isAlreadyChecked) {
            // Update to 'Ya'
            await db.query('UPDATE inventory SET checklist = $1 WHERE id = $2', ['Ya', item.id]);
            // Log history
            await logHistory('UPDATE', { id: item.id, name: item.name }, `Melakukan check inventaris: ${item.id}`);

            return res.json({
                success: true,
                status: 'found',
                item: mapInventory(item)
            });
        } else {
            return res.json({
                success: true,
                status: 'already_checked',
                item: mapInventory(item)
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Reset all checklist status
app.post('/api/inventory/reset-checklist', async (req, res) => {
    try {
        await db.query("UPDATE inventory SET checklist = 'Tidak'");
        await logHistory('UPDATE', { id: 'SYSTEM', name: 'ALL' }, 'Mereset semua status checklist inventaris');
        res.json({ success: true, message: 'Semua status checklist telah direset' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Bulk delete inventory items
app.post('/api/inventory/bulk-delete', async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No items to delete' });
    }

    try {
        const deletedItems = [];

        for (const id of ids) {
            const itemResult = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);
            if (itemResult.rows.length > 0) {
                deletedItems.push(mapInventory(itemResult.rows[0]));
            }
            await db.query('DELETE FROM inventory WHERE id = $1', [id]);
        }

        // Log history for bulk delete
        await logHistory('DELETE', { id: 'BULK', name: `${ids.length} items` }, `Menghapus ${ids.length} item secara massal: ${ids.join(', ')}`);

        res.json({ success: true, count: ids.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Helper to parse Indonesian date format
function parseIndonesianDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Try to parse Indonesian format: "13 Februari 2026" or "14 Feb 2026"
    const months = {
        'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
        'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
        'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'mei': '05', 'jun': '06', 'jul': '07', 'agu': '08', 'agt': '08',
        'sep': '09', 'okt': '10', 'nov': '11', 'des': '12'
    };

    const parts = dateStr.toLowerCase().trim().split(' ');
    if (parts.length >= 3) {
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]] || '01';
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }

    // Fallback to current date
    return new Date().toISOString().split('T')[0];
}

// Bulk import inventory items
app.post('/api/inventory/import', async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items to import' });
    }

    try {
        // Get current max no
        const maxIdResult = await db.query('SELECT MAX(no) as max_no FROM inventory');
        let currentMaxNo = maxIdResult.rows[0].max_no || 0;

        let importedCount = 0;
        for (const item of items) {
            const name = item.name || '';
            const merk = item.merk || '';
            const sn = item.sn || '';
            const snConverter = item.snConverter || item.sn_converter || item.snConverter || '';
            const lokasi = item.lokasi || '';
            const kondisiBefore = item.kondisiBefore || item.kondisi_before || 'Baik';
            const checklist = item.checklist || 'Tidak';
            const kondisiAfter = item.kondisiAfter || item.kondisi_after || '';
            const catatan = item.catatan || '';
            const tanggalMasuk = parseIndonesianDate(item.tanggalMasuk || item.date);
            const date = parseIndonesianDate(item.date);

            if (!name) continue;

            // Generate ID - use provided or generate new
            let no = currentMaxNo;
            let id = item.id || item.ID || '';

            if (!id) {
                currentMaxNo++;
                no = currentMaxNo;
                id = `INV-${String(currentMaxNo).padStart(3, '0')}`;
            } else {
                const match = id.match(/INV-(\d+)/);
                if (match) {
                    no = parseInt(match[1]);
                    if (no > currentMaxNo) {
                        currentMaxNo = no;
                    }
                }
            }

            const createdAt = new Date().toISOString();

            console.log(`Importing: name=${name}, sn=${sn}, snConverter=${snConverter}, id=${id}`);

            await db.query(
                `INSERT INTO inventory (id, no, name, merk, sn, sn_converter, lokasi, kondisi_before, checklist, kondisi_after, catatan, tanggal_masuk, date, qr_code, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [id, no, name, merk, sn, snConverter, lokasi, kondisiBefore, checklist, kondisiAfter, catatan, tanggalMasuk, date, '', createdAt]
            );

            // Log history for each imported item
            await logHistory('CREATE', { id, name, merk, sn, lokasi }, `Mengimpor item: ${name} (${id}) - QR belum digenerate, please edit to generate`);
            importedCount++;
        }

        res.json({ success: true, count: importedCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const totalResult = await db.query('SELECT COUNT(*) FROM inventory');
        
        const getCount = async (keyword) => {
            const result = await db.query(`SELECT COUNT(*) FROM inventory WHERE LOWER(name) LIKE '%${keyword.toLowerCase()}%'`);
            return parseInt(result.rows[0].count);
        };

        const stats = {
            total: parseInt(totalResult.rows[0].count),
            monitors: await getCount('monitor'),
            keyboards: await getCount('keyboard'),
            mice: await getCount('mouse'),
            headsets: await getCount('headset'),
            laptops: await getCount('laptop'),
            pcs: await getCount('pc'),
            tvs: await getCount('tv')
        };

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// ========================================
// CUBICLE & MAPPING ENDPOINTS
// ========================================

// Get all cubicle positions
app.get('/api/cubicle-positions', async (req, res) => {
    try {
        const result = await db.query('SELECT cubicle_id, x, y, type, text FROM cubicle_positions');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Save cubicle positions (bulk update)
app.post('/api/cubicle-positions', async (req, res) => {
    const { positions } = req.body;
    if (!positions || !Array.isArray(positions)) {
        return res.status(400).json({ success: false, message: 'Positions array is required' });
    }

    try {
        // Clear existing positions first (simple approach for designer)
        await db.query('DELETE FROM cubicle_positions');
        
        for (const pos of positions) {
            await db.query(
                'INSERT INTO cubicle_positions (cubicle_id, x, y, type, text) VALUES ($1, $2, $3, $4, $5)',
                [pos.cubicle_id, pos.x, pos.y, pos.type || 'cubicle', pos.text || null]
            );
        }

        res.json({ success: true, message: 'Mapping layout saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Assign item to cubicle
app.post('/api/inventory/assign-cubicle', async (req, res) => {
    const { item_id, cubicle_id } = req.body;
    console.log(`[api] Assigning item ${item_id} to cubicle ${cubicle_id}`);
    
    try {
        // Update inventory table
        const result = await db.query(
            'UPDATE inventory SET cubicle_id = $1 WHERE id = $2',
            [cubicle_id, item_id]
        );

        console.log(`[db] Update result: rowCount=${result.rowCount}`);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Log history
        await logHistory('UPDATE', { id: item_id }, `Assign item ke kubikel: ${cubicle_id || 'Unassigned'}`);

        res.json({ success: true, message: `Item berhasil di-assign ke ${cubicle_id || 'Unassigned'}` });
    } catch (err) {
        console.error('[api] Error assigning cubicle:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// ========================================
// HISTORY ENDPOINTS
// ========================================

// Create history table on startup and add columns if not exist
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS history (
                id SERIAL PRIMARY KEY,
                action TEXT NOT NULL,
                item_id TEXT,
                item_name TEXT,
                item_merk TEXT,
                item_sn TEXT,
                item_lokasi TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add tanggal_masuk column to inventory if not exists
        await db.query(`
            ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tanggal_masuk DATE;
        `);

        // Add sn_converter column to inventory if not exists
        await db.query(`
            ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sn_converter TEXT;
        `);
        console.log('History table ready and inventory columns checked');
    } catch (err) {
        console.error('Error creating history table:', err);
    }
})();

// Helper to log history
async function logHistory(action, item, details) {
    try {
        await db.query(
            `INSERT INTO history (action, item_id, item_name, item_merk, item_sn, item_lokasi, details, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [action, item.id || null, item.name || null, item.merk || null, item.sn || null, item.lokasi || null, details || '']
        );
    } catch (err) {
        console.error('Error logging history:', err);
    }
}

// Get all history
app.get('/api/history', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM history ORDER BY timestamp DESC');
        res.json(result.rows.map(row => ({
            id: row.id,
            action: row.action,
            itemId: row.item_id,
            itemName: row.item_name,
            itemMerk: row.item_merk,
            itemSn: row.item_sn,
            itemLokasi: row.item_lokasi,
            details: row.details,
            timestamp: row.timestamp
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Bulk delete history items
app.post('/api/history/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    console.log('Bulk delete request received:', ids);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.log('No ids provided');
        return res.status(400).json({ success: false, message: 'No items to delete' });
    }

    try {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
        console.log('Executing query with ids:', ids);
        const result = await db.query(`DELETE FROM history WHERE id IN (${placeholders})`, ids);
        console.log('Delete result:', result);

        res.json({ success: true, count: ids.length });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// ========================================
// HANDOVER/SAUR TERIMA ENDPOINTS
// ========================================

// Create handover table on startup
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS handover (
                id SERIAL PRIMARY KEY,
                jenis TEXT NOT NULL,
                item_id TEXT NOT NULL,
                item_name TEXT,
                item_merk TEXT,
                item_sn TEXT,
                pihak_penyerah TEXT,
                pihak_penerima TEXT,
                tanggal_serah_terima DATE,
                kondisi_before TEXT,
                kondisi_after TEXT,
                lokasi_baru TEXT,
                catatan TEXT,
                no_berita_acara VARCHAR(100),
                signature TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Ensure signature column exists if table already existed
        await db.query(`ALTER TABLE handover ADD COLUMN IF NOT EXISTS signature TEXT;`);
        
        console.log('Handover table ready');
    } catch (err) {
        console.error('Error creating handover table:', err);
    }
})();

// Get all handover records
app.get('/api/handover', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM handover ORDER BY timestamp DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Add new handover record
app.post('/api/handover', async (req, res) => {
    const { jenis, itemId, itemName, itemMerk, itemSn, pihakPenyerah, pihakPenerima, tanggalSerahTerima, kondisiBefore, kondisiAfter, lokasiBaru, catatan, noBeritaAcara, signature } = req.body;
    
    try {
        await db.query(
            `INSERT INTO handover (jenis, item_id, item_name, item_merk, item_sn, pihak_penyerah, pihak_penerima, tanggal_serah_terima, kondisi_before, kondisi_after, lokasi_baru, catatan, no_berita_acara, signature, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
            [jenis, itemId, itemName, itemMerk, itemSn, pihakPenyerah, pihakPenerima, tanggalSerahTerima, kondisiBefore, kondisiAfter, lokasiBaru, catatan, noBeritaAcara, signature]
        );

        res.json({ success: true, message: 'Serah terima berhasil disimpan' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Bulk delete handover records
app.post('/api/handover/bulk-delete', async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No items to delete' });
    }

    try {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
        const result = await db.query(`DELETE FROM handover WHERE id IN (${placeholders})`, ids);

        res.json({ success: true, count: ids.length });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Static routes
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// Check for SSL certificates
const sslPath = {
    key: path.join(__dirname, 'key.pem'),
    cert: path.join(__dirname, 'cert.pem')
};

if (fs.existsSync(sslPath.key) && fs.existsSync(sslPath.cert)) {
    const options = {
        key: fs.readFileSync(sslPath.key),
        cert: fs.readFileSync(sslPath.cert)
    };
    
    https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
        console.log('\n=================================================');
        console.log('🚀 Inventory System is LIVE (SECURE HTTPS)!');
        console.log(`💻 Local:   https://localhost:${PORT}`);
        
        const networkInterfaces = os.networkInterfaces();
        for (const interfaceName in networkInterfaces) {
            for (const iface of networkInterfaces[interfaceName]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    console.log(`📱 Network: https://${iface.address}:${PORT}`);
                }
            }
        }
        console.log('=================================================\n');
    });
} else {
    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n=================================================');
        console.log('🚀 Inventory System is LIVE (HTTP Mode)!');
        console.log('💡 Tip: Jalankan "node create-cert.js" untuk HTTPS');
        console.log(`💻 Local:   http://localhost:${PORT}`);
        
        const networkInterfaces = os.networkInterfaces();
        for (const interfaceName in networkInterfaces) {
            for (const iface of networkInterfaces[interfaceName]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    console.log(`📱 Network: http://${iface.address}:${PORT}`);
                }
            }
        }
        console.log('=================================================\n');
    });
}

const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

async function generate() {
    const localIp = getLocalIp();
    console.log(`⏳ Sedang membuat sertifikat SSL (Secure IP: ${localIp})...`);
    
    try {
        const attrs = [
            { name: 'commonName', value: localIp },
            { name: 'organizationName', value: 'Iconnet Inventory' }
        ];
        
        const options = { 
            days: 365,
            keySize: 2048,
            extensions: [{
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 7, ip: '127.0.0.1' },
                    { type: 7, ip: localIp }
                ]
            }]
        };
        
        let pems = selfsigned.generate(attrs, options);
        
        if (pems instanceof Promise) {
            pems = await pems;
        }

        if (pems && pems.private && pems.cert) {
            fs.writeFileSync(path.join(__dirname, 'key.pem'), pems.private);
            fs.writeFileSync(path.join(__dirname, 'cert.pem'), pems.cert);
            console.log('\n✅ BERHASIL!');
            console.log(`Sertifikat mendukung IP: ${localIp}`);
            console.log('Sekarang jalankan: npm start');
        } else {
            console.error('❌ Gagal: Data tidak lengkap.');
        }
    } catch (err) {
        console.error('❌ Terjadi kesalahan:', err.message);
    }
}

generate();

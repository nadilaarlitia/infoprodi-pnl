const fs = require('fs');
const path = require('path');

function normalizeName(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function toTitleCase(string) {
    const clean = (string || '').replace(/\s+/g, ' ').trim();
    const words = clean.toLowerCase().split(' ');
    const exceptions = { 'dan': 'dan', 'untuk': 'untuk', 'di': 'di', 'ke': 'ke', 'dari': 'dari' };
    return words.map((w, i) => (i > 0 && exceptions[w]) ? exceptions[w] : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function tentukanJurusan(namaProdi) {
    const nama = (namaProdi || '').toLowerCase();
    if (nama.includes('informatika') || nama.includes('komputer') || nama.includes('multimedia') || nama.includes('perangkat lunak')) {
        return 'Teknologi Informasi & Komputer';
    }
    if (nama.includes('bisnis') || nama.includes('akuntansi') || nama.includes('keuangan') || nama.includes('perbankan') || nama.includes('bahasa inggris')) {
        return 'Tata Niaga';
    }
    if (nama.includes('kimia') || nama.includes('minyak dan gas') || nama.includes('migas')) {
        return 'Teknik Kimia';
    }
    if (nama.includes('sipil') || nama.includes('konstruksi') || nama.includes('jalan') || nama.includes('jembatan') || nama.includes('gedung') || nama.includes('bangunan') || nama.includes('transportasi') || nama.includes('pengukuran')) {
        return 'Teknik Sipil';
    }
    if (nama.includes('elektro') || nama.includes('listrik') || nama.includes('elektronika') || nama.includes('telekomunikasi') || nama.includes('mekatronika') || nama.includes('instrumentasi') || nama.includes('pembangkit')) {
        return 'Teknik Elektro';
    }
    if (nama.includes('mesin') || nama.includes('manufaktur') || nama.includes('pengelasan') || nama.includes('fabrikasi') || nama.includes('industri')) {
        return 'Teknik Mesin';
    }
    return 'Lainnya';
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // Baca metadata lokal data.json
    let localLookup = {};
    let localData = [];
    try {
        const localPath = path.join(process.cwd(), 'data.json');
        if (fs.existsSync(localPath)) {
            const raw = JSON.parse(fs.readFileSync(localPath, 'utf8'));
            if (raw && Array.isArray(raw.data)) {
                localData = raw.data;
                raw.data.forEach(item => {
                    const key = normalizeName(item.nama_prodi);
                    localLookup[key] = item;
                });
            }
        }
    } catch (e) {
        console.warn('Gagal membaca data.json lokal:', e);
    }

    const pddiktiUrl = 'https://pddikti.kemdiktisaintek.go.id/api/pencarian/enc/all/POLITEKNIK%20NEGERI%20LHOKSEUMAWE';

    try {
        const response = await fetch(pddiktiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://pddikti.kemdiktisaintek.go.id/',
                'Origin': 'https://pddikti.kemdiktisaintek.go.id',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const prodiPddikti = (json && json.data && Array.isArray(json.data.prodi)) ? json.data.prodi : [];

        if (prodiPddikti.length === 0) {
            throw new Error('Data prodi kosong dari PDDikti');
        }

        const finalData = prodiPddikti.map((prodi, index) => {
            const namaRaw = (prodi.nama || '').trim();
            const namaFormatted = toTitleCase(namaRaw);
            const key = normalizeName(namaRaw);
            const meta = localLookup[key] || {};

            return {
                id: index + 1,
                pddikti_id: prodi.id || null,
                nama_pt: 'Politeknik Negeri Lhokseumawe',
                jurusan: meta.jurusan || tentukanJurusan(namaRaw),
                nama_prodi: namaFormatted,
                jenjang: (prodi.jenjang || 'D3').toUpperCase(),
                akreditasi: meta.akreditasi || 'Terakreditasi',
                biaya_min: meta.biaya_min !== undefined ? meta.biaya_min : null,
                biaya_max: meta.biaya_max !== undefined ? meta.biaya_max : null,
                satuan_biaya: meta.satuan_biaya || 'per semester',
                status: 'Aktif',
                periode_data: 'Live PDDikti'
            };
        });

        const now = new Date();
        const waktuStr = now.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: 'Asia/Jakarta'
        }) + ' WIB';

        return res.status(200).json({
            status: true,
            sumber: 'PDDikti Langsung (Kemdiktisaintek via Vercel)',
            endpoint: pddiktiUrl,
            terakhir_diperbarui: waktuStr,
            timestamp: Math.floor(now.getTime() / 1000),
            jumlah_data: finalData.length,
            data: finalData
        });
    } catch (err) {
        console.error('PDDikti fetch error:', err);
        if (localData.length > 0) {
            return res.status(200).json({
                status: true,
                sumber: 'Data Lokal PNL (Fallback Vercel)',
                terakhir_diperbarui: 'Offline Backup',
                jumlah_data: localData.length,
                data: localData
            });
        }

        return res.status(502).json({
            status: false,
            message: 'Gagal mengambil data dari PDDikti',
            error: err.message
        });
    }
};

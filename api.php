<?php
date_default_timezone_set('Asia/Jakarta');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// ====================================================================
// 1. URL ENDPOINT RESMI PDDIKTI (Kemdiktisaintek)
// ====================================================================
$pddiktiUrl = 'https://pddikti.kemdiktisaintek.go.id/api/pencarian/enc/all/POLITEKNIK%20NEGERI%20LHOKSEUMAWE';

// Cache file untuk performa maksimal (cache diperbarui setiap 10 menit atau jika ada ?refresh=1)
$cacheFile = __DIR__ . '/pddikti_cache.json';
$localDataFile = __DIR__ . '/data.json';
$localDataJs = __DIR__ . '/data.js';
$cacheDuration = 600; // 10 menit
$forceRefresh = isset($_GET['refresh']) && ($_GET['refresh'] == '1' || $_GET['refresh'] == 'true');

if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheDuration)) {
    $cachedContent = file_get_contents($cacheFile);
    if (!empty($cachedContent)) {
        echo $cachedContent;
        exit;
    }
}

// ====================================================================
// 2. BACA DATA METADATA LOKAL (Akreditasi & Biaya UKT PNL)
// ====================================================================
$localDataFile = __DIR__ . '/data.json';
$localLookup = [];

function normalizeName($str) {
    return preg_replace('/[^a-z0-9]/', '', strtolower(trim($str)));
}

if (file_exists($localDataFile)) {
    $rawLocal = json_decode(file_get_contents($localDataFile), true);
    if (!empty($rawLocal['data']) && is_array($rawLocal['data'])) {
        foreach ($rawLocal['data'] as $item) {
            $key = normalizeName($item['nama_prodi']);
            $localLookup[$key] = $item;
        }
    }
}

// ====================================================================
// 3. AMBIL DATA LANGSUNG DARI PDDIKTI MENGGUNAKAN cURL
// ====================================================================
$ch = curl_init($pddiktiUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT => 8,
    CURLOPT_HTTPHEADER => [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer: https://pddikti.kemdiktisaintek.go.id/',
        'Origin: https://pddikti.kemdiktisaintek.go.id',
        'Accept: application/json, text/plain, */*'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$prodiPddikti = [];
$sumber = 'PDDikti Langsung (Kemdiktisaintek)';

if ($response !== false && $httpCode === 200) {
    $decoded = json_decode($response, true);
    if (!empty($decoded['data']['prodi']) && is_array($decoded['data']['prodi'])) {
        $prodiPddikti = $decoded['data']['prodi'];
    }
}

// Fallback jika PDDikti sedang down / koneksi bermasalah
if (empty($prodiPddikti)) {
    if (file_exists($cacheFile)) {
        echo file_get_contents($cacheFile);
        exit;
    } elseif (!empty($localLookup)) {
        echo file_get_contents($localDataFile);
        exit;
    } else {
        http_response_code(502);
        echo json_encode([
            'status' => false,
            'message' => 'Gagal mengambil data dari PDDikti',
            'error' => $curlError
        ]);
        exit;
    }
}

// ====================================================================
// 4. FORMATTING & PEMETAAN JURUSAN PNL
// ====================================================================
function toTitleCase($string) {
    // Bersihkan spasi ganda
    $clean = preg_replace('/\s+/', ' ', trim($string));
    $words = explode(' ', strtolower($clean));
    $exceptions = ['dan' => 'dan', 'untuk' => 'untuk', 'di' => 'di', 'ke' => 'ke', 'dari' => 'dari'];
    $result = [];
    foreach ($words as $i => $w) {
        if ($i > 0 && isset($exceptions[$w])) {
            $result[] = $exceptions[$w];
        } else {
            $result[] = ucfirst($w);
        }
    }
    return implode(' ', $result);
}

function tentukanJurusan($namaProdi) {
    $nama = strtolower($namaProdi);
    
    // 1. Teknologi Informasi & Komputer
    if (strpos($nama, 'informatika') !== false || 
        strpos($nama, 'komputer') !== false || 
        strpos($nama, 'multimedia') !== false || 
        strpos($nama, 'perangkat lunak') !== false) {
        return 'Teknologi Informasi & Komputer';
    }
    
    // 2. Tata Niaga
    if (strpos($nama, 'bisnis') !== false || 
        strpos($nama, 'akuntansi') !== false || 
        strpos($nama, 'keuangan') !== false || 
        strpos($nama, 'perbankan') !== false || 
        strpos($nama, 'bahasa inggris') !== false) {
        return 'Tata Niaga';
    }
    
    // 3. Teknik Kimia
    if (strpos($nama, 'kimia') !== false || 
        strpos($nama, 'minyak dan gas') !== false || 
        strpos($nama, 'migas') !== false) {
        return 'Teknik Kimia';
    }
    
    // 4. Teknik Sipil
    if (strpos($nama, 'sipil') !== false || 
        strpos($nama, 'konstruksi') !== false || 
        strpos($nama, 'jalan') !== false || 
        strpos($nama, 'jembatan') !== false || 
        strpos($nama, 'gedung') !== false || 
        strpos($nama, 'bangunan') !== false || 
        strpos($nama, 'transportasi') !== false || 
        strpos($nama, 'pengukuran') !== false) {
        return 'Teknik Sipil';
    }
    
    // 5. Teknik Elektro
    if (strpos($nama, 'elektro') !== false || 
        strpos($nama, 'listrik') !== false || 
        strpos($nama, 'elektronika') !== false || 
        strpos($nama, 'telekomunikasi') !== false || 
        strpos($nama, 'mekatronika') !== false || 
        strpos($nama, 'instrumentasi') !== false || 
        strpos($nama, 'pembangkit') !== false) {
        return 'Teknik Elektro';
    }
    
    // 6. Teknik Mesin
    if (strpos($nama, 'mesin') !== false || 
        strpos($nama, 'manufaktur') !== false || 
        strpos($nama, 'pengelasan') !== false || 
        strpos($nama, 'fabrikasi') !== false || 
        strpos($nama, 'industri') !== false) {
        return 'Teknik Mesin';
    }
    
    return 'Lainnya';
}

// ====================================================================
// 5. SUSUN ARRAY DATA FINAL
// ====================================================================
$finalData = [];

foreach ($prodiPddikti as $index => $prodi) {
    $namaRaw = trim($prodi['nama'] ?? '');
    $namaFormatted = toTitleCase($namaRaw);
    $key = normalizeName($namaRaw);
    
    // Cocokkan dengan metadata akreditasi & UKT lokal
    $meta = $localLookup[$key] ?? null;
    
    $jurusan = $meta['jurusan'] ?? tentukanJurusan($namaRaw);
    $akreditasi = $meta['akreditasi'] ?? 'Terakreditasi';
    $biayaMin = $meta['biaya_min'] ?? null;
    $biayaMax = $meta['biaya_max'] ?? null;
    $satuanBiaya = $meta['satuan_biaya'] ?? 'per semester';
    
    $finalData[] = [
        'id' => $index + 1,
        'pddikti_id' => $prodi['id'] ?? null,
        'nama_pt' => 'Politeknik Negeri Lhokseumawe',
        'jurusan' => $jurusan,
        'nama_prodi' => $namaFormatted,
        'jenjang' => strtoupper($prodi['jenjang'] ?? 'D3'),
        'akreditasi' => $akreditasi,
        'biaya_min' => $biayaMin,
        'biaya_max' => $biayaMax,
        'satuan_biaya' => $satuanBiaya,
        'status' => 'Aktif',
        'periode_data' => 'Live PDDikti'
    ];
}

$waktuSekarang = date('d M Y, H:i:s') . ' WIB';

$outputArray = [
    'status' => true,
    'sumber' => $sumber,
    'endpoint' => $pddiktiUrl,
    'terakhir_diperbarui' => $waktuSekarang,
    'timestamp' => time(),
    'jumlah_data' => count($finalData),
    'data' => $finalData
];

$outputJson = json_encode($outputArray, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// Simpan ke cache
@file_put_contents($cacheFile, $outputJson);

// Selalu sinkronkan data.json dan data.js agar fallback offline selalu mutakhir
@file_put_contents($localDataFile, $outputJson);
$jsContent = "window.DATA_FALLBACK = " . $outputJson . ";\n";
@file_put_contents($localDataJs, $jsContent);

echo $outputJson;

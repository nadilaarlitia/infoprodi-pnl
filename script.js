let semuaData = [];
let jurusanAktif = "";
let terakhirSinkronWaktu = "-";
let tableSortColumn = "id";
let tableSortAsc = true;
let viewAktif = "kartu"; // "kartu" atau "tabel"

// =====================================================
// ELEMEN DOM
// =====================================================

const jurusanContainer = document.getElementById("jurusanContainer");
const prodiContainer = document.getElementById("prodiContainer");

const halamanJurusan = document.getElementById("halamanJurusan");
const halamanProdi = document.getElementById("halamanProdi");
const halamanTabel = document.getElementById("halamanTabel");

const tabKartu = document.getElementById("tabKartu");
const tabTabel = document.getElementById("tabTabel");
const tabBadgeCount = document.getElementById("tabBadgeCount");

const btnRefreshData = document.getElementById("btnRefreshData");
const refreshIcon = document.getElementById("refreshIcon");
const refreshText = document.getElementById("refreshText");
const syncTimeBadge = document.getElementById("syncTimeBadge");

const btnDownloadPdf = document.getElementById("btnDownloadPdf");
const btnDownloadPdfTabel = document.getElementById("btnDownloadPdfTabel");

const searchJurusan = document.getElementById("searchJurusan");
const searchProdi = document.getElementById("searchProdi");
const searchTabel = document.getElementById("searchTabel");

const filterJurusanTabel = document.getElementById("filterJurusanTabel");
const filterJenjangTabel = document.getElementById("filterJenjangTabel");
const filterAkreditasiTabel = document.getElementById("filterAkreditasiTabel");
const btnResetFilter = document.getElementById("btnResetFilter");

const tabelCount = document.getElementById("tabelCount");
const tabelTotal = document.getElementById("tabelTotal");
const tabelProdiBody = document.getElementById("tabelProdiBody");
const emptyTabel = document.getElementById("emptyTabel");
const prodiTable = document.getElementById("prodiTable");

const namaJurusan = document.getElementById("namaJurusan");
const jumlahProdi = document.getElementById("jumlahProdi");
const jumlahJurusan = document.getElementById("jumlahJurusan");
const jumlahProdiJurusan = document.getElementById("jumlahProdiJurusan");

const tombolKembali = document.getElementById("tombolKembali");

const emptyJurusan = document.getElementById("emptyJurusan");
const emptyProdi = document.getElementById("emptyProdi");

const errorBox = document.getElementById("error");

const printTableBody = document.getElementById("printTableBody");
const printSyncDate = document.getElementById("printSyncDate");
const printDate = document.getElementById("printDate");
const printSignDate = document.getElementById("printSignDate");

const toastNotification = document.getElementById("toastNotification");

// Modal Elements
const modalDetailProdi = document.getElementById("modalDetailProdi");
const tutupModal = document.getElementById("tutupModal");
const modalJenjang = document.getElementById("modalJenjang");
const modalAkreditasi = document.getElementById("modalAkreditasi");
const modalNamaProdi = document.getElementById("modalNamaProdi");
const modalJurusan = document.getElementById("modalJurusan");
const modalInfoJurusan = document.getElementById("modalInfoJurusan");
const modalInfoAkreditasi = document.getElementById("modalInfoAkreditasi");
const modalInfoUkt = document.getElementById("modalInfoUkt");
const modalLinkPddikti = document.getElementById("modalLinkPddikti");


// =====================================================
// TOAST NOTIFIKASI
// =====================================================

let toastTimer = null;
function tampilkanToast(pesan, durasi = 3800) {
    if (!toastNotification) return;
    toastNotification.innerHTML = pesan;
    toastNotification.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastNotification.classList.remove("show");
    }, durasi);
}


// =====================================================
// FORMAT RUPIAH
// =====================================================

function formatRupiah(angka) {
    if (angka === null || angka === undefined || angka === "") {
        return "-";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(Number(angka));
}


// =====================================================
// PENGOLAHAN DATA DARI API / FALLBACK
// =====================================================

function olahDanTampilkanData(data) {
    if (Array.isArray(data)) {
        semuaData = data;
    } else if (Array.isArray(data.data)) {
        semuaData = data.data;
        if (data.terakhir_diperbarui) {
            terakhirSinkronWaktu = data.terakhir_diperbarui;
        }
    } else {
        throw new Error("Format data tidak sesuai");
    }

    // Default timestamp jika belum ada
    if (!terakhirSinkronWaktu || terakhirSinkronWaktu === "-") {
        const now = new Date();
        terakhirSinkronWaktu = now.toLocaleDateString("id-ID", {
            day: "numeric", month: "short", year: "numeric"
        }) + ", " + now.toLocaleTimeString("id-ID", {
            hour: "2-digit", minute: "2-digit"
        }) + " WIB";
    }

    // Perbarui badge sinkronisasi
    if (syncTimeBadge) {
        syncTimeBadge.textContent = "Sinkron: " + terakhirSinkronWaktu;
    }
    if (printSyncDate) {
        printSyncDate.textContent = terakhirSinkronWaktu;
    }
    if (tabBadgeCount) {
        tabBadgeCount.textContent = semuaData.length;
    }

    if (errorBox) {
        errorBox.style.display = "none";
    }

    tampilkanStatistik();
    tampilkanJurusan(semuaData);
    renderTabelProdi();
}


// =====================================================
// LOADER DATA UTAMA (api.php -> data.json -> data.js)
// =====================================================

function muatDataAplikasi() {
    // Jika dibuka langsung via file:// (double-click di explorer tanpa server),
    // browser memblokir fetch() lokal karena CORS. Gunakan data.js jika tersedia.
    if (window.location.protocol === "file:" && typeof window.DATA_FALLBACK !== "undefined") {
        console.log("Membuka via file://, memuat data dari data.js...");
        olahDanTampilkanData(window.DATA_FALLBACK);
        return;
    }

    // Coba ambil dari api.php (Live PDDikti), fallback ke data.json jika offline
    fetch("api.php")
        .then(response => {
            if (!response.ok) {
                throw new Error("api.php response tidak ok: " + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data berhasil dimuat dari:", data.sumber || "API", data);
            olahDanTampilkanData(data);
        })
        .catch(apiError => {
            console.warn("Gagal memuat dari api.php, mencoba fallback ke data.json...", apiError);
            fetch("data.json?v=" + Date.now())
                .then(res => {
                    if (!res.ok) throw new Error("data.json tidak ditemukan");
                    return res.json();
                })
                .then(data => {
                    olahDanTampilkanData(data);
                })
                .catch(error => {
                    console.warn("Gagal memuat data.json, mengecek fallback data.js...", error);
                    if (typeof window.DATA_FALLBACK !== "undefined") {
                        console.log("Memuat data dari window.DATA_FALLBACK...");
                        olahDanTampilkanData(window.DATA_FALLBACK);
                        return;
                    }

                    console.error("Gagal memuat data dari semua sumber:", error);
                    if (errorBox) {
                        if (window.location.protocol === "file:") {
                            errorBox.innerHTML = `
                                <strong>Aplikasi dibuka melalui protokol file:// (Klik Ganda)</strong>
                                <span>Browser memblokir pembacaan file data karena batasan keamanan (CORS).<br>
                                <b>Solusi:</b> Buka <b>XAMPP Control Panel</b>, klik tombol <b>Start Apache</b>, lalu buka di browser: 
                                <a href="http://localhost/infoprodi-PNL-online/" style="color:#be123c;font-weight:bold;text-decoration:underline;">http://localhost/infoprodi-PNL-online/</a></span>
                            `;
                        }
                        errorBox.style.display = "flex";
                    }
                    if (jurusanContainer) jurusanContainer.innerHTML = "";
                });
        });
}


// =====================================================
// TOMBOL SINKRONISASI DATA TERBARU DARI PDDIKTI
// =====================================================

function sinkronkanDataPddikti() {
    if (btnRefreshData) {
        btnRefreshData.disabled = true;
        btnRefreshData.classList.add("loading");
    }
    if (refreshText) refreshText.textContent = "Menghubungi PDDikti...";

    tampilkanToast("⏳ Sedang mengambil data ter-update langsung dari Kemdiktisaintek PDDikti...");

    fetch("api.php?refresh=1&_t=" + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("Gagal refresh: status " + res.status);
            return res.json();
        })
        .then(data => {
            olahDanTampilkanData(data);
            tampilkanToast(`✅ Berhasil! ${semuaData.length} Program Studi diperbarui langsung dari PDDikti.`);
        })
        .catch(err => {
            console.warn("Sinkronisasi live PDDikti gagal:", err);
            if (window.location.protocol === "file:") {
                tampilkanToast(`ℹ️ Anda membuka lewat <b>file://</b>. Buka lewat server: <a href="http://localhost/infoprodi-PNL-online/" style="color:#f5c400;text-decoration:underline;font-weight:bold;margin-left:4px;">http://localhost/infoprodi-PNL-online/ ↗</a>`, 7000);
            } else {
                tampilkanToast("⚠️ Server PDDikti sedang sibuk/offline. Data saat ini tetap aman digunakan.", 4000);
            }
        })
        .finally(() => {
            if (btnRefreshData) {
                btnRefreshData.disabled = false;
                btnRefreshData.classList.remove("loading");
            }
            if (refreshText) refreshText.textContent = "Sinkronkan PDDikti";
        });
}

if (btnRefreshData) {
    btnRefreshData.addEventListener("click", sinkronkanDataPddikti);
}


// =====================================================
// NAVIGASI TAB TAMPILAN (KARTU vs TABEL)
// =====================================================

function gantiTampilan(tampilan) {
    viewAktif = tampilan;

    if (tampilan === "kartu") {
        if (tabKartu) {
            tabKartu.classList.add("active");
            tabKartu.setAttribute("aria-selected", "true");
        }
        if (tabTabel) {
            tabTabel.classList.remove("active");
            tabTabel.setAttribute("aria-selected", "false");
        }

        if (halamanTabel) halamanTabel.style.display = "none";

        if (jurusanAktif) {
            if (halamanJurusan) halamanJurusan.style.display = "none";
            if (halamanProdi) halamanProdi.style.display = "block";
        } else {
            if (halamanJurusan) halamanJurusan.style.display = "block";
            if (halamanProdi) halamanProdi.style.display = "none";
        }
    } else if (tampilan === "tabel") {
        if (tabTabel) {
            tabTabel.classList.add("active");
            tabTabel.setAttribute("aria-selected", "true");
        }
        if (tabKartu) {
            tabKartu.classList.remove("active");
            tabKartu.setAttribute("aria-selected", "false");
        }

        if (halamanJurusan) halamanJurusan.style.display = "none";
        if (halamanProdi) halamanProdi.style.display = "none";
        if (halamanTabel) halamanTabel.style.display = "block";

        renderTabelProdi();
    }
}

if (tabKartu) {
    tabKartu.addEventListener("click", () => gantiTampilan("kartu"));
}
if (tabTabel) {
    tabTabel.addEventListener("click", () => gantiTampilan("tabel"));
}


// =====================================================
// STATISTIK KARTU
// =====================================================

function tampilkanStatistik() {
    const daftarJurusan = new Set();

    semuaData.forEach(item => {
        if (item.jurusan) {
            daftarJurusan.add(item.jurusan);
        }
    });

    if (jumlahProdi) {
        jumlahProdi.textContent = semuaData.length;
    }

    if (jumlahJurusan) {
        jumlahJurusan.textContent = daftarJurusan.size;
    }
}


// =====================================================
// TAMPILKAN JURUSAN (CARD VIEW)
// =====================================================

function tampilkanJurusan(data) {
    if (!jurusanContainer) return;
    jurusanContainer.innerHTML = "";

    const daftarJurusan = {};

    data.forEach(item => {
        const jurusan = item.jurusan || "Jurusan Lainnya";
        if (!daftarJurusan[jurusan]) {
            daftarJurusan[jurusan] = [];
        }
        daftarJurusan[jurusan].push(item);
    });

    const namaDaftarJurusan = Object.keys(daftarJurusan);

    if (namaDaftarJurusan.length === 0) {
        if (emptyJurusan) emptyJurusan.style.display = "block";
        return;
    }

    if (emptyJurusan) emptyJurusan.style.display = "none";

    namaDaftarJurusan.forEach((jurusan, index) => {
        const jumlah = daftarJurusan[jurusan].length;

        const card = document.createElement("div");
        card.className = "jurusan-card";

        card.innerHTML = `
            <div class="jurusan-card-top">
                <div class="jurusan-card-icon">🎓</div>
                <div class="card-arrow">→</div>
            </div>

            <div class="jurusan-card-content">
                <div class="card-number">JURUSAN ${String(index + 1).padStart(2, "0")}</div>
                <h3>${jurusan}</h3>
                <p>${jumlah} Program Studi</p>
            </div>

            <div class="jurusan-card-footer">
                <span>Lihat Program Studi</span>
                <span class="footer-arrow">→</span>
            </div>
        `;

        card.addEventListener("click", function () {
            bukaJurusan(jurusan);
        });

        jurusanContainer.appendChild(card);
    });
}


// =====================================================
// BUKA HALAMAN PROGRAM STUDI PER JURUSAN
// =====================================================

function bukaJurusan(jurusan) {
    jurusanAktif = jurusan;

    const dataJurusan = semuaData.filter(item => item.jurusan === jurusan);

    if (namaJurusan) namaJurusan.textContent = jurusan;
    if (jumlahProdiJurusan) jumlahProdiJurusan.textContent = `${dataJurusan.length} Program Studi`;

    tampilkanProdi(dataJurusan);

    if (halamanJurusan) halamanJurusan.style.display = "none";
    if (halamanProdi) halamanProdi.style.display = "block";

    if (searchProdi) searchProdi.value = "";

    window.scrollTo({ top: 0, behavior: "smooth" });
}


// =====================================================
// TAMPILKAN KARTU PROGRAM STUDI
// =====================================================

function tampilkanProdi(data) {
    if (!prodiContainer) return;
    prodiContainer.innerHTML = "";

    if (data.length === 0) {
        if (emptyProdi) emptyProdi.style.display = "block";
        return;
    }

    if (emptyProdi) emptyProdi.style.display = "none";

    data.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "prodi-card";

        const jenjang = item.jenjang || "-";
        const akreditasi = item.akreditasi || "Terakreditasi";

        let biayaHTML = `
            <div class="biaya-text">
                <strong>Belum tersedia</strong>
                <small>Kisaran biaya UKT</small>
            </div>
        `;

        if (item.biaya_min !== null && item.biaya_min !== undefined && item.biaya_max !== null && item.biaya_max !== undefined) {
            biayaHTML = `
                <div class="biaya-text">
                    <strong>
                        ${formatRupiah(item.biaya_min)} - ${formatRupiah(item.biaya_max)}
                    </strong>
                    <small>Kisaran biaya UKT (${item.satuan_biaya || 'per semester'})</small>
                </div>
            `;
        }

        const pddiktiUrl = item.pddikti_id
            ? `https://pddikti.kemdiktisaintek.go.id/detail-prodi/${encodeURIComponent(item.pddikti_id)}`
            : `https://pddikti.kemdiktisaintek.go.id/pencarian/all/${encodeURIComponent(item.nama_prodi || "Politeknik Negeri Lhokseumawe")}`;

        card.innerHTML = `
            <div class="prodi-card-top">
                <span class="jenjang">${jenjang}</span>
                <span class="akreditasi">${akreditasi}</span>
            </div>

            <div class="prodi-card-content">
                <div class="card-number">PROGRAM STUDI ${String(index + 1).padStart(2, "0")}</div>
                <h3>${item.nama_prodi || "-"}</h3>
                <p class="prodi-jurusan">${item.jurusan || "-"}</p>
                <div class="card-divider"></div>
                <div class="prodi-info">
                    <div class="info-item">
                        <div class="info-icon">🎓</div>
                        <div>
                            <label>AKREDITASI</label>
                            <p>${akreditasi}</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon">💰</div>
                        <div>
                            <label>BIAYA UKT</label>
                            ${biayaHTML}
                        </div>
                    </div>
                </div>
            </div>

            <div class="prodi-card-footer">
                <span>Lihat Detail Resmi PDDikti</span>
                <span class="footer-arrow">↗</span>
            </div>
        `;

        card.addEventListener("click", function () {
            bukaModalDetail(item, pddiktiUrl);
        });

        prodiContainer.appendChild(card);
    });
}


// =====================================================
// TAMPILKAN TABEL LENGKAP PROGRAM STUDI (TABLE VIEW)
// =====================================================

function renderTabelProdi() {
    if (!tabelProdiBody) return;

    const keyword = (searchTabel ? searchTabel.value : "").toLowerCase().trim();
    const jurusanFilter = filterJurusanTabel ? filterJurusanTabel.value : "";
    const jenjangFilter = filterJenjangTabel ? filterJenjangTabel.value : "";
    const akreditasiFilter = filterAkreditasiTabel ? filterAkreditasiTabel.value : "";

    let filtered = semuaData.filter(item => {
        const matchKeyword = !keyword || (
            (item.nama_prodi || "").toLowerCase().includes(keyword) ||
            (item.jurusan || "").toLowerCase().includes(keyword) ||
            (item.jenjang || "").toLowerCase().includes(keyword) ||
            (item.akreditasi || "").toLowerCase().includes(keyword)
        );

        const matchJurusan = !jurusanFilter || item.jurusan === jurusanFilter;
        const matchJenjang = !jenjangFilter || item.jenjang === jenjangFilter;
        const matchAkreditasi = !akreditasiFilter || (item.akreditasi || "").toLowerCase() === akreditasiFilter.toLowerCase();

        return matchKeyword && matchJurusan && matchJenjang && matchAkreditasi;
    });

    // Sorting
    filtered.sort((a, b) => {
        let valA = a[tableSortColumn];
        let valB = b[tableSortColumn];

        if (tableSortColumn === "id" || tableSortColumn === "biaya_min") {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            return tableSortAsc ? valA - valB : valB - valA;
        }

        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
        if (valA < valB) return tableSortAsc ? -1 : 1;
        if (valA > valB) return tableSortAsc ? 1 : -1;
        return 0;
    });

    // Update Counter
    if (tabelCount) tabelCount.textContent = filtered.length;
    if (tabelTotal) tabelTotal.textContent = semuaData.length;

    tabelProdiBody.innerHTML = "";

    if (filtered.length === 0) {
        if (emptyTabel) emptyTabel.style.display = "block";
        return;
    }

    if (emptyTabel) emptyTabel.style.display = "none";

    filtered.forEach((item, index) => {
        const tr = document.createElement("tr");

        const pddiktiUrl = item.pddikti_id
            ? `https://pddikti.kemdiktisaintek.go.id/detail-prodi/${encodeURIComponent(item.pddikti_id)}`
            : `https://pddikti.kemdiktisaintek.go.id/pencarian/all/${encodeURIComponent(item.nama_prodi || "Politeknik Negeri Lhokseumawe")}`;

        // Jenjang Class
        let jenjangClass = "badge-jenjang";
        if (item.jenjang === "D4") jenjangClass += " jenjang-d4";
        if (item.jenjang === "S2 Terapan") jenjangClass += " jenjang-s2";

        // Akreditasi Class
        let akreditasiClass = "badge-akreditasi";
        const akredLower = (item.akreditasi || "").toLowerCase();
        if (akredLower.includes("unggul")) akreditasiClass += " badge-unggul";
        else if (akredLower.includes("baik sekali")) akreditasiClass += " badge-baiksekali";
        else if (akredLower.includes("baik")) akreditasiClass += " badge-baik";
        else if (akredLower === "b") akreditasiClass += " badge-b";
        else akreditasiClass += " badge-terakreditasi";

        // Biaya UKT format
        let biayaHTML = `<span style="color:#888;">-</span>`;
        if (item.biaya_min !== null && item.biaya_min !== undefined && item.biaya_max !== null && item.biaya_max !== undefined) {
            biayaHTML = `
                <span class="biaya-range-val">${formatRupiah(item.biaya_min)} - ${formatRupiah(item.biaya_max)}</span>
                <span class="biaya-satuan-sub">${item.satuan_biaya || 'per semester'}</span>
            `;
        }

        tr.innerHTML = `
            <td class="col-no">${index + 1}</td>
            <td class="col-prodi">
                <div class="prodi-title-cell">${item.nama_prodi || "-"}</div>
                <div class="prodi-pt-sub">Politeknik Negeri Lhokseumawe</div>
            </td>
            <td class="col-jurusan">${item.jurusan || "-"}</td>
            <td class="col-jenjang"><span class="${jenjangClass}">${item.jenjang || "-"}</span></td>
            <td class="col-akreditasi"><span class="${akreditasiClass}">${item.akreditasi || "Terakreditasi"}</span></td>
            <td class="col-biaya">${biayaHTML}</td>
            <td class="col-status">
                <span class="badge-status-aktif">● Aktif</span>
            </td>
            <td class="col-aksi">
                <div class="action-btn-group">
                    <button class="btn-tbl-detail" type="button">Detail</button>
                    <a href="${pddiktiUrl}" target="_blank" rel="noopener noreferrer" class="btn-tbl-pddikti" title="Buka profil resmi PDDikti">PDDikti ↗</a>
                </div>
            </td>
        `;

        tr.querySelector(".btn-tbl-detail").addEventListener("click", () => {
            bukaModalDetail(item, pddiktiUrl);
        });

        tabelProdiBody.appendChild(tr);
    });
}

// Event Listeners Filter & Search Tabel
if (searchTabel) {
    searchTabel.addEventListener("input", renderTabelProdi);
}
if (filterJurusanTabel) {
    filterJurusanTabel.addEventListener("change", renderTabelProdi);
}
if (filterJenjangTabel) {
    filterJenjangTabel.addEventListener("change", renderTabelProdi);
}
if (filterAkreditasiTabel) {
    filterAkreditasiTabel.addEventListener("change", renderTabelProdi);
}
if (btnResetFilter) {
    btnResetFilter.addEventListener("click", () => {
        if (searchTabel) searchTabel.value = "";
        if (filterJurusanTabel) filterJurusanTabel.value = "";
        if (filterJenjangTabel) filterJenjangTabel.value = "";
        if (filterAkreditasiTabel) filterAkreditasiTabel.value = "";
        renderTabelProdi();
    });
}

// Sorting Kolom Tabel
const tableHeaders = document.querySelectorAll("#prodiTable thead th[data-sort]");
tableHeaders.forEach(th => {
    th.addEventListener("click", () => {
        const sortKey = th.getAttribute("data-sort");
        if (tableSortColumn === sortKey) {
            tableSortAsc = !tableSortAsc;
        } else {
            tableSortColumn = sortKey;
            tableSortAsc = true;
        }

        tableHeaders.forEach(h => {
            h.classList.remove("sorted-asc", "sorted-desc");
            const icon = h.querySelector(".sort-icon");
            if (icon) icon.textContent = "↕";
        });

        th.classList.add(tableSortAsc ? "sorted-asc" : "sorted-desc");
        const sortIcon = th.querySelector(".sort-icon");
        if (sortIcon) sortIcon.textContent = tableSortAsc ? "▲" : "▼";

        renderTabelProdi();
    });
});


// =====================================================
// FITUR UNDUH LAPORAN PDF / CETAK DOKUMEN RESMI
// =====================================================

function unduhLaporanPdf() {
    if (!printTableBody) return;

    printTableBody.innerHTML = "";

    const keyword = (searchTabel ? searchTabel.value : "").toLowerCase().trim();
    const jurusanFilter = filterJurusanTabel ? filterJurusanTabel.value : "";
    const jenjangFilter = filterJenjangTabel ? filterJenjangTabel.value : "";
    const akreditasiFilter = filterAkreditasiTabel ? filterAkreditasiTabel.value : "";

    const dataToPrint = semuaData.filter(item => {
        const matchKeyword = !keyword || (
            (item.nama_prodi || "").toLowerCase().includes(keyword) ||
            (item.jurusan || "").toLowerCase().includes(keyword) ||
            (item.jenjang || "").toLowerCase().includes(keyword) ||
            (item.akreditasi || "").toLowerCase().includes(keyword)
        );
        const matchJurusan = !jurusanFilter || item.jurusan === jurusanFilter;
        const matchJenjang = !jenjangFilter || item.jenjang === jenjangFilter;
        const matchAkreditasi = !akreditasiFilter || (item.akreditasi || "").toLowerCase() === akreditasiFilter.toLowerCase();
        return matchKeyword && matchJurusan && matchJenjang && matchAkreditasi;
    });

    dataToPrint.forEach((item, index) => {
        const tr = document.createElement("tr");

        let biayaText = "-";
        if (item.biaya_min !== null && item.biaya_min !== undefined && item.biaya_max !== null && item.biaya_max !== undefined) {
            biayaText = `${formatRupiah(item.biaya_min)} - ${formatRupiah(item.biaya_max)}`;
        }

        tr.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td><strong>${item.nama_prodi || "-"}</strong></td>
            <td>${item.jurusan || "-"}</td>
            <td style="text-align: center;">${item.jenjang || "-"}</td>
            <td style="text-align: center;">${item.akreditasi || "Terakreditasi"}</td>
            <td>${biayaText}</td>
        `;
        printTableBody.appendChild(tr);
    });

    const now = new Date();
    const formattedDate = now.toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric"
    });
    const formattedTime = now.toLocaleTimeString("id-ID", {
        hour: "2-digit", minute: "2-digit"
    }) + " WIB";

    if (printDate) printDate.textContent = `${formattedDate}, ${formattedTime}`;
    if (printSignDate) printSignDate.textContent = formattedDate;
    if (printSyncDate) printSyncDate.textContent = terakhirSinkronWaktu;

    tampilkanToast("📄 Menyiapkan dokumen cetak... Pilih 'Save as PDF' / 'Simpan sebagai PDF' di jendela cetak.");

    setTimeout(() => {
        window.print();
    }, 450);
}

if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener("click", unduhLaporanPdf);
}
if (btnDownloadPdfTabel) {
    btnDownloadPdfTabel.addEventListener("click", unduhLaporanPdf);
}


// =====================================================
// PENCARIAN JURUSAN (CARD VIEW)
// =====================================================

if (searchJurusan) {
    searchJurusan.addEventListener("input", function () {
        const keyword = this.value.toLowerCase().trim();

        if (keyword === "") {
            tampilkanJurusan(semuaData);
            return;
        }

        const hasil = semuaData.filter(item => {
            const jurusan = (item.jurusan || "").toLowerCase();
            const prodi = (item.nama_prodi || "").toLowerCase();
            return jurusan.includes(keyword) || prodi.includes(keyword);
        });

        tampilkanJurusan(hasil);
    });
}


// =====================================================
// PENCARIAN PROGRAM STUDI (CARD VIEW)
// =====================================================

if (searchProdi) {
    searchProdi.addEventListener("input", function () {
        const keyword = this.value.toLowerCase().trim();
        const dataJurusan = semuaData.filter(item => item.jurusan === jurusanAktif);

        if (keyword === "") {
            tampilkanProdi(dataJurusan);
            return;
        }

        const hasil = dataJurusan.filter(item => {
            const nama = (item.nama_prodi || "").toLowerCase();
            const jenjang = (item.jenjang || "").toLowerCase();
            const akreditasi = (item.akreditasi || "").toLowerCase();
            return nama.includes(keyword) || jenjang.includes(keyword) || akreditasi.includes(keyword);
        });

        tampilkanProdi(hasil);
    });
}


// =====================================================
// TOMBOL KEMBALI KE JURUSAN
// =====================================================

if (tombolKembali) {
    tombolKembali.addEventListener("click", function () {
        if (halamanProdi) halamanProdi.style.display = "none";
        if (halamanJurusan) halamanJurusan.style.display = "block";
        jurusanAktif = "";

        if (searchProdi) searchProdi.value = "";
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}


// =====================================================
// MODAL DETAIL PRODI
// =====================================================

function bukaModalDetail(item, pddiktiUrl) {
    if (!modalDetailProdi) return;

    if (modalJenjang) modalJenjang.textContent = item.jenjang || "-";
    if (modalAkreditasi) modalAkreditasi.textContent = item.akreditasi || "Terakreditasi";
    if (modalNamaProdi) modalNamaProdi.textContent = item.nama_prodi || "-";
    if (modalJurusan) modalJurusan.textContent = item.jurusan || "-";
    if (modalInfoJurusan) modalInfoJurusan.textContent = item.jurusan || "-";
    if (modalInfoAkreditasi) modalInfoAkreditasi.textContent = item.akreditasi || "Terakreditasi";

    let uktText = "Belum tersedia";
    if (item.biaya_min !== null && item.biaya_min !== undefined && item.biaya_max !== null && item.biaya_max !== undefined) {
        uktText = `${formatRupiah(item.biaya_min)} - ${formatRupiah(item.biaya_max)} (${item.satuan_biaya || 'per semester'})`;
    }
    if (modalInfoUkt) modalInfoUkt.textContent = uktText;

    if (modalLinkPddikti) {
        modalLinkPddikti.href = pddiktiUrl;
    }

    modalDetailProdi.classList.add("active");
    modalDetailProdi.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function sembunyikanModal() {
    if (!modalDetailProdi) return;
    modalDetailProdi.classList.remove("active");
    modalDetailProdi.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

if (tutupModal) {
    tutupModal.addEventListener("click", sembunyikanModal);
}

if (modalDetailProdi) {
    modalDetailProdi.addEventListener("click", function (e) {
        if (e.target === modalDetailProdi) {
            sembunyikanModal();
        }
    });
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modalDetailProdi && modalDetailProdi.classList.contains("active")) {
        sembunyikanModal();
    }
});


// =====================================================
// INISIALISASI APLIKASI
// =====================================================

muatDataAplikasi();
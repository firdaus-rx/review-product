const SHEET_KATEGORI = "kategori";
const SHEET_PRODUK = "produk";
const SHEET_REVIEW = "review";
const TIMEZONE = "Asia/Jakarta";

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action;

    if (action === "kategori") {
      return jsonResponse({
        success: true,
        data: getKategori(),
      });
    }

    if (action === "produk") {
      return jsonResponse({
        success: true,
        data: getProdukPaginated(params),
      });
    }

    if (action === "produk_detail") {
      return jsonResponse({
        success: true,
        data: getProdukById(params.id),
      });
    }

    if (action === "review") {
      return jsonResponse({
        success: true,
        data: getReview(),
      });
    }

    return jsonResponse({
      success: false,
      message: "Action tidak ditemukan",
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message,
    });
  }
}

function doPost(e) {
  try {
    const data = parsePostData(e);

    if (data.action === "tambah_kategori") {
      return jsonResponse(tambahKategori(data));
    }

    if (data.action === "update_kategori") {
      return jsonResponse(updateKategori(data));
    }

    if (data.action === "tambah_produk") {
      return jsonResponse(tambahProduk(data));
    }

    if (data.action === "update_produk") {
      return jsonResponse(updateProduk(data));
    }

    if (data.action === "tambah_review") {
      return jsonResponse(tambahReview(data));
    }

    return jsonResponse({
      success: false,
      message: "Action tidak ditemukan",
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message,
    });
  }
}

/* =========================
   KATEGORI
========================= */

function getKategori() {
  const rows = getDataRows(getSheet(SHEET_KATEGORI));

  return rows
    .filter((row) => row[0] !== "" && row[0] !== null)
    .map((row) => buildKategoriObject(row))
    .filter((kategori) => kategori.status !== "Nonaktif");
}

function getAllKategori() {
  const rows = getDataRows(getSheet(SHEET_KATEGORI));

  return rows
    .filter((row) => row[0] !== "" && row[0] !== null)
    .map((row) => buildKategoriObject(row));
}

function getKategoriMap() {
  const kategoriRows = getAllKategori();
  const map = {};

  kategoriRows.forEach((kategori) => {
    map[String(kategori.id)] = kategori;
  });

  return map;
}

function getKategoriById(id) {
  if (!id) return null;

  const kategoriRows = getAllKategori();

  return (
    kategoriRows.find((kategori) => String(kategori.id) === String(id)) || null
  );
}

function tambahKategori(data) {
  validasiKategori(data, false);

  const sheet = getSheet(SHEET_KATEGORI);
  const newId = getNextId(sheet);
  const namaKategori = clean(data.nama_kategori);
  const slug = clean(data.slug) || createSlug(namaKategori);

  sheet.appendRow([
    newId,
    namaKategori,
    slug,
    clean(data.icon) || "fa-tag",
    clean(data.warna) || "primary",
    clean(data.status) || "Aktif",
  ]);

  return {
    success: true,
    message: "Kategori berhasil ditambahkan",
    data: {
      id: newId,
    },
  };
}

function updateKategori(data) {
  validasiKategori(data, true);

  const sheet = getSheet(SHEET_KATEGORI);
  const rows = sheet.getDataRange().getValues();
  const id = String(data.id);
  const namaKategori = clean(data.nama_kategori);
  const slug = clean(data.slug) || createSlug(namaKategori);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      sheet.getRange(i + 1, 2, 1, 5).setValues([
        [
          namaKategori,
          slug,
          clean(data.icon) || "fa-tag",
          clean(data.warna) || "primary",
          clean(data.status) || "Aktif",
        ],
      ]);

      return {
        success: true,
        message: "Kategori berhasil diperbarui",
        data: {
          id: data.id,
        },
      };
    }
  }

  return {
    success: false,
    message: "Kategori tidak ditemukan",
  };
}

function buildKategoriObject(row) {
  return {
    id: row[0],
    nama_kategori: row[1],
    slug: row[2],
    icon: row[3] || "fa-tag",
    warna: row[4] || "primary",
    status: row[5] || "Aktif",
  };
}

function validasiKategori(data, isUpdate) {
  if (isUpdate && !clean(data.id)) {
    throw new Error("ID kategori wajib dikirim");
  }

  if (!clean(data.nama_kategori)) {
    throw new Error("Nama kategori wajib diisi");
  }
}

/* =========================
   PRODUK
========================= */

function getProduk() {
  const produkSheet = getSheet(SHEET_PRODUK);
  const reviewRows = getDataRows(getSheet(SHEET_REVIEW));
  const produkRows = getDataRows(produkSheet);
  const kategoriMap = getKategoriMap();

  return produkRows
    .filter((row) => row[0] !== "" && row[0] !== null)
    .map((row) => buildProdukObject(row, reviewRows, kategoriMap));
}

function getProdukPaginated(params) {
  const page = Math.max(Number(params.page || 1), 1);
  const limit = Math.max(Number(params.limit || 6), 1);
  const kategoriId = clean(params.kategori_id);
  const keyword = clean(params.search).toLowerCase();

  let allProduk = getProduk();

  if (kategoriId && kategoriId !== "Semua") {
    allProduk = allProduk.filter(
      (item) => String(item.kategori_id) === String(kategoriId),
    );
  }

  if (keyword) {
    allProduk = allProduk.filter((item) => {
      const haystack = [
        item.nama_produk,
        item.brand,
        item.kategori,
        item.deskripsi,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }

  const totalData = allProduk.length;
  const totalPage = Math.ceil(totalData / limit) || 1;
  const safePage = Math.min(page, totalPage);
  const startIndex = (safePage - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    items: allProduk.slice(startIndex, endIndex),
    pagination: {
      page: safePage,
      limit: limit,
      total_data: totalData,
      total_page: totalPage,
      has_prev: safePage > 1,
      has_next: safePage < totalPage,
      prev_page: safePage > 1 ? safePage - 1 : null,
      next_page: safePage < totalPage ? safePage + 1 : null,
    },
  };
}

function getProdukById(id) {
  if (!id) {
    throw new Error("ID produk wajib dikirim");
  }

  const produkRows = getDataRows(getSheet(SHEET_PRODUK));
  const reviewRows = getDataRows(getSheet(SHEET_REVIEW));
  const kategoriMap = getKategoriMap();

  const produk = produkRows.find((row) => String(row[0]) === String(id));

  if (!produk) {
    return null;
  }

  return buildProdukObject(produk, reviewRows, kategoriMap);
}

function tambahProduk(data) {
  validasiProduk(data, false);

  const sheet = getSheet(SHEET_PRODUK);
  const newId = getNextId(sheet);

  sheet.appendRow([
    newId,
    clean(data.kategori_id),
    clean(data.nama_produk),
    clean(data.brand),
    Number(data.harga),
    clean(data.gambar),
    clean(data.deskripsi),
    clean(data.status) || "Aktif",
  ]);

  return {
    success: true,
    message: "Produk berhasil ditambahkan",
    data: {
      id: newId,
    },
  };
}

function updateProduk(data) {
  validasiProduk(data, true);

  const sheet = getSheet(SHEET_PRODUK);
  const rows = sheet.getDataRange().getValues();
  const id = String(data.id);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      sheet.getRange(i + 1, 2, 1, 7).setValues([
        [
          clean(data.kategori_id),
          clean(data.nama_produk),
          clean(data.brand),
          Number(data.harga),
          clean(data.gambar),
          clean(data.deskripsi),
          clean(data.status) || "Aktif",
        ],
      ]);

      return {
        success: true,
        message: "Produk berhasil diperbarui",
        data: {
          id: data.id,
        },
      };
    }
  }

  return {
    success: false,
    message: "Produk tidak ditemukan",
  };
}

function buildProdukObject(row, reviewRows, kategoriMap) {
  const produkId = String(row[0]);
  const kategoriId = row[1];
  const kategori = kategoriMap[String(kategoriId)] || null;

  const reviewsProduk = reviewRows
    .filter((review) => String(review[1]) === produkId)
    .map((review) => ({
      id: review[0],
      produk_id: review[1],
      nama_reviewer: review[2],
      email: review[3],
      rating: Number(review[4] || 0),
      judul_review: review[5],
      isi_review: review[6],
      tanggal: formatTanggal(review[7]),
    }));

  const totalReview = reviewsProduk.length;

  const totalRating = reviewsProduk.reduce((total, review) => {
    return total + Number(review.rating || 0);
  }, 0);

  const ratingRataRata =
    totalReview > 0 ? Number((totalRating / totalReview).toFixed(1)) : 0;

  return {
    id: row[0],
    kategori_id: kategoriId,
    kategori: kategori ? kategori.nama_kategori : "",
    kategori_detail: kategori,
    nama_produk: row[2],
    brand: row[3],
    harga: Number(row[4] || 0),
    gambar: row[5],
    deskripsi: row[6],
    status: row[7],
    rating_rata_rata: ratingRataRata,
    total_review: totalReview,
    reviews: reviewsProduk,
  };
}

function validasiProduk(data, isUpdate) {
  if (isUpdate && !clean(data.id)) {
    throw new Error("ID produk wajib dikirim");
  }

  if (!clean(data.kategori_id)) {
    throw new Error("Kategori wajib dipilih");
  }

  if (!getKategoriById(data.kategori_id)) {
    throw new Error("Kategori tidak ditemukan");
  }

  if (!clean(data.nama_produk)) {
    throw new Error("Nama produk wajib diisi");
  }

  if (!clean(data.brand)) {
    throw new Error("Brand wajib diisi");
  }

  if (data.harga === "" || data.harga === null || data.harga === undefined) {
    throw new Error("Harga wajib diisi");
  }

  if (isNaN(Number(data.harga)) || Number(data.harga) < 0) {
    throw new Error("Harga harus berupa angka valid");
  }

  if (!clean(data.gambar)) {
    throw new Error("URL gambar wajib diisi");
  }

  if (!clean(data.deskripsi)) {
    throw new Error("Deskripsi wajib diisi");
  }
}

/* =========================
   REVIEW
========================= */

function getReview() {
  const rows = getDataRows(getSheet(SHEET_REVIEW));

  return rows
    .filter((row) => row[0] !== "" && row[0] !== null)
    .map((row) => ({
      id: row[0],
      produk_id: row[1],
      nama_reviewer: row[2],
      email: row[3],
      rating: Number(row[4] || 0),
      judul_review: row[5],
      isi_review: row[6],
      tanggal: formatTanggal(row[7]),
    }));
}

function tambahReview(data) {
  validasiReview(data);

  const sheet = getSheet(SHEET_REVIEW);
  const newId = getNextId(sheet);
  const tanggal = Utilities.formatDate(
    new Date(),
    TIMEZONE,
    "yyyy-MM-dd HH:mm:ss",
  );

  sheet.appendRow([
    newId,
    clean(data.produk_id),
    clean(data.nama_reviewer),
    clean(data.email),
    Number(data.rating),
    clean(data.judul_review),
    clean(data.isi_review),
    tanggal,
  ]);

  return {
    success: true,
    message: "Review berhasil ditambahkan",
    data: {
      id: newId,
    },
  };
}

function validasiReview(data) {
  if (!clean(data.produk_id)) {
    throw new Error("Produk wajib dipilih");
  }

  if (!getProdukById(data.produk_id)) {
    throw new Error("Produk tidak ditemukan");
  }

  if (!clean(data.nama_reviewer)) {
    throw new Error("Nama reviewer wajib diisi");
  }

  if (!clean(data.email)) {
    throw new Error("Email wajib diisi");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(data.email))) {
    throw new Error("Format email tidak valid");
  }

  const rating = Number(data.rating);

  if (!rating) {
    throw new Error("Rating wajib diisi");
  }

  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating harus antara 1 sampai 5");
  }

  if (!clean(data.judul_review)) {
    throw new Error("Judul review wajib diisi");
  }

  if (!clean(data.isi_review)) {
    throw new Error("Isi review wajib diisi");
  }
}

/* =========================
   HELPER
========================= */

function parsePostData(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Body request kosong");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("Body request harus JSON valid");
  }
}

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);

  if (!sheet) {
    throw new Error('Sheet "' + name + '" tidak ditemukan');
  }

  return sheet;
}

function getDataRows(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow <= 1 || lastColumn === 0) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

function getNextId(sheet) {
  const rows = getDataRows(sheet);
  const ids = rows.map((row) => Number(row[0])).filter((id) => !isNaN(id));

  if (ids.length === 0) {
    return 1;
  }

  return Math.max.apply(null, ids) + 1;
}

function formatTanggal(date) {
  if (!date) {
    return "";
  }

  if (Object.prototype.toString.call(date) === "[object Date]") {
    return Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  }

  return String(date);
}

function clean(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function createSlug(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
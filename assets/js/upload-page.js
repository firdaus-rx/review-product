let isEditMode = false;
let kategoriData = [];

document.addEventListener("DOMContentLoaded", initUploadPage);

async function initUploadPage() {
  const productForm = document.getElementById("productForm");

  if (productForm) {
    productForm.addEventListener("submit", simpanProduk);
  }

  setPageMode(false);
  setFormDisabled(true);

  await loadKategori();
  await checkEditMode();

  setFormDisabled(false);
}

async function loadKategori() {
  const select = document.getElementById("kategoriProduk");

  if (!select) return;

  select.innerHTML = `<option value="">Memuat kategori...</option>`;

  try {
    const result = await ApiService.getKategori();

    kategoriData = Array.isArray(result) ? result : [];

    if (!kategoriData.length) {
      select.innerHTML = `<option value="">Belum ada kategori</option>`;
      await showWarning("Belum ada data kategori.");
      return;
    }

    renderKategoriOptions();
  } catch (error) {
    console.error("Load kategori error:", error);

    kategoriData = [];
    select.innerHTML = `<option value="">Gagal memuat kategori</option>`;

    await showError(error.message || "Gagal memuat kategori.");
  }
}

function renderKategoriOptions(selectedId = "") {
  const select = document.getElementById("kategoriProduk");
  if (!select) return;

  if (!Array.isArray(kategoriData) || !kategoriData.length) {
    select.innerHTML = `<option value="">Belum ada kategori</option>`;
    return;
  }

  select.innerHTML = `
    <option value="">Pilih kategori</option>
    ${kategoriData
      .map((kategori) => {
        const id = String(kategori.id || "");
        const nama = String(kategori.nama_kategori || "-");
        const selected = String(selectedId) === id ? "selected" : "";

        return `
          <option value="${escapeHtml(id)}" ${selected}>
            ${escapeHtml(nama)}
          </option>
        `;
      })
      .join("")}
  `;
}

async function checkEditMode() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    isEditMode = false;
    setPageMode(false);
    return;
  }

  isEditMode = true;
  setPageMode(true);

  try {
    const produk = await ApiService.getProdukById(id);

    if (!produk) {
      await showWarning("Produk tidak ditemukan.");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 900);

      return;
    }

    setValue("produkEditId", produk.id);
    setValue("namaProduk", produk.nama_produk);
    setValue("brandProduk", produk.brand);
    setValue("hargaProduk", produk.harga);
    setValue("gambarProduk", produk.gambar);
    setValue("deskripsiProduk", produk.deskripsi);
    setValue("statusProduk", produk.status || "Aktif");

    renderKategoriOptions(produk.kategori_id);
    setValue("kategoriProduk", produk.kategori_id);
  } catch (error) {
    console.error("Check edit mode error:", error);

    await showError(
      error.message || "Gagal memuat detail produk untuk diedit.",
    );
  }
}

async function simpanProduk(e) {
  e.preventDefault();

  const btn = document.getElementById("btnProduk");
  if (!btn) return;

  const data = {
    id: getValue("produkEditId"),
    kategori_id: getValue("kategoriProduk").trim(),
    nama_produk: getValue("namaProduk").trim(),
    brand: getValue("brandProduk").trim(),
    harga: getValue("hargaProduk"),
    gambar: getValue("gambarProduk").trim(),
    deskripsi: getValue("deskripsiProduk").trim(),
    status: getValue("statusProduk") || "Aktif",
  };

  const errorMessage = validateForm(data);

  if (errorMessage) {
    await showWarning(errorMessage);
    return;
  }

  if (isEditMode && !data.id) {
    await showError("ID produk tidak ditemukan.");
    return;
  }

  setButtonLoading(btn, isEditMode ? "Mengupdate..." : "Menyimpan...");
  setFormDisabled(true);

  showLoadingAlert(
    isEditMode ? "Mengupdate produk..." : "Menyimpan produk...",
  );

  try {
    const result = isEditMode
      ? await ApiService.updateProduk(data)
      : await ApiService.tambahProduk(data);

    closeLoadingAlert();

    await showSuccess(
      result.message ||
        (isEditMode
          ? "Produk berhasil diperbarui."
          : "Produk berhasil ditambahkan."),
    );

    window.location.href = "index.html";
  } catch (error) {
    console.error("Simpan produk error:", error);

    closeLoadingAlert();

    await showError(error.message || "Gagal terhubung ke Google Sheet.");

    setFormDisabled(false);
    resetButton(btn);
  }
}

function validateForm(data) {
  if (!data.nama_produk) return "Nama produk wajib diisi.";
  if (!data.kategori_id) return "Kategori wajib dipilih.";
  if (!data.brand) return "Brand wajib diisi.";

  if (data.harga === "" || data.harga === null || data.harga === undefined) {
    return "Harga wajib diisi.";
  }

  if (isNaN(Number(data.harga)) || Number(data.harga) < 0) {
    return "Harga harus berupa angka valid.";
  }

  if (!data.gambar) return "URL gambar wajib diisi.";
  if (!data.deskripsi) return "Deskripsi wajib diisi.";

  return "";
}

function setPageMode(editMode) {
  const title = document.getElementById("formTitle");
  const btn = document.getElementById("btnProduk");

  if (title) {
    title.innerText = editMode ? "Edit Produk" : "Upload Produk Baru";
  }

  if (btn) {
    btn.innerHTML = editMode
      ? '<i class="fas fa-save me-1"></i> Update Produk'
      : '<i class="fas fa-save me-1"></i> Simpan Produk';
  }
}

function setFormDisabled(disabled) {
  [
    "namaProduk",
    "kategoriProduk",
    "brandProduk",
    "hargaProduk",
    "gambarProduk",
    "deskripsiProduk",
    "statusProduk",
  ].forEach((id) => {
    const field = document.getElementById(id);

    if (field) {
      field.disabled = disabled;
    }
  });

  const btn = document.getElementById("btnProduk");

  if (btn) {
    btn.disabled = disabled;
  }
}

function setButtonLoading(btn, text) {
  btn.disabled = true;
  btn.innerHTML = `
    <i class="fas fa-spinner fa-spin me-1"></i>
    ${escapeHtml(text)}
  `;
}

function resetButton(btn) {
  btn.disabled = false;
  btn.innerHTML = isEditMode
    ? '<i class="fas fa-save me-1"></i> Update Produk'
    : '<i class="fas fa-save me-1"></i> Simpan Produk';
}

function showSuccess(message) {
  return Swal.fire({
    icon: "success",
    title: "Berhasil",
    text: message,
    confirmButtonColor: "#198754",
    confirmButtonText: "OK",
  });
}

function showError(message) {
  return Swal.fire({
    icon: "error",
    title: "Gagal",
    text: message,
    confirmButtonColor: "#dc3545",
    confirmButtonText: "Tutup",
  });
}

function showWarning(message) {
  return Swal.fire({
    icon: "warning",
    title: "Perhatian",
    text: message,
    confirmButtonColor: "#f59e0b",
    confirmButtonText: "Mengerti",
  });
}

function showLoadingAlert(title = "Memproses...") {
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

function closeLoadingAlert() {
  Swal.close();
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "") : "";
}

function setValue(id, value) {
  const el = document.getElementById(id);

  if (el) {
    el.value = value === null || value === undefined ? "" : String(value);
  }
}
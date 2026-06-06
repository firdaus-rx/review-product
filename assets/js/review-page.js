let produkData = [];
let initialProdukId = "";

document.addEventListener("DOMContentLoaded", initReviewPage);

async function initReviewPage() {
  ensureSwalFallback();

  const params = new URLSearchParams(window.location.search);
  initialProdukId = params.get("produk_id") || "";

  setupRatingPicker();

  const reviewForm = document.getElementById("reviewForm");
  const produkSelect = document.getElementById("produkId");

  if (reviewForm) {
    reviewForm.addEventListener("submit", tambahReview);
  }

  if (produkSelect) {
    produkSelect.addEventListener("change", async function () {
      const produkId = this.value;

      if (!produkId) {
        clearSelectedProductInfo();
        return;
      }

      await renderSelectedById(produkId);
    });
  }

  await loadProdukOptions(initialProdukId);
}

async function loadProdukOptions(selectedId = "") {
  const select = document.getElementById("produkId");

  if (!select) return;

  try {
    select.disabled = true;
    select.innerHTML = '<option value="">Memuat produk...</option>';

    const response = await ApiService.getProduk(1, 1000);

    produkData = normalizeProdukResponse(response);

    if (!produkData.length) {
      select.innerHTML = '<option value="">Belum ada produk</option>';
      clearSelectedProductInfo();
      await showWarning("Belum ada produk yang bisa direview.");
      return;
    }

    select.innerHTML = [
      '<option value="">Pilih Produk</option>',
      ...produkData.map(
        (item) => `
          <option value="${escapeHtml(item.id)}">
            ${escapeHtml(item.nama_produk || "-")}
          </option>
        `,
      ),
    ].join("");

    if (selectedId) {
      select.value = selectedId;

      if (!select.value) {
        const produkDetail = await ApiService.getProdukById(selectedId);

        if (produkDetail) {
          produkData.push(produkDetail);

          select.insertAdjacentHTML(
            "beforeend",
            `
              <option value="${escapeHtml(produkDetail.id)}" selected>
                ${escapeHtml(produkDetail.nama_produk || "-")}
              </option>
            `,
          );

          select.value = String(produkDetail.id);
        }
      }
    }

    select.disabled = false;
    await renderSelectedById(select.value);
  } catch (error) {
    console.error("Load produk options error:", error);

    select.disabled = false;
    select.innerHTML = '<option value="">Gagal memuat produk</option>';
    clearSelectedProductInfo();

    await showError(error.message || "Gagal memuat produk.");
  }
}

function normalizeProdukResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && Array.isArray(response.items)) {
    return response.items;
  }

  if (response && response.data && Array.isArray(response.data.items)) {
    return response.data.items;
  }

  if (response && Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function setupRatingPicker() {
  const picker = document.getElementById("ratingPicker");

  if (!picker) return;

  picker.querySelectorAll(".rating-star").forEach((button) => {
    button.addEventListener("click", function () {
      setRating(this.dataset.rating);
    });
  });
}

function setRating(value) {
  const ratingInput = document.getElementById("rating");
  const ratingText = document.getElementById("ratingText");
  const rating = Number(value || 0);

  if (ratingInput) {
    ratingInput.value = rating > 0 ? String(rating) : "";
  }

  document.querySelectorAll(".rating-star").forEach((button) => {
    const buttonRating = Number(button.dataset.rating || 0);

    button.classList.toggle("active", buttonRating <= rating);
    button.setAttribute(
      "aria-checked",
      buttonRating === rating ? "true" : "false",
    );
  });

  if (ratingText) {
    ratingText.innerText = rating > 0 ? `${rating} dari 5` : "Pilih rating";
  }
}

async function renderSelectedById(produkId) {
  if (!produkId) {
    clearSelectedProductInfo();
    return;
  }

  let produk = produkData.find((item) => String(item.id) === String(produkId));

  if (!produk) {
    try {
      produk = await ApiService.getProdukById(produkId);

      if (produk) {
        produkData.push(produk);
      }
    } catch (error) {
      console.error("Get produk detail error:", error);
      await showError(error.message || "Gagal memuat detail produk.");
    }
  }

  if (produk) {
    renderSelectedProductInfo(produk);
  } else {
    clearSelectedProductInfo();
  }
}

function renderSelectedProductInfo(produk) {
  const selectedProductInfo = document.getElementById("selectedProductInfo");

  if (!selectedProductInfo) return;

  const rating = Number(produk.rating_rata_rata || 0);
  const totalReview = Number(produk.total_review || 0);
  const image = produk.gambar || "https://placehold.co/600x400?text=No+Image";
  const kategori = produk.kategori_detail || {};
  const kategoriIcon = kategori.icon || "fa-tag";
  const kategoriNama = produk.kategori || kategori.nama_kategori || "-";

  selectedProductInfo.innerHTML = `
    <div class="selected-product-card mb-4 overflow-hidden">
      <div class="row g-0">
        <div class="col-md-3">
          <img
            src="${escapeHtml(image)}"
            class="selected-product-image"
            alt="${escapeHtml(produk.nama_produk || "Produk")}"
            onerror="this.src='https://placehold.co/600x400?text=No+Image'"
          >
        </div>

        <div class="col-md-9">
          <div class="p-4">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
              <span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                <i class="fas ${escapeHtml(kategoriIcon)} me-1"></i>
                ${escapeHtml(kategoriNama)}
              </span>
              <span class="text-muted small">${escapeHtml(produk.brand || "-")}</span>
            </div>

            <h4 class="fw-bold mb-2">${escapeHtml(produk.nama_produk || "-")}</h4>
            <p class="text-secondary small mb-3">${escapeHtml(produk.deskripsi || "-")}</p>

            <div class="d-flex flex-wrap align-items-center gap-3">
              <div class="fw-bold text-primary fs-5">${formatRupiah(produk.harga)}</div>
              <div class="star-rating">${renderStars(rating)}</div>
              <small class="text-muted">Rating ${rating.toFixed(1)} dari ${totalReview} review</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function clearSelectedProductInfo() {
  const selectedProductInfo = document.getElementById("selectedProductInfo");

  if (selectedProductInfo) {
    selectedProductInfo.innerHTML = "";
  }
}

async function tambahReview(e) {
  e.preventDefault();

  const btn = document.getElementById("btnReview");
  const form = document.getElementById("reviewForm");

  if (!btn || !form) return;

  const selectedProdukId = getValue("produkId");

  const data = {
    produk_id: selectedProdukId,
    nama_reviewer: getValue("namaReviewer").trim(),
    email: getValue("emailReviewer").trim(),
    rating: getValue("rating"),
    judul_review: getValue("judulReview").trim(),
    isi_review: getValue("isiReview").trim(),
  };

  const errorMessage = validateReviewForm(data);

  if (errorMessage) {
    await showWarning(errorMessage);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Mengirim...`;

  showLoadingAlert("Mengirim review...");

  try {
    const result = await ApiService.tambahReview(data);

    closeLoadingAlert();

    await showSuccess(result.message || "Review berhasil dikirim.");

    form.reset();
    setRating("");

    const keepProdukId = initialProdukId || selectedProdukId;
    await loadProdukOptions(keepProdukId);
  } catch (error) {
    console.error("Tambah review error:", error);

    closeLoadingAlert();

    await showError(error.message || "Gagal terhubung ke Google Sheet.");
  }

  resetButton(btn);
}

function validateReviewForm(data) {
  if (!data.produk_id) return "Silakan pilih produk terlebih dahulu.";
  if (!data.nama_reviewer) return "Nama reviewer wajib diisi.";
  if (!data.email) return "Email wajib diisi.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "Format email tidak valid.";
  }
  if (!data.rating) return "Silakan pilih rating bintang terlebih dahulu.";
  if (!data.judul_review) return "Judul review wajib diisi.";
  if (!data.isi_review) return "Isi review wajib diisi.";

  return "";
}

function resetButton(btn) {
  btn.disabled = false;
  btn.innerHTML = "Kirim Review";
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "") : "";
}

/* SweetAlert Helper */
function ensureSwalFallback() {
  if (typeof Swal !== "undefined") return;

  console.error("SweetAlert2 belum dimuat.");

  window.Swal = {
    fire: (options) => {
      window.alert(options.text || options.title || "Terjadi kesalahan");
      return Promise.resolve();
    },
    close: () => {},
    showLoading: () => {},
  };
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
let produkData = [];
let kategoriData = [];

let activeCategory = "Semua";
let searchKeyword = "";

let currentPage = 1;
let perPage = 6;
let pagination = null;

document.addEventListener("DOMContentLoaded", initProdukPage);

async function initProdukPage() {
  loadStateFromUrl();

  const searchInput = document.getElementById("searchInput");
  const perPageSelect = document.getElementById("perPageSelect");

  if (searchInput) {
    searchInput.value = searchKeyword;

    searchInput.addEventListener(
      "input",
      debounce(async function () {
        searchKeyword = this.value.toLowerCase().trim();
        currentPage = 1;
        updateUrlParams();
        await loadProduk();
      }, 350),
    );
  }

  if (perPageSelect) {
    perPageSelect.value = String(perPage);

    perPageSelect.addEventListener("change", async function () {
      perPage = Number(this.value) || 6;
      currentPage = 1;
      updateUrlParams();
      await loadProduk();
    });
  }

  await loadKategori();
  await loadProduk();
}

function loadStateFromUrl() {
  const params = new URLSearchParams(window.location.search);

  currentPage = Math.max(Number(params.get("page") || 1), 1);
  perPage = Math.max(Number(params.get("limit") || 6), 1);
  activeCategory = params.get("kategori_id") || "Semua";
  searchKeyword = (params.get("search") || "").toLowerCase().trim();
}

function updateUrlParams() {
  const params = new URLSearchParams();

  if (currentPage > 1) {
    params.set("page", String(currentPage));
  }

  if (perPage !== 6) {
    params.set("limit", String(perPage));
  }

  if (activeCategory && activeCategory !== "Semua") {
    params.set("kategori_id", String(activeCategory));
  }

  if (searchKeyword) {
    params.set("search", searchKeyword);
  }

  const queryString = params.toString();

  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  window.history.replaceState({}, "", newUrl);
}

async function loadKategori() {
  try {
    kategoriData = await ApiService.getKategori();
    if (!Array.isArray(kategoriData)) kategoriData = [];

    renderCategoryFilter();
  } catch (error) {
    console.error(error);
    kategoriData = [];
    renderCategoryFilter();
  }
}

async function loadProduk() {
  const loading = document.getElementById("loadingProduk");

  try {
    showLoading(loading);
    updateUrlParams();

    const response = await ApiService.getProduk(
      currentPage,
      perPage,
      activeCategory,
      searchKeyword,
    );

    produkData = response && Array.isArray(response.items) ? response.items : [];
    pagination = response ? response.pagination : null;

    if (pagination) {
      currentPage = Number(pagination.page || currentPage);
      updateUrlParams();
    }

    renderStats();
    renderProduk(produkData);
    renderPagination();

    hideLoading(loading);
  } catch (error) {
    console.error(error);
    produkData = [];
    pagination = null;

    renderStats();
    renderProduk([]);
    renderPagination();
    showError(loading);
  }
}

function renderStats() {
  const container = document.getElementById("statsProduk");
  if (!container) return;

  const totalProduk = pagination ? pagination.total_data : produkData.length;

  const totalReview = produkData.reduce(
    (total, item) => total + Number(item.total_review || 0),
    0,
  );

  const totalWeightedRating = produkData.reduce((total, item) => {
    return (
      total +
      Number(item.rating_rata_rata || 0) * Number(item.total_review || 0)
    );
  }, 0);

  const averageRating = totalReview > 0 ? totalWeightedRating / totalReview : 0;

  const stats = [
    { label: "Total Produk", value: totalProduk, icon: "fa-box-open" },
    { label: "Total Kategori", value: kategoriData.length, icon: "fa-layer-group" },
    { label: "Rating Halaman", value: averageRating.toFixed(1), icon: "fa-star" },
    { label: "Review Halaman", value: totalReview, icon: "fa-comments" },
  ];

  container.innerHTML = stats
    .map(
      (item) => `
        <div class="col-6 col-lg-3">
          <div class="stat-card h-100">
            <div class="stat-icon"><i class="fas ${item.icon}"></i></div>
            <div>
              <div class="stat-value">${escapeHtml(item.value)}</div>
              <div class="stat-label">${escapeHtml(item.label)}</div>
            </div>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderCategoryFilter() {
  const container = document.getElementById("categoryFilter");
  if (!container) return;

  const categories = [
    {
      id: "Semua",
      nama_kategori: "Semua",
      icon: "fa-layer-group",
      warna: "primary",
    },
    ...kategoriData,
  ];

  if (
    activeCategory !== "Semua" &&
    !kategoriData.some((item) => String(item.id) === String(activeCategory))
  ) {
    activeCategory = "Semua";
    updateUrlParams();
  }

  container.innerHTML = categories
    .map((category) => {
      const categoryId = String(category.id);
      const isActive = String(activeCategory) === categoryId;
      const icon = category.icon || "fa-tag";

      return `
        <button
          type="button"
          class="category-pill ${isActive ? "active" : ""}"
          data-category-id="${escapeHtml(categoryId)}"
        >
          <i class="fas ${escapeHtml(icon)} me-1"></i>
          ${escapeHtml(category.nama_kategori || "-")}
        </button>
      `;
    })
    .join("");

  container.querySelectorAll(".category-pill").forEach((button) => {
    button.addEventListener("click", async function () {
      activeCategory = this.dataset.categoryId || "Semua";
      currentPage = 1;

      updateUrlParams();
      renderCategoryFilter();
      await loadProduk();
    });
  });
}

function renderProduk(data) {
  const container = document.getElementById("productList");
  if (!container) return;

  if (!data.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <i class="fas fa-store-slash fa-3x text-secondary mb-3"></i>
          <h5 class="fw-bold mb-2">Produk tidak ditemukan</h5>
          <p class="text-muted mb-0">Ubah pencarian atau kategori.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = data.map(renderProdukCard).join("");
}

function renderPagination() {
  const container = document.getElementById("paginationProduk");
  const info = document.getElementById("paginationInfo");

  if (!container) return;

  if (!pagination) {
    container.innerHTML = "";
    if (info) info.innerHTML = "";
    return;
  }

  if (info) {
    const start =
      pagination.total_data === 0
        ? 0
        : (pagination.page - 1) * pagination.limit + 1;

    const end = Math.min(
      pagination.page * pagination.limit,
      pagination.total_data,
    );

    info.innerHTML = `
      Menampilkan <strong>${start}</strong> - <strong>${end}</strong>
      dari <strong>${pagination.total_data}</strong> produk
    `;
  }

  if (pagination.total_page <= 1) {
    container.innerHTML = "";
    return;
  }

  const pages = getVisiblePages(pagination.page, pagination.total_page);

  container.innerHTML = `
    <nav aria-label="Pagination Produk">
      <ul class="pagination justify-content-center flex-wrap gap-1 mb-0">
        <li class="page-item ${!pagination.has_prev ? "disabled" : ""}">
          <a href="#" class="page-link" data-page="${pagination.prev_page || pagination.page}">
            <i class="fas fa-chevron-left"></i>
          </a>
        </li>

        ${pages
          .map((page) => {
            if (page === "...") {
              return `
                <li class="page-item disabled">
                  <span class="page-link">...</span>
                </li>
              `;
            }

            return `
              <li class="page-item ${page === pagination.page ? "active" : ""}">
                <a href="#" class="page-link" data-page="${page}">
                  ${page}
                </a>
              </li>
            `;
          })
          .join("")}

        <li class="page-item ${!pagination.has_next ? "disabled" : ""}">
          <a href="#" class="page-link" data-page="${pagination.next_page || pagination.page}">
            <i class="fas fa-chevron-right"></i>
          </a>
        </li>
      </ul>
    </nav>
  `;

  container.querySelectorAll("[data-page]").forEach((el) => {
    el.addEventListener("click", async function (e) {
      e.preventDefault();

      const page = Number(this.dataset.page);

      if (!page || page === currentPage) return;

      currentPage = page;

      updateUrlParams();
      await loadProduk();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });
}

function getVisiblePages(page, totalPage) {
  if (totalPage <= 7) {
    return Array.from({ length: totalPage }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPage];
  }

  if (page >= totalPage - 3) {
    return [
      1,
      "...",
      totalPage - 4,
      totalPage - 3,
      totalPage - 2,
      totalPage - 1,
      totalPage,
    ];
  }

  return [1, "...", page - 1, page, page + 1, "...", totalPage];
}

function renderProdukCard(item) {
  const rating = Number(item.rating_rata_rata || 0);
  const totalReview = Number(item.total_review || 0);
  const image = item.gambar || "https://placehold.co/600x400?text=No+Image";
  const kategori = item.kategori_detail || {};
  const kategoriIcon = kategori.icon || "fa-tag";
  const kategoriNama = item.kategori || kategori.nama_kategori || "-";

  return `
    <div class="col-md-6 col-lg-4">
      <div class="card product-card h-100 border-0 rounded-4 overflow-hidden shadow-sm">
        <div class="position-relative">
          <img
            src="${escapeHtml(image)}"
            class="product-image"
            alt="${escapeHtml(item.nama_produk || "Produk")}"
            loading="lazy"
            onerror="this.src='https://placehold.co/600x400?text=No+Image'"
          >

          <span class="position-absolute top-0 start-0 m-3 badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
            <i class="fas ${escapeHtml(kategoriIcon)} me-1"></i>
            ${escapeHtml(kategoriNama)}
          </span>

          <span class="position-absolute top-0 end-0 m-3 badge bg-dark bg-opacity-75 text-white rounded-pill px-3 py-2">
            <i class="fas fa-star text-warning me-1"></i>${rating.toFixed(1)}
          </span>
        </div>

        <div class="card-body p-4 d-flex flex-column">
          <small class="text-uppercase text-muted fw-semibold mb-2">
            ${escapeHtml(item.brand || "-")}
          </small>

          <h5 class="fw-bold mb-2 product-title">
            ${escapeHtml(item.nama_produk || "-")}
          </h5>

          <p class="text-muted small product-description mb-3">
            ${escapeHtml(item.deskripsi || "-")}
          </p>

          <div class="mt-auto product-actions">
            <div class="product-footer mb-3">
              <div>
                <div class="fw-bold text-primary fs-5">
                  ${formatRupiah(item.harga)}
                </div>
                <small class="text-muted">${totalReview} review</small>
              </div>

              <div class="text-end">
                <div class="star-rating">${renderStars(rating)}</div>
                <small class="text-muted">Rating ${rating.toFixed(1)} / 5</small>
              </div>
            </div>

            <div class="rating-summary mb-3">
              <div class="d-flex justify-content-between small mb-1">
                <span class="text-muted">Kualitas rating</span>
                <span class="fw-semibold">${rating.toFixed(1)} dari ${totalReview} review</span>
              </div>

              <div class="progress rating-progress">
                <div
                  class="progress-bar"
                  style="width: ${Math.min((rating / 5) * 100, 100)}%"
                ></div>
              </div>
            </div>

            <div class="d-grid gap-2">
              <a href="detail.html?id=${encodeURIComponent(item.id)}" class="btn btn-primary rounded-pill">
                <i class="fas fa-eye me-1"></i> Lihat Detail
              </a>

              <a href="review.html?produk_id=${encodeURIComponent(item.id)}" class="btn btn-outline-primary rounded-pill">
                <i class="fas fa-pen me-1"></i> Beri Review
              </a>

              <a href="upload.html?id=${encodeURIComponent(item.id)}" class="btn btn-outline-secondary rounded-pill">
                <i class="fas fa-edit me-1"></i> Edit Produk
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showLoading(loading) {
  if (!loading) return;

  loading.style.display = "block";
  loading.className = "alert alert-light border text-center rounded-4";
  loading.innerHTML =
    '<i class="fas fa-spinner fa-spin me-2"></i> Memuat produk...';
}

function hideLoading(loading) {
  if (loading) loading.style.display = "none";
}

function showError(loading) {
  if (!loading) return;

  loading.style.display = "block";
  loading.className = "alert alert-danger rounded-4 border-0 shadow-sm";
  loading.innerHTML = `
    <div class="d-flex align-items-center justify-content-center gap-3">
      <i class="fas fa-triangle-exclamation fs-4"></i>
      <div class="text-start">
        <strong>Gagal memuat produk</strong>
        <div class="small">Periksa URL Apps Script dan permission deployment.</div>
      </div>
    </div>
  `;
}

function debounce(callback, delay = 350) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
}
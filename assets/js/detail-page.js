document.addEventListener("DOMContentLoaded", initDetailPage);

async function initDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const loading = document.getElementById("loadingDetail");
  const container = document.getElementById("detailProduk");

  if (!loading || !container) return;

  if (!id) {
    showAlert(loading, "danger", "ID produk tidak ditemukan.");
    return;
  }

  try {
    showLoading(loading);

    const produk = await ApiService.getProdukById(id);

    if (!produk) {
      showAlert(loading, "warning", "Produk tidak ditemukan.");
      return;
    }

    loading.style.display = "none";
    container.innerHTML = renderDetailProduk(produk);
  } catch (error) {
    console.error(error);
    showAlert(loading, "danger", "Gagal memuat detail produk.");
  }
}

function showLoading(element) {
  element.style.display = "block";
  element.className = "alert alert-light border text-center rounded-4";
  element.innerHTML = `
    <i class="fas fa-spinner fa-spin me-2"></i>
    Memuat detail produk...
  `;
}

function showAlert(element, type, message) {
  element.style.display = "block";
  element.className = `alert alert-${type} rounded-4`;
  element.innerHTML = escapeHtml(message);
}

function renderDetailProduk(item) {
  const rating = toNumber(item.rating_rata_rata);
  const totalReview = toNumber(item.total_review);
  const reviews = Array.isArray(item.reviews) ? item.reviews : [];
  const image = item.gambar || "https://placehold.co/800x500?text=No+Image";

  return `
    <section class="row g-4 align-items-stretch mb-5">
      <div class="col-lg-6">
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
          <img
            src="${escapeHtml(image)}"
            class="detail-product-image"
            alt="${escapeHtml(item.nama_produk || 'Produk')}"
            loading="lazy"
            onerror="this.src='https://placehold.co/800x500?text=No+Image'"
          />
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card border-0 shadow-sm rounded-4 h-100">
          <div class="card-body p-4 p-lg-5 d-flex flex-column">
            ${renderProductInfo(item, rating, totalReview)}
          </div>
        </div>
      </div>
    </section>

    <section class="mb-5">
      ${renderReviewHeader(totalReview)}
      ${renderRatingBreakdown(reviews)}
      ${renderReviewList(reviews)}
    </section>
  `;
}

function renderProductInfo(item, rating, totalReview) {
  return `
    <div class="mb-3">
      <span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
        ${escapeHtml(item.kategori || "-")}
      </span>

      <span class="badge bg-success-subtle text-success rounded-pill px-3 py-2 ms-1">
        ${escapeHtml(item.status || "Aktif")}
      </span>
    </div>

    <h1 class="fw-bold mb-2">${escapeHtml(item.nama_produk || "-")}</h1>

    <div class="text-muted mb-3">
      Brand:
      <strong>${escapeHtml(item.brand || "-")}</strong>
    </div>

    <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
      <div class="star-rating">${renderStars(rating)}</div>
      <strong>${rating.toFixed(1)} / 5</strong>
      <span class="text-muted">(${totalReview} review)</span>
    </div>

    <div class="fw-bold text-primary fs-3 mb-4">
      ${formatRupiah(item.harga)}
    </div>

    <p class="text-muted lh-lg mb-4">
      ${escapeHtml(item.deskripsi || "Belum ada deskripsi produk.")}
    </p>

    <div class="rating-summary mb-4">
      <div class="d-flex justify-content-between small mb-1">
        <span class="text-muted">Kualitas rating</span>
        <span class="fw-semibold">${rating.toFixed(1)} dari ${totalReview} review</span>
      </div>

      <div class="progress rating-progress">
        <div
          class="progress-bar"
          style="width: ${getRatingPercent(rating)}%"
        ></div>
      </div>
    </div>

    <div class="d-grid gap-2 mt-auto">
      <a href="review.html?produk_id=${encodeURIComponent(item.id)}" class="btn btn-primary rounded-pill">
        <i class="fas fa-pen me-1"></i> Beri Review
      </a>

      <a href="upload.html?id=${encodeURIComponent(item.id)}" class="btn btn-outline-secondary rounded-pill">
        <i class="fas fa-edit me-1"></i> Edit Produk
      </a>

      <a href="index.html" class="btn btn-light rounded-pill">
        <i class="fas fa-arrow-left me-1"></i> Kembali
      </a>
    </div>
  `;
}

function renderReviewHeader(totalReview) {
  return `
    <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-3">
      <div>
        <h3 class="fw-bold mb-1">Review Produk</h3>
        <p class="text-muted mb-0">Semua ulasan yang diberikan untuk produk ini.</p>
      </div>

      <span class="badge bg-dark rounded-pill px-3 py-2">
        ${totalReview} review
      </span>
    </div>
  `;
}

function renderRatingBreakdown(reviews) {
  if (!reviews.length) return "";

  const total = reviews.length;
  const counts = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((review) => toNumber(review.rating) === star).length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    return { star, count, percent };
  });

  return `
    <div class="card border-0 shadow-sm rounded-4 mb-4">
      <div class="card-body p-4">
        <h5 class="fw-bold mb-3">Ringkasan Rating</h5>

        <div class="row g-3">
          ${counts
            .map(
              (item) => `
                <div class="col-12">
                  <div class="d-flex align-items-center gap-3">
                    <div class="small fw-bold" style="width: 54px;">
                      ${item.star}
                      <i class="fas fa-star text-warning ms-1"></i>
                    </div>

                    <div class="progress rating-progress flex-grow-1">
                      <div class="progress-bar" style="width: ${item.percent}%"></div>
                    </div>

                    <div class="small text-muted text-end" style="width: 78px;">
                      ${item.count} review
                    </div>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderReviewList(reviews) {
  if (!reviews.length) {
    return `
      <div class="empty-state">
        <i class="fas fa-comments fa-3x text-secondary mb-3"></i>
        <h5 class="fw-bold mb-2">Belum ada review</h5>
        <p class="text-muted mb-0">
          Jadilah orang pertama yang memberikan review.
        </p>
      </div>
    `;
  }

  return `
    <div class="row g-3">
      ${reviews.map(renderReviewCard).join("")}
    </div>
  `;
}

function renderReviewCard(review) {
  const rating = toNumber(review.rating);

  return `
    <div class="col-12">
      <article class="detail-review-card">
        <div class="detail-review-body">
          <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
            <div class="min-w-0">
              <h5 class="fw-bold mb-1">
                ${escapeHtml(review.judul_review || "-")}
              </h5>

              <div class="text-muted small">
                <i class="fas fa-user me-1"></i>
                ${escapeHtml(review.nama_reviewer || "-")}

                ${
                  review.email
                    ? `
                      <span class="mx-1">•</span>
                      <i class="fas fa-envelope me-1"></i>
                      ${escapeHtml(review.email)}
                    `
                    : ""
                }
              </div>
            </div>

            <div class="text-lg-end">
              <div class="star-rating">${renderStars(rating)}</div>
              <small class="text-muted">${rating.toFixed(1)} / 5</small>
            </div>
          </div>

          <p class="text-muted lh-lg mb-3">
            ${escapeHtml(review.isi_review || "-")}
          </p>

          <div class="small text-muted">
            <i class="fas fa-calendar-days me-1"></i>
            ${escapeHtml(review.tanggal || "-")}
          </div>
        </div>
      </article>
    </div>
  `;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getRatingPercent(rating) {
  return Math.min(Math.max((rating / 5) * 100, 0), 100);
}

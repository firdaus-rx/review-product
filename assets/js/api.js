const ApiService = {
  async requestJson(url, options = {}) {
    const res = await fetch(url, options);

    let json = null;

    try {
      json = await res.json();
    } catch (error) {
      throw new Error("Response API bukan JSON valid");
    }

    if (!res.ok) {
      throw new Error(json.message || `HTTP ${res.status}`);
    }

    if (json.success === false) {
      throw new Error(json.message || "Permintaan API gagal");
    }

    return json;
  },

  async postJson(data) {
    return await this.requestJson(CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(data),
    });
  },

  async getKategori() {
    const json = await this.requestJson(`${CONFIG.API_URL}?action=kategori`);

    if (Array.isArray(json.data)) {
      return json.data;
    }

    return [];
  },

  async getProduk(page = 1, limit = 6, kategoriId = "Semua", search = "") {
    const params = new URLSearchParams({
      action: "produk",
      page: String(page),
      limit: String(limit),
    });

    if (kategoriId && kategoriId !== "Semua") {
      params.set("kategori_id", kategoriId);
    }

    if (search) {
      params.set("search", search);
    }

    const json = await this.requestJson(
      `${CONFIG.API_URL}?${params.toString()}`
    );

    return json.data;
  },

  async getProdukById(id) {
    const json = await this.requestJson(
      `${CONFIG.API_URL}?action=produk_detail&id=${encodeURIComponent(id)}`
    );

    return json.data;
  },

  async tambahProduk(data) {
    return await this.postJson({
      action: "tambah_produk",
      ...data,
    });
  },

  async updateProduk(data) {
    return await this.postJson({
      action: "update_produk",
      ...data,
    });
  },

  async getReview() {
    const json = await this.requestJson(`${CONFIG.API_URL}?action=review`);

    return json.data || [];
  },

  async tambahReview(data) {
    return await this.postJson({
      action: "tambah_review",
      ...data,
    });
  },
};
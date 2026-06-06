document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.getElementById("navbarApp");

  if (!navbar) return;

  const currentPage = getCurrentPage();

  const menus = [
    {
      label: "Produk",
      href: "index.html",
      icon: "fa-box-open",
      match: ["", "index.html"],
    },
    {
      label: "Upload Produk",
      href: "upload.html",
      icon: "fa-cloud-arrow-up",
      match: ["upload.html"],
    },
    {
      label: "Beri Review",
      href: "review.html",
      icon: "fa-star-half-stroke",
      match: ["review.html"],
    },
  ];

  navbar.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-glass sticky-top py-3">
      <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4" href="index.html">
          <span class="brand-logo">
            <i class="fas fa-star"></i>
          </span>
          <span class="brand-gradient">ReviewProduct</span>
        </a>

        <button
          class="navbar-toggler border-0 shadow-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#menu"
          aria-controls="menu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div id="menu" class="collapse navbar-collapse">
          <ul class="navbar-nav ms-auto gap-lg-2 mt-3 mt-lg-0">
            ${menus.map((menu) => renderNavItem(menu, currentPage)).join("")}
          </ul>
        </div>
      </div>
    </nav>
  `;
});

function getCurrentPage() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf("/") + 1);

  return page || "index.html";
}

function renderNavItem(menu, currentPage) {
  const isActive = menu.match.includes(currentPage);

  return `
    <li class="nav-item">
      <a
        class="nav-link nav-link-modern ${isActive ? "active" : ""}"
        href="${menu.href}"
        aria-current="${isActive ? "page" : "false"}"
      >
        <i class="fas ${menu.icon} me-1"></i>
        ${menu.label}
      </a>
    </li>
  `;
}
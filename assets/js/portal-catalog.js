"use strict";

(() => {
  const page = document.body.dataset.catalog;
  const grid = document.getElementById("catalog-grid");
  const controls = document.getElementById("catalog-controls");
  const status = document.getElementById("catalog-status");
  if (!page || !grid) return;

  const esc = (value) =>
    String(value || "").replace(
      /[&<>'"]/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[char],
    );
  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const search = (value) =>
    String(value || "")
      .toLowerCase()
      .trim();
  let items = [];

  function renderControls(data) {
    if (!controls) return;
    const destinations = [
      ...new Set(data.map((item) => item.destination || item.name)),
    ].sort();
    const regions =
      page === "destinations"
        ? [...new Set(data.map((item) => item.region))].sort()
        : [];
    controls.innerHTML =
      '<label class="catalog-control">Search <span class="kbd-hint">/</span><input id="catalog-search" type="search" placeholder="Type / to search ' +
      esc(page) +
      '..." /></label>' +
      '<label class="catalog-control">Destination<select id="catalog-destination"><option value="">All destinations</option>' +
      destinations
        .map(
          (name) =>
            '<option value="' + esc(name) + '">' + esc(name) + "</option>",
        )
        .join("") +
      "</select></label>" +
      (regions.length
        ? '<label class="catalog-control">Region<select id="catalog-region"><option value="">All regions</option>' +
          regions
            .map(
              (name) =>
                '<option value="' + esc(name) + '">' + esc(name) + "</option>",
            )
            .join("") +
          "</select></label>"
        : "") +
      (page !== "destinations"
        ? '<label class="catalog-control">Sort<select id="catalog-sort"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>'
        : "");
    controls.addEventListener("input", render);
    controls.addEventListener("change", render);
  }

  function filtered() {
    const query = search(document.getElementById("catalog-search")?.value);
    const destination =
      document.getElementById("catalog-destination")?.value || "";
    const region = document.getElementById("catalog-region")?.value || "";
    const sort = document.getElementById("catalog-sort")?.value || "featured";
    const selected = items.filter((item) => {
      const text = Object.values(item).flat().join(" ").toLowerCase();
      return (
        (!query || text.includes(query)) &&
        (!destination || (item.destination || item.name) === destination) &&
        (!region || item.region === region)
      );
    });
    if (sort === "price-low") selected.sort((a, b) => a.price - b.price);
    if (sort === "price-high") selected.sort((a, b) => b.price - a.price);
    return selected;
  }

  function card(item) {
    const destination = item.destination || item.name;
    const saved = window.BMPlatform?.isSaved({
      type: page,
      slug: item.slug,
      name: item.name,
    });
    const imgSrc = item.image || "assets/images/sample.webp";
    const saveButton =
      '<button class="save-button" type="button" data-save="true" data-slug="' +
      esc(item.slug) +
      '" aria-pressed="' +
      String(Boolean(saved)) +
      '">' +
      (saved ? "Saved" : "Save") +
      "</button>";
    if (page === "packages") {
      return (
        '<article class="portal-card glass">' +
        '<div class="portal-card-media">' +
        '<img src="' +
        esc(imgSrc) +
        '" alt="' +
        esc(item.name) +
        '" loading="lazy" width="400" height="240" class="portal-card-img" onerror="this.src=\'sample.webp\'" />' +
        '<div class="card-actions">' +
        saveButton +
        "</div>" +
        '<span class="portal-card-badge">' +
        esc(item.region) +
        "</span>" +
        "</div>" +
        '<div class="portal-card-content">' +
        '<span class="tag">' +
        esc(item.region) +
        " · " +
        esc(item.duration) +
        "</span><h2>" +
        esc(item.name) +
        "</h2><p>" +
        esc(item.highlights.join(" · ")) +
        '</p><p class="portal-card-price"><strong>From ' +
        money.format(item.price) +
        '</strong> per person*</p><a class="text-button" href="travel-assistant?destination=' +
        encodeURIComponent(destination) +
        "&journey=" +
        encodeURIComponent(item.name) +
        '">Plan this trip →</a></div></article>'
      );
    }
    if (page === "hotels") {
      return (
        '<article class="portal-card glass">' +
        '<div class="portal-card-media">' +
        '<img src="' +
        esc(imgSrc) +
        '" alt="' +
        esc(item.name) +
        '" loading="lazy" width="400" height="240" class="portal-card-img" onerror="this.src=\'sample.webp\'" />' +
        '<div class="card-actions">' +
        saveButton +
        "</div>" +
        '<span class="portal-card-badge">' +
        esc(item.type) +
        "</span>" +
        "</div>" +
        '<div class="portal-card-content">' +
        '<span class="tag">' +
        esc(item.destination) +
        " · " +
        "★".repeat(item.stars) +
        "</span><h2>" +
        esc(item.name) +
        "</h2><p>" +
        esc(item.description) +
        '</p><p class="portal-card-price"><strong>From ' +
        money.format(item.price) +
        '</strong> per night*</p><a class="text-button" href="travel-assistant?destination=' +
        encodeURIComponent(destination) +
        "&stay=" +
        encodeURIComponent(item.name) +
        '">Check availability →</a></div></article>'
      );
    }
    return (
      '<article class="portal-card glass">' +
      '<div class="portal-card-media">' +
      '<img src="' +
      esc(imgSrc) +
      '" alt="' +
      esc(item.name) +
      '" loading="lazy" width="400" height="240" class="portal-card-img" onerror="this.src=\'sample.webp\'" />' +
      '<div class="card-actions">' +
      saveButton +
      "</div>" +
      '<span class="portal-card-badge">' +
      esc(item.region) +
      "</span>" +
      "</div>" +
      '<div class="portal-card-content">' +
      '<span class="tag">' +
      esc(item.region) +
      "</span><h2>" +
      esc(item.name) +
      "</h2><p>" +
      esc(item.tagline) +
      '</p><p class="portal-card-meta"><strong>Best time:</strong> ' +
      esc(item.bestTime) +
      '</p><a class="text-button" href="travel-assistant?destination=' +
      encodeURIComponent(item.name) +
      '">Build an itinerary →</a></div></article>'
    );
  }

  function render() {
    const selected = filtered();
    grid.innerHTML = selected.length
      ? selected.map(card).join("")
      : '<div class="portal-empty glass"><h2>No matches yet</h2><p>Try another search or reset the filters.</p><button id="catalog-reset" class="text-button" type="button">Reset filters</button></div>';
    if (status) status.textContent = `${selected.length} ${page} shown`;
  }

  grid.addEventListener("click", (event) => {
    const save = event.target.closest("[data-save]");
    if (save) {
      const item = items.find((entry) => entry.slug === save.dataset.slug);
      if (!item || !window.BMPlatform) return;
      const isSaved = window.BMPlatform.toggleSaved({
        type: page,
        slug: item.slug,
        name: item.name,
        destination: item.destination || item.name,
        detail: item.duration || item.tagline || item.description || "",
        image: item.image || "assets/images/sample.webp",
      });
      save.textContent = isSaved ? "Saved" : "Save";
      save.setAttribute("aria-pressed", String(isSaved));
      if (window.BMPlatform.toast) {
        window.BMPlatform.toast(
          isSaved
            ? `Saved "${item.name}" to My Account`
            : `Removed "${item.name}" from saved ideas`,
          isSaved ? "success" : "info",
        );
      }
      return;
    }
    if (event.target.closest("#catalog-reset") && controls) {
      controls
        .querySelectorAll("input, select")
        .forEach((control) => (control.value = ""));
      const sort = document.getElementById("catalog-sort");
      if (sort) sort.value = "featured";
      render();
    }
  });

  function loadData() {
    fetch("data/travel-catalog.json")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        items = data[page] || [];
        renderControls(items);
        render();
      })
      .catch(() => {
        grid.innerHTML =
          '<div class="portal-empty glass"><h2>Catalogue temporarily unavailable</h2><p>We could not load the latest travel listings. Please retry or speak with our travel desk directly.</p><div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px;"><button id="catalog-retry" class="btn btn-amber" type="button">Retry Loading</button><a class="btn btn-glass" href="/#contact">Contact Desk</a></div></div>';
        if (status) status.textContent = "Catalogue temporarily unavailable";
        const retryBtn = document.getElementById("catalog-retry");
        if (retryBtn) {
          retryBtn.addEventListener("click", () => {
            grid.innerHTML =
              '<div class="skeleton-card glass"><div class="skeleton-bar" style="height: 16px; width: 45%;"></div><div class="skeleton-bar" style="height: 22px; width: 80%;"></div><div class="skeleton-bar" style="height: 48px; width: 100%;"></div></div>';
            loadData();
          });
        }
      });
  }
  loadData();
})();

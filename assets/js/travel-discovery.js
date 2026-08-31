"use strict";
// BrahmnMitra — Homepage Travel Discovery & Trip Planner

window.BM = window.BM || {};

BM.initTravelDiscovery = function () {
  const catalogUrl = "data/travel-catalog.json";
  const packageGrid = document.getElementById("package-grid");
  const hotelGrid = document.getElementById("hotel-grid");
  const destinationGrid = document.getElementById("destination-grid");
  const packageFilter = document.getElementById("package-filter");
  const hotelFilter = document.getElementById("hotel-filter");
  const planner = document.getElementById("trip-planner");
  const plannerDestination = document.getElementById("planner-destination");
  const plannerStatus = document.getElementById("planner-status");
  const searchInput = document.getElementById("travel-search");
  const searchResults = document.getElementById("search-results");
  const searchStatus = document.getElementById("search-status");
  const recentSearches = document.getElementById("recent-searches");

  if (!packageGrid || !hotelGrid || !destinationGrid) return;

  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const safe = (value) =>
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
  const terms = (value) =>
    String(value || "")
      .toLowerCase()
      .trim();
  const toContact = () =>
    document
      .getElementById("contact")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  const storageKey = "bm_recent_searches_v1";

  let data = null;
  let activeRegion = "All";
  let searchSaveTimer = 0;

  function getRecent() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]").slice(0, 5);
    } catch (error) {
      return [];
    }
  }
  function saveRecent(value) {
    const item = String(value || "").trim();
    if (!item) return;
    const next = [item]
      .concat(
        getRecent().filter(
          (entry) => entry.toLowerCase() !== item.toLowerCase(),
        ),
      )
      .slice(0, 5);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (error) {
      /* storage is optional */
    }
    if (window.BMPlatform) {
      window.BMPlatform.addActivity(`Explored ${item}`, "account");
    }
    renderRecent();
  }
  function renderRecent() {
    if (!recentSearches) return;
    const recent = getRecent();
    recentSearches.hidden = recent.length === 0;
    recentSearches.innerHTML = recent.length
      ? '<span class="recent-label">Recently explored</span>' +
        recent
          .map(
            (item) =>
              '<button type="button" class="recent-chip" data-search-term="' +
              safe(item) +
              '">' +
              safe(item) +
              "</button>",
          )
          .join("")
      : "";
  }

  function renderPackages() {
    const selectedDestination = packageFilter ? packageFilter.value : "";
    const items = data.packages.filter(
      (item) =>
        (activeRegion === "All" || item.region === activeRegion) &&
        (!selectedDestination || item.destination === selectedDestination),
    );
    packageGrid.innerHTML = items.length
      ? items
          .map((item) => {
            const highlights = item.highlights
              .map((highlight) => "<li>" + safe(highlight) + "</li>")
              .join("");
            const imgSrc = item.image || "assets/images/sample.webp";
            return (
              '<article class="travel-card package-card glass" data-reveal>' +
              '<div class="card-art card-art-' +
              safe(item.slug) +
              '"><img src="' +
              safe(imgSrc) +
              '" alt="' +
              safe(item.name) +
              '" loading="lazy" width="400" height="240" class="card-art-img" onerror="this.src=\'assets/images/sample.webp\'" /><span>' +
              safe(item.destination) +
              "</span></div>" +
              '<div class="card-body"><div class="card-meta"><span>' +
              safe(item.region) +
              "</span><span>" +
              safe(item.style) +
              "</span></div>" +
              "<h3>" +
              safe(item.name) +
              '</h3><p class="card-duration">' +
              safe(item.duration) +
              "</p>" +
              '<ul class="card-highlights">' +
              highlights +
              "</ul>" +
              '<div class="card-price"><span>From</span><strong>' +
              money.format(item.price) +
              "</strong><small>per person*</small></div>" +
              '<p class="card-note">' +
              safe(item.availability) +
              "</p>" +
              '<button class="btn btn-amber plan-item" type="button" data-kind="package" data-name="' +
              safe(item.name) +
              '" data-destination="' +
              safe(item.destination) +
              '">Plan this trip <span aria-hidden="true">→</span></button></div></article>'
            );
          })
          .join("")
      : emptyCard(
          "No packages match those filters.",
          "Clear filters",
          "packages",
        );
  }

  function renderHotels() {
    const selectedDestination = hotelFilter ? hotelFilter.value : "";
    const items = data.hotels.filter(
      (item) =>
        !selectedDestination || item.destination === selectedDestination,
    );
    hotelGrid.innerHTML = items.length
      ? items
          .map((item) => {
            const stars = "★".repeat(item.stars) + "☆".repeat(5 - item.stars);
            const imgSrc = item.image || "assets/images/sample.webp";
            return (
              '<article class="travel-card hotel-card glass" data-reveal>' +
              '<div class="card-art card-art-' +
              safe(item.slug) +
              '"><img src="' +
              safe(imgSrc) +
              '" alt="' +
              safe(item.name) +
              '" loading="lazy" width="400" height="240" class="card-art-img" onerror="this.src=\'assets/images/sample.webp\'" /><span>' +
              safe(item.destination) +
              "</span></div>" +
              '<div class="card-body"><div class="hotel-top"><span class="star-rating" aria-label="' +
              item.stars +
              ' star property">' +
              stars +
              "</span><span>" +
              safe(item.type) +
              "</span></div>" +
              "<h3>" +
              safe(item.name) +
              "</h3><p>" +
              safe(item.description) +
              "</p>" +
              '<ul class="amenities">' +
              item.amenities
                .map((amenity) => "<li>" + safe(amenity) + "</li>")
                .join("") +
              "</ul>" +
              '<div class="card-price"><span>From</span><strong>' +
              money.format(item.price) +
              "</strong><small>per night*</small></div>" +
              '<button class="text-button plan-item" type="button" data-kind="hotel" data-name="' +
              safe(item.name) +
              '" data-destination="' +
              safe(item.destination) +
              '">Check with a travel expert <span aria-hidden="true">→</span></button></div></article>'
            );
          })
          .join("")
      : emptyCard(
          "No curated stays match that destination.",
          "Show all stays",
          "hotels",
        );
  }

  function renderDestinations() {
    destinationGrid.innerHTML = data.destinations
      .map((item) => {
        const imgSrc = item.image || "assets/images/sample.webp";
        return (
          '<article class="destination-card glass" data-reveal>' +
          '<div class="card-art destination-art"><img src="' +
          safe(imgSrc) +
          '" alt="' +
          safe(item.name) +
          '" loading="lazy" width="400" height="240" class="card-art-img" onerror="this.src=\'assets/images/sample.webp\'" /><span class="destination-index">' +
          safe(item.region) +
          "</span></div>" +
          '<div class="destination-body">' +
          "<h3>" +
          safe(item.name) +
          "</h3><p>" +
          safe(item.tagline) +
          "</p>" +
          "<dl><div><dt>Best time</dt><dd>" +
          safe(item.bestTime) +
          "</dd></div><div><dt>Don't miss</dt><dd>" +
          safe(item.places.slice(0, 2).join(" · ")) +
          "</dd></div></dl>" +
          '<button class="text-button destination-search" type="button" data-search-term="' +
          safe(item.name) +
          '">Explore ' +
          safe(item.name) +
          ' <span aria-hidden="true">→</span></button></div></article>'
        );
      })
      .join("");
  }

  function emptyCard(message, label, type) {
    return (
      '<div class="catalog-empty glass"><p>' +
      safe(message) +
      '</p><button type="button" class="text-button" data-clear-filter="' +
      safe(type) +
      '">' +
      safe(label) +
      "</button></div>"
    );
  }

  function setEnquiry(kind, name, destination) {
    const form = document.getElementById("enquiry-form");
    if (!form) return;
    const service = form.elements.service;
    const message = form.elements.message;
    if (service) {
      service.value = "tailor_made";
      service.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (message) {
      const intro =
        "I would like to plan " +
        (kind === "hotel" ? "a stay at " : "") +
        name +
        " in " +
        destination +
        ".";
      message.value = message.value ? message.value + "\n\n" + intro : intro;
    }
    toContact();
    window.setTimeout(() => (form.elements.name || form).focus(), 650);
  }

  function showSearch(query) {
    const needle = terms(query);
    if (!needle) {
      searchResults.innerHTML = "";
      searchStatus.textContent =
        "Search destinations, packages and curated stays.";
      return;
    }
    const results = [];
    data.destinations.forEach((item) => {
      const haystack = [
        item.name,
        item.region,
        item.tagline,
        item.places.join(" "),
        item.experiences.join(" "),
      ].join(" ");
      if (terms(haystack).includes(needle))
        results.push({
          type: "Destination",
          title: item.name,
          detail: item.tagline,
          destination: item.name,
        });
    });
    data.packages.forEach((item) => {
      const haystack = [
        item.name,
        item.destination,
        item.region,
        item.style,
        item.highlights.join(" "),
      ].join(" ");
      if (terms(haystack).includes(needle))
        results.push({
          type: "Package",
          title: item.name,
          detail: item.duration + " · from " + money.format(item.price),
          destination: item.destination,
          name: item.name,
        });
    });
    data.hotels.forEach((item) => {
      const haystack = [
        item.name,
        item.destination,
        item.type,
        item.amenities.join(" "),
      ].join(" ");
      if (terms(haystack).includes(needle))
        results.push({
          type: "Curated stay",
          title: item.name,
          detail:
            item.destination +
            " · from " +
            money.format(item.price) +
            " / night",
          destination: item.destination,
          name: item.name,
        });
    });
    const shown = results.slice(0, 8);
    searchStatus.textContent = shown.length
      ? shown.length + " matching result" + (shown.length === 1 ? "" : "s")
      : "No matching plans yet. Ask us to build one for you.";
    searchResults.innerHTML = shown
      .map(
        (result) =>
          '<button type="button" class="search-result" data-kind="' +
          (result.type === "Curated stay" ? "hotel" : "package") +
          '" data-name="' +
          safe(result.name || result.title) +
          '" data-destination="' +
          safe(result.destination) +
          '"><span class="search-type">' +
          safe(result.type) +
          "</span><strong>" +
          safe(result.title) +
          "</strong><span>" +
          safe(result.detail) +
          "</span></button>",
      )
      .join("");
  }

  function populateSelects() {
    const names = data.destinations.map((item) => item.name);
    const options =
      '<option value="">All destinations</option>' +
      names
        .map(
          (name) =>
            '<option value="' + safe(name) + '">' + safe(name) + "</option>",
        )
        .join("");
    if (packageFilter) packageFilter.innerHTML = options;
    if (hotelFilter) hotelFilter.innerHTML = options;
    if (plannerDestination)
      plannerDestination.innerHTML =
        '<option value="">I am still deciding</option>' +
        names
          .map(
            (name) =>
              '<option value="' + safe(name) + '">' + safe(name) + "</option>",
          )
          .join("");
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const regionButton = event.target.closest("[data-region]");
      if (regionButton) {
        activeRegion = regionButton.dataset.region;
        document
          .querySelectorAll("[data-region]")
          .forEach((button) =>
            button.setAttribute(
              "aria-pressed",
              String(button === regionButton),
            ),
          );
        renderPackages();
      }
      const planButton = event.target.closest(".plan-item, .search-result");
      if (planButton)
        setEnquiry(
          planButton.dataset.kind || "package",
          planButton.dataset.name,
          planButton.dataset.destination,
        );
      const termButton = event.target.closest("[data-search-term]");
      if (termButton && searchInput) {
        searchInput.value = termButton.dataset.searchTerm;
        showSearch(searchInput.value);
        document
          .getElementById("search")
          .scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => searchInput.focus(), 500);
      }
      const clearButton = event.target.closest("[data-clear-filter]");
      if (clearButton) {
        if (clearButton.dataset.clearFilter === "packages") {
          activeRegion = "All";
          packageFilter.value = "";
          document
            .querySelector('[data-region="All"]')
            .setAttribute("aria-pressed", "true");
          renderPackages();
        }
        if (clearButton.dataset.clearFilter === "hotels") {
          hotelFilter.value = "";
          renderHotels();
        }
      }
    });
    if (packageFilter) packageFilter.addEventListener("change", renderPackages);
    if (hotelFilter) hotelFilter.addEventListener("change", renderHotels);
    if (searchInput)
      searchInput.addEventListener("input", () => {
        showSearch(searchInput.value);
        window.clearTimeout(searchSaveTimer);
        if (searchInput.value.trim().length > 1) {
          searchSaveTimer = window.setTimeout(
            () => saveRecent(searchInput.value),
            800,
          );
        }
      });
    if (planner)
      planner.addEventListener("submit", (event) => {
        event.preventDefault();
        const form = new FormData(planner);
        const destination = form.get("destination") || "a tailor-made journey";
        const dates = form.get("dates") || "dates to be decided";
        const travellers =
          form.get("custom_travellers") ||
          form.get("travellers") ||
          "traveller details to be decided";
        const budget =
          form.get("custom_budget") ||
          form.get("budget") ||
          "budget to be discussed";
        if (plannerStatus)
          plannerStatus.textContent =
            "We have prepared your enquiry. Tell us a little about yourself and we will take it from here.";
        setEnquiry("trip", destination, destination);
        const message =
          document.getElementById("enquiry-form").elements.message;
        if (message)
          message.value =
            "Trip planner request: " +
            destination +
            ". Dates: " +
            dates +
            ". Travellers: " +
            travellers +
            ". Budget: " +
            budget +
            ".\n\n" +
            message.value;
      });
  }

  function loadCatalog() {
    fetch("/backend/catalog.php")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .catch(() => {
        return fetch("https://brahmnmitra.onrender.com/catalog.php").then((res) => (res.ok ? res.json() : Promise.reject()));
      })
      .catch(() => {
        return fetch("/data/travel-catalog.json").then((res) => (res.ok ? res.json() : Promise.reject()));
      })
      .then((catalogue) => {
        data = catalogue;
        populateSelects();
        renderPackages();
        renderHotels();
        renderDestinations();
        renderRecent();
        bindEvents();
      })
      .catch(() => {
        packageGrid.innerHTML = emptyCard(
          "The travel catalogue is temporarily unavailable. Our travel desk is ready to craft your custom itinerary.",
          "Speak with our travel desk",
          "unavailable",
        );
        hotelGrid.innerHTML = "";
        destinationGrid.innerHTML = "";
        if (searchStatus)
          searchStatus.textContent =
            "Search is temporarily unavailable. Please contact our travel experts.";
      });
  }
  loadCatalog();
};

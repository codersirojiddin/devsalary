const API_BASE_URL = "/api/v1";

const countryFilter = document.getElementById("countryFilter");
const levelFilter = document.getElementById("levelFilter");
const roleFilter = document.getElementById("roleFilter");
const stats = document.getElementById("stats");
const chart = document.getElementById("chart");
const salaryRows = document.getElementById("salaryRows");
const resultCount = document.getElementById("resultCount");
const loadNotice = document.getElementById("loadNotice");
const loadMoreBtn = document.getElementById("loadMoreBtn");

let salaries = [];
let currentFiltered = [];
let renderedCount = 0;

const PAGE_SIZE = 120;
const API_PAGE_SIZE = 200;

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

init();

/* =========================================================
   INIT
========================================================= */

async function init() {
  try {
    setLoadingState(true);

    await checkApi();

    salaries = await fetchAllSalaries();

    if (!Array.isArray(salaries)) {
      throw new Error("Invalid salary data received from API");
    }

    buildFilters();
    bindEvents();

    // Set defaults
    countryFilter.value = "all";
    levelFilter.value = "all";
    roleFilter.value = "all";

    applyFiltersAndRender(true);
    syncTitleAndMeta();

    loadNotice.textContent = `Connected to DevSalary API • ${salaries.length.toLocaleString()} records`;
    loadNotice.classList.remove("error");
  } catch (error) {
    console.error("DevSalary initialization error:", error);

    loadNotice.textContent =
      "Could not connect to the DevSalary API. Make sure the Go backend is running on http://localhost:8080.";

    loadNotice.classList.add("error");
  } finally {
    setLoadingState(false);
  }
}

/* =========================================================
   API
========================================================= */

async function checkApi() {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API health check failed: HTTP ${response.status}`);
  }
}

async function fetchAllSalaries() {
  const allRecords = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${API_BASE_URL}/salaries`);

    url.searchParams.set("limit", API_PAGE_SIZE);
    url.searchParams.set("offset", offset);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch salaries: HTTP ${response.status}`
      );
    }

    const payload = await response.json();

    const records = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
      ? payload.data
      : [];

    allRecords.push(...records);

    if (records.length < API_PAGE_SIZE) {
      break;
    }

    offset += API_PAGE_SIZE;
  }

  return allRecords;
}

async function fetchFilteredFromAPI() {
  const url = new URL(`${API_BASE_URL}/salaries`);

  const country = countryFilter.value;
  const level = levelFilter.value;
  const role = roleFilter.value;

  if (country !== "all") {
    url.searchParams.set("country", country);
  }

  if (level !== "all") {
    url.searchParams.set("level", level);
  }

  if (role !== "all") {
    url.searchParams.set("role", role);
  }

  // Current frontend already has all records cached,
  // so this function is available for future server-side filtering.
  url.searchParams.set("limit", 200);
  url.searchParams.set("offset", 0);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch filtered salaries: HTTP ${response.status}`
    );
  }

  const payload = await response.json();

  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
    ? payload.data
    : [];
}

/* =========================================================
   FILTERS
========================================================= */

function buildFilters() {
  const countries = [
    ...new Set(
      salaries
        .map((item) => item.country)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const roles = [
    ...new Set(
      salaries
        .map((item) => item.role)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const levels = [
    ...new Set(
      salaries
        .map((item) => item.level)
        .filter(Boolean)
    ),
  ];

  fillSelect(countryFilter, [
    { label: "All countries", value: "all" },
    ...countries.map((country) => ({
      label: country,
      value: country,
    })),
  ]);

  // Keep the normal order even if database contains other values.
  const preferredLevels = ["junior", "mid", "senior"];

  const sortedLevels = [
    ...preferredLevels.filter((level) => levels.includes(level)),
    ...levels.filter((level) => !preferredLevels.includes(level)),
  ];

  fillSelect(levelFilter, [
    { label: "All levels", value: "all" },
    ...sortedLevels.map((level) => ({
      label: capitalize(level),
      value: level,
    })),
  ]);

  fillSelect(roleFilter, [
    { label: "All roles", value: "all" },
    ...roles.map((role) => ({
      label: role,
      value: role,
    })),
  ]);
}

function bindEvents() {
  countryFilter.addEventListener("change", handleFilterChange);
  levelFilter.addEventListener("change", handleFilterChange);
  roleFilter.addEventListener("change", handleFilterChange);

  loadMoreBtn.addEventListener("click", () => {
    renderTableNextPage();
  });
}

function handleFilterChange() {
  applyFiltersAndRender(true);
  syncTitleAndMeta();
}

/* =========================================================
   FILTERING
========================================================= */

function applyFiltersAndRender(resetPagination = true) {
  currentFiltered = getFilteredData();

  if (resetPagination) {
    renderedCount = 0;
    salaryRows.innerHTML = "";
  }

  renderStats(currentFiltered);
  renderChart(currentFiltered);
  renderTableNextPage();
}

function getFilteredData() {
  const selectedCountry = countryFilter.value;
  const selectedLevel = levelFilter.value;
  const selectedRole = roleFilter.value;

  return salaries.filter((item) => {
    const countryOk =
      selectedCountry === "all" ||
      item.country === selectedCountry;

    const levelOk =
      selectedLevel === "all" ||
      item.level === selectedLevel;

    const roleOk =
      selectedRole === "all" ||
      item.role === selectedRole;

    return countryOk && levelOk && roleOk;
  });
}

/* =========================================================
   STATS
========================================================= */

function renderStats(data) {
  if (!data.length) {
    stats.innerHTML = `
      <article class="stat">
        <h3>Matching records</h3>
        <p>0</p>
      </article>
    `;

    return;
  }

  const arr = data
    .map((item) => Number(item.annual_usd))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!arr.length) {
    stats.innerHTML = "";
    return;
  }

  const average = Math.round(
    arr.reduce((sum, value) => sum + value, 0) / arr.length
  );

  const median = calculateMedian(arr);
  const min = arr[0];
  const max = arr[arr.length - 1];

  const items = [
    [
      "Matching records",
      data.length.toLocaleString(),
    ],
    [
      "Average salary",
      fmtMoney.format(average),
    ],
    [
      "Median salary",
      fmtMoney.format(median),
    ],
    [
      "Lowest salary",
      fmtMoney.format(min),
    ],
    [
      "Highest salary",
      fmtMoney.format(max),
    ],
  ];

  stats.innerHTML = items
    .map(
      ([label, value]) => `
        <article class="stat">
          <h3>${esc(label)}</h3>
          <p>${esc(value)}</p>
        </article>
      `
    )
    .join("");
}

function calculateMedian(sortedValues) {
  const middle = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return Math.round(
      (sortedValues[middle - 1] + sortedValues[middle]) / 2
    );
  }

  return Math.round(sortedValues[middle]);
}

/* =========================================================
   CHART
========================================================= */

function renderChart(data) {
  if (!data.length) {
    chart.innerHTML =
      '<p class="muted">No records for current filters.</p>';
    return;
  }

  const selectedCountry = countryFilter.value;

  const title =
    selectedCountry === "all"
      ? "Top Roles by Average Salary (Global Mix)"
      : "Top Roles by Average Salary";

  const byRole = new Map();

  for (const item of data) {
    const salary = Number(item.annual_usd);

    if (!Number.isFinite(salary)) {
      continue;
    }

    const role = item.role || "Unknown role";

    const bucket = byRole.get(role) || {
      sum: 0,
      count: 0,
    };

    bucket.sum += salary;
    bucket.count += 1;

    byRole.set(role, bucket);
  }

  const roleAverages = [...byRole.entries()]
    .map(([role, aggregate]) => ({
      role,
      avg: Math.round(
        aggregate.sum / aggregate.count
      ),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 12);

  if (!roleAverages.length) {
    chart.innerHTML =
      '<p class="muted">No chart data available.</p>';
    return;
  }

  const peak = roleAverages[0].avg || 1;

  chart.innerHTML = `
    <div class="chart-title">${esc(title)}</div>

    ${roleAverages
      .map(({ role, avg }) => {
        const width = Math.max(
          4,
          Math.round((avg / peak) * 100)
        );

        return `
          <div class="bar-row">
            <span class="role-name">
              ${esc(role)}
            </span>

            <div class="track">
              <div
                class="fill"
                style="width:${width}%"
              ></div>
            </div>

            <span class="salary">
              ${esc(fmtMoney.format(avg))}
            </span>
          </div>
        `;
      })
      .join("")}
  `;
}

/* =========================================================
   TABLE
========================================================= */

function renderTableNextPage() {
  resultCount.textContent =
    `${currentFiltered.length.toLocaleString()} results`;

  if (!currentFiltered.length) {
    salaryRows.innerHTML = `
      <tr>
        <td colspan="4">
          No matching salaries.
        </td>
      </tr>
    `;

    loadMoreBtn.hidden = true;
    return;
  }

  const sorted = currentFiltered
    .slice()
    .sort(
      (a, b) =>
        Number(b.annual_usd) -
        Number(a.annual_usd)
    );

  const nextSlice = sorted.slice(
    renderedCount,
    renderedCount + PAGE_SIZE
  );

  const rowsHtml = nextSlice
    .map((item) => {
      const salary = Number(item.annual_usd);

      return `
        <tr>
          <td>
            ${esc(item.role || "Unknown")}
          </td>

          <td>
            ${esc(item.country || "Unknown")}
          </td>

          <td>
            ${esc(
              capitalize(
                item.level || "Unknown"
              )
            )}
          </td>

          <td>
            ${esc(
              Number.isFinite(salary)
                ? fmtMoney.format(salary)
                : "—"
            )}
          </td>
        </tr>
      `;
    })
    .join("");

  if (rowsHtml) {
    salaryRows.insertAdjacentHTML(
      "beforeend",
      rowsHtml
    );
  }

  renderedCount += nextSlice.length;

  const allLoaded =
    renderedCount >= currentFiltered.length;

  loadMoreBtn.hidden = allLoaded;
  loadMoreBtn.textContent = allLoaded
    ? "All loaded"
    : "Load more";
}

/* =========================================================
   PAGE META
========================================================= */

function syncTitleAndMeta() {
  const country = countryFilter.value;
  const level = levelFilter.value;
  const role = roleFilter.value;

  const titleEl =
    document.getElementById("pageTitle");

  const subEl =
    document.getElementById("pageSubtitle");

  const parts = [];

  if (role !== "all") {
    parts.push(role);
  }

  if (level !== "all") {
    parts.push(capitalize(level));
  }

  if (country !== "all") {
    parts.push(country);
  }

  const nice = parts.length
    ? parts.join(" • ")
    : "All countries • All roles • All levels";

  if (titleEl) {
    titleEl.textContent =
      "Developer Jobs — Yearly Salary (USD)";
  }

  if (subEl) {
    subEl.textContent =
      `Showing: ${nice}`;
  }

  document.title =
    "Developer Salary Explorer (Annual USD) — DevSalary";

  const metaDesc =
    document.querySelector(
      'meta[name="description"]'
    );

  if (metaDesc) {
    metaDesc.setAttribute(
      "content",
      "Explore estimated annual developer salaries by country, role, and level. Filter, compare averages and medians, and view top-paying roles."
    );
  }
}

/* =========================================================
   UI HELPERS
========================================================= */

function setLoadingState(isLoading) {
  if (isLoading) {
    loadNotice.textContent =
      "Connecting to DevSalary API...";

    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
    }
  } else {
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
    }
  }
}

function fillSelect(select, options) {
  if (!select) return;

  select.innerHTML = options
    .map(
      (option) => `
        <option value="${escAttr(
          option.value
        )}">
          ${esc(option.label)}
        </option>
      `
    )
    .join("");
}

function capitalize(value) {
  const text = String(value || "");

  if (!text) {
    return "";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

/* =========================================================
   SECURITY / ESCAPING
========================================================= */

function esc(value) {
  return String(value).replace(
    /[&<>"']/g,
    (match) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[match])
  );
}

function escAttr(value) {
  return esc(value);
}

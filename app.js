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
const DATA_URL = "./devsalary-data.json";

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

init();

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    salaries = await response.json();

    buildFilters();
    bindEvents();
    applyFiltersAndRender(true);
    syncTitleAndMeta();
  } catch (error) {
    loadNotice.textContent =
      "Data could not be loaded. If you're testing locally, run a local server (example: python -m http.server).";
    console.error(error);
  }
}

function buildFilters() {
  const countries = [...new Set(salaries.map((i) => i.country))].sort((a, b) =>
    a.localeCompare(b)
  );
  const roles = [...new Set(salaries.map((i) => i.role))].sort((a, b) =>
    a.localeCompare(b)
  );

  fillSelect(countryFilter, [
    { label: "All countries", value: "all" },
    ...countries.map((c) => ({ label: c, value: c })),
  ]);

  fillSelect(levelFilter, [
    { label: "All levels", value: "all" },
    { label: "Junior", value: "junior" },
    { label: "Mid", value: "mid" },
    { label: "Senior", value: "senior" },
  ]);

  fillSelect(roleFilter, [
    { label: "All roles", value: "all" },
    ...roles.map((r) => ({ label: r, value: r })),
  ]);
}

function bindEvents() {
  countryFilter.addEventListener("change", () => {
    applyFiltersAndRender(true);
    syncTitleAndMeta();
  });
  levelFilter.addEventListener("change", () => {
    applyFiltersAndRender(true);
    syncTitleAndMeta();
  });
  roleFilter.addEventListener("change", () => {
    applyFiltersAndRender(true);
    syncTitleAndMeta();
  });
  loadMoreBtn.addEventListener("click", () => renderTableNextPage());
}

function applyFiltersAndRender(resetPagination) {
  currentFiltered = getFilteredData();
  renderStats(currentFiltered);
  renderChart(currentFiltered);

  if (resetPagination) {
    renderedCount = 0;
    salaryRows.innerHTML = "";
  }

  renderTableNextPage();
}

function getFilteredData() {
  const selectedCountry = countryFilter.value;
  const selectedLevel = levelFilter.value;
  const selectedRole = roleFilter.value;

  return salaries.filter((item) => {
    const countryOk = selectedCountry === "all" || item.country === selectedCountry;
    const levelOk = selectedLevel === "all" || item.level === selectedLevel;
    const roleOk = selectedRole === "all" || item.role === selectedRole;
    return countryOk && levelOk && roleOk;
  });
}

function renderStats(data) {
  if (!data.length) {
    stats.innerHTML = "";
    return;
  }

  const arr = data.map((x) => x.annual_usd);
  const avg = Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  const min = Math.min(...arr);
  const max = Math.max(...arr);

  const items = [
    ["Matching records", data.length.toLocaleString()],
    ["Average salary", fmtMoney.format(avg)],
    ["Lowest salary", fmtMoney.format(min)],
    ["Highest salary", fmtMoney.format(max)],
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

function renderChart(data) {
  if (!data.length) {
    chart.innerHTML = '<p class="muted">No records for current filters.</p>';
    return;
  }

  const isGlobal = countryFilter.value === "all";
  const title = isGlobal
    ? "Top Roles by Average Salary (Global Mix)"
    : "Top Roles by Average Salary";

  const byRole = new Map();
  for (const item of data) {
    const bucket = byRole.get(item.role) || { sum: 0, count: 0 };
    bucket.sum += item.annual_usd;
    bucket.count += 1;
    byRole.set(item.role, bucket);
  }

  const roleAverages = [...byRole.entries()]
    .map(([role, agg]) => ({ role, avg: Math.round(agg.sum / agg.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 12);

  const peak = roleAverages[0]?.avg || 1;

  chart.innerHTML = `
    <div class="chart-title">${esc(title)}</div>
    ${roleAverages
      .map(({ role, avg }) => {
        const width = Math.max(4, Math.round((avg / peak) * 100));
        return `
          <div class="bar-row">
            <span class="role-name">${esc(role)}</span>
            <div class="track"><div class="fill" style="width:${width}%"></div></div>
            <span class="salary">${esc(fmtMoney.format(avg))}</span>
          </div>
        `;
      })
      .join("")}
  `;
}

function renderTableNextPage() {
  resultCount.textContent = `${currentFiltered.length.toLocaleString()} results`;

  if (!currentFiltered.length) {
    salaryRows.innerHTML = '<tr><td colspan="4">No matching salaries.</td></tr>';
    loadMoreBtn.hidden = true;
    return;
  }

  const sorted = currentFiltered.slice().sort((a, b) => b.annual_usd - a.annual_usd);
  const nextSlice = sorted.slice(renderedCount, renderedCount + PAGE_SIZE);

  const rowsHtml = nextSlice
    .map(
      (item) => `
      <tr>
        <td>${esc(item.role)}</td>
        <td>${esc(item.country)}</td>
        <td>${esc(capitalize(item.level))}</td>
        <td>${esc(fmtMoney.format(item.annual_usd))}</td>
      </tr>
    `
    )
    .join("");

  salaryRows.insertAdjacentHTML("beforeend", rowsHtml);

  renderedCount += nextSlice.length;
  loadMoreBtn.hidden = renderedCount >= currentFiltered.length;
  loadMoreBtn.textContent = renderedCount >= currentFiltered.length ? "All loaded" : "Load more";
}

function syncTitleAndMeta() {
  const c = countryFilter.value;
  const l = levelFilter.value;
  const r = roleFilter.value;

  const titleEl = document.getElementById("pageTitle");
  const subEl = document.getElementById("pageSubtitle");

  const parts = [];
  if (r !== "all") parts.push(r);
  if (l !== "all") parts.push(capitalize(l));
  if (c !== "all") parts.push(c);

  const nice = parts.length ? parts.join(" • ") : "All countries • All roles • All levels";

  if (titleEl) titleEl.textContent = "Developer Jobs — Yearly Salary (USD)";
  if (subEl) subEl.textContent = `Showing: ${nice}`;

  document.title = `Developer Salary Explorer (Annual USD) — DevSalary`;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute(
      "content",
      "Explore estimated annual developer salaries by country, role, and level (Junior/Mid/Senior). Filter, compare averages, and view top-paying roles."
    );
  }
}

function fillSelect(select, options) {
  select.innerHTML = options
    .map((o) => `<option value="${escAttr(o.value)}">${esc(o.label)}</option>`)
    .join("");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function escAttr(str) {
  return esc(str);
}

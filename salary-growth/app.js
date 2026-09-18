const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:8080/api/v1"
    : "/api/v1";

const countryEl = document.getElementById("country");
const roleEl = document.getElementById("role");
const levelEl = document.getElementById("level");
const currentSalaryEl = document.getElementById("currentSalary");
const skillsEl = document.getElementById("skills");
const selectedCountEl = document.getElementById("selectedCount");
const growthForm = document.getElementById("growthForm");
const calculateBtn = document.getElementById("calculateBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

const currentSalaryValue = document.getElementById("currentSalaryValue");
const marketMedianValue = document.getElementById("marketMedianValue");
const estimatedSalaryValue = document.getElementById("estimatedSalaryValue");
const growthPercentValue = document.getElementById("growthPercentValue");
const selectedSkillsEl = document.getElementById("selectedSkills");
const recommendedSkillsEl = document.getElementById("recommendedSkills");
const modelNoteEl = document.getElementById("modelNote");

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

init();

async function init() {
  try {
    setStatus("Loading market data...");

    await healthCheck();

    const rows = await fetchAllSalaries();

    const countries = uniqueSorted(rows.map((item) => item.country));
    const roles = uniqueSorted(rows.map((item) => item.role));

    fillSelect(countryEl, countries, "Select country");
    fillSelect(roleEl, roles, "Select role");

    countryEl.addEventListener("change", loadSkills);
    roleEl.addEventListener("change", loadSkills);
    growthForm.addEventListener("submit", calculate);

    if (countries.length) countryEl.value = countries[0];
    if (roles.length) roleEl.value = roles[0];

    await loadSkills();
    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not connect to the DevSalary API. Make sure the Go backend is running on port 8080.",
      true
    );
  }
}

async function healthCheck() {
  const response = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
  if (!response.ok) throw new Error(`API health failed: ${response.status}`);
}

async function fetchAllSalaries() {
  const records = [];
  const pageSize = 200;
  let offset = 0;

  while (true) {
    const payload = await fetchJSON(
      `${API_BASE_URL}/salaries?limit=${pageSize}&offset=${offset}`
    );

    const page = Array.isArray(payload) ? payload : payload.data || [];
    records.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return records;
}

async function loadSkills() {
  const role = roleEl.value;

  if (!role) {
    skillsEl.innerHTML = "";
    updateSelectedCount();
    return;
  }

  try {
    skillsEl.innerHTML = '<p class="muted">Loading skills…</p>';

    const payload = await fetchJSON(
      `${API_BASE_URL}/skills?role=${encodeURIComponent(role)}`
    );

    const skills = payload.data || [];

    skillsEl.innerHTML = skills
      .map(
        (skill) => `
          <label class="skill-option">
            <input type="checkbox" value="${escAttr(skill.slug)}" />
            <span>
              <strong>${esc(skill.name)}</strong>
              <small>${esc(skill.category)} · ${Number(skill.weight).toFixed(1)} pts</small>
            </span>
          </label>
        `
      )
      .join("");

    skillsEl
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => input.addEventListener("change", updateSelectedCount));

    updateSelectedCount();
  } catch (error) {
    console.error(error);
    skillsEl.innerHTML = '<p class="error-text">Could not load skills.</p>';
  }
}

async function calculate(event) {
  event.preventDefault();

  const request = {
    country: countryEl.value,
    role: roleEl.value,
    level: levelEl.value,
    current_salary: Number(currentSalaryEl.value),
    skill_slugs: getSelectedSkills(),
  };

  if (!request.country || !request.role || !request.level || request.current_salary <= 0) {
    setStatus("Complete all fields before calculating.", true);
    return;
  }

  try {
    calculateBtn.disabled = true;
    setStatus("Calculating…");

    const result = await fetchJSON(`${API_BASE_URL}/salary-growth/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    renderResults(result);
    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Calculation failed.", true);
  } finally {
    calculateBtn.disabled = false;
  }
}

function renderResults(result) {
  resultsEl.hidden = false;

  currentSalaryValue.textContent = money.format(result.current_salary);
  marketMedianValue.textContent = money.format(result.market_median);
  estimatedSalaryValue.textContent = money.format(result.estimated_salary_after_skills);
  growthPercentValue.textContent = `+${Number(result.skill_growth_percent).toFixed(1)}%`;

  selectedSkillsEl.innerHTML = renderSkillRows(result.selected_skills, true);
  recommendedSkillsEl.innerHTML = renderSkillRows(result.recommended_skills, false);
  modelNoteEl.textContent = result.model_note;

  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSkillRows(skills, selected) {
  if (!skills || !skills.length) {
    return '<p class="muted">No skills selected yet.</p>';
  }

  return skills
    .map(
      (skill) => `
        <div class="skill-result">
          <div>
            <strong>${esc(skill.name)}</strong>
            <small>${esc(skill.category)}</small>
          </div>
          <span>${selected ? `+${Number(skill.weight).toFixed(1)} pts` : `+${Number(skill.weight).toFixed(1)} pts potential`}</span>
        </div>
      `
    )
    .join("");
}

function getSelectedSkills() {
  return [...skillsEl.querySelectorAll('input[type="checkbox"]:checked')].map(
    (input) => input.value
  );
}

function updateSelectedCount() {
  const count = getSelectedSkills().length;
  selectedCountEl.textContent = `${count} selected`;
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: HTTP ${response.status}`);
  }

  return payload;
}

function fillSelect(select, values, placeholder) {
  select.innerHTML = [
    `<option value="">${esc(placeholder)}</option>`,
    ...values.map((value) => `<option value="${escAttr(value)}">${esc(value)}</option>`),
  ].join("");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error-text", isError);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[match]));
}

function escAttr(value) {
  return esc(value);
}

// ==========================================================================
// STATE MANAGEMENT & CONFIG
// ==========================================================================
const STATE = {
    expenses: [],
    dashboard: {
        total_expenses: 0,
        today_expenses: 0,
        monthly_expenses: 0,
        highest_category: "N/A",
        monthly_budget: 0,
        budget_remaining: 0
    },
    report: {
        total_spending: 0,
        monthly_budget: 0,
        category_totals: {},
        highest_category: "N/A",
        ai_analysis: "",
        ai_savings_suggestion: ""
    },
    activeTab: "dashboard",
    isLightTheme: false,
    charts: { pie: null, bar: null }
};

// Demo credentials
const AUTH = { username: "admin", password: "password" };

const STORAGE_KEYS = { session: "apex_session", theme: "apex_theme" };

const API_URL = "";

let searchDebounceTimer = null;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initTheme();
    checkSession();
    initDateHeader();
    initLoginListeners();
    initThemeToggle();
    initLogoutListener();
    initTabNavigation();
    initFormListeners();
    initModalListeners();
    initSearchListeners();
});

// ==========================================================================
// THEME MANAGEMENT
// ==========================================================================
function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved === "light") {
        STATE.isLightTheme = true;
        document.body.classList.add("light-theme");
    } else {
        STATE.isLightTheme = false;
        document.body.classList.remove("light-theme");
    }
    setThemeIcon(STATE.isLightTheme);
}

function setThemeIcon(isLight) {
    const icon = document.getElementById("theme-toggle-icon");
    if (!icon) return;
    icon.setAttribute("data-lucide", isLight ? "sun" : "moon");
    lucide.createIcons();
}

function initThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
        STATE.isLightTheme = !STATE.isLightTheme;
        document.body.classList.toggle("light-theme", STATE.isLightTheme);
        localStorage.setItem(STORAGE_KEYS.theme, STATE.isLightTheme ? "light" : "dark");
        setThemeIcon(STATE.isLightTheme);
        if (STATE.charts.pie || STATE.charts.bar) refreshChartData();
    });
}

// ==========================================================================
// SESSION / AUTH MANAGEMENT
// ==========================================================================
function checkSession() {
    if (localStorage.getItem(STORAGE_KEYS.session) === "active") {
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById("login-container").classList.remove("hidden");
    document.getElementById("app-container").classList.add("hidden");
}

function showApp() {
    document.getElementById("login-container").classList.add("hidden");
    const appEl = document.getElementById("app-container");
    appEl.classList.remove("hidden");
    refreshAllData();
}

function initLoginListeners() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const errorEl  = document.getElementById("login-error-msg");
        const loginBtn = document.getElementById("login-btn");
        const loader   = document.getElementById("login-loader");

        errorEl.classList.add("hidden");
        loginBtn.disabled = true;
        loader.classList.remove("hidden");

        setTimeout(() => {
            loginBtn.disabled = false;
            loader.classList.add("hidden");

            if (username === AUTH.username && password === AUTH.password) {
                localStorage.setItem(STORAGE_KEYS.session, "active");
                form.reset();
                showApp();
            } else {
                errorEl.classList.remove("hidden");
                document.getElementById("password").value = "";
                document.getElementById("password").focus();
            }
        }, 600);
    });
}

function initLogoutListener() {
    const btn = document.getElementById("logout-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEYS.session);
        if (STATE.charts.pie)  { STATE.charts.pie.destroy();  STATE.charts.pie  = null; }
        if (STATE.charts.bar)  { STATE.charts.bar.destroy();  STATE.charts.bar  = null; }
        STATE.expenses  = [];
        STATE.activeTab = "dashboard";
        // Reset nav
        document.querySelectorAll(".nav-btn").forEach(b => {
            b.classList.toggle("active", b.getAttribute("data-tab") === "dashboard");
        });
        document.querySelectorAll(".tab-panel").forEach(p => {
            p.classList.toggle("active", p.id === "tab-dashboard");
        });
        showLogin();
    });
}

// ==========================================================================
// DATE HEADER
// ==========================================================================
function initDateHeader() {
    const dateSpan = document.getElementById("current-date-str");
    if (dateSpan) {
        dateSpan.textContent = new Date().toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
    }
    const monthLbl = document.getElementById("current-month-lbl");
    if (monthLbl) {
        monthLbl.textContent = new Date().toLocaleString("en-US", { month: "long" }) + " spending";
    }
}

// ==========================================================================
// NAVIGATION
// ==========================================================================
function initTabNavigation() {
    document.querySelectorAll(".nav-btn[data-tab]").forEach(btn => {
        btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
    });
    const gotoBtn = document.getElementById("goto-expenses-btn");
    if (gotoBtn) gotoBtn.addEventListener("click", () => switchTab("expenses"));
}

function switchTab(tabId) {
    if (STATE.activeTab === tabId) return;

    document.querySelectorAll(".nav-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
    });
    document.querySelectorAll(".tab-panel").forEach(p => {
        p.classList.toggle("active", p.id === `tab-${tabId}`);
    });

    STATE.activeTab = tabId;

    const titles = {
        dashboard: { title: "Financial Dashboard",    sub: "Track your wealth and review AI-driven insights." },
        expenses:  { title: "Expense Management",     sub: "Log daily expenses and verify AI category predictions." },
        reports:   { title: "AI Insights Report",     sub: "Review intelligent monthly summaries and strategic saving advice." }
    };

    document.getElementById("page-title").textContent    = titles[tabId]?.title ?? "";
    document.getElementById("page-subtitle").textContent = titles[tabId]?.sub   ?? "";

    if (tabId === "dashboard") refreshDashboard();
    else if (tabId === "expenses") refreshExpensesList();
    else if (tabId === "reports") refreshMonthlyReport();
}

// ==========================================================================
// FORM LISTENERS
// ==========================================================================
function initFormListeners() {
    // Add Expense
    const expForm = document.getElementById("expense-form");
    if (expForm) {
        expForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const addBtn = document.getElementById("add-btn");
            const loader = document.getElementById("form-loader");
            const name   = document.getElementById("expense_name").value.trim();
            const amount = parseFloat(document.getElementById("amount").value);

            if (!name || isNaN(amount) || amount <= 0) return;

            addBtn.disabled = true;
            loader.classList.remove("hidden");

            try {
                const res = await fetch(`${API_URL}/add-expense`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ expense_name: name, amount })
                });
                if (!res.ok) throw new Error("Server error");
                expForm.reset();
                await refreshAllData();
                flashBtn(addBtn);
            } catch (err) {
                console.error(err);
                alert("Could not add expense. Please check server connection.");
            } finally {
                addBtn.disabled = false;
                loader.classList.add("hidden");
            }
        });
    }

    // Budget Form
    const budgetForm = document.getElementById("budget-form");
    if (budgetForm) {
        budgetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const monthly_budget = parseFloat(document.getElementById("monthly_budget_input").value);
            if (isNaN(monthly_budget) || monthly_budget < 0) return;
            try {
                const res = await fetch(`${API_URL}/budget`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ monthly_budget })
                });
                if (!res.ok) throw new Error();
                closeModal("budget-modal");
                await refreshAllData();
            } catch {
                alert("Failed to update budget.");
            }
        });
    }

    // Edit Expense Form
    const editForm = document.getElementById("edit-expense-form");
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id         = document.getElementById("edit-expense-id").value;
            const name       = document.getElementById("edit-expense-name").value.trim();
            const amount     = parseFloat(document.getElementById("edit-expense-amount").value);
            const category   = document.getElementById("edit-expense-category").value.trim();
            const suggestion = document.getElementById("edit-expense-suggestion").value.trim();

            if (!id || !name || isNaN(amount) || amount <= 0) return;

            try {
                const res = await fetch(`${API_URL}/update-expense/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ expense_name: name, amount, category, suggestion })
                });
                if (!res.ok) throw new Error();
                closeModal("edit-expense-modal");
                await refreshAllData();
            } catch {
                alert("Failed to update expense.");
            }
        });
    }
}

// ==========================================================================
// MODAL MANAGEMENT
// ==========================================================================
function initModalListeners() {
    const openBudget   = document.getElementById("open-budget-modal");
    const closeBudget  = document.getElementById("close-budget-modal");
    const cancelBudget = document.getElementById("cancel-budget-modal");
    const closeEdit    = document.getElementById("close-edit-modal");
    const cancelEdit   = document.getElementById("cancel-edit-modal");

    openBudget?.addEventListener("click",   () => { document.getElementById("monthly_budget_input").value = STATE.dashboard.monthly_budget || ""; openModal("budget-modal"); });
    closeBudget?.addEventListener("click",  () => closeModal("budget-modal"));
    cancelBudget?.addEventListener("click", () => closeModal("budget-modal"));
    closeEdit?.addEventListener("click",    () => closeModal("edit-expense-modal"));
    cancelEdit?.addEventListener("click",   () => closeModal("edit-expense-modal"));

    document.querySelectorAll(".modal-overlay").forEach(el => {
        el.addEventListener("click", (e) => { if (e.target === el) closeModal(el.id); });
    });
}

function openModal(id)  { document.getElementById(id)?.classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id)?.classList.add("hidden"); }

// ==========================================================================
// SEARCH — debounce input + explicit button click
// ==========================================================================
function initSearchListeners() {
    const input  = document.getElementById("expense-search-input");
    const button = document.getElementById("expense-search-btn");

    if (input) {
        input.addEventListener("input", () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => fetchAndRenderSearch(input.value.trim()), 300);
        });
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { clearTimeout(searchDebounceTimer); fetchAndRenderSearch(input.value.trim()); }
        });
    }

    if (button) {
        button.addEventListener("click", () => {
            clearTimeout(searchDebounceTimer);
            const query = document.getElementById("expense-search-input")?.value.trim() ?? "";
            fetchAndRenderSearch(query);
        });
    }
}

async function fetchAndRenderSearch(query) {
    try {
        const res = await fetch(`${API_URL}/expenses?search=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        STATE.expenses = await res.json();
        renderExpensesTable();
    } catch (err) {
        console.error(err);
    }
}

// ==========================================================================
// DATA REFRESHERS
// ==========================================================================
async function refreshAllData() {
    await refreshDashboard();
    if (STATE.activeTab === "expenses") await refreshExpensesList();
    else if (STATE.activeTab === "reports") await refreshMonthlyReport();
    else await refreshExpensesList(true);
}

async function refreshDashboard() {
    try {
        const res  = await fetch(`${API_URL}/dashboard`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        STATE.dashboard = data;

        document.getElementById("card-total-val").textContent = fmt(data.total_expenses);
        document.getElementById("card-today-val").textContent = fmt(data.today_expenses);
        document.getElementById("card-month-val").textContent = fmt(data.monthly_expenses);
        document.getElementById("sb-budget-display").textContent = fmt(data.monthly_budget);

        renderBudgetImpact(data);
        await refreshChartData();
    } catch (err) { console.error("Dashboard error:", err); }
}

async function refreshExpensesList(dashboardOnly = false) {
    try {
        const query = document.getElementById("expense-search-input")?.value.trim() ?? "";
        const res   = await fetch(`${API_URL}/expenses?search=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        const data  = await res.json();
        STATE.expenses = data;

        renderDashboardRecent(data);
        if (!dashboardOnly) renderExpensesTable();
    } catch (err) { console.error(err); }
}

async function refreshMonthlyReport() {
    const loadA = document.getElementById("ai-analysis-loading");
    const textA = document.getElementById("ai-analysis-text");
    const loadS = document.getElementById("ai-suggestion-loading");
    const textS = document.getElementById("ai-suggestion-text");

    loadA?.classList.remove("hidden");  textA?.classList.add("hidden");
    loadS?.classList.remove("hidden");  textS?.classList.add("hidden");

    try {
        const res  = await fetch(`${API_URL}/monthly-report`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        STATE.report = data;

        document.getElementById("report-budget-val").textContent  = fmt(data.monthly_budget);
        document.getElementById("report-spent-val").textContent   = fmt(data.total_spending);
        document.getElementById("report-highest-cat").textContent = data.highest_category || "—";

        if (textA) textA.innerHTML = `<p>${data.ai_analysis}</p>`;
        if (textS) textS.innerHTML = `<p>${data.ai_savings_suggestion}</p>`;

        loadA?.classList.add("hidden");  textA?.classList.remove("hidden");
        loadS?.classList.add("hidden");  textS?.classList.remove("hidden");

        renderReportBreakdownTable(data);
    } catch (err) {
        console.error(err);
        if (loadA) loadA.textContent = "Failed to load AI insights.";
        if (loadS) loadS.textContent = "Failed to load suggestions.";
    }
}

async function refreshChartData() {
    try {
        const res  = await fetch(`${API_URL}/monthly-report`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const cats = Object.keys(data.category_totals || {});
        const amts = Object.values(data.category_totals || {});

        renderCharts(cats, amts);

        // Highest category ring
        const ring     = document.getElementById("highest-cat-ring");
        const catName  = document.getElementById("highest-cat-name");
        const catDesc  = document.getElementById("highest-cat-desc");
        const catIcon  = document.getElementById("highest-cat-icon");

        if (data.highest_category && data.highest_category !== "N/A") {
            catName.textContent = data.highest_category;
            catDesc.textContent = `Your spending is concentrated in ${data.highest_category} (${fmt(data.category_totals[data.highest_category])}). Visit AI Insights for saving strategies.`;
            setCategoryIcon(data.highest_category, catIcon);
            ring.style.boxShadow  = `0 0 28px ${getCategoryGlow(data.highest_category)}`;
            ring.style.borderColor = getCategoryColor(data.highest_category);
        } else {
            catName.textContent = "None";
            catDesc.textContent = "Add daily expenses to discover your highest spending category.";
            catIcon.setAttribute("data-lucide", "alert-circle");
            ring.style.boxShadow  = "";
            ring.style.borderColor = "";
        }
        lucide.createIcons();
    } catch (err) { console.error(err); }
}

// ==========================================================================
// RENDERING
// ==========================================================================
function fmt(v) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0);
}

function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
           " " + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getCategoryColor(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("food"))       return "#8b5cf6";
    if (c.includes("transport"))  return "#06b6d4";
    if (c.includes("elect"))      return "#ef4444";
    if (c.includes("entert"))     return "#f59e0b";
    if (c.includes("shop"))       return "#10b981";
    if (c.includes("bill")||c.includes("util")) return "#ec4899";
    return "#64748b";
}

function getCategoryGlow(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("food"))       return "rgba(139,92,246,0.35)";
    if (c.includes("transport"))  return "rgba(6,182,212,0.35)";
    if (c.includes("elect"))      return "rgba(239,68,68,0.35)";
    if (c.includes("entert"))     return "rgba(245,158,11,0.35)";
    if (c.includes("shop"))       return "rgba(16,185,129,0.35)";
    if (c.includes("bill")||c.includes("util")) return "rgba(236,72,153,0.35)";
    return "rgba(100,116,139,0.35)";
}

function getCatClass(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("food"))      return "food";
    if (c.includes("transport")) return "transport";
    if (c.includes("elect"))     return "electronics";
    if (c.includes("entert"))    return "entertainment";
    if (c.includes("shop"))      return "shopping";
    if (c.includes("bill")||c.includes("util")) return "bills";
    return "other";
}

function setCategoryIcon(cat, el) {
    const c = (cat || "").toLowerCase();
    if (c.includes("food"))      el.setAttribute("data-lucide", "utensils");
    else if (c.includes("transport")) el.setAttribute("data-lucide", "car");
    else if (c.includes("elect"))     el.setAttribute("data-lucide", "laptop");
    else if (c.includes("entert"))    el.setAttribute("data-lucide", "tv");
    else if (c.includes("shop"))      el.setAttribute("data-lucide", "shopping-bag");
    else if (c.includes("bill")||c.includes("util")) el.setAttribute("data-lucide", "receipt");
    else el.setAttribute("data-lucide", "help-circle");
}

function renderBudgetImpact(data) {
    const { monthly_budget: limit, monthly_expenses: spent, budget_remaining: remaining } = data;

    const banner    = document.getElementById("budget-alert-banner");
    const bar       = document.getElementById("sb-budget-progress");
    const status    = document.getElementById("sb-budget-status");
    const budgetCard = document.getElementById("budget-card");
    const cardText  = document.getElementById("budget-indicator-text");
    const cardIcon  = document.getElementById("budget-card-icon");
    const cardVal   = document.getElementById("card-budget-val");

    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    bar.style.width = `${Math.min(pct, 100)}%`;

    const over = limit > 0 && spent > limit;
    banner?.classList.toggle("hidden", !over);
    bar.classList.toggle("exceeded", over);

    if (over) {
        status.textContent = `Over limit by ${fmt(spent - limit)}!`;
        status.classList.add("overlimit");
        budgetCard?.classList.add("overlimit");
        if (cardText) cardText.innerHTML = `<i data-lucide="alert-circle"></i> <span style="color:var(--rose)">Budget Exceeded</span>`;
        if (cardIcon) cardIcon.innerHTML = `<i data-lucide="alert-triangle"></i>`;
        if (cardVal)  { cardVal.textContent = `-${fmt(Math.abs(remaining))}`; cardVal.style.color = "var(--rose)"; }
    } else {
        status.textContent = limit > 0 ? `${pct.toFixed(0)}% used · ${fmt(remaining)} left` : "Set a budget to track usage.";
        status.classList.remove("overlimit");
        budgetCard?.classList.remove("overlimit");
        if (cardText) cardText.innerHTML = `<i data-lucide="activity"></i> <span>Within allowance</span>`;
        if (cardIcon) cardIcon.innerHTML = `<i data-lucide="percent"></i>`;
        if (cardVal)  { cardVal.textContent = fmt(Math.max(0, remaining)); cardVal.style.color = ""; }
    }
    lucide.createIcons();
}

function renderDashboardRecent(expenses) {
    const container = document.getElementById("dashboard-recent-expenses");
    if (!container) return;
    container.innerHTML = "";

    if (!expenses?.length) {
        container.innerHTML = `<div class="empty-state">No expenses recorded yet.</div>`;
        return;
    }

    expenses.slice(0, 5).forEach(exp => {
        const div = document.createElement("div");
        div.className = "activity-item";
        div.innerHTML = `
            <div class="activity-left">
                <div class="activity-dot" style="background:${getCategoryColor(exp.category)}"></div>
                <div>
                    <span class="activity-name">${exp.expense_name}</span>
                    <div class="activity-date">${fmtDate(exp.created_at)}</div>
                </div>
            </div>
            <div class="activity-right">
                <span class="activity-amount">${fmt(parseFloat(exp.amount))}</span>
                <div class="activity-cat">${exp.category || "Other"}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderExpensesTable() {
    const tbody    = document.getElementById("expenses-table-body");
    const countLbl = document.getElementById("ledger-count");
    if (!tbody) return;

    const count = STATE.expenses.length;
    if (countLbl) countLbl.textContent = `${count} item${count === 1 ? "" : "s"} tracked`;

    tbody.innerHTML = "";

    if (!count) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No matching expenses found. Add one above!</td></tr>`;
        return;
    }

    STATE.expenses.forEach(exp => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="date-col">${fmtDate(exp.created_at)}</td>
            <td style="font-weight:500">${exp.expense_name}</td>
            <td class="amt-col">${fmt(parseFloat(exp.amount))}</td>
            <td><span class="cat-tag ${getCatClass(exp.category)}">${exp.category || "Other"}</span></td>
            <td class="suggestion-col">${exp.suggestion || "—"}</td>
            <td>
                <div class="row-actions">
                    <button class="action-btn edit" onclick="openEditModal(${exp.id},'${esc(exp.expense_name)}',${exp.amount},'${esc(exp.category||"")}','${esc(exp.suggestion||"")}')" title="Edit">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteExpense(${exp.id})" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function renderReportBreakdownTable(data) {
    const tbody = document.getElementById("report-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const cats = Object.keys(data.category_totals || {});
    if (!cats.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty">No records for this month.</td></tr>`;
        return;
    }

    cats.forEach(cat => {
        const amt = data.category_totals[cat];
        let pctStr = "N/A", impactStr = "Minor";
        if (data.monthly_budget > 0) {
            const pct = (amt / data.monthly_budget) * 100;
            pctStr = `${pct.toFixed(1)}%`;
            if (pct >= 50)      impactStr = `<span style="color:var(--rose);font-weight:600">Critical (≥50%)</span>`;
            else if (pct >= 25) impactStr = `<span style="color:var(--amber);font-weight:500">Moderate (≥25%)</span>`;
            else                impactStr = `<span style="color:var(--emerald)">Low (<25%)</span>`;
        }
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="cat-tag ${getCatClass(cat)}">${cat}</span></td>
            <td style="font-weight:600">${fmt(amt)}</td>
            <td>${pctStr}</td>
            <td>${impactStr}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// ==========================================================================
// CHART.JS — THEME-AWARE
// ==========================================================================
function renderCharts(cats, amts) {
    const pieCtx = document.getElementById("categoryPieChart");
    const barCtx = document.getElementById("categoryBarChart");
    if (!pieCtx || !barCtx) return;

    if (STATE.charts.pie) { STATE.charts.pie.destroy(); STATE.charts.pie = null; }
    if (STATE.charts.bar) { STATE.charts.bar.destroy(); STATE.charts.bar = null; }
    if (!cats?.length) return;

    const isLight = STATE.isLightTheme;
    const tickColor = isLight ? "#475569" : "#94a3b8";
    const gridColor = isLight ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.04)";
    const borderCol = isLight ? "#f0f4f8" : "#0f1623";
    const fontConf  = { family: "'Inter', sans-serif", size: 11 };
    const bgColors  = cats.map(c => getCategoryColor(c));

    STATE.charts.pie = new Chart(pieCtx, {
        type: "doughnut",
        data: {
            labels: cats,
            datasets: [{
                data: amts,
                backgroundColor: bgColors,
                borderColor: borderCol,
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: tickColor, font: fontConf, padding: 18, boxWidth: 12, usePointStyle: true }
                },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed)}` } }
            },
            cutout: "68%"
        }
    });

    STATE.charts.bar = new Chart(barCtx, {
        type: "bar",
        data: {
            labels: cats,
            datasets: [{
                label: "Spending ($)",
                data: amts,
                backgroundColor: bgColors,
                borderRadius: 10,
                barThickness: 30
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` Total: ${fmt(ctx.parsed.y)}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: tickColor, font: fontConf } },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: fontConf, callback: v => `$${v}` }
                }
            }
        }
    });
}

// ==========================================================================
// GLOBAL TABLE ACTIONS
// ==========================================================================
window.deleteExpense = async function(id) {
    if (!confirm("Permanently delete this expense?")) return;
    try {
        const res = await fetch(`${API_URL}/delete-expense/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        await refreshAllData();
    } catch { alert("Failed to delete. Try again."); }
};

window.openEditModal = function(id, name, amount, category, suggestion) {
    document.getElementById("edit-expense-id").value          = id;
    document.getElementById("edit-expense-name").value        = name;
    document.getElementById("edit-expense-amount").value      = amount;
    document.getElementById("edit-expense-category").value    = category;
    document.getElementById("edit-expense-suggestion").value  = suggestion;
    openModal("edit-expense-modal");
};

// ==========================================================================
// UTILITIES
// ==========================================================================
function esc(str) {
    if (typeof str !== "string") return "";
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
              .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function flashBtn(btn) {
    const orig = btn.style.background;
    btn.style.background = "linear-gradient(135deg,#10b981,#059669)";
    setTimeout(() => { btn.style.background = orig; }, 1400);
}

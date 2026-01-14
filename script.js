// 1. CONFIGURATION
const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; 

// 2. STATE MANAGEMENT
let inventoryData = { categories: {}, stockLevels: {}, analytics: {} };
let currentView = 'entry'; 

/**
 * FETCH DATA: Syncs categories, stock, and analytics from Google Sheets
 */
async function fetchSheetData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        inventoryData = await response.json();
        
        if (currentView === 'entry') {
            if (document.getElementById('saleType').value !== 'Expense') {
                populateCategories();
            }
        } else {
            renderDashboard();
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        showFeedback("Sync failed. Check API URL and Permissions.", "error");
    }
}

/**
 * UI LOGIC: Switch between Entry Form and Analytics Dashboard
 */
function toggleView(view) {
    currentView = view;
    const formEl = document.getElementById('opForm');
    const dashEl = document.getElementById('dashboardView');
    const entryBtn = document.getElementById('viewEntryBtn');
    const dashBtn = document.getElementById('viewDashBtn');

    if (view === 'dashboard') {
        formEl.classList.add('hidden');
        dashEl.classList.remove('hidden');
        dashBtn.classList.add('active-tab');
        entryBtn.classList.remove('active-tab');
        renderDashboard();
    } else {
        formEl.classList.remove('hidden');
        dashEl.classList.add('hidden');
        entryBtn.classList.add('active-tab');
        dashBtn.classList.remove('active-tab');
        if (Object.keys(inventoryData.categories).length > 0) populateCategories();
    }
}

/**
 * RENDER DASHBOARD: Displays KPI Cards with Comparisons and Leaderboards
 */
function renderDashboard() {
    const stats = inventoryData.analytics || {};
    
    // Update KPI Cards
    updateKPICard('displayRevenue', stats.revenue, stats.revVsLastMonth, '₦');
    updateKPICard('displayProfit', stats.profit, stats.profitVsLastMonth, '₦');
    
    // Calculate and Update Margin
    const margin = stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(1) : 0;
    document.getElementById('displayMargin').textContent = `${margin}%`;

    // Render Year-to-Date Summary
    renderYearlySummary(stats);

    // Render Top Products List
    renderTopProducts(stats);
}

function updateKPICard(id, value, comparison, prefix = '') {
    const el = document.getElementById(id);
    el.textContent = `${prefix}${(value || 0).toLocaleString()}`;
    
    // Optional: add small comparison text if needed (e.g. via a title attribute or extra span)
    if (comparison !== undefined) {
        const trend = comparison >= 0 ? '↑' : '↓';
        el.title = `${trend} ${Math.abs(comparison)}% vs Last Month`;
    }
}

function renderYearlySummary(stats) {
    const container = document.getElementById('stockAnalysis');
    // We clear it initially to start building the sections
    container.innerHTML = '<h3>📊 Yearly Performance (YTD)</h3>';
    
    const yearlyRow = document.createElement('div');
    yearlyRow.className = 'stock-row good';
    yearlyRow.innerHTML = `<span>YTD Revenue:</span> <strong>₦${(stats.yearlyRevenue || 0).toLocaleString()}</strong>`;
    container.appendChild(yearlyRow);

    const yearlyProfitRow = document.createElement('div');
    yearlyProfitRow.className = 'stock-row good';
    yearlyProfitRow.innerHTML = `<span>YTD Profit:</span> <strong>₦${(stats.yearlyProfit || 0).toLocaleString()}</strong>`;
    container.appendChild(yearlyProfitRow);
}

function renderTopProducts(stats) {
    const container = document.getElementById('stockAnalysis');
    
    // Top by Volume Section (Leaderboard)
    const volHeader = document.createElement('div');
    volHeader.innerHTML = '<p style="font-size:0.8rem; font-weight:bold; margin-top:20px; color:#2980b9; text-transform:uppercase;">Top 10 Products by Revenue</p>';
    container.appendChild(volHeader);

    (stats.topProductsByVol || []).forEach(item => {
        if(item.name) {
            const row = document.createElement('div');
            row.className = 'stock-row';
            row.innerHTML = `<span>${item.name}</span> <strong>₦${item.value.toLocaleString()}</strong>`;
            container.appendChild(row);
        }
    });

    // Top by Quantity Section
    const qtyHeader = document.createElement('div');
    qtyHeader.innerHTML = '<p style="font-size:0.8rem; font-weight:bold; margin-top:20px; color:#27ae60; text-transform:uppercase;">Top 10 Products by Quantity</p>';
    container.appendChild(qtyHeader);

    (stats.topProductsByQty || []).forEach(item => {
        if(item.name) {
            const row = document.createElement('div');
            row.className = 'stock-row';
            row.innerHTML = `<span>${item.name}</span> <strong>${item.value} units</strong>`;
            container.appendChild(row);
        }
    });
}

/**
 * UI LOGIC: Populates the Category dropdown
 */
function populateCategories() {
    const catSelect = document.getElementById('category');
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    
    const categories = Object.keys(inventoryData.categories).sort();
    
    if (categories.length === 0) {
        catSelect.innerHTML = '<option value="">No Categories Found</option>';
        return;
    }

    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });
    catSelect.disabled = false;
}

/**
 * EVENT: Handle Category change to update Product list
 */
document.getElementById('category').addEventListener('change', (e) => {
    const prodSelect = document.getElementById('product');
    const products = inventoryData.categories[e.target.value] || [];
    
    prodSelect.innerHTML = '<option value="">-- Select Item --</option>';
    products.forEach(prod => {
        const opt = document.createElement('option');
        opt.value = prod;
        opt.textContent = prod;
        prodSelect.appendChild(opt);
    });
    
    prodSelect.disabled = false;
    document.getElementById('stockBadge').classList.add('hidden');
});

/**
 * EVENT: Handle Product change to show Stock Reminder
 */
document.getElementById('product').addEventListener('change', (e) => {
    const productName = e.target.value;
    const stock = inventoryData.stockLevels[productName];
    const badge = document.getElementById('stockBadge');
    
    if (productName && stock !== undefined) {
        badge.textContent = `Stock: ${stock}`;
        badge.classList.remove('hidden', 'low-stock', 'out-stock', 'good-stock');
        
        if (stock <= 0) {
            badge.classList.add('out-stock');
            badge.textContent += " (OUT)";
        } else if (stock <= 5) {
            badge.classList.add('low-stock');
            badge.textContent += " (LOW)";
        } else {
            badge.classList.add('good-stock');
        }
    } else {
        badge.classList.add('hidden');
    }
});

/**
 * EVENT: Toggle between Sales and Expense modes
 */
document.getElementById('saleType').addEventListener('change', (e) => {
    const isExpense = e.target.value === 'Expense';
    const catGroup = document.getElementById('catGroup');
    const prodSelect = document.getElementById('product');
    const manualInput = document.getElementById('manualInput');
    const productLabel = document.getElementById('productLabel');
    const qtyLabel = document.getElementById('qtyLabel');
    const stockBadge = document.getElementById('stockBadge');

    stockBadge.classList.add('hidden');

    if (isExpense) {
        catGroup.classList.add('hidden');
        prodSelect.classList.add('hidden');
        manualInput.classList.remove('hidden');
        productLabel.textContent = "Reason for Expense";
        qtyLabel.textContent = "Amount (₦)";
    } else {
        catGroup.classList.remove('hidden');
        prodSelect.classList.remove('hidden');
        manualInput.classList.add('hidden');
        productLabel.textContent = "Product / Item";
        qtyLabel.textContent = "Quantity";
        if (Object.keys(inventoryData.categories).length > 0) populateCategories();
    }
});

/**
 * SUBMIT: Send data to Google Apps Script
 */
document.getElementById('opForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = "Processing...";
    
    const isExpense = document.getElementById('saleType').value === 'Expense';
    
    const payload = {
        saleType: document.getElementById('saleType').value,
        category: isExpense ? 'Expense' : document.getElementById('category').value,
        product: isExpense ? document.getElementById('manualInput').value : document.getElementById('product').value,
        qty: document.getElementById('qty').value
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        showFeedback("✅ Transaction Logged Successfully!", "success");
        e.target.reset();
        
        document.getElementById('saleType').dispatchEvent(new Event('change'));
        fetchSheetData();
        
    } catch (err) {
        showFeedback("Error logging transaction.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Log Transaction";
    }
});

function showFeedback(text, type) {
    const el = document.getElementById('feedback');
    el.textContent = text;
    el.className = type;
    el.classList.remove('hidden');
    setTimeout(() => { el.classList.add('hidden'); }, 4000);
}

// Navigation Listeners
document.getElementById('viewEntryBtn').addEventListener('click', () => toggleView('entry'));
document.getElementById('viewDashBtn').addEventListener('click', () => toggleView('dashboard'));

window.onload = fetchSheetData;

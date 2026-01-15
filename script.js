const API_URL = "https://script.google.com/macros/s/AKfycbxPzAtnBzgPhPnwKVSl7gFwgjXPGe799sYBDArclT-Czn1MUMnVF5LccxPaXvPiCds/exec"; 
let inventoryData = { categories: {}, stockLevels: {}, analytics: {}, valuation: {} };
let trendChart, distChart;
let currentStaff = null;

const staffList = {
    "1234": "Dennis",
    "5678": "Staff A",
    "0000": "The Oracle"
};

async function handleLogin() {
    const pin = document.getElementById('pinInput').value;
    if (staffList[pin]) {
        currentStaff = staffList[pin];
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('staffWelcome').textContent = `Welcome, ${currentStaff}`;
        fetchSheetData();
    } else {
        const errorMsg = document.getElementById('loginError');
        errorMsg.textContent = "Invalid PIN. Access Denied.";
        errorMsg.classList.remove('hidden');
    }
}

async function fetchSheetData() {
    try {
        const response = await fetch(API_URL);
        inventoryData = await response.json();
        setupDashboardSelectors();
        populateCategories();
    } catch (err) { console.error("Sync Error:", err); }
}

function setupDashboardSelectors() {
    const mSelect = document.getElementById('monthSelector');
    const ySelect = document.getElementById('yearSelector');
    mSelect.innerHTML = ''; ySelect.innerHTML = '';

    inventoryData.analytics.monthlyRecords.forEach((rec, index) => {
        const opt = document.createElement('option');
        opt.value = index; opt.textContent = rec.name;
        mSelect.appendChild(opt);
    });

    inventoryData.analytics.yearlyRecords.forEach((rec, index) => {
        const opt = document.createElement('option');
        opt.value = index; opt.textContent = rec.name;
        ySelect.appendChild(opt);
    });

    updateDashboardDisplay();
}

function updateDashboardDisplay() {
    const viewType = document.querySelector('input[name="viewMode"]:checked').value;
    const mSelect = document.getElementById('monthSelector');
    const ySelect = document.getElementById('yearSelector');
    
    let data;
    if (viewType === 'monthly') {
        data = inventoryData.analytics.monthlyRecords[mSelect.value];
        mSelect.classList.remove('hidden'); ySelect.classList.add('hidden');
    } else {
        data = inventoryData.analytics.yearlyRecords[ySelect.value];
        ySelect.classList.remove('hidden'); mSelect.classList.add('hidden');
    }

    if (!data) return;

    // Financial Cards
    document.getElementById('displayRevenue').textContent = `₦${data.revenue.toLocaleString()}`;
    document.getElementById('displayNet').textContent = `₦${data.net.toLocaleString()}`;
    document.getElementById('displayGross').textContent = `₦${data.gross.toLocaleString()}`;
    document.getElementById('displayExpenses').textContent = `₦${data.expenses.toLocaleString()}`;
    
    // Valuation Cards
    document.getElementById('valCost').textContent = `₦${inventoryData.valuation.cost.toLocaleString()}`;
    document.getElementById('valRetail').textContent = `₦${inventoryData.valuation.retail.toLocaleString()}`;
    document.getElementById('valReseller').textContent = `₦${inventoryData.valuation.reseller.toLocaleString()}`;
    
    initCharts(data);
    renderLeaderboards(data);
}

function initCharts(currentData) {
    const ctxTrend = document.getElementById('revenueTrendChart').getContext('2d');
    const ctxDist = document.getElementById('typeDistChart').getContext('2d');
    const history = inventoryData.analytics.history;

    if (trendChart) trendChart.destroy();
    if (distChart) distChart.destroy();

    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: history.labels,
            datasets: [{
                label: 'Revenue Trend (₦)',
                data: history.revenue,
                borderColor: '#2980b9',
                backgroundColor: 'rgba(41, 128, 185, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    distChart = new Chart(ctxDist, {
        type: 'pie',
        data: {
            labels: ['Retail', 'Reseller'],
            datasets: [{
                data: [currentData.retailRev || 0, currentData.resellerRev || 0],
                backgroundColor: ['#27ae60', '#f39c12']
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Sales Split' } }
        }
    });
}

function renderLeaderboards(data) {
    const container = document.getElementById('leaderboardContent');
    container.innerHTML = '';

    const sections = [
        { label: '🔥 Top 10 by Profit (Live)', data: data.topProfit },
        { label: '📦 Top 10 by Quantity (Live)', data: data.topQty }
    ];

    sections.forEach(sec => {
        const h = document.createElement('h4'); h.textContent = sec.label; container.appendChild(h);
        if (!sec.data || sec.data.length === 0) {
            const p = document.createElement('p'); p.textContent = "No data for this period"; container.appendChild(p);
        }
        sec.data.forEach(item => {
            const row = document.createElement('div');
            row.className = 'stock-row';
            row.innerHTML = `<span>${item.name}</span><strong>${typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</strong>`;
            container.appendChild(row);
        });
    });
}

function populateCategories() {
    const catSelect = document.getElementById('category');
    catSelect.innerHTML = '<option value="">Select Category</option>';
    Object.keys(inventoryData.categories).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.textContent = cat;
        catSelect.appendChild(opt);
    });
    catSelect.disabled = false;
}

// UI Event Listeners
document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.getElementById('viewEntryBtn').addEventListener('click', () => toggleView('entry'));
document.getElementById('viewDashBtn').addEventListener('click', () => toggleView('dashboard'));
document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
    radio.addEventListener('change', updateDashboardDisplay);
});
document.getElementById('monthSelector').addEventListener('change', updateDashboardDisplay);
document.getElementById('yearSelector').addEventListener('change', updateDashboardDisplay);

// Dependents
document.getElementById('category').addEventListener('change', (e) => {
    const prodSelect = document.getElementById('product');
    const products = inventoryData.categories[e.target.value] || [];
    prodSelect.innerHTML = '<option value="">Select Item</option>';
    products.forEach(p => {
        const opt = document.createElement('option'); opt.value = p; opt.textContent = p; prodSelect.appendChild(opt);
    });
    prodSelect.disabled = false;
});

document.getElementById('product').addEventListener('change', (e) => {
    const stock = inventoryData.stockLevels[e.target.value];
    const badge = document.getElementById('stockBadge');
    if (stock !== undefined) {
        badge.textContent = `Stock: ${stock}`;
        badge.className = `stock-badge ${stock <= 0 ? 'out-stock' : (stock <= 5 ? 'low-stock' : 'good-stock')}`;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
});

function toggleView(view) {
    document.getElementById('opForm').classList.toggle('hidden', view !== 'entry');
    document.getElementById('dashboardView').classList.toggle('hidden', view !== 'dashboard');
}

// Form Submission
document.getElementById('opForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = "Processing...";
    
    const payload = {
        saleType: document.getElementById('saleType').value,
        category: document.getElementById('category').value,
        product: document.getElementById('product').value,
        qty: document.getElementById('qty').value,
        staff: currentStaff
    };

    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("Success! Record logged by " + currentStaff);
        location.reload();
    } catch (err) { alert("Error connecting to sheet."); btn.disabled = false; }
};

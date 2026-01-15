const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; 
let inventoryData = { categories: {}, stockLevels: {}, analytics: {}, valuation: {} };
let trendChart, distChart;
let currentStaff = null;

// Define your Staff PINs here
const staffList = {
    "1234": "Dennis",
    "5678": "Demola",
    "0000": "Tunmise"
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

    document.getElementById('displayRevenue').textContent = `₦${data.revenue.toLocaleString()}`;
    document.getElementById('displayNet').textContent = `₦${data.net.toLocaleString()}`;
    document.getElementById('displayGross').textContent = `₦${data.gross.toLocaleString()}`;
    document.getElementById('displayExpenses').textContent = `₦${data.expenses.toLocaleString()}`;
    document.getElementById('valCost').textContent = `₦${inventoryData.valuation.cost.toLocaleString()}`;
    document.getElementById('valSale').textContent = `₦${inventoryData.valuation.sale.toLocaleString()}`;
    
    renderLeaderboards(data);
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
            row.innerHTML = `<span>${item.name}</span><strong>₦${item.value.toLocaleString()}</strong>`;
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

// Event Listeners
document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.getElementById('viewEntryBtn').addEventListener('click', () => toggleView('entry'));
document.getElementById('viewDashBtn').addEventListener('click', () => toggleView('dashboard'));
document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
    radio.addEventListener('change', updateDashboardDisplay);
});
document.getElementById('monthSelector').addEventListener('change', updateDashboardDisplay);
document.getElementById('yearSelector').addEventListener('change', updateDashboardDisplay);

function toggleView(view) {
    document.getElementById('opForm').classList.toggle('hidden', view !== 'entry');
    document.getElementById('dashboardView').classList.toggle('hidden', view !== 'dashboard');
}

// Simplified form submission including currentStaff
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

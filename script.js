// 1. CONFIGURATION
// REPLACE THE URL BELOW with your actual Google Apps Script Web App URL
const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; 

// 2. STATE MANAGEMENT
let inventoryData = { categories: {}, stockLevels: {} };

/**
 * FETCH DATA: Syncs categories and current stock from Google Sheets
 */
async function fetchSheetData() {
    const catSelect = document.getElementById('category');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        inventoryData = await response.json();
        
        // Only populate dropdowns if we aren't in Expense mode
        if (document.getElementById('saleType').value !== 'Expense') {
            populateCategories();
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        showFeedback("Sync failed. Check API URL and Permissions.", "error");
    }
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
    document.getElementById('stockBadge').classList.add('hidden'); // Reset badge
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
        document.getElementById('category').required = false;
        prodSelect.required = false;
        manualInput.required = true;
    } else {
        catGroup.classList.remove('hidden');
        prodSelect.classList.remove('hidden');
        manualInput.classList.add('hidden');
        productLabel.textContent = "Product / Item";
        qtyLabel.textContent = "Quantity";
        document.getElementById('category').required = true;
        prodSelect.required = true;
        manualInput.required = false;
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
        
        // Refresh UI state
        document.getElementById('saleType').dispatchEvent(new Event('change'));
        // Refresh stock data from sheet
        fetchSheetData();
        
    } catch (err) {
        showFeedback("Error logging transaction.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Log Transaction";
    }
});

/**
 * UTILITY: Show temporary feedback message
 */
function showFeedback(text, type) {
    const el = document.getElementById('feedback');
    el.textContent = text;
    el.className = type;
    el.classList.remove('hidden');
    setTimeout(() => { el.classList.add('hidden'); }, 4000);
}

// Initial Sync
window.onload = fetchSheetData;

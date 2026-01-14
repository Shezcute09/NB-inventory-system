const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; 

let inventoryData = { categories: {}, stockLevels: {} };

async function fetchSheetData() {
    try {
        const response = await fetch(API_URL);
        inventoryData = await response.json();
        if (document.getElementById('saleType').value !== 'Expense') {
            populateCategories();
        }
    } catch (err) {
        showFeedback("Error syncing stock levels.", "error");
    }
}

function populateCategories() {
    const catSelect = document.getElementById('category');
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    Object.keys(inventoryData.categories).sort().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });
    catSelect.disabled = false;
}

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

// STOCK REMINDER LOGIC
document.getElementById('product').addEventListener('change', (e) => {
    const productName = e.target.value;
    const stock = inventoryData.stockLevels[productName];
    const badge = document.getElementById('stockBadge');
    
    if (productName && stock !== undefined) {
        badge.textContent = `Current Stock: ${stock}`;
        badge.classList.remove('hidden', 'low-stock', 'out-stock', 'good-stock');
        
        if (stock <= 0) {
            badge.classList.add('out-stock');
            badge.textContent += " (OUT OF STOCK)";
        } else if (stock <= 5) {
            badge.classList.add('low-stock');
            badge.textContent += " (LOW!)";
        } else {
            badge.classList.add('good-stock');
        }
    } else {
        badge.classList.add('hidden');
    }
});

document.getElementById('saleType').addEventListener('change', (e) => {
    const isExpense = e.target.value === 'Expense';
    document.getElementById('catGroup').style.display = isExpense ? 'none' : 'block';
    document.getElementById('product').style.display = isExpense ? 'none' : 'block';
    document.getElementById('manualInput').style.display = isExpense ? 'block' : 'none';
    document.getElementById('stockBadge').classList.add('hidden');
    if (!isExpense && Object.keys(inventoryData.categories).length > 0) populateCategories();
});

document.getElementById('opForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = "Logging...";
    
    const isExpense = document.getElementById('saleType').value === 'Expense';
    const payload = {
        saleType: document.getElementById('saleType').value,
        category: isExpense ? 'Expense' : document.getElementById('category').value,
        product: isExpense ? document.getElementById('manualInput').value : document.getElementById('product').value,
        qty: document.getElementById('qty').value
    };

    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        showFeedback("✅ Logged to Sheet!", "success");
        e.target.reset();
        fetchSheetData(); // Refresh stock levels after sale
    } catch (err) {
        showFeedback("Error logging data.", "error");
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

window.onload = fetchSheetData;

// REPLACE THIS URL with your actual Google Apps Script Web App URL from Part 1
const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; 

let inventoryMap = {};

// 1. Fetch Categories from Sheet on Load
async function fetchSheetData() {
    try {
        const response = await fetch(API_URL);
        inventoryMap = await response.json();
        
        // Only populate if not in Expense mode
        if (document.getElementById('saleType').value !== 'Expense') {
            populateCategories();
        }
    } catch (err) {
        showFeedback("Error syncing with Google Sheet.", "error");
    }
}

function populateCategories() {
    const catSelect = document.getElementById('category');
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    
    Object.keys(inventoryMap).sort().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });
    catSelect.disabled = false;
}

// 2. Handle Sale Type Changes (Toggle Expense Mode)
document.getElementById('saleType').addEventListener('change', (e) => {
    const type = e.target.value;
    const catGroup = document.getElementById('catGroup');
    const prodSelect = document.getElementById('product');
    const manualInput = document.getElementById('manualInput');
    const productLabel = document.getElementById('productLabel');
    const qtyLabel = document.getElementById('qtyLabel');

    if (type === 'Expense') {
        // Expense Mode: Hide Category, Show Manual Input
        catGroup.classList.add('hidden');
        document.getElementById('category').required = false;
        
        prodSelect.classList.add('hidden');
        prodSelect.required = false;
        
        manualInput.classList.remove('hidden');
        manualInput.required = true;
        
        productLabel.textContent = "Reason for Expense";
        qtyLabel.textContent = "Amount (₦)";
    } else {
        // Sales Mode: Show Category, Show Dropdown
        catGroup.classList.remove('hidden');
        document.getElementById('category').required = true;
        
        prodSelect.classList.remove('hidden');
        prodSelect.required = true;
        
        manualInput.classList.add('hidden');
        manualInput.required = false;
        
        productLabel.textContent = "Product / Item";
        qtyLabel.textContent = "Quantity";
        
        // Refresh categories if map is loaded
        if (Object.keys(inventoryMap).length > 0) populateCategories();
    }
});

// 3. Dependent Dropdown Logic
document.getElementById('category').addEventListener('change', (e) => {
    const prodSelect = document.getElementById('product');
    const products = inventoryMap[e.target.value] || [];
    
    prodSelect.innerHTML = '<option value="">-- Select Item --</option>';
    products.forEach(prod => {
        const opt = document.createElement('option');
        opt.value = prod;
        opt.textContent = prod;
        prodSelect.appendChild(opt);
    });
    
    prodSelect.disabled = false;
});

// 4. Submit Handler
document.getElementById('opForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = "Processing...";
    
    const isExpense = document.getElementById('saleType').value === 'Expense';
    
    // Construct payload dynamically based on mode
    const payload = {
        saleType: document.getElementById('saleType').value,
        category: isExpense ? 'Expense' : document.getElementById('category').value,
        product: isExpense ? document.getElementById('manualInput').value : document.getElementById('product').value,
        qty: document.getElementById('qty').value
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        showFeedback("✅ Transaction Saved Successfully!", "success");
        e.target.reset();
        
        // Reset UI state
        document.getElementById('saleType').dispatchEvent(new Event('change'));
        
    } catch (err) {
        showFeedback("Submission Failed. Check Connection.", "error");
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

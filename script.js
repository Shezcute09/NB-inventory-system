const API_URL = "YOUR_DEPLOYED_WEB_APP_URL";
let sheetData = {};

// Fetch Categories on Load
window.onload = async () => {
    const response = await fetch(API_URL);
    sheetData = await response.json();
    
    const catSelect = document.getElementById('category');
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    Object.keys(sheetData).forEach(cat => {
        let opt = document.createElement('option');
        opt.value = cat;
        opt.innerHTML = cat;
        catSelect.appendChild(opt);
    });
    catSelect.disabled = false;
};

// Handle Dependent Dropdown
document.getElementById('category').addEventListener('change', (e) => {
    const prodSelect = document.getElementById('product');
    const products = sheetData[e.target.value] || [];
    prodSelect.innerHTML = '<option value="">-- Select Item --</option>';
    products.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p;
        opt.innerHTML = p;
        prodSelect.appendChild(opt);
    });
    prodSelect.disabled = false;
});

// Submit Form
document.getElementById('staffForm').onsubmit = async (e) => {
    e.preventDefault();
    document.getElementById('submitBtn').innerText = "Syncing with Sheet...";
    
    const payload = {
        saleType: document.getElementById('saleType').value,
        category: document.getElementById('category').value,
        product: document.getElementById('product').value,
        qty: document.getElementById('qty').value
    };

    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    document.getElementById('msg').innerHTML = "✅ Logged successfully!";
    document.getElementById('submitBtn').innerText = "Log Transaction";
    e.target.reset();
};

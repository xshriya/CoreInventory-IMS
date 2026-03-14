document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('jwtToken');
    const path = window.location.pathname;
    
    // If no token exists and user is NOT on login or signup pages, boot them.
    if (!token && !path.includes('login.html') && !path.includes('signup.html') && !path.includes('forgot-password.html')) {
        window.location.replace('login.html');
    }
    
    // Display user info if on an authenticated page
    if (token && !path.includes('login.html') && !path.includes('signup.html') && !path.includes('forgot-password.html')) {
        displayUserInfo();
        initializeUserDisplay();
    }
});

function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userInfo');
    window.location.replace('login.html');
}

// Get current user info
function getCurrentUser() {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
}

// Display user info in header
function displayUserInfo() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Find or create user display element
    let userDisplay = document.getElementById('userDisplay');
    
    if (!userDisplay) {
        // Try to find a suitable container in the header
        const header = document.querySelector('header') || document.querySelector('.header') || document.querySelector('[class*="header"]');
        if (header) {
            userDisplay = document.createElement('div');
            userDisplay.id = 'userDisplay';
            userDisplay.className = 'flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm font-medium text-slate-700';
            header.appendChild(userDisplay);
        }
    }
    
    if (userDisplay) {
        userDisplay.innerHTML = `
            <span class="material-symbols-outlined text-primary">person</span>
            <span>${user.login_id || user.email}</span>
        `;
    }
}

// Autofill user name in forms
function autofillUserName(inputId) {
    const user = getCurrentUser();
    if (!user) return;
    
    const input = document.getElementById(inputId);
    if (input && !input.value) {
        input.value = user.login_id || user.email || 'Admin User';
    }
}

// Initialize user display on page load
function initializeUserDisplay() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Update header user name
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = user.login_id || user.email;
    }
    
    // Autofill responsible fields
    autofillUserName('responsible');
}

// Export functions for global access
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.displayUserInfo = displayUserInfo;
window.autofillUserName = autofillUserName;
window.initializeUserDisplay = initializeUserDisplay;
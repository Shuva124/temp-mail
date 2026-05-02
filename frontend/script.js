const API_BASE_URL = 'https://temp-mail-fw3k.onrender.com/api';

// DOM Elements
const landingView = document.getElementById('landing-view');
const dashboardView = document.getElementById('dashboard-view');
const generateBtn = document.getElementById('generate-btn');
const emailAddressInput = document.getElementById('email-address');
const copyBtn = document.getElementById('copy-btn');
const changeEmailBtn = document.getElementById('change-email-btn');
const timerDisplay = document.getElementById('countdown');
const timerBadge = document.querySelector('.timer-badge');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const emailListContainer = document.getElementById('email-list');
const emailContentArea = document.getElementById('email-content');

// State Variables
let currentAddress = null;
let currentDeletionTime = null;
let pollingInterval = null;
let timerInterval = null;
let storedEmails = [];
let activeEmailId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    setupEventListeners();
});

function setupEventListeners() {
    generateBtn.addEventListener('click', handleGenerateEmail);
    copyBtn.addEventListener('click', copyToClipboard);
    changeEmailBtn.addEventListener('click', changeEmail);
    refreshBtn.addEventListener('click', handleRefreshClick);
}

// Core Logic
function loadFromLocalStorage() {
    const storedAddress = localStorage.getItem('temp_address');
    const storedExpiry = localStorage.getItem('temp_expiry');

    if (storedAddress && storedExpiry) {
        currentAddress = storedAddress;
        currentDeletionTime = new Date(storedExpiry);
        
        // Check if already expired before mounting
        if (new Date() >= currentDeletionTime) {
            handleExpiry(false); // Silent expiry on load
        } else {
            setupActiveSession();
        }
    } else {
        showLanding();
    }
}

async function handleGenerateEmail() {
    try {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spin">↻</span> Generating...';

        const response = await fetch(`${API_BASE_URL}/address/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to create email');

        const data = await response.json();
        
        localStorage.setItem('temp_address', data.address);
        localStorage.setItem('temp_expiry', data.deletion_time);
        
        currentAddress = data.address;
        currentDeletionTime = new Date(data.deletion_time);
        
        showToast('Email generated successfully');
        setupActiveSession();

    } catch (error) {
        showToast('Error generating email. Please try again.', 'error');
        console.error(error);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Generate Email';
    }
}

function setupActiveSession() {
    landingView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    emailAddressInput.value = currentAddress;
    
    // Reset state
    storedEmails = [];
    activeEmailId = null;
    renderInbox();
    clearEmailDetail();
    
    checkExpiry();
    timerInterval = setInterval(checkExpiry, 1000);
    
    fetchEmails(); 
    startPolling();
}

function showLanding() {
    landingView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
}

// Expiry Management
function checkExpiry() {
    const now = new Date().getTime();
    const expiry = currentDeletionTime.getTime();
    const diff = expiry - now;

    if (diff <= 0) {
        handleExpiry(true);
        return;
    }

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    timerDisplay.textContent = `Expires in: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (diff <= 60000) { // Last minute red warning
        timerBadge.classList.add('timer-danger');
    } else {
        timerBadge.classList.remove('timer-danger');
    }
}

function handleExpiry(showNotification = true) {
    stopPolling();
    clearInterval(timerInterval);
    
    localStorage.removeItem('temp_address');
    localStorage.removeItem('temp_expiry');
    
    currentAddress = null;
    currentDeletionTime = null;
    
    if (showNotification) {
        showToast('Your temporary email has expired.', 'error');
    }
    
    showLanding();
}

function changeEmail() {
    stopPolling();
    clearInterval(timerInterval);
    handleGenerateEmail();
}

// Polling & Data Fetching
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchEmails, 3000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

async function fetchEmails(isManual = false) {
    if (!currentAddress) return;
    
    if (isManual) {
        refreshIcon.classList.add('spin');
        refreshBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/webhook/emails/${currentAddress}`);
        if (!response.ok) throw new Error('Failed to fetch emails');
        
        const emails = await response.json();
        
        // Only re-render if count changes (basic diffing)
        if (emails.length !== storedEmails.length) {
            storedEmails = emails;
            renderInbox();
        }
    } catch (error) {
        console.error('Fetch error:', error);
        if (isManual) showToast('Failed to sync inbox', 'error');
    } finally {
        if (isManual) {
            setTimeout(() => {
                refreshIcon.classList.remove('spin');
                refreshBtn.disabled = false;
            }, 500);
        }
    }
}

function handleRefreshClick() {
    fetchEmails(true);
}

// UI Rendering
function renderInbox() {
    emailListContainer.innerHTML = '';
    
    if (storedEmails.length === 0) {
        emailListContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                No emails yet. Waiting for incoming messages...
            </div>
        `;
        return;
    }

    // Render list (assuming newer emails come last or first from backend, reverse if needed)
    [...storedEmails].reverse().forEach(emailObj => {
        const item = document.createElement('div');
        item.className = `email-item ${activeEmailId === emailObj.id ? 'active' : ''}`;
        
        item.innerHTML = `
            <div class="email-sender">${escapeHTML(emailObj.email.from)}</div>
            <div class="email-subject">${escapeHTML(emailObj.email.subject || '(No Subject)')}</div>
        `;
        
        item.addEventListener('click', () => viewEmail(emailObj.id));
        emailListContainer.appendChild(item);
    });
}

function viewEmail(id) {
    activeEmailId = id;
    renderInbox(); // Update active state class
    
    const emailData = storedEmails.find(e => e.id === id);
    if (!emailData) return;

    // Use an iframe to isolate potentially messy HTML content
    emailContentArea.innerHTML = `
        <div class="full-email-header">
            <h2 class="full-email-subject">${escapeHTML(emailData.email.subject || '(No Subject)')}</h2>
            <div class="full-email-sender">From: ${escapeHTML(emailData.email.from)}</div>
        </div>
        <iframe id="email-iframe" class="iframe-container" sandbox></iframe>
    `;

    const iframe = document.getElementById('email-iframe');
    const doc = iframe.contentWindow.document;
    doc.open();
    // Wrap in basic styling for raw text if backend doesn't send HTML
    doc.write(`
        <style>body { font-family: sans-serif; color: #111827; line-height: 1.5; padding: 0.5rem; word-wrap: break-word; }</style>
        ${emailData.email.body}
    `);
    doc.close();
}

function clearEmailDetail() {
    emailContentArea.innerHTML = `
        <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--purple-light)" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <p>Select an email to read</p>
    `;
    emailContentArea.classList.add('empty-state');
}

// Utilities
function copyToClipboard() {
    if (!currentAddress) return;
    navigator.clipboard.writeText(currentAddress).then(() => {
        showToast('Email address copied!');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' 
        ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
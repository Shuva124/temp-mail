const apiBase = 'https://temp-mail-fw3k.onrender.com/api';

const landView = document.getElementById('landing-view');
const dashView = document.getElementById('dashboard-view');
const genBtn = document.getElementById('generate-btn');
const mailInp = document.getElementById('email-address');
const copyBtn = document.getElementById('copy-btn');
const changeBtn = document.getElementById('change-email-btn');
const timerDisp = document.getElementById('countdown');
const timerBdge = document.querySelector('.timer-badge');
const refBtn = document.getElementById('refresh-btn');
const refIcon = document.getElementById('refresh-icon');
const listCont = document.getElementById('email-list');
const contArea = document.getElementById('email-content');

let currAddr = null;
let delTime = null;
let pollInt = null;
let timerInt = null;
let mails = [];
let actvId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindEvents();
});

function bindEvents() {
    genBtn.addEventListener('click', makeMail);
    copyBtn.addEventListener('click', copyMail);
    changeBtn.addEventListener('click', swapMail);
    refBtn.addEventListener('click', forceFetch);
}

function loadData() {
    const strAddr = localStorage.getItem('temp_address');
    const strExp = localStorage.getItem('temp_expiry');

    if (strAddr && strExp) {
        currAddr = strAddr;
        delTime = new Date(strExp);
        
        if (new Date() >= delTime) {
            dropSess(false);
        } else {
            startSess();
        }
    } else {
        showLand();
    }
}

async function makeMail() {
    try {
        genBtn.disabled = true;
        genBtn.innerHTML = '<svg class="spin" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Generating...';

        const res = await fetch(`${apiBase}/address/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error('Create fail');

        const data = await res.json();
        
        localStorage.setItem('temp_address', data.address);
        localStorage.setItem('temp_expiry', data.deletion_time);
        
        currAddr = data.address;
        delTime = new Date(data.deletion_time);
        
        popToast('Email generated successfully');
        startSess();

    } catch (err) {
        popToast('Error generating email.', 'error');
    } finally {
        genBtn.disabled = false;
        genBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Generate Email';
    }
}

function startSess() {
    landView.classList.add('hidden');
    dashView.classList.remove('hidden');
    mailInp.value = currAddr;
    
    mails = [];
    actvId = null;
    drawList();
    clearPane();
    
    chkExp();
    timerInt = setInterval(chkExp, 1000);
    
    getMails(); 
    setPoll();
}

function showLand() {
    landView.classList.remove('hidden');
    dashView.classList.add('hidden');
}

function chkExp() {
    const now = new Date().getTime();
    const exp = delTime.getTime();
    const diff = exp - now;

    if (diff <= 0) {
        dropSess(true);
        return;
    }

    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    
    timerDisp.textContent = `Expires in: ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    if (diff <= 60000) {
        timerBdge.classList.add('timer-danger');
    } else {
        timerBdge.classList.remove('timer-danger');
    }
}

function dropSess(notify = true) {
    haltPoll();
    clearInterval(timerInt);
    
    localStorage.removeItem('temp_address');
    localStorage.removeItem('temp_expiry');
    
    currAddr = null;
    delTime = null;
    
    if (notify) {
        popToast('Temporary email expired.', 'error');
    }
    
    showLand();
}

function swapMail() {
    haltPoll();
    clearInterval(timerInt);
    makeMail();
}

function setPoll() {
    if (pollInt) clearInterval(pollInt);
    pollInt = setInterval(getMails, 3000);
}

function haltPoll() {
    if (pollInt) {
        clearInterval(pollInt);
        pollInt = null;
    }
}

async function getMails(manual = false) {
    if (!currAddr) return;
    
    if (manual) {
        refIcon.classList.add('spin');
        refBtn.disabled = true;
    }

    try {
        const res = await fetch(`${apiBase}/webhook/emails/${currAddr}`);
        if (!res.ok) throw new Error('Fetch fail');
        
        const reqMails = await res.json();
        
        if (reqMails.length !== mails.length) {
            mails = reqMails;
            drawList();
        }
    } catch (err) {
        if (manual) popToast('Failed to sync inbox', 'error');
    } finally {
        if (manual) {
            setTimeout(() => {
                refIcon.classList.remove('spin');
                refBtn.disabled = false;
            }, 500);
        }
    }
}

function forceFetch() {
    getMails(true);
}

function drawList() {
    listCont.innerHTML = '';
    
    if (mails.length === 0) {
        listCont.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                No emails yet. Waiting for incoming messages...
            </div>
        `;
        return;
    }

    [...mails].reverse().forEach(obj => {
        const node = document.createElement('div');
        node.className = `email-item ${actvId === obj.id ? 'active' : ''}`;
        
        node.innerHTML = `
            <div class="email-sender">${escStr(obj.email.from)}</div>
            <div class="email-subject">${escStr(obj.email.subject || '(No Subject)')}</div>
        `;
        
        node.addEventListener('click', () => showMail(obj.id));
        listCont.appendChild(node);
    });
}

function fmtMail(obj) {
    if (obj.html && obj.html.trim() !== '') return obj.html;
    
    let txt = obj.body || obj.text || '';
    if (/<[a-z][\s\S]*>/i.test(txt)) return txt;
    
    let node = document.createElement('div');
    node.textContent = txt;
    let safe = node.innerHTML;

    const regx = /(https?:\/\/[^\s<()]+)/g;
    safe = safe.replace(regx, str => {
        let cln = str;
        let end = '';
        if (/[.,;?!]$/.test(cln)) {
            end = cln.slice(-1);
            cln = cln.slice(0, -1);
        }
        return `<a href="${cln}" target="_blank">${cln}</a>${end}`;
    });

    return safe.replace(/\n/g, '<br>');
}

function showMail(id) {
    actvId = id;
    drawList();

    const item = mails.find(e => e.id === id);
    if (!item) return;

    const subj = item.email.subject || '(No Subject)';
    const fromStr = item.email.from || 'Unknown';
    const init = fromStr.charAt(0).toUpperCase();

    contArea.classList.remove('empty-state');
    
    contArea.innerHTML = `
        <div class="mail-reader">
            <h1 class="mail-title">${escStr(subj)}</h1>
            <div class="mail-meta">
                <div class="mail-avatar">${escStr(init)}</div>
                <div class="mail-sender">
                    <span class="mail-author">${escStr(fromStr)}</span>
                </div>
            </div>
            <div class="mail-body-wrapper">
                <iframe id="mail-frame" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"></iframe>
            </div>
        </div>
    `;

    const frame = document.getElementById('mail-frame');
    const htmlObj = fmtMail(item.email);
    
    frame.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: #111827;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0 0.5rem;
                    font-size: 0.875rem;
                    word-wrap: break-word;
                }
                img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 0.5rem 0;
                }
                a {
                    color: #7c3aed;
                    text-decoration: underline;
                }
                a:hover {
                    color: #6d28d9;
                }
            </style>
        </head>
        <body>
            ${htmlObj}
        </body>
        </html>
    `;
}

function clearPane() {
    contArea.innerHTML = `
        <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--purple-light)" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <p>Select an email to read</p>
    `;
    contArea.classList.add('empty-state');
}

function copyMail() {
    if (!currAddr) return;
    navigator.clipboard.writeText(currAddr).then(() => {
        popToast('Email address copied!');
    }).catch(() => {
        popToast('Failed to copy', 'error');
    });
}

function popToast(msg, type = 'success') {
    const box = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' 
        ? '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    
    toast.innerHTML = `${icon} <span>${msg}</span>`;
    box.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escStr(str) {
    if (!str) return '';
    const node = document.createElement('div');
    node.textContent = str;
    return node.innerHTML;
}
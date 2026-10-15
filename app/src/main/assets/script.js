// app/src/main/assets/script.js
let selectedTipPercent = 20;
let pendingFeatureAfterUnlock = null;
let adCountdownInterval = null;

const STORAGE_KEYS = {
    PRO_UNLOCKED: 'tns_pro_forever_v1',
    UNLOCK_EXPIRES_AT: 'tns_unlock_expires_at_v1',
    HISTORY: 'tns_split_history_v1',
    HANDLES: 'tns_payment_handles_v1',
    GEMINI_KEY: 'tns_gemini_api_key_v1'
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#bill-amount, #tax-amount, #ppl-count, #tip-on-tax').forEach(el => {
        el.addEventListener('input', calculateSplit);
        el.addEventListener('change', calculateSplit);
    });

    loadSavedSettings();
    updateLockUI();
    calculateSplit();
    setInterval(updateLockUI, 15000);
});

function calculateSplit() {
    const billInput = parseFloat(document.getElementById('bill-amount').value);
    const taxInput = parseFloat(document.getElementById('tax-amount').value);
    const pplInput = parseInt(document.getElementById('ppl-count').value, 10);
    const tipOnTax = document.getElementById('tip-on-tax').checked;

    const bill = !isNaN(billInput) && billInput >= 0 ? billInput : 0;
    const tax = !isNaN(taxInput) && taxInput >= 0 ? taxInput : 0;
    const ppl = !isNaN(pplInput) && pplInput >= 1 ? pplInput : 1;

    const tipBase = tipOnTax ? (bill + tax) : bill;
    const tipAmount = tipBase * (selectedTipPercent / 100);
    const grandTotal = bill + tax + tipAmount;
    const perPerson = grandTotal / ppl;

    document.getElementById('active-tip-label').innerText = `${selectedTipPercent}%`;
    document.getElementById('tip-total').innerText = `$${tipAmount.toFixed(2)}`;
    document.getElementById('grand-total').innerText = `$${grandTotal.toFixed(2)}`;
    document.getElementById('final-res').innerText = `$${perPerson.toFixed(2)}`;

    return { bill, tax, ppl, tipPercent: selectedTipPercent, tipAmount, grandTotal, perPerson };
}

function adjustPeople(delta) {
    const input = document.getElementById('ppl-count');
    const current = parseInt(input.value, 10) || 1;
    const next = Math.max(1, Math.min(100, current + delta));
    input.value = next;
    calculateSplit();
}

function setTip(percent) {
    if (percent === 'custom') {
        const custom = prompt('Enter custom tip percentage (e.g. 22):', String(selectedTipPercent));
        if (custom !== null) {
            const parsed = parseFloat(custom);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                selectedTipPercent = parsed;
            }
        }
    } else {
        selectedTipPercent = Number(percent);
    }

    const buttons = document.querySelectorAll('#tip-selector button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        const btnTip = btn.getAttribute('data-tip');
        if (btnTip === String(percent) || (percent === 'custom' && btnTip === 'custom')) {
            btn.classList.add('active');
        }
    });

    calculateSplit();
}

function roundUp() {
    const grandDisplay = document.getElementById('grand-total');
    const eachDisplay = document.getElementById('final-res');
    const ppl = Math.max(1, parseInt(document.getElementById('ppl-count').value, 10) || 1);

    const currentTotal = parseFloat(grandDisplay.innerText.replace('\$', '')) || 0;
    if (currentTotal > 0) {
        const roundedTotal = Math.ceil(currentTotal);
        const newEach = roundedTotal / ppl;
        grandDisplay.innerText = `$${roundedTotal.toFixed(2)}`;
        eachDisplay.innerText = `$${newEach.toFixed(2)}`;
    }
}

function resetCalculator() {
    document.getElementById('bill-amount').value = '';
    document.getElementById('tax-amount').value = '';
    document.getElementById('ppl-count').value = '1';
    document.getElementById('tip-on-tax').checked = false;
    setTip(20);
    showStatusBanner('Calculator reset');
}

/* ==========================================
   SMS / Group Share & Payment Deep Links
   ========================================== */
function sendTextToGroup() {
    const state = getDisplayedState();
    const message =
        `Receipt Split (Tip-n-Split AI):\n` +
        `Subtotal: $${state.bill.toFixed(2)} | Tax: $${state.tax.toFixed(2)} | Tip (${state.tipPercent}%): ${state.tipText}\n` +
        `Grand Total: ${state.totalText} (${state.ppl} ${state.ppl > 1 ? 'people' : 'person'})\n` +
        `Each Person Owes: ${state.eachText}\n` +
        `Split via https://tns.jeconllc.com`;

    if (navigator.share) {
        navigator.share({
            title: 'Tip-n-Split Bill Breakdown',
            text: message
        }).catch(() => {
            openSmsFallback(message);
        });
    } else {
        openSmsFallback(message);
    }
}

function openSmsFallback(message) {
    const encoded = encodeURIComponent(message);
    window.location.href = `sms:?body=${encoded}`;
}

function payWith(provider) {
    const state = getDisplayedState();
    const amount = state.eachNumeric > 0 ? state.eachNumeric.toFixed(2) : '0.00';
    const handles = getPaymentHandles();
    const note = encodeURIComponent('Dinner Split via Tip-n-Split AI');

    let targetUrl = '';
    if (provider === 'venmo') {
        const recipient = handles.venmo ? `&recipients=${encodeURIComponent(handles.venmo)}` : '';
        targetUrl = `https://venmo.com/?txn=charge&amount=${amount}&note=${note}${recipient}`;
    } else if (provider === 'cashapp') {
        const tag = handles.cashapp ? handles.cashapp.replace(/^\$/, '') : '';
        targetUrl = tag ? `https://cash.app/$${encodeURIComponent(tag)}/${amount}` : `https://cash.app/`;
    } else if (provider === 'paypal') {
        const user = handles.paypal ? handles.paypal.replace(/^@/, '') : '';
        targetUrl = user ? `https://paypal.me/${encodeURIComponent(user)}/${amount}` : `https://www.paypal.com/myaccount/transfer/homepage/request`;
    }

    if (targetUrl) {
        window.open(targetUrl, '_blank');
    }
}

function getDisplayedState() {
    const bill = parseFloat(document.getElementById('bill-amount').value) || 0;
    const tax = parseFloat(document.getElementById('tax-amount').value) || 0;
    const ppl = Math.max(1, parseInt(document.getElementById('ppl-count').value, 10) || 1);
    const tipText = document.getElementById('tip-total').innerText;
    const totalText = document.getElementById('grand-total').innerText;
    const eachText = document.getElementById('final-res').innerText;
    const eachNumeric = parseFloat(eachText.replace('\$', '')) || 0;

    return { bill, tax, ppl, tipPercent: selectedTipPercent, tipText, totalText, eachText, eachNumeric };
}

/* ==========================================
   Monetization: 1-Hour Ad Unlock & \$2.99 Pro
   ========================================== */
function isUnlocked() {
    if (localStorage.getItem(STORAGE_KEYS.PRO_UNLOCKED) === 'true') {
        return true;
    }
    const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.UNLOCK_EXPIRES_AT) || '0', 10);
    return Date.now() < expiresAt;
}

function updateLockUI() {
    const unlocked = isUnlocked();
    const isPro = localStorage.getItem(STORAGE_KEYS.PRO_UNLOCKED) === 'true';
    const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.UNLOCK_EXPIRES_AT) || '0', 10);

    document.getElementById('lock-scanner').innerText = unlocked ? '🔓' : '🔒';
    document.getElementById('lock-ai').innerText = unlocked ? '🔓' : '🔒';

    const banner = document.getElementById('unlock-timer-text');
    if (isPro) {
        banner.innerHTML = '★ Executive Pro Unlocked Forever';
    } else if (unlocked) {
        const minsLeft = Math.max(1, Math.ceil((expiresAt - Date.now()) / 60000));
        banner.innerHTML = `AI Tools Unlocked (${minsLeft}m left) • <a href="javascript:void(0)" onclick="openUnlockModal('pro')">Go Pro ($2.99)</a>`;
    } else {
        banner.innerHTML = `Ad-Supported Mode • <a href="javascript:void(0)" onclick="openUnlockModal('pro')">Unlock Pro ($2.99)</a>`;
    }
}

function handleFeatureTap(feature) {
    if (isUnlocked()) {
        launchFeature(feature);
    } else {
        pendingFeatureAfterUnlock = feature;
        openUnlockModal(feature);
    }
}

function openUnlockModal(feature) {
    pendingFeatureAfterUnlock = feature;
    document.getElementById('ad-Countdown-box').style.display = 'none';
    document.getElementById('unlock-modal-buttons').style.display = 'flex';
    document.getElementById('unlock-modal').style.display = 'flex';
}

function startRewardedAd() {
    const box = document.getElementById('ad-Countdown-box');
    const buttons = document.getElementById('unlock-modal-buttons');
    const label = document.getElementById('ad-countdown-label');
    const fill = document.getElementById('ad-progress-fill');

    buttons.style.display = 'none';
    box.style.display = 'block';

    let remaining = 5; // Fast 5-second simulated sponsor countdown
    const total = remaining;
    label.innerText = `Sponsor Message Playing... ${remaining}s`;
    fill.style.width = '0%';

    clearInterval(adCountdownInterval);
    adCountdownInterval = setInterval(() => {
        remaining -= 1;
        const pct = Math.min(100, Math.round(((total - remaining) / total) * 100));
        fill.style.width = `${pct}%`;

        if (remaining > 0) {
            label.innerText = `Sponsor Message Playing... ${remaining}s`;
        } else {
            clearInterval(adCountdownInterval);
            const oneHourMs = 60 * 60 * 1000;
            localStorage.setItem(STORAGE_KEYS.UNLOCK_EXPIRES_AT, String(Date.now() + oneHourMs));
            updateLockUI();
            closeModals();
            showStatusBanner('AI Tools unlocked for 60 minutes!');
            if (pendingFeatureAfterUnlock && pendingFeatureAfterUnlock !== 'pro') {
                launchFeature(pendingFeatureAfterUnlock);
            }
        }
    }, 1000);
}

function activateProForever() {
    localStorage.setItem(STORAGE_KEYS.PRO_UNLOCKED, 'true');
    updateLockUI();
    closeModals();
    showStatusBanner('★ Executive Pro Unlocked Forever!');
    if (pendingFeatureAfterUnlock && pendingFeatureAfterUnlock !== 'pro') {
        launchFeature(pendingFeatureAfterUnlock);
    }
}

function launchFeature(feature) {
    if (feature === 'scanner') {
        document.getElementById('receipt-file-input').click();
    } else if (feature === 'ai') {
        document.getElementById('ai-modal').style.display = 'flex';
    }
}

/* ==========================================
   Voice Input & Natural Language Bill Parser
   ========================================== */
function triggerVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceBtn = document.getElementById('voice-btn');

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        voiceBtn.classList.add('listening');
        voiceBtn.innerText = '🎙️ LISTENING... SPEAK NOW';
        showStatusBanner('Say e.g. "Bill is 85 dollars, tax 7.50, 20 percent tip, split 4 ways"');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            applyNaturalLanguageToCalculator(transcript);
        };

        recognition.onerror = () => {
            voiceBtn.classList.remove('listening');
            voiceBtn.innerText = '🎤 OPEN VOICE INPUT';
            if (window.AndroidBridge && typeof window.AndroidBridge.navigateTo === 'function') {
                window.AndroidBridge.navigateTo('voice');
            } else {
                showStatusBanner('Voice capture canceled or unavailable.');
            }
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('listening');
            voiceBtn.innerText = '🎤 OPEN VOICE INPUT';
        };

        recognition.start();
    } else if (window.AndroidBridge && typeof window.AndroidBridge.navigateTo === 'function') {
        window.AndroidBridge.navigateTo('voice');
    } else {
        const manual = prompt('Voice recognition not supported in this browser. Type your spoken bill:', 'Bill is \$85, tax \$6.80, 20% tip, split 4 ways');
        if (manual) {
            applyNaturalLanguageToCalculator(manual);
        }
    }
}

// Called both by Web Speech API and by MainActivity.kt native bridge
function applyNaturalLanguageToCalculator(text) {
    if (!text) return;
    const clean = text.toLowerCase();

    // 1. Parse Tip Percentage (e.g. "18%", "20 percent")
    const tipMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
    if (tipMatch) {
        selectedTipPercent = parseFloat(tipMatch[1]);
    }

    // 2. Parse People Count (e.g. "split 4 ways", "between 5 people", "for 3")
    const pplMatch = clean.match(/(?:split|among|between|for)\s+(\d+)\s*(?:ways|people|persons|guests)?/) ||
                     clean.match(/(\d+)\s+(?:ways|people|persons|guests)/);
    if (pplMatch) {
        document.getElementById('ppl-count').value = Math.max(1, parseInt(pplMatch[1], 10));
    }

    // 3. Parse Tax Amount (e.g. "tax is 6.80", "tax \$7.25")
    const taxMatch = clean.match(/tax(?:es)?\s*(?:is|of|was|:)?\s*\$?\s*(\d+(?:\.\d+)?)/);
    if (taxMatch) {
        document.getElementById('tax-amount').value = parseFloat(taxMatch[1]).toFixed(2);
    }

    // 4. Parse Bill Subtotal (e.g. "bill is 85", "subtotal 120.50", or fallback first dollar figure)
    const billMatch = clean.match(/(?:bill|subtotal|total|check)\s*(?:is|of|was|:)?\s*\$?\s*(\d+(?:\.\d+)?)/) ||
                      clean.match(/\$\s*(\d+(?:\.\d+)?)/) ||
                      clean.match(/^(\d+(?:\.\d+)?)/);
    if (billMatch) {
        document.getElementById('bill-amount').value = parseFloat(billMatch[1]).toFixed(2);
    }

    calculateSplit();
    showStatusBanner(`Applied: "${text}"`);
}

async function runAiAssistant() {
    const promptText = document.getElementById('ai-prompt-input').value.trim();
    const apiKey = document.getElementById('gemini-api-key').value.trim();

    if (apiKey) {
        localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, apiKey);
    }

    if (!promptText) {
        closeModals();
        return;
    }

    if (apiKey) {
        try {
            showStatusBanner('Consulting Gemini AI...');
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Extract dining bill values from this text and return ONLY valid JSON with keys {"bill": number, "tax": number, "tipPercent": number, "people": number}: ${promptText}`
                        }]
                    }]
                })
            });
            const data = await response.json();
            const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (typeof parsed.bill === 'number') document.getElementById('bill-amount').value = parsed.bill.toFixed(2);
                if (typeof parsed.tax === 'number') document.getElementById('tax-amount').value = parsed.tax.toFixed(2);
                if (typeof parsed.tipPercent === 'number') selectedTipPercent = parsed.tipPercent;
                if (typeof parsed.people === 'number') document.getElementById('ppl-count').value = Math.max(1, parsed.people);
                calculateSplit();
                closeModals();
                showStatusBanner('AI parsed and updated your bill!');
                return;
            }
        } catch (err) {
            console.warn('Gemini call failed, falling back to local parser:', err);
        }
    }

    applyNaturalLanguageToCalculator(promptText);
    closeModals();
}

/* ==========================================
   Receipt Scanner (Camera + Gemini Vision / Local Fallback)
   ========================================== */
async function processReceiptImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
    showStatusBanner('Scanning receipt image...');

    if (apiKey) {
        try {
            const base64Data = await fileToBase64(file);
            const mimeType = file.type || 'image/jpeg';
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: 'Read this receipt image and return ONLY valid JSON: {"subtotal": number, "tax": number}. Use 0 if a field is not visible.' },
                            { inline_data: { mime_type: mimeType, data: base64Data } }
                        ]
                    }]
                })
            });
            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.subtotal) document.getElementById('bill-amount').value = Number(parsed.subtotal).toFixed(2);
                if (parsed.tax) document.getElementById('tax-amount').value = Number(parsed.tax).toFixed(2);
                calculateSplit();
                showStatusBanner('Receipt scanned via Gemini Vision!');
                event.target.value = '';
                return;
            }
        } catch (e) {
            console.warn('Receipt vision error:', e);
        }
    }

    const enteredTotal = prompt('Receipt captured! Confirm or enter receipt subtotal (\$):', document.getElementById('bill-amount').value || '64.50');
    if (enteredTotal !== null) {
        const sub = parseFloat(enteredTotal) || 0;
        const estimatedTax = +(sub * 0.0825).toFixed(2);
        document.getElementById('bill-amount').value = sub.toFixed(2);
        if (!document.getElementById('tax-amount').value) {
            document.getElementById('tax-amount').value = estimatedTax.toFixed(2);
        }
        calculateSplit();
        showStatusBanner(`Receipt loaded: $${sub.toFixed(2)} subtotal`);
    }
    event.target.value = '';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            resolve(result.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* ==========================================
   Local History & Payment Handles Persistence
   ========================================== */
function saveCurrentSplit() {
    const state = getDisplayedState();
    if (state.bill <= 0) {
        showStatusBanner('Enter a bill amount before saving.');
        return;
    }

    const history = getLocalHistory();
    history.unshift({
        id: Date.now(),
        date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        bill: state.bill,
        tax: state.tax,
        ppl: state.ppl,
        tipPercent: state.tipPercent,
        totalText: state.totalText,
        eachText: state.eachText
    });

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 25)));
    showStatusBanner('Split saved to history!');
}

function getLocalHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
    } catch {
        return [];
    }
}

function openHistoryModal() {
    const listEl = document.getElementById('history-list');
    const history = getLocalHistory();

    if (history.length === 0) {
        listEl.innerHTML = '<p class="modal-desc" style="text-align:center;">No saved splits yet. Tap "Save to History" after calculating a check.</p>';
    } else {
        listEl.innerHTML = history.map((item, idx) => `
            <div class="history-item" onclick="restoreHistoryItem(${idx})">
                <div>
                    <div><strong>${item.eachText}/ea</strong> (${item.ppl} ppl)</div>
                    <div style="color:#94A3B8; font-size:0.75rem;">${item.date} • Total ${item.totalText}</div>
                </div>
                <span style="color:#D4AF37; font-size:0.8rem;">Load →</span>
            </div>
        `).join('');
    }

    document.getElementById('history-modal').style.display = 'flex';
}

function restoreHistoryItem(index) {
    const history = getLocalHistory();
    const item = history[index];
    if (!item) return;

    document.getElementById('bill-amount').value = Number(item.bill).toFixed(2);
    document.getElementById('tax-amount').value = Number(item.tax).toFixed(2);
    document.getElementById('ppl-count').value = item.ppl;
    selectedTipPercent = item.tipPercent;
    calculateSplit();
    closeModals();
    showStatusBanner('Loaded saved split from history');
}

function clearLocalHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    openHistoryModal();
}

function openNativeHistory() {
    if (window.AndroidBridge && typeof window.AndroidBridge.navigateTo === 'function') {
        window.AndroidBridge.navigateTo('history');
    } else {
        showStatusBanner('Cloud Voice Logs available in the Android app.');
    }
}

function openHandlesModal() {
    const handles = getPaymentHandles();
    document.getElementById('handle-venmo').value = handles.venmo || '';
    document.getElementById('handle-cashapp').value = handles.cashapp || '';
    document.getElementById('handle-paypal').value = handles.paypal || '';
    document.getElementById('handles-modal').style.display = 'flex';
}

function savePaymentHandles() {
    const handles = {
        venmo: document.getElementById('handle-venmo').value.trim(),
        cashapp: document.getElementById('handle-cashapp').value.trim(),
        paypal: document.getElementById('handle-paypal').value.trim()
    };
    localStorage.setItem(STORAGE_KEYS.HANDLES, JSON.stringify(handles));
    closeModals();
    showStatusBanner('Payment handles saved!');
}

function getPaymentHandles() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.HANDLES) || '{}');
    } catch {
        return {};
    }
}

function loadSavedSettings() {
    const savedKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);
    if (savedKey) {
        document.getElementById('gemini-api-key').value = savedKey;
    }
}

function closeModals() {
    clearInterval(adCountdownInterval);
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.style.display = 'none';
    });
}

function showStatusBanner(msg) {
    const banner = document.getElementById('voice-status');
    banner.innerText = msg;
    banner.style.display = 'block';
    clearTimeout(window._tnsBannerTimer);
    window._tnsBannerTimer = setTimeout(() => {
        banner.style.display = 'none';
    }, 4500);
}
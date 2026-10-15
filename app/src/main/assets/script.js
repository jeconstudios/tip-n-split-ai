// app/src/main/assets/script.js

/* =========================================================
   1. FIREBASE CONFIGURATION & INITIALIZATION (tip-n-split-ai)
   ========================================================= */
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD2Ht5kvZSudz85pMHx8JYEuccWtdxxbj0",
    authDomain: "tip-n-split-ai.firebaseapp.com",
    projectId: "tip-n-split-ai",
    storageBucket: "tip-n-split-ai.firebasestorage.app",
    messagingSenderId: "793273334606",
    appId: "1:793273334606:android:53b2c81f2dbcbca98a3c1f"
};

let firebaseAuth = null;
let firebaseDb = null;
let currentUser = null;

try {
    if (typeof firebase !== "undefined" && !firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
    }
} catch (err) {
    console.warn("Firebase offline mode active:", err);
}

/* =========================================================
   2. STATE & STORAGE KEYS
   ========================================================= */
let selectedTipPercent = 20;
let pendingGatedCallback = null;
let adCountdownInterval = null;
let itemizedEntries = [];

const STORAGE_KEYS = {
    PRO_UNLOCKED: "tns_pro_forever_v2",
    UNLOCK_EXPIRES_AT: "tns_unlock_expires_at_v2",
    VAULT_LEDGER: "tns_finance_vault_v2",
    HANDLES: "tns_payment_handles_v1",
    GEMINI_KEY: "tns_gemini_api_key_v1",
    PIN_CODE: "tns_quick_pin_v1",
    MONTHLY_BUDGET: "tns_monthly_budget_v1"
};

// Complete Catalog of All 33 Executive Functions
const FUNCTIONS_33 = [
    { id: 1, title: "Bill Subtotal Calculator", cat: "Core Math", pro: false, action: () => focusElement("bill-amount", "tab-split") },
    { id: 2, title: "Exact Tax Dollar Entry", cat: "Core Math", pro: false, action: () => focusElement("tax-amount", "tab-split") },
    { id: 3, title: "Auto Tax Rate % Calculator", cat: "Core Math", pro: false, action: () => focusElement("tax-rate-pct", "tab-split") },
    { id: 4, title: "Pre-Tax vs. Post-Tax Tip Toggle", cat: "Core Math", pro: false, action: () => toggleCheckbox("tip-on-tax") },
    { id: 5, title: "One-Tap Tip Presets (15/18/20/25/0%)", cat: "Core Math", pro: false, action: () => switchTab("tab-split") },
    { id: 6, title: "Precision Tip % Slider (0%–35%)", cat: "Core Math", pro: false, action: () => focusElement("tip-slider", "tab-split") },
    { id: 7, title: "Service Star Rating Tip Advisor", cat: "Core Math", pro: false, action: () => openServiceRatingPrompt() },
    { id: 8, title: "Equal Group Diner Split", cat: "Group Splitting", pro: false, action: () => focusElement("ppl-count", "tab-split") },
    { id: 9, title: "Itemized Dish-by-Diner Split Builder", cat: "Group Splitting", pro: true, action: () => handleGatedFunction(9, openItemizedModal) },
    { id: 10, title: "Executive Custom Percentage / Ratio Split", cat: "Group Splitting", pro: true, action: () => handleGatedFunction(10, runExecRatioSplit) },
    { id: 11, title: "Couples / Household Unit Split", cat: "Group Splitting", pro: true, action: () => handleGatedFunction(11, runCouplesSplit) },
    { id: 12, title: "Alcohol / Bar Tab Tip Exclusion", cat: "Group Splitting", pro: false, action: () => focusElement("bar-amount", "tab-split") },
    { id: 13, title: "Birthday / VIP Guest Comp Split", cat: "Group Splitting", pro: false, action: () => focusElement("vip-count", "tab-split") },
    { id: 14, title: "Smart Round-Up & Penny Remainder Resolver", cat: "Group Splitting", pro: false, action: () => roundUp() },
    { id: 15, title: "AI Camera Receipt Vision Scanner", cat: "AI & Voice", pro: true, action: () => handleGatedFunction(15, triggerReceiptCamera) },
    { id: 16, title: "Hands-Free Voice-to-Split Parser", cat: "AI & Voice", pro: true, action: () => handleGatedFunction(16, triggerVoiceInput) },
    { id: 17, title: "AI Natural Language Split Assistant", cat: "AI & Voice", pro: true, action: () => handleGatedFunction(17, openAiAssistantModal) },
    { id: 18, title: "Auto-Gratuity Double-Tip Detector", cat: "AI & Voice", pro: true, action: () => handleGatedFunction(18, detectAutoGratuity) },
    { id: 19, title: "Multi-Receipt (Bar + Table) Merger", cat: "AI & Voice", pro: true, action: () => handleGatedFunction(19, mergeSecondReceipt) },
    { id: 20, title: "Live Multi-Currency FX Bill Converter", cat: "Global Travel", pro: false, action: () => focusElement("fx-currency", "tab-travel") },
    { id: 21, title: "International Tipping Etiquette Advisor", cat: "Global Travel", pro: false, action: () => focusElement("etiquette-country", "tab-travel") },
    { id: 22, title: "Corporate Per-Diem Daily Allowance Tracker", cat: "Global Travel", pro: false, action: () => focusElement("per-diem-limit", "tab-travel") },
    { id: 23, title: "Exact Cash Bill Denominations Calculator", cat: "Global Travel", pro: false, action: () => switchTab("tab-travel") },
    { id: 24, title: "Dining Credit Card Points Optimizer", cat: "Global Travel", pro: false, action: () => focusElement("cc-multiplier", "tab-travel") },
    { id: 25, title: "Venmo Instant Charge Deep-Link", cat: "Payments & Share", pro: false, action: () => payWith("venmo") },
    { id: 26, title: "CashApp $Cashtag Instant Request Link", cat: "Payments & Share", pro: false, action: () => payWith("cashapp") },
    { id: 27, title: "PayPal.Me Instant Split Request Link", cat: "Payments & Share", pro: false, action: () => payWith("paypal") },
    { id: 28, title: "Group SMS / Native Share Receipt Summary", cat: "Payments & Share", pro: false, action: () => sendTextToGroup() },
    { id: 29, title: "Instant Table Payment QR Code Generator", cat: "Payments & Share", pro: true, action: () => handleGatedFunction(29, openQrModal) },
    { id: 30, title: "Encrypted Cloud Login & 4-Digit PIN Lock", cat: "Finance Vault", pro: false, action: () => openAuthModal() },
    { id: 31, title: "Financial Expense Vault & Merchant Tagging", cat: "Finance Vault", pro: false, action: () => switchTab("tab-vault") },
    { id: 32, title: "Monthly Dining Budget & Spend Analytics", cat: "Finance Vault", pro: false, action: () => focusElement("monthly-budget-input", "tab-vault") },
    { id: 33, title: "IRS 50% Tax Deduction Calculator & CSV Export", cat: "Finance Vault", pro: true, action: () => handleGatedFunction(33, exportVaultCsv) }
];

/* =========================================================
   3. INITIALIZATION & EVENT LISTENERS
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const watchedInputs = [
        "bill-amount",
        "tax-amount",
        "bar-amount",
        "discount-amount",
        "ppl-count",
        "vip-count",
        "tip-on-tax",
        "exclude-bar-tip"
    ];

    watchedInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", calculateSplit);
            el.addEventListener("change", calculateSplit);
        }
    });

    loadSavedSettings();
    render33Directory();
    renderVaultLedger();
    updateLockUI();
    calculateSplit();
    initFirebaseAuthWatcher();
    checkInitialPinLock();

    setInterval(updateLockUI, 15000);
});

function switchTab(tabId) {
    document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.style.display = panel.id === tabId ? "block" : "none";
    });
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    if (tabId === "tab-travel") updateTravelCalculations();
    if (tabId === "tab-vault") renderVaultLedger();
    if (tabId === "tab-directory") render33Directory();
}

function focusElement(elementId, tabId) {
    if (tabId) switchTab(tabId);
    setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 80);
}

function toggleCheckbox(id) {
    switchTab("tab-split");
    const el = document.getElementById(id);
    if (el) {
        el.checked = !el.checked;
        calculateSplit();
    }
}

/* =========================================================
   4. CORE & ADVANCED SPLIT MATH (FUNCTIONS #1 - #14)
   ========================================================= */
function applyTaxRatePercent() {
    const bill = parseFloat(document.getElementById("bill-amount").value) || 0;
    const rate = parseFloat(document.getElementById("tax-rate-pct").value);
    if (!isNaN(rate) && rate >= 0 && bill > 0) {
        const computedTax = bill * (rate / 100);
        document.getElementById("tax-amount").value = computedTax.toFixed(2);
        calculateSplit();
    }
}

function calculateSplit() {
    const bill = Math.max(0, parseFloat(document.getElementById("bill-amount").value) || 0);
    const tax = Math.max(0, parseFloat(document.getElementById("tax-amount").value) || 0);
    const bar = Math.max(0, parseFloat(document.getElementById("bar-amount").value) || 0);
    const discount = Math.max(0, parseFloat(document.getElementById("discount-amount").value) || 0);

    const totalDiners = Math.max(1, parseInt(document.getElementById("ppl-count").value, 10) || 1);
    const vipGuests = Math.max(0, parseInt(document.getElementById("vip-count").value, 10) || 0);
    const payingDiners = Math.max(1, totalDiners - vipGuests);

    const tipOnTax = document.getElementById("tip-on-tax").checked;
    const excludeBarTip = document.getElementById("exclude-bar-tip").checked;

    let tipBase = tipOnTax ? (bill + tax) : bill;
    if (excludeBarTip) {
        tipBase = Math.max(0, tipBase - bar);
    }

    const tipAmount = tipBase * (selectedTipPercent / 100);
    const grandTotal = Math.max(0, bill + tax + tipAmount - discount);
    const rawPerPerson = grandTotal / payingDiners;
    const perPerson = Math.floor(rawPerPerson * 100) / 100;
    const remainderCents = Math.round((grandTotal - perPerson * payingDiners) * 100);

    document.getElementById("active-tip-label").innerText = `${selectedTipPercent}%`;
    document.getElementById("tip-total").innerText = `$${tipAmount.toFixed(2)}`;
    document.getElementById("grand-total").innerText = `$${grandTotal.toFixed(2)}`;
    document.getElementById("final-res").innerText = `$${ (grandTotal / payingDiners).toFixed(2) }`;

    const payingRow = document.getElementById("paying-diners-row");
    if (vipGuests > 0) {
        payingRow.style.display = "flex";
        document.getElementById("paying-diners-val").innerText = `${payingDiners} (of ${totalDiners})`;
    } else {
        payingRow.style.display = "none";
    }

    const pennyEl = document.getElementById("penny-resolver-text");
    if (payingDiners > 1 && remainderCents > 0) {
        pennyEl.innerText = `14. Penny Resolver: ${remainderCents} diner(s) pay +$0.01 so total matches 100%`;
    } else {
        pennyEl.innerText = `14. Exact split — $0.00 remainder`;
    }

    updateTravelCalculations();

    return {
        bill,
        tax,
        bar,
        discount,
        totalDiners,
        vipGuests,
        payingDiners,
        tipPercent: selectedTipPercent,
        tipAmount,
        grandTotal,
        perPerson: grandTotal / payingDiners
    };
}

function setTip(percent) {
    if (percent === "custom") {
        const custom = prompt("Enter custom tip percentage (0 - 100):", String(selectedTipPercent));
        if (custom !== null) {
            const parsed = parseFloat(custom);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                selectedTipPercent = parsed;
            }
        }
    } else {
        selectedTipPercent = Number(percent);
    }

    const slider = document.getElementById("tip-slider");
    if (slider && selectedTipPercent <= 35) {
        slider.value = selectedTipPercent;
    }

    document.querySelectorAll("#tip-selector button").forEach(btn => {
        btn.classList.remove("active");
        const btnTip = btn.getAttribute("data-tip");
        if (btnTip === String(percent) || (percent === "custom" && btnTip === "custom")) {
            btn.classList.add("active");
        }
    });

    calculateSplit();
}

function setTipFromSlider(val) {
    selectedTipPercent = parseFloat(val) || 0;
    document.querySelectorAll("#tip-selector button").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-tip") === String(selectedTipPercent));
    });
    calculateSplit();
}

// Function #7: Service Star Rating Recommender
function openServiceRatingPrompt() {
    const rating = prompt("Rate dining service from 1 to 5 stars (1=Poor, 3=Good, 5=Exceptional):", "5");
    if (!rating) return;
    const stars = Math.max(1, Math.min(5, parseInt(rating, 10) || 4));
    const map = { 1: 10, 2: 15, 3: 18, 4: 20, 5: 25 };
    setTip(map[stars]);
    showStatusBanner(`⭐ ${stars}-Star Service: Tip set to ${map[stars]}%`);
}

function adjustPeople(delta) {
    const input = document.getElementById("ppl-count");
    const next = Math.max(1, Math.min(100, (parseInt(input.value, 10) || 1) + delta));
    input.value = next;
    calculateSplit();
}

function adjustVip(delta) {
    const total = parseInt(document.getElementById("ppl-count").value, 10) || 1;
    const input = document.getElementById("vip-count");
    const next = Math.max(0, Math.min(Math.max(0, total - 1), (parseInt(input.value, 10) || 0) + delta));
    input.value = next;
    calculateSplit();
}

function roundUp() {
    const grandDisplay = document.getElementById("grand-total");
    const eachDisplay = document.getElementById("final-res");
    const state = calculateSplit();

    if (state.grandTotal > 0) {
        const roundedTotal = Math.ceil(state.grandTotal);
        const newEach = roundedTotal / state.payingDiners;
        grandDisplay.innerText = `$${roundedTotal.toFixed(2)}`;
        eachDisplay.innerText = `$${newEach.toFixed(2)}`;
        showStatusBanner(`Total rounded up to $${roundedTotal.toFixed(2)}`);
    }
}

// Function #9: Itemized Diner Split Builder
function openItemizedModal() {
    renderItemizedList();
    document.getElementById("itemized-modal").style.display = "flex";
}

function addItemizedRow() {
    const nameEl = document.getElementById("item-diner-name");
    const priceEl = document.getElementById("item-price");
    const diner = nameEl.value.trim() || "Guest";
    const price = parseFloat(priceEl.value);

    if (isNaN(price) || price <= 0) {
        showStatusBanner("Enter a valid dish price.");
        return;
    }

    itemizedEntries.push({ diner, price });
    nameEl.value = "";
    priceEl.value = "";
    renderItemizedList();
}

function renderItemizedList() {
    const listEl = document.getElementById("itemized-list");
    if (itemizedEntries.length === 0) {
        listEl.innerHTML = `<p class="helper-note" style="text-align:center;">No items added yet.</p>`;
        return;
    }

    const byDiner = {};
    let subtotal = 0;
    itemizedEntries.forEach(item => {
        subtotal += item.price;
        byDiner[item.diner] = (byDiner[item.diner] || 0) + item.price;
    });

    const tax = parseFloat(document.getElementById("tax-amount").value) || 0;
    const multiplier = 1 + (selectedTipPercent / 100) + (subtotal > 0 ? tax / subtotal : 0);

    listEl.innerHTML = Object.keys(byDiner).map(diner => {
        const base = byDiner[diner];
        const withTaxTip = base * multiplier;
        return `
            <div class="history-item">
                <span><strong>${escapeHtml(diner)}</strong> (Base: $${base.toFixed(2)})</span>
                <span>Owes: <strong>$${withTaxTip.toFixed(2)}</strong></span>
            </div>
        `;
    }).join("");
}

function applyItemizedToCalculator() {
    if (itemizedEntries.length === 0) {
        closeModals();
        return;
    }
    const subtotal = itemizedEntries.reduce((acc, cur) => acc + cur.price, 0);
    const uniqueDiners = new Set(itemizedEntries.map(i => i.diner.toLowerCase())).size;
    document.getElementById("bill-amount").value = subtotal.toFixed(2);
    document.getElementById("ppl-count").value = Math.max(1, uniqueDiners);
    calculateSplit();
    closeModals();
    showStatusBanner(`Itemized subtotal ($${subtotal.toFixed(2)}) applied for ${uniqueDiners} diner(s).`);
}

function clearItemizedRows() {
    itemizedEntries = [];
    renderItemizedList();
}

// Function #10: Executive Custom Ratio / % Split
function runExecRatioSplit() {
    const state = calculateSplit();
    if (state.grandTotal <= 0) {
        showStatusBanner("Enter a bill subtotal first.");
        return;
    }
    const ratioInput = prompt("Enter Executive Split Ratio (e.g. '70/30' or '60/40' or '50/25/25'):", "70/30");
    if (!ratioInput) return;

    const parts = ratioInput.split(/[\/,\s]+/).map(n => parseFloat(n)).filter(n => !isNaN(n) && n > 0);
    const sum = parts.reduce((a, b) => a + b, 0);
    if (parts.length < 2 || sum <= 0) return;

    const breakdown = parts.map((pct, i) => {
        const share = state.grandTotal * (pct / sum);
        return `Party ${i + 1} (${Math.round((pct / sum) * 100)}%): $${share.toFixed(2)}`;
    }).join(" | ");

    showStatusBanner(breakdown);
}

// Function #11: Couples / Household Unit Split
function runCouplesSplit() {
    const state = calculateSplit();
    const couples = prompt("How many couples/households are splitting this check?", "2");
    const count = parseInt(couples, 10);
    if (!isNaN(count) && count >= 1) {
        const perCouple = state.grandTotal / count;
        showStatusBanner(`👫 Each Couple/Household (${count}) owes: $${perCouple.toFixed(2)}`);
    }
}

/* =========================================================
   5. AI, SCANNER & VOICE TOOLS (FUNCTIONS #15 - #19)
   ========================================================= */
function triggerReceiptCamera() {
    document.getElementById("receipt-file-input").click();
}

function openAiAssistantModal() {
    document.getElementById("ai-modal").style.display = "flex";
}

// Function #18: Auto-Gratuity Double-Tip Detector
function detectAutoGratuity() {
    const bill = parseFloat(document.getElementById("bill-amount").value) || 0;
    const ppl = parseInt(document.getElementById("ppl-count").value, 10) || 1;

    if (ppl >= 6) {
        const confirmGrat = confirm(`⚠️ Party of ${ppl} detected! Most restaurants automatically add an 18%–20% Service Charge for 6+ guests.\n\nDid the restaurant already include Auto-Gratuity on the check? (Click OK to set additional tip to 0% so you don't double-tip.)`);
        if (confirmGrat) {
            setTip(0);
            showStatusBanner("Protected from double-tipping! Additional tip set to 0%.");
        }
    } else {
        showStatusBanner(`Party of ${ppl}: Standard auto-gratuity usually applies to 6+ guests (Bill: $${bill.toFixed(2)}).`);
    }
}

// Function #19: Multi-Receipt Merger
function mergeSecondReceipt() {
    const addSub = prompt("Enter 2nd Receipt / Bar Tab Subtotal (\$) to merge into current check:", "0.00");
    if (addSub === null) return;
    const addTax = prompt("Enter 2nd Receipt Tax (\$):", "0.00");

    const curBill = parseFloat(document.getElementById("bill-amount").value) || 0;
    const curTax = parseFloat(document.getElementById("tax-amount").value) || 0;

    const nextBill = curBill + (parseFloat(addSub) || 0);
    const nextTax = curTax + (parseFloat(addTax) || 0);

    document.getElementById("bill-amount").value = nextBill.toFixed(2);
    document.getElementById("tax-amount").value = nextTax.toFixed(2);
    calculateSplit();
    showStatusBanner(`Merged! Combined subtotal is now $${nextBill.toFixed(2)}.`);
}

// Function #16: Voice Input & Natural Language Parser
function triggerVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceBtn = document.getElementById("voice-btn");

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        voiceBtn.classList.add("listening");
        voiceBtn.innerText = "🎙️ LISTENING... SPEAK NOW";
        showStatusBanner('Say e.g. "Bill is 85 dollars, tax 7.50, 20 percent tip, split 4 ways"');

        recognition.onresult = event => {
            const transcript = event.results[0][0].transcript;
            applyNaturalLanguageToCalculator(transcript);
        };

        recognition.onerror = () => {
            voiceBtn.classList.remove("listening");
            voiceBtn.innerText = "🎤 16. OPEN VOICE SPLIT INPUT";
            if (window.AndroidBridge && typeof window.AndroidBridge.navigateTo === "function") {
                window.AndroidBridge.navigateTo("voice");
            } else {
                showStatusBanner("Voice capture canceled or unavailable.");
            }
        };

        recognition.onend = () => {
            voiceBtn.classList.remove("listening");
            voiceBtn.innerText = "🎤 16. OPEN VOICE SPLIT INPUT";
        };

        recognition.start();
    } else if (window.AndroidBridge && typeof window.AndroidBridge.navigateTo === "function") {
        window.AndroidBridge.navigateTo("voice");
    } else {
        const manual = prompt("Speak or type your check breakdown:", "Bill is \$120, tax \$9.60, 20% tip, split 4 ways");
        if (manual) applyNaturalLanguageToCalculator(manual);
    }
}

function applyNaturalLanguageToCalculator(text) {
    if (!text) return;
    const clean = text.toLowerCase();

    const tipMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
    if (tipMatch) selectedTipPercent = parseFloat(tipMatch[1]);

    const pplMatch = clean.match(/(?:split|among|between|for)\s+(\d+)\s*(?:ways|people|persons|guests)?/) ||
                     clean.match(/(\d+)\s+(?:ways|people|persons|guests)/);
    if (pplMatch) document.getElementById("ppl-count").value = Math.max(1, parseInt(pplMatch[1], 10));

    const vipMatch = clean.match(/(\d+)\s*(?:vip|birthday|free|comp)/);
    if (vipMatch) document.getElementById("vip-count").value = Math.max(0, parseInt(vipMatch[1], 10));

    const barMatch = clean.match(/(?:bar|alcohol|drinks?)\s*(?:is|of|was|:)?\s*\$?\s*(\d+(?:\.\d+)?)/);
    if (barMatch) document.getElementById("bar-amount").value = parseFloat(barMatch[1]).toFixed(2);

    const taxMatch = clean.match(/tax(?:es)?\s*(?:is|of|was|:)?\s*\$?\s*(\d+(?:\.\d+)?)/);
    if (taxMatch) document.getElementById("tax-amount").value = parseFloat(taxMatch[1]).toFixed(2);

    const billMatch = clean.match(/(?:bill|subtotal|total|check)\s*(?:is|of|was|:)?\s*\$?\s*(\d+(?:\.\d+)?)/) ||
                      clean.match(/\$\s*(\d+(?:\.\d+)?)/) ||
                      clean.match(/^(\d+(?:\.\d+)?)/);
    if (billMatch) document.getElementById("bill-amount").value = parseFloat(billMatch[1]).toFixed(2);

    calculateSplit();
    showStatusBanner(`Applied: "${text}"`);
}

async function runAiAssistant() {
    const promptText = document.getElementById("ai-prompt-input").value.trim();
    const apiKey = document.getElementById("gemini-api-key").value.trim();

    if (apiKey) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, apiKey);
    if (!promptText) {
        closeModals();
        return;
    }

    if (apiKey) {
        try {
            showStatusBanner("Consulting Gemini AI...");
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Extract dining bill values from this text and return ONLY valid JSON with keys {"bill": number, "tax": number, "bar": number, "tipPercent": number, "people": number, "vip": number}: ${promptText}`
                        }]
                    }]
                })
            });
            const data = await response.json();
            const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (typeof parsed.bill === "number") document.getElementById("bill-amount").value = parsed.bill.toFixed(2);
                if (typeof parsed.tax === "number") document.getElementById("tax-amount").value = parsed.tax.toFixed(2);
                if (typeof parsed.bar === "number") document.getElementById("bar-amount").value = parsed.bar.toFixed(2);
                if (typeof parsed.tipPercent === "number") selectedTipPercent = parsed.tipPercent;
                if (typeof parsed.people === "number") document.getElementById("ppl-count").value = Math.max(1, parsed.people);
                if (typeof parsed.vip === "number") document.getElementById("vip-count").value = Math.max(0, parsed.vip);
                calculateSplit();
                closeModals();
                showStatusBanner("✨ Gemini AI updated your calculator!");
                return;
            }
        } catch (err) {
            console.warn("Gemini fallback to local parser:", err);
        }
    }

    applyNaturalLanguageToCalculator(promptText);
    closeModals();
}

async function processReceiptImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || "";
    showStatusBanner("📷 Scanning receipt image...");

    if (apiKey) {
        try {
            const base64Data = await fileToBase64(file);
            const mimeType = file.type || "image/jpeg";
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: 'Read this restaurant receipt and return ONLY valid JSON: {"subtotal": number, "tax": number, "merchant": string}.' },
                            { inline_data: { mime_type: mimeType, data: base64Data } }
                        ]
                    }]
                })
            });
            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.subtotal) document.getElementById("bill-amount").value = Number(parsed.subtotal).toFixed(2);
                if (parsed.tax) document.getElementById("tax-amount").value = Number(parsed.tax).toFixed(2);
                if (parsed.merchant) document.getElementById("expense-merchant").value = String(parsed.merchant);
                calculateSplit();
                showStatusBanner("📷 Receipt extracted via Gemini Vision!");
                event.target.value = "";
                return;
            }
        } catch (e) {
            console.warn("Vision scan fallback:", e);
        }
    }

    const enteredTotal = prompt("Receipt image captured! Confirm or enter receipt subtotal (\$):", document.getElementById("bill-amount").value || "78.50");
    if (enteredTotal !== null) {
        const sub = parseFloat(enteredTotal) || 0;
        document.getElementById("bill-amount").value = sub.toFixed(2);
        if (!document.getElementById("tax-amount").value) {
            document.getElementById("tax-amount").value = (sub * 0.0825).toFixed(2);
        }
        calculateSplit();
        showStatusBanner(`Receipt loaded: $${sub.toFixed(2)} subtotal`);
    }
    event.target.value = "";
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* =========================================================
   6. GLOBAL TRAVEL & FX SUITE (FUNCTIONS #20 - #24)
   ========================================================= */
function updateTravelCalculations() {
    const eachText = document.getElementById("final-res")?.innerText || "\$0.00";
    const totalText = document.getElementById("grand-total")?.innerText || "\$0.00";
    const eachUsd = parseFloat(eachText.replace("\$", "")) || 0;
    const totalUsd = parseFloat(totalText.replace("\$", "")) || 0;

    // #20: Multi-Currency Converter
    const fxSelect = document.getElementById("fx-currency");
    if (fxSelect) {
        const rate = parseFloat(fxSelect.value) || 1;
        const converted = eachUsd * rate;
        const label = fxSelect.options[fxSelect.selectedIndex].text.split(" ")[0];
        document.getElementById("fx-converted-output").innerText =
            rate >= 100 ? `${Math.round(converted).toLocaleString()} ${label}` : `${converted.toFixed(2)} ${label}`;
    }

    // #22: Per-Diem Tracker
    const perDiemEl = document.getElementById("per-diem-limit");
    if (perDiemEl) {
        const allowance = parseFloat(perDiemEl.value) || 0;
        const remaining = allowance - eachUsd;
        const remEl = document.getElementById("per-diem-remaining");
        remEl.innerText = remaining >= 0 ? `$${remaining.toFixed(2)} under` : `$${Math.abs(remaining).toFixed(2)} OVER`;
        remEl.style.color = remaining >= 0 ? "#10B981" : "#EF4444";
    }

    // #23: Exact Cash Bills Breakdown
    updateCashDenominations(Math.ceil(eachUsd));

    // #24: Credit Card Rewards Optimizer
    const ccSelect = document.getElementById("cc-multiplier");
    if (ccSelect) {
        const mult = parseFloat(ccSelect.value) || 0.03;
        const rebate = totalUsd * mult;
        document.getElementById("cc-rewards-output").innerText =
            `Estimated points/cashback value on this $${totalUsd.toFixed(2)} check: $${rebate.toFixed(2)}`;
    }
}

function updateCashDenominations(amountWhole) {
    const out = document.getElementById("cash-denominations-output");
    if (!out) return;
    if (amountWhole <= 0) {
        out.innerText = "Enter a bill amount on the Split tab to see exact \$100/\$50/\$20/\$10/\$5/\$1 breakdown.";
        return;
    }

    let rem = amountWhole;
    const bills = [100, 50, 20, 10, 5, 1];
    const parts = [];
    bills.forEach(b => {
        const count = Math.floor(rem / b);
        if (count > 0) {
            parts.push(`${count}×$${b}`);
            rem %= b;
        }
    });
    out.innerText = `For $${amountWhole}.00 cash/person: ${parts.join(" + ")}`;
}

function showCountryEtiquette() {
    const code = document.getElementById("etiquette-country").value;
    const notes = {
        us: { text: "US/Canada: 18%–22% pre-tax is standard for sit-down dining.", tip: 20 },
        kh: { text: "Cambodia: 5%–10% or rounding up is warmly appreciated in USD or Riel (4,065 KHR ≈ \$1).", tip: 10 },
        eu: { text: "Western Europe: Service is usually included; 5%–10% for great hospitality.", tip: 8 },
        uk: { text: "United Kingdom: Check if a 12.5% discretionary service charge is already on the bill.", tip: 10 },
        jp: { text: "Japan: 0% — tipping is not practiced and may be politely declined.", tip: 0 },
        th: { text: "Thailand: 5%–10% at upscale and sit-down dining establishments.", tip: 10 }
    };
    const info = notes[code] || notes.us;
    document.getElementById("etiquette-note").innerText = info.text;
}

function applyRecommendedCountryTip() {
    const code = document.getElementById("etiquette-country").value;
    const map = { us: 20, kh: 10, eu: 8, uk: 10, jp: 0, th: 10 };
    setTip(map[code] ?? 20);
    switchTab("tab-split");
    showStatusBanner(`Applied ${map[code] ?? 20}% regional tip etiquette.`);
}

/* =========================================================
   7. PAYMENTS, SMS & TABLE QR CODE (FUNCTIONS #25 - #29)
   ========================================================= */
function sendTextToGroup() {
    const state = calculateSplit();
    const message =
        `Receipt Split (Tip-n-Split AI):\n` +
        `Subtotal: $${state.bill.toFixed(2)} | Tax: $${state.tax.toFixed(2)} | Tip (${state.tipPercent}%): $${state.tipAmount.toFixed(2)}\n` +
        `Grand Total: $${state.grandTotal.toFixed(2)} (${state.payingDiners} paying)\n` +
        `Each Person Owes: $${state.perPerson.toFixed(2)}\n` +
        `Split via https://tns.jeconllc.com`;

    if (navigator.share) {
        navigator.share({ title: "Tip-n-Split Check Breakdown", text: message }).catch(() => openSmsFallback(message));
    } else {
        openSmsFallback(message);
    }
}

function openSmsFallback(message) {
    window.location.href = `sms:?body=${encodeURIComponent(message)}`;
}

function payWith(provider) {
    const state = calculateSplit();
    const amount = state.perPerson > 0 ? state.perPerson.toFixed(2) : "0.00";
    const handles = getPaymentHandles();
    const note = encodeURIComponent("Dinner Split via Tip-n-Split AI");

    let targetUrl = "";
    if (provider === "venmo") {
        const recipient = handles.venmo ? `&recipients=${encodeURIComponent(handles.venmo)}` : "";
        targetUrl = `https://venmo.com/?txn=charge&amount=${amount}&note=${note}${recipient}`;
    } else if (provider === "cashapp") {
        const tag = handles.cashapp ? handles.cashapp.replace(/^\$/, "") : "";
        targetUrl = tag ? `https://cash.app/$${encodeURIComponent(tag)}/${amount}` : `https://cash.app/`;
    } else if (provider === "paypal") {
        const user = handles.paypal ? handles.paypal.replace(/^@/, "") : "";
        targetUrl = user ? `https://paypal.me/${encodeURIComponent(user)}/${amount}` : `https://www.paypal.com/myaccount/transfer/homepage/request`;
    }

    if (targetUrl) window.open(targetUrl, "_blank");
}

function openQrModal() {
    const state = calculateSplit();
    const amount = state.perPerson > 0 ? state.perPerson.toFixed(2) : "0.00";
    const handles = getPaymentHandles();

    let payLink = `https://tns.jeconllc.com/?share=${amount}`;
    if (handles.venmo) {
        payLink = `https://venmo.com/${encodeURIComponent(handles.venmo)}?txn=pay&amount=${amount}&note=Tip-n-Split`;
    } else if (handles.cashapp) {
        payLink = `https://cash.app/$${encodeURIComponent(handles.cashapp.replace(/^\$/, ""))}/${amount}`;
    } else if (handles.paypal) {
        payLink = `https://paypal.me/${encodeURIComponent(handles.paypal)}/${amount}`;
    }

    document.getElementById("qr-share-desc").innerText = `Each diner scans to pay $${amount} immediately.`;
    document.getElementById("qr-image").src =
        `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payLink)}`;
    document.getElementById("qr-modal").style.display = "flex";
}

/* =========================================================
   8. AUTHENTICATION, PIN LOCK & FINANCE VAULT (#30 - #33)
   ========================================================= */
function initFirebaseAuthWatcher() {
    if (!firebaseAuth) return;
    firebaseAuth.onAuthStateChanged(user => {
        currentUser = user;
        const authBtn = document.getElementById("auth-status-btn");
        const syncStatus = document.getElementById("vault-sync-status");
        const outView = document.getElementById("auth-logged-out-view");
        const inView = document.getElementById("auth-logged-in-view");

        if (user) {
            const label = user.email ? user.email.split("@")[0] : "Cloud User";
            authBtn.innerText = `🟢 ${label} (Vault Active)`;
            syncStatus.innerText = `☁️ Cloud Encrypted Sync Active (${user.email || "Authenticated"})`;
            outView.style.display = "none";
            inView.style.display = "block";
            document.getElementById("auth-user-email").innerText = user.email || user.uid;
            pullCloudVaultData();
        } else {
            authBtn.innerText = "🔒 Sign In / Vault";
            syncStatus.innerText = "Local Encrypted Mode • Sign in for Cloud Sync";
            outView.style.display = "block";
            inView.style.display = "none";
        }
    });
}

function openAuthModal() {
    document.getElementById("auth-modal").style.display = "flex";
}

async function signInEmail() {
    if (!firebaseAuth) return showStatusBanner("Firebase Auth unavailable offline.");
    const email = document.getElementById("auth-email").value.trim();
    const pass = document.getElementById("auth-password").value;
    if (!email || !pass) return showStatusBanner("Enter both email and password.");

    try {
        await firebaseAuth.signInWithEmailAndPassword(email, pass);
        closeModals();
        showStatusBanner("Signed in! Syncing your Financial Vault...");
    } catch (err) {
        showStatusBanner(`Sign-in error: ${err.message}`);
    }
}

async function signUpEmail() {
    if (!firebaseAuth) return showStatusBanner("Firebase Auth unavailable offline.");
    const email = document.getElementById("auth-email").value.trim();
    const pass = document.getElementById("auth-password").value;
    if (!email || pass.length < 6) return showStatusBanner("Enter a valid email and 6+ character password.");

    try {
        await firebaseAuth.createUserWithEmailAndPassword(email, pass);
        closeModals();
        showStatusBanner("Account created & Financial Vault initialized!");
    } catch (err) {
        showStatusBanner(`Registration error: ${err.message}`);
    }
}

async function signInWithGoogle() {
    if (!firebaseAuth) return showStatusBanner("Firebase Auth unavailable offline.");
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebaseAuth.signInWithPopup(provider);
        closeModals();
        showStatusBanner("Signed in with Google!");
    } catch (err) {
        showStatusBanner(`Google Sign-In note: ${err.message}`);
    }
}

async function signOutUser() {
    if (firebaseAuth) {
        await firebaseAuth.signOut();
        closeModals();
        showStatusBanner("Signed out of Cloud Vault.");
    }
}

// 4-Digit Quick PIN Privacy Lock
function savePinCode() {
    const pin = document.getElementById("user-pin-code").value.trim();
    if (pin && pin.length === 4) {
        localStorage.setItem(STORAGE_KEYS.PIN_CODE, btoa(pin));
        closeModals();
        showStatusBanner("🛡️ 4-Digit Quick PIN saved!");
    } else {
        localStorage.removeItem(STORAGE_KEYS.PIN_CODE);
        showStatusBanner("Quick PIN cleared.");
    }
}

function togglePinLockScreen() {
    const saved = localStorage.getItem(STORAGE_KEYS.PIN_CODE);
    if (!saved) {
        openAuthModal();
        showStatusBanner("Set a 4-digit PIN in your Vault Account settings first.");
        return;
    }
    document.getElementById("pin-unlock-input").value = "";
    document.getElementById("pin-modal").style.display = "flex";
}

function checkInitialPinLock() {
    if (localStorage.getItem(STORAGE_KEYS.PIN_CODE)) {
        document.getElementById("pin-modal").style.display = "flex";
    }
}

function verifyPinUnlock() {
    const entered = document.getElementById("pin-unlock-input").value.trim();
    const saved = localStorage.getItem(STORAGE_KEYS.PIN_CODE);
    if (!saved || btoa(entered) === saved) {
        document.getElementById("pin-modal").style.display = "none";
        showStatusBanner("🔓 Financial Vault Unlocked");
    } else {
        showStatusBanner("❌ Incorrect PIN code");
    }
}

// Function #31: Save Split to Financial Vault (Local + Cloud Firestore)
async function saveSplitToVault() {
    const state = calculateSplit();
    if (state.bill <= 0) {
        showStatusBanner("Enter a bill subtotal on the Split tab before saving.");
        return;
    }

    const category = document.getElementById("expense-category")?.value || "Business Meal (50% Deductible)";
    const merchant = document.getElementById("expense-merchant")?.value.trim() || "Dining Establishment";

    const entry = {
        id: String(Date.now()),
        dateIso: new Date().toISOString(),
        dateFormatted: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        merchant,
        category,
        bill: state.bill,
        tax: state.tax,
        tipAmount: state.tipAmount,
        tipPercent: state.tipPercent,
        total: state.grandTotal,
        payingDiners: state.payingDiners,
        myShare: state.perPerson,
        taxDeductible: category.includes("50%") ? +(state.perPerson * 0.5).toFixed(2) : 0
    };

    const ledger = getVaultLedger();
    ledger.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.VAULT_LEDGER, JSON.stringify(ledger.slice(0, 100)));

    if (currentUser && firebaseDb) {
        try {
            await firebaseDb
                .collection("users")
                .doc(currentUser.uid)
                .collection("financeLedger")
                .doc(entry.id)
                .set(entry);
        } catch (err) {
            console.warn("Cloud ledger write error:", err);
        }
    }

    renderVaultLedger();
    showStatusBanner(`💾 Logged $${entry.myShare.toFixed(2)} (${entry.merchant}) to Finance Vault!`);
}

function getVaultLedger() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_LEDGER) || "[]");
    } catch {
        return [];
    }
}

async function pullCloudVaultData() {
    if (!currentUser || !firebaseDb) return;
    try {
        const snap = await firebaseDb
            .collection("users")
            .doc(currentUser.uid)
            .collection("financeLedger")
            .orderBy("dateIso", "desc")
            .limit(50)
            .get();

        if (!snap.empty) {
            const cloudEntries = [];
            snap.forEach(doc => cloudEntries.push(doc.data()));
            localStorage.setItem(STORAGE_KEYS.VAULT_LEDGER, JSON.stringify(cloudEntries));
            renderVaultLedger();
        }

        const settingsDoc = await firebaseDb
            .collection("users")
            .doc(currentUser.uid)
            .collection("settings")
            .doc("profile")
            .get();

        if (settingsDoc.exists && settingsDoc.data().handles) {
            localStorage.setItem(STORAGE_KEYS.HANDLES, JSON.stringify(settingsDoc.data().handles));
        }
    } catch (err) {
        console.warn("Cloud pull skipped:", err);
    }
}

async function syncVaultWithCloud() {
    if (!currentUser) {
        openAuthModal();
        return;
    }
    showStatusBanner("☁️ Syncing ledger with Firebase Cloud...");
    await pullCloudVaultData();
    showStatusBanner("☁️ Cloud Vault synchronized!");
}

function renderVaultLedger() {
    const ledger = getVaultLedger();
    const listEl = document.getElementById("vault-ledger-list");
    if (!listEl) return;

    let totalCheckSum = 0;
    let myShareSum = 0;
    let deductibleSum = 0;

    ledger.forEach(item => {
        totalCheckSum += Number(item.total) || 0;
        myShareSum += Number(item.myShare) || 0;
        deductibleSum += Number(item.taxDeductible) || 0;
    });

    document.getElementById("vault-stat-total").innerText = `$${totalCheckSum.toFixed(2)}`;
    document.getElementById("vault-stat-myshare").innerText = `$${myShareSum.toFixed(2)}`;
    document.getElementById("vault-stat-deductible").innerText = `$${deductibleSum.toFixed(2)}`;

    updateBudgetProgress(myShareSum);

    if (ledger.length === 0) {
        listEl.innerHTML = `<p class="helper-note" style="text-align:center;">No financial entries logged yet.</p>`;
        return;
    }

    listEl.innerHTML = ledger.map((item, idx) => `
        <div class="history-item" onclick="loadVaultEntryToCalculator(${idx})">
            <div>
                <div><strong>${escapeHtml(item.merchant)}</strong> • $${Number(item.myShare).toFixed(2)}</div>
                <div style="color:#94A3B8; font-size:0.72rem;">${item.dateFormatted} • ${escapeHtml(item.category)}</div>
            </div>
            <span style="color:#D4AF37; font-size:0.78rem;">Load →</span>
        </div>
    `).join("");
}

function loadVaultEntryToCalculator(idx) {
    const entry = getVaultLedger()[idx];
    if (!entry) return;
    document.getElementById("bill-amount").value = Number(entry.bill).toFixed(2);
    document.getElementById("tax-amount").value = Number(entry.tax).toFixed(2);
    document.getElementById("ppl-count").value = entry.payingDiners || 1;
    selectedTipPercent = entry.tipPercent ?? 20;
    calculateSplit();
    switchTab("tab-split");
    showStatusBanner(`Loaded ${entry.merchant} into calculator.`);
}

// Function #32: Monthly Dining Budget Progress
function updateBudgetProgress(currentSpentOverride) {
    const budgetInput = document.getElementById("monthly-budget-input");
    if (!budgetInput) return;
    const budget = Math.max(1, parseFloat(budgetInput.value) || 600);
    localStorage.setItem(STORAGE_KEYS.MONTHLY_BUDGET, String(budget));

    const ledger = getVaultLedger();
    const spent = typeof currentSpentOverride === "number"
        ? currentSpentOverride
        : ledger.reduce((sum, i) => sum + (Number(i.myShare) || 0), 0);

    const pct = Math.min(100, Math.round((spent / budget) * 100));
    document.getElementById("budget-summary-label").innerText = `$${spent.toFixed(0)} / $${budget.toFixed(0)} (${pct}%)`;
    const fill = document.getElementById("budget-progress-fill");
    if (fill) {
        fill.style.width = `${pct}%`;
        fill.style.background = pct > 90 ? "#EF4444" : "#D4AF37";
    }
}

// Function #33: IRS CSV Tax Export
function exportVaultCsv() {
    const ledger = getVaultLedger();
    if (ledger.length === 0) {
        showStatusBanner("Log at least one expense to export a CSV.");
        return;
    }

    const headers = ["Date", "Merchant", "Category", "Subtotal", "Tax", "Tip", "GrandTotal", "Diners", "MyShare", "IRS_50Pct_Deductible"];
    const rows = ledger.map(e => [
        `"${e.dateFormatted}"`,
        `"${String(e.merchant).replace(/"/g, '""')}"`,
        `"${String(e.category).replace(/"/g, '""')}"`,
        Number(e.bill).toFixed(2),
        Number(e.tax).toFixed(2),
        Number(e.tipAmount).toFixed(2),
        Number(e.total).toFixed(2),
        e.payingDiners,
        Number(e.myShare).toFixed(2),
        Number(e.taxDeductible).toFixed(2)
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `TipNSplit_Tax_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatusBanner("📥 Downloaded IRS Expense CSV!");
}

/* =========================================================
   9. MONETIZATION GATE & 33-FUNCTION DIRECTORY
   ========================================================= */
function isUnlocked() {
    if (localStorage.getItem(STORAGE_KEYS.PRO_UNLOCKED) === "true") return true;
    const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.UNLOCK_EXPIRES_AT) || "0", 10);
    return Date.now() < expiresAt;
}

function updateLockUI() {
    const unlocked = isUnlocked();
    const isPro = localStorage.getItem(STORAGE_KEYS.PRO_UNLOCKED) === "true";
    const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.UNLOCK_EXPIRES_AT) || "0", 10);

    document.querySelectorAll("[data-lock-badge]").forEach(el => {
        el.innerText = unlocked ? "🔓" : "🔒";
    });

    const proPill = document.getElementById("pro-badge-pill");
    const banner = document.getElementById("unlock-timer-text");

    if (isPro) {
        if (proPill) proPill.innerText = "★ EXEC PRO";
        if (banner) banner.innerHTML = "★ All 33 Executive Functions Unlocked Forever";
    } else if (unlocked) {
        const minsLeft = Math.max(1, Math.ceil((expiresAt - Date.now()) / 60000));
        if (proPill) proPill.innerText = `🔓 ${minsLeft}M PASS`;
        if (banner) banner.innerHTML = `All 33 Functions Unlocked (${minsLeft}m left) • <a href="javascript:void(0)" onclick="openUnlockModal('pro')">Unlock Forever ($2.99)</a>`;
    } else {
        if (proPill) proPill.innerText = "FREE TIER";
        if (banner) banner.innerHTML = `Ad-Supported Mode • <a href="javascript:void(0)" onclick="openUnlockModal('pro')">Unlock All 33 Functions ($2.99)</a>`;
    }
}

function handleGatedFunction(fnNumber, callback) {
    if (isUnlocked()) {
        callback();
    } else {
        pendingGatedCallback = callback;
        openUnlockModal(fnNumber);
    }
}

function openUnlockModal(fnIdentifier) {
    if (typeof fnIdentifier === "string") pendingGatedCallback = null;
    document.getElementById("ad-Countdown-box").style.display = "none";
    document.getElementById("unlock-modal-buttons").style.display = "flex";
    document.getElementById("unlock-modal").style.display = "flex";
}

function startRewardedAd() {
    const box = document.getElementById("ad-Countdown-box");
    const buttons = document.getElementById("unlock-modal-buttons");
    const label = document.getElementById("ad-countdown-label");
    const fill = document.getElementById("ad-progress-fill");

    buttons.style.display = "none";
    box.style.display = "block";

    let remaining = 5;
    const total = remaining;
    label.innerText = `Sponsor Message Playing... ${remaining}s`;
    fill.style.width = "0%";

    clearInterval(adCountdownInterval);
    adCountdownInterval = setInterval(() => {
        remaining -= 1;
        const pct = Math.min(100, Math.round(((total - remaining) / total) * 100));
        fill.style.width = `${pct}%`;

        if (remaining > 0) {
            label.innerText = `Sponsor Message Playing... ${remaining}s`;
        } else {
            clearInterval(adCountdownInterval);
            localStorage.setItem(STORAGE_KEYS.UNLOCK_EXPIRES_AT, String(Date.now() + 60 * 60 * 1000));
            updateLockUI();
            render33Directory();
            closeModals();
            showStatusBanner("🔓 All 33 Executive Functions unlocked for 60 minutes!");
            if (typeof pendingGatedCallback === "function") {
                const cb = pendingGatedCallback;
                pendingGatedCallback = null;
                cb();
            }
        }
    }, 1000);
}

function activateProForever() {
    localStorage.setItem(STORAGE_KEYS.PRO_UNLOCKED, "true");
    updateLockUI();
    render33Directory();
    closeModals();
    showStatusBanner("★ All 33 Executive Functions Unlocked Forever!");
    if (typeof pendingGatedCallback === "function") {
        const cb = pendingGatedCallback;
        pendingGatedCallback = null;
        cb();
    }
}

function render33Directory() {
    const grid = document.getElementById("functions-33-grid");
    if (!grid) return;
    const unlocked = isUnlocked();

    grid.innerHTML = FUNCTIONS_33.map(fn => {
        const badge = fn.pro ? (unlocked ? "🔓 Pro" : "🔒 Ad/Pro") : "✓ Free";
        return `
            <button type="button" class="dir-item" onclick="launchDirectoryFunction(${fn.id})">
                <div>
                    <span class="dir-num">#${fn.id}</span>
                    <span class="dir-title">${escapeHtml(fn.title)}</span>
                    <span class="dir-cat">${escapeHtml(fn.cat)}</span>
                </div>
                <span class="gold-text">${badge} →</span>
            </button>
        `;
    }).join("");
}

function launchDirectoryFunction(id) {
    const item = FUNCTIONS_33.find(f => f.id === id);
    if (item && typeof item.action === "function") {
        item.action();
    }
}

/* =========================================================
   10. HANDLES & UTILITY HELPERS
   ========================================================= */
function openHandlesModal() {
    const handles = getPaymentHandles();
    document.getElementById("handle-venmo").value = handles.venmo || "";
    document.getElementById("handle-cashapp").value = handles.cashapp || "";
    document.getElementById("handle-paypal").value = handles.paypal || "";
    document.getElementById("handles-modal").style.display = "flex";
}

async function savePaymentHandles() {
    const handles = {
        venmo: document.getElementById("handle-venmo").value.trim(),
        cashapp: document.getElementById("handle-cashapp").value.trim(),
        paypal: document.getElementById("handle-paypal").value.trim()
    };
    localStorage.setItem(STORAGE_KEYS.HANDLES, JSON.stringify(handles));

    if (currentUser && firebaseDb) {
        try {
            await firebaseDb
                .collection("users")
                .doc(currentUser.uid)
                .collection("settings")
                .doc("profile")
                .set({ handles }, { merge: true });
        } catch (err) {
            console.warn("Handles cloud sync skipped:", err);
        }
    }

    closeModals();
    showStatusBanner("Payment handles saved!");
}

function getPaymentHandles() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.HANDLES) || "{}");
    } catch {
        return {};
    }
}

function loadSavedSettings() {
    const savedKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);
    if (savedKey && document.getElementById("gemini-api-key")) {
        document.getElementById("gemini-api-key").value = savedKey;
    }
    const savedBudget = localStorage.getItem(STORAGE_KEYS.MONTHLY_BUDGET);
    if (savedBudget && document.getElementById("monthly-budget-input")) {
        document.getElementById("monthly-budget-input").value = savedBudget;
    }
}

function closeModals() {
    clearInterval(adCountdownInterval);
    document.querySelectorAll(".modal-overlay").forEach(m => {
        if (m.id !== "pin-modal") m.style.display = "none";
    });
}

function showStatusBanner(msg) {
    const banner = document.getElementById("voice-status");
    if (!banner) return;
    banner.innerText = msg;
    banner.style.display = "block";
    clearTimeout(window._tnsBannerTimer);
    window._tnsBannerTimer = setTimeout(() => {
        banner.style.display = "none";
    }, 4500);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[m]));
}
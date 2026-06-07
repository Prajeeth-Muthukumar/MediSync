// CareSync Companion - Premium Dashboard & Alerts Controller

document.addEventListener("DOMContentLoaded", function () {
    console.log("CareSync Companion Dashboard active.");

    // Initialize clock
    updateClock();
    setInterval(updateClock, 1000);

    // Live NLP Frequency parsing helper (for Doctor page)
    const freqInputs = document.querySelectorAll(".frequency-nlp-input");
    freqInputs.forEach(input => attachFrequencyParser(input));

    // Handle adding medication rows dynamically in Doctor Prescription Form
    const addMedBtn = document.getElementById("add-med-row-btn");
    if (addMedBtn) {
        addMedBtn.addEventListener("click", addNewMedicationRow);
    }

    // Start background alert monitoring
    startNotificationMonitoring();
});

// Real-time Clock
function updateClock() {
    const clockElement = document.getElementById("live-digital-clock");
    if (clockElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
        clockElement.innerHTML = `<span class="text-sm text-slate-500 mr-3">${dateString}</span><span class="font-bold font-mono tracking-wider">${timeString}</span>`;
    }
}

// Attach live keyup listener for NLP parsing
let parseTimeout = null;
function attachFrequencyParser(inputElement) {
    inputElement.addEventListener("input", function (e) {
        clearTimeout(parseTimeout);
        const feedbackContainer = document.getElementById(`freq-parse-feedback-${inputElement.dataset.rowId}`);
        
        if (!feedbackContainer) return;
        
        const value = e.target.value.trim();
        if (value.length < 3) {
            feedbackContainer.innerHTML = "";
            return;
        }

        // Debounce API calls by 500ms
        parseTimeout = setTimeout(() => {
            feedbackContainer.innerHTML = `<span class="text-xs text-cyan-400 animate-pulse">Analyzing schedule...</span>`;
            fetch(`/api/parse-frequency/?freq=${encodeURIComponent(value)}`)
                .ajaxGetJson()
                .then(data => {
                    if (data && data.times) {
                        let timesHtml = data.times.map(t => 
                            `<span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">${t}</span>`
                        ).join(" ");
                        feedbackContainer.innerHTML = `
                            <div class="mt-2 flex flex-wrap items-center gap-2">
                                <span class="text-xs text-emerald-400 font-semibold">${data.label}:</span>
                                ${timesHtml}
                            </div>
                        `;
                    }
                })
                .catch(err => {
                    feedbackContainer.innerHTML = "";
                });
        }, 500);
    });
}

// Procedural JSON fetch polyfill to simplify code
Promise.prototype.ajaxGetJson = function() {
    return this; // placeholder
};
// Quick clean fetch utility
FetchJson = function(url) {
    return fetch(url).then(res => res.json());
};

// Override parser call with native fetch
function attachFrequencyParser(inputElement) {
    inputElement.addEventListener("input", function (e) {
        clearTimeout(parseTimeout);
        const feedbackContainer = document.getElementById(`freq-parse-feedback-${inputElement.dataset.rowId}`);
        
        if (!feedbackContainer) return;
        
        const value = e.target.value.trim();
        if (value.length < 2) {
            feedbackContainer.innerHTML = "";
            return;
        }

        // Debounce API calls by 400ms
        parseTimeout = setTimeout(() => {
            feedbackContainer.innerHTML = `<span class="text-xs text-cyan-400 animate-pulse">Analyzing schedule...</span>`;
            fetch(`/api/parse-frequency/?freq=${encodeURIComponent(value)}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.times) {
                        let timesHtml = data.times.map(t => 
                            `<span class="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-900/50 text-xs font-mono">${t}</span>`
                        ).join(" ");
                        feedbackContainer.innerHTML = `
                            <div class="mt-2 flex flex-wrap items-center gap-2">
                                <span class="text-xs text-emerald-400 font-semibold">${data.label}:</span>
                                ${timesHtml}
                            </div>
                        `;
                    }
                })
                .catch(() => {
                    feedbackContainer.innerHTML = "";
                });
        }, 400);
    });
}

// Add a new row to Doctor Prescription form
let medRowCount = 1;
function addNewMedicationRow() {
    medRowCount++;
    const container = document.getElementById("medication-rows-container");
    if (!container) return;
    
    const newRow = document.createElement("div");
    newRow.className = "p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 mb-4 transition-all duration-300 relative";
    newRow.id = `med-row-${medRowCount}`;
    newRow.innerHTML = `
        <button type="button" onclick="deleteMedRow(${medRowCount})" class="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Medication Name</label>
                <input type="text" name="med_name[]" placeholder="e.g., Metformin 500mg" required class="form-input w-full">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dosage Instruction</label>
                <input type="text" name="dosage[]" placeholder="e.g., 1 tablet" required class="form-input w-full">
            </div>
            <div class="col-span-1 md:col-span-2">
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Frequency (Natural Language Parsing)</label>
                <input type="text" name="frequency[]" placeholder="e.g., Twice a day after food" required data-row-id="${medRowCount}" class="form-input w-full frequency-nlp-input">
                <div id="freq-parse-feedback-${medRowCount}" class="min-h-[20px]"></div>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Duration (Days)</label>
                <input type="number" name="duration[]" value="5" min="1" required class="form-input w-full">
            </div>
        </div>
    `;
    
    container.appendChild(newRow);
    
    // Attach parser to new input
    const newInput = newRow.querySelector(".frequency-nlp-input");
    attachFrequencyParser(newInput);
}

// Delete medication row
function deleteMedRow(rowId) {
    const row = document.getElementById(`med-row-${rowId}`);
    if (row) {
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        setTimeout(() => {
            row.remove();
        }, 300);
    }
}

// Background Alert monitoring
let knownLogIds = new Set();
let isFirstPoll = true;

function startNotificationMonitoring() {
    // Initial fetch to load active alerts without popup
    fetchRecentAlerts();
    
    // Poll logs every 5 seconds
    setInterval(fetchRecentAlerts, 5000);
}

function fetchRecentAlerts() {
    fetch("/api/notification-logs/")
        .then(res => res.json())
        .then(data => {
            if (data && data.logs) {
                // If it is the first load, simply add existing ones to known set to avoid spamming alerts on boot
                if (isFirstPoll) {
                    data.logs.forEach(log => knownLogIds.add(log.id));
                    isFirstPoll = false;
                    
                    // Also seed real-time log lists on the doctor dashboard if present
                    updateDoctorDashboardLogsList(data.logs);
                    return;
                }
                
                // Track new items
                let hasNew = false;
                data.logs.forEach(log => {
                    if (!knownLogIds.has(log.id)) {
                        knownLogIds.add(log.id);
                        hasNew = true;
                        
                        // Show a gorgeous slide-in notification toast
                        showAlertToast(log);
                    }
                });
                
                if (hasNew) {
                    // Update log list on doctor dashboard if we are on that page
                    updateDoctorDashboardLogsList(data.logs);
                    
                    // Reload patient schedule timeline if we are on that page to show updated reminder badge statuses!
                    const timelineContainer = document.getElementById("patient-timeline-section");
                    if (timelineContainer) {
                        // Soft reload the timeline context
                        setTimeout(() => {
                            window.location.reload();
                        }, 3000);
                    }
                }
            }
        })
        .catch(() => {
            // Silently handle errors in background poll
        });
}

// Play notification sound helper
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Custom elegant digital chime synthesizer
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Digital medical ring sound
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        osc1.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6 note
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
        osc2.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
        
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.4);
        osc2.stop(audioCtx.currentTime + 0.4);
    } catch(e) {
        // AudioContext browser security policy may block play, ignore quietly
    }
}

// Dynamic slide-in toast alert
function showAlertToast(log) {
    const container = document.getElementById("global-toast-container");
    if (!container) return;
    
    // Play chime sound
    playNotificationSound();
    
    const toast = document.createElement("div");
    toast.className = "toast-alert glass-card glass-card-glow-cyan";
    
    // Customize icon
    const iconSvg = `
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <svg class="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        </div>
    `;
    
    toast.innerHTML = `
        ${iconSvg}
        <div class="flex-grow">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">${log.mode} Alert Sent</span>
                <span class="text-[10px] text-slate-500 font-mono">${log.channel}</span>
            </div>
            <h4 class="text-sm font-bold text-slate-100 mt-1">${log.patient_name}</h4>
            <p class="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Reminder for <strong>${log.medication_name}</strong> (${log.dosage}) dispatched successfully.
            </p>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-500 hover:text-slate-300 self-start mt-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-destruct after 8 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 8000);
}

// Update the logs list directly in Doctor Dashboard
function updateDoctorDashboardLogsList(logs) {
    const listContainer = document.getElementById("doctor-notification-logs-list");
    if (!listContainer) return;
    
    if (logs.length === 0) {
        listContainer.innerHTML = `<div class="p-6 text-center text-slate-500 text-sm">No notification alerts dispatched yet.</div>`;
        return;
    }
    
    listContainer.innerHTML = logs.map(log => {
        const modeBadge = log.mode === "Live" 
            ? `<span class="badge-status badge-sent">LIVE</span>` 
            : `<span class="badge-status badge-pending">SIMULATED</span>`;
            
        return `
            <div class="p-3 border-b border-slate-800/80 hover:bg-slate-900/20 transition-all flex items-center justify-between text-xs">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-200">${log.patient_name}</span>
                        <span class="text-slate-500 font-mono">${log.patient_phone}</span>
                    </div>
                    <div class="text-slate-400 mt-0.5">
                        Alerted: <span class="text-cyan-400 font-semibold font-mono">${log.medication_name} (${log.dosage})</span>
                    </div>
                    <div class="text-[10px] text-slate-500 mt-1 font-mono">${log.timestamp}</div>
                </div>
                <div class="text-right">
                    ${modeBadge}
                    <div class="text-[10px] text-slate-600 font-mono mt-1">${log.channel}</div>
                </div>
            </div>
        `;
    }).join("");
}

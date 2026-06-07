// Global Application State Variables
let dispatchType = 'blood'; // 'blood' or 'organ'
let map = null;
let beaconMarker = null;
let circleGeofence = null;
let markersList = [];

let selectedLat = 40.7580; // Default Manhattan lat
let selectedLng = -73.9855; // Default Manhattan lng
let radiusKm = 5.0;
let currentQueryTab = 'mongodb';
let activeModalTab = 'sms';

// Sample Options list
const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+', 'All'];
const ORGAN_TYPES = ['Kidney', 'Liver', 'Cornea', 'Heart', 'All'];

// Initialize App on DOM Load
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    lucide.createIcons();
    
    // Set initial form selector options
    populateResourceOptions();
    
    // Init Leaflet Map
    initLeafletMap();
    
    // Perform initial asset search
    fetchAssets();
});

// Setup Leaflet Map
function initLeafletMap() {
    // Center map around default coordinates
    map = L.map('leaflet-map', {
        zoomControl: true,
        doubleClickZoom: false // Disable double click zoom so we can use double click to relocate
    }).setView([selectedLat, selectedLng], 13);
    
    // Load Dark Matter Map Tiles from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Create Pulsating Beacon Marker (Patient location)
    const pulsatingIcon = L.divIcon({
        className: 'pulsating-marker-icon',
        html: '<div class="ring-pulsator"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    beaconMarker = L.marker([selectedLat, selectedLng], {
        icon: pulsatingIcon,
        draggable: true
    }).addTo(map);

    // Handle marker dragging events
    beaconMarker.on('dragend', function(event) {
        const marker = event.target;
        const position = marker.getLatLng();
        updateCoordinates(position.lat, position.lng);
    });

    // Create radius geofence circle
    circleGeofence = L.circle([selectedLat, selectedLng], {
        color: '#10B981',
        fillColor: '#10B981',
        fillOpacity: 0.1,
        weight: 1.5,
        radius: radiusKm * 1000 // Leaflet expects meters
    }).addTo(map);

    // Double click on map to reposition beacon
    map.on('dblclick', function(event) {
        const latlng = event.latlng;
        updateCoordinates(latlng.lat, latlng.lng);
        logConsole(`[MAP] Anchor relocated manually to coordinates: (${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)})`, 'info-line');
    });
}

// Relocate geofence anchor & trigger updates
function updateCoordinates(lat, lng) {
    selectedLat = lat;
    selectedLng = lng;
    
    // Reposition map marker & circle
    beaconMarker.setLatLng([lat, lng]);
    circleGeofence.setLatLng([lat, lng]);
    
    // Update coordinates display in UI
    document.getElementById('current-coords').innerText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    
    // Re-query database
    fetchAssets();
}

// Fill selections in resource dropdown based on tab
function populateResourceOptions() {
    const selector = document.getElementById('resource-select');
    const label = document.getElementById('resource-label');
    
    selector.innerHTML = '';
    
    if (dispatchType === 'blood') {
        label.innerText = 'Blood Group Required';
        BLOOD_GROUPS.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.innerText = g;
            selector.appendChild(opt);
        });
        selector.value = 'O-'; // Default to O- for demo emergency
    } else {
        label.innerText = 'Organ / Tissue Needed';
        ORGAN_TYPES.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o;
            opt.innerText = o;
            selector.appendChild(opt);
        });
        selector.value = 'Kidney';
    }
}

// Set dispatch tab type
function setDispatchType(type) {
    if (dispatchType === type) return;
    
    dispatchType = type;
    
    // Toggle active classes on tab buttons
    document.getElementById('tab-blood').classList.toggle('active', type === 'blood');
    document.getElementById('tab-organ').classList.toggle('active', type === 'organ');
    
    // Reset dropdown selector values
    populateResourceOptions();
    
    // Clear list and re-fetch coordinates
    fetchAssets();
}

// Update Radius from Slider
function updateRadius(val) {
    radiusKm = parseFloat(val);
    document.getElementById('radius-val').innerText = `${radiusKm.toFixed(1)} km`;
    
    // Update map circle radius (in meters)
    if (circleGeofence) {
        circleGeofence.setRadius(radiusKm * 1000);
    }
    
    // Trigger real-time search
    fetchAssets();
}

// Trigger DB Query API & update frontend
function fetchAssets() {
    const resourceVal = document.getElementById('resource-select').value;
    
    // Compile query endpoint parameters
    let filterType = '';
    let subFilter = '';
    
    if (dispatchType === 'blood') {
        filterType = 'all'; // Query all assets, then filter list, or target specific
        // For query parameters, we can send details:
        subFilter = resourceVal;
    } else {
        // Organ request
        subFilter = `organ:${resourceVal}`;
    }
    
    // Fetch query details from Django backend
    const url = `/api/assets/?lat=${selectedLat}&lng=${selectedLng}&radius=${radiusKm}&sub_filter=${subFilter}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                renderAssets(data.assets);
                updateQueriesVisualizer(data.queries);
            }
        })
        .catch(err => {
            console.error('Error fetching assets:', err);
            logConsole('[ERROR] Database lookup failure: ' + err.message, 'critical-line');
        });
}

// Update query code boxes
function updateQueriesVisualizer(queries) {
    const mongoCode = document.getElementById('code-mongodb');
    const postgisCode = document.getElementById('code-postgis');
    
    mongoCode.innerText = queries.mongodb;
    postgisCode.innerText = queries.postgis;
    
    // Request Prism.js to highlight syntax
    Prism.highlightElement(mongoCode);
    Prism.highlightElement(postgisCode);
}

// Clear and render asset pins on Leaflet Map
function renderAssets(assets) {
    // 1. Remove all old markers
    markersList.forEach(m => map.removeLayer(m));
    markersList = [];
    
    // 2. Render sidebar list wrapper
    const listContainer = document.getElementById('assets-list');
    const summary = document.getElementById('assets-summary');
    listContainer.innerHTML = '';
    
    if (assets.length === 0) {
        summary.innerText = "0 matching assets identified within range";
        listContainer.innerHTML = `
            <div class="empty-list-state">
                <i data-lucide="alert-triangle"></i>
                <p>No resources found. Increase search radius or change filters.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    summary.innerText = `${assets.length} matching asset${assets.length > 1 ? 's' : ''} identified within range`;
    
    assets.forEach(asset => {
        // Create custom Leaflet Marker colors
        let markerColor = '#10B981'; // Default ngo green
        let iconName = 'shield';
        let detailHtml = '';
        
        if (asset.type === 'blood_bank') {
            markerColor = '#3b82f6'; // blue
            iconName = 'cross';
            // Show stock
            const selectVal = document.getElementById('resource-select').value;
            if (dispatchType === 'blood') {
                const qty = asset.inventory[selectVal] || 0;
                detailHtml = `<div style="font-size:11px; margin-top:4px;"><b>Stock of ${selectVal}:</b> <span style="color:#3b82f6; font-weight:bold;">${qty} Bags</span></div>`;
            } else {
                const qty = asset.organ_stock[selectVal] || 0;
                detailHtml = `<div style="font-size:11px; margin-top:4px;"><b>Stock of ${selectVal}:</b> <span style="color:#ef4444; font-weight:bold;">${qty} Unit(s)</span></div>`;
            }
        } else if (asset.type === 'donor') {
            markerColor = '#eab308'; // yellow/gold
            iconName = 'user';
            detailHtml = `<div style="font-size:11px; margin-top:4px;"><b>Blood Group:</b> <span style="color:#eab308; font-weight:bold;">${asset.blood_group}</span> (${asset.status})</div>`;
        } else {
            // NGO
            iconName = 'heart-handshake';
            detailHtml = `<div style="font-size:11px; margin-top:4px; color:#64748b;"><i>${asset.focus}</i></div>`;
        }

        // HTML custom marker pin
        const customPin = L.divIcon({
            className: 'custom-pin-icon',
            html: `<div style="background-color:${markerColor}; width:12px; height:12px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 6px ${markerColor};"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        // Add Marker to map
        const m = L.marker([asset.lat, asset.lng], { icon: customPin }).addTo(map);
        
        // Setup popup dialog
        const popupContent = `
            <div style="font-family:'Inter',sans-serif; min-width:160px; color:#f8fafc;">
                <b style="font-size:12px; color:${markerColor};">${asset.name}</b>
                <div style="font-size:10px; color:#94a3b8; margin: 2px 0;">${asset.type.toUpperCase().replace('_', ' ')} | Distance: ${asset.distance_km} km</div>
                <hr style="border-color:#334155; margin:6px 0;"/>
                ${detailHtml}
                <div style="font-size:10px; margin-top:6px; color:#64748b;">Contact: ${asset.contact}</div>
            </div>
        `;
        m.bindPopup(popupContent);
        markersList.push(m);
        
        // Create sidebar item list card
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <div class="asset-card-main">
                <span class="asset-card-title">${asset.name}</span>
                <span class="asset-card-details">${asset.contact}</span>
                <span class="asset-card-sub">${asset.type === 'blood_bank' ? 'Emergency Center' : asset.type === 'donor' ? 'Registered Donor' : 'Local NGO'}</span>
            </div>
            <div class="asset-card-side">
                <span class="distance-badge">${asset.distance_km} km</span>
                <span class="asset-type-badge type-${asset.type.replace('_', '-')}">${asset.type.replace('_', ' ')}</span>
            </div>
        `;
        
        // Card interactions
        card.addEventListener('mouseover', () => {
            m.openPopup();
        });
        
        card.addEventListener('click', () => {
            map.panTo([asset.lat, asset.lng]);
            m.openPopup();
        });
        
        listContainer.appendChild(card);
    });
    
    // Lucide Icons reload for dynamic components
    lucide.createIcons();
}

// Tabs switching logic for dynamic queries visualizer
function setQueryTab(tab) {
    currentQueryTab = tab;
    
    document.querySelectorAll('.query-tabs .q-tab').forEach((el, index) => {
        el.classList.toggle('active', (index === 0 && tab === 'mongodb') || (index === 1 && tab === 'postgis'));
    });
    
    document.getElementById('panel-mongodb').classList.toggle('active', tab === 'mongodb');
    document.getElementById('panel-postgis').classList.toggle('active', tab === 'postgis');
}

// Add logs in Console panel
function logConsole(msg, styleClass = 'info-line') {
    const box = document.getElementById('console-logs');
    const line = document.createElement('div');
    line.className = `console-line ${styleClass}`;
    line.innerText = msg;
    box.appendChild(line);
    
    // Autoscroll console panel
    box.scrollTop = box.scrollHeight;
}

// Clear dispatch console logs
function clearConsole() {
    const box = document.getElementById('console-logs');
    box.innerHTML = '<div class="console-line system-line">[SYSTEM] Console log reset. Waiting for actions...</div>';
}

// Trigger Alert Notifications Dispatch flow
function triggerDispatch(event) {
    event.preventDefault();
    
    const patientName = document.getElementById('patient-name').value;
    const resourceVal = document.getElementById('resource-select').value;
    const urgency = document.querySelector('input[name="urgency"]:checked').value;
    const btn = document.getElementById('btn-submit');
    
    // Loading State
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="pulse-icon" style="animation:spin 1s infinite linear;"></i> Broadcasting alerts...';
    lucide.createIcons();
    
    logConsole(`[DISPATCH] Broadcast requested by ${patientName} for ${resourceVal} - Urgency: ${urgency}`, 'alert-line');
    
    const payload = {
        patient_name: patientName,
        lat: selectedLat,
        lng: selectedLng,
        radius: radiusKm,
        request_type: dispatchType,
        item_needed: resourceVal,
        urgency: urgency
    };
    
    fetch('/api/request/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            // Simulate incremental logs output like a terminal stream!
            let logIndex = 0;
            const logInterval = setInterval(() => {
                if (logIndex < data.logs.length) {
                    const logStyle = data.logs[logIndex].includes('ALERT') ? 'critical-line' :
                                     data.logs[logIndex].includes('Successfully') || data.logs[logIndex].includes('complete') ? 'success-line' : 'info-line';
                    logConsole(data.logs[logIndex], logStyle);
                    logIndex++;
                } else {
                    clearInterval(logInterval);
                    btn.disabled = false;
                    btn.innerHTML = '<i data-lucide="bell"></i> Broadcast Emergency Dispatch';
                    lucide.createIcons();
                    
                    // Show notification previews in modal
                    showNotificationModal(data);
                }
            }, 500);
        } else {
            throw new Error(data.message);
        }
    })
    .catch(err => {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="bell"></i> Broadcast Emergency Dispatch';
        lucide.createIcons();
        logConsole(`[ERROR] Notification broadcast aborted: ${err.message}`, 'critical-line');
    });
}

// Show notification modals
function showNotificationModal(data) {
    const modal = document.getElementById('notification-modal');
    modal.classList.add('active');
    
    // Populate SMS mockup
    const smsInbox = document.getElementById('sms-inbox-mock');
    smsInbox.innerHTML = '';
    
    if (data.sms_sent.length === 0) {
        smsInbox.innerHTML = `
            <div style="color:#64748b; font-size:12px; text-align:center; margin-top:40px;">
                No registered individual donors identified in range for SMS dispatch.
            </div>
        `;
    } else {
        data.sms_sent.forEach(sms => {
            const smsTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            smsInbox.innerHTML += `
                <div style="font-size:10px; color:#64748b; text-align:center; margin-bottom:4px;">
                    Alert dispatched to: ${sms.to} (${sms.phone})
                </div>
                <div class="sms-bubble sms-sent">
                    ${sms.body}
                    <span class="sms-meta">${smsTime} · Sent</span>
                </div>
            `;
        });
    }
    
    // Populate Email mockup (default to first email sent, or show helper)
    const emailTo = document.getElementById('email-to-mock');
    const emailSub = document.getElementById('email-sub-mock');
    const emailContent = document.getElementById('email-body-mock');
    
    if (data.emails_sent.length === 0) {
        emailTo.innerHTML = '<span>To:</span> N/A';
        emailSub.innerHTML = '<span>Subject:</span> No Email Sent';
        emailContent.innerHTML = `
            <div style="color:#64748b; font-size:12px; text-align:center; padding-top:40px;">
                No local NGOs found in range to dispatch coordinator emails.
            </div>
        `;
    } else {
        const firstEmail = data.emails_sent[0];
        emailTo.innerHTML = `<span>To:</span> ${firstEmail.to} &lt;${firstEmail.email}&gt;`;
        emailSub.innerHTML = `<span>Subject:</span> ${firstEmail.subject}`;
        emailContent.innerHTML = firstEmail.body;
        
        if (data.emails_sent.length > 1) {
            emailContent.innerHTML += `
                <div style="background:#1e293b; color:#94a3b8; font-size:11px; padding:10px; border-radius:6px; margin-top:20px; border:1.5px dashed var(--border-color); text-align:center;">
                    Transmitted identical alerts to ${data.emails_sent.length - 1} other local NGO endpoints.
                </div>
            `;
        }
    }
    
    // Default active modal tab
    setModalTab('sms');
}

// Switch between SMS and Email tab in communication preview modal
function setModalTab(tab) {
    activeModalTab = tab;
    
    document.getElementById('m-tab-sms').classList.toggle('active', tab === 'sms');
    document.getElementById('m-tab-email').classList.toggle('active', tab === 'email');
    
    document.getElementById('m-panel-sms').classList.toggle('active', tab === 'sms');
    document.getElementById('m-panel-email').classList.toggle('active', tab === 'email');
}

// Close communications preview popup
function closeNotificationModal(event) {
    document.getElementById('notification-modal').classList.remove('active');
}

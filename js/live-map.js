/**
 * AarogyaLink — Live Tracking Map Engine
 * Powered by Leaflet.js with Custom AarogyaLink Retro-Clinical Styling
 * Supports:
 * - Patient Emergency App Live Tracking HUD
 * - Ambulance Driver Turn-by-Turn Navigation Map
 * - EMS District Controller Fleet Radar Map
 * - Evaluator Quad Split-View Mini Map
 */

(function () {
  'use strict';

  // Geographic Coordinates for Samastipur, Bihar Pilot
  const SAMASTIPUR_COORDS = {
    center: [25.8580, 85.7880],
    
    // Landmarks (Pickup points)
    patientPickup: [25.8562, 85.7845], // Near Kali Mandir, Ward 4
    railwayGate: [25.8592, 85.7818],   // Samastipur Railway Gate #2
    karpooriGram: [25.8455, 85.7582],  // Karpoori Gram Primary School
    tajpurPillar: [25.8482, 85.7725],  // Tajpur NH-28 Pillar #14

    // Hospitals
    sadarHospital: [25.8640, 85.7975],      // Sadar District Hospital Gate #1 (Primary)
    traumaCenter: [25.8690, 85.8060],       // Sadar District Trauma Center (Reroute Ahead)
    rpcauChc: [25.8420, 85.7650],           // RPCAU Community Health Centre
    tajpurHospital: [25.8475, 85.7760],     // Tajpur Referral Hospital

    // Registered Ambulance Fleet Stand Positions
    fleet: [
      { id: 'BR-33-P-4821', name: 'Rajesh Kumar', lat: 25.8529, lng: 85.7801, status: 'BUSY (En Route)', gear: 'O₂ (92%) + ECG', active: true },
      { id: 'BR-33-A-1029', name: 'Ravi Kumar', lat: 25.8615, lng: 85.7920, status: 'AVAILABLE', gear: 'Full ALS Ventilator + O₂', active: false },
      { id: 'BR-33-C-9901', name: 'Mohammed Ali', lat: 25.8440, lng: 85.7680, status: 'AVAILABLE', gear: 'O₂ + Defibrillator', active: false },
      { id: 'BR-33-D-5512', name: 'Sanjay Singh', lat: 25.8490, lng: 85.7820, status: 'AVAILABLE (Basic)', gear: 'Basic Van (No O₂)', active: false }
    ],

    // Route legs (detailed road coordinates in Samastipur)
    routeLegs: {
      // Stand to Patient (Kali Mandir)
      toPatient: [
        [25.8505, 85.7765],
        [25.8516, 85.7782],
        [25.8529, 85.7801],
        [25.8545, 85.7824],
        [25.8562, 85.7845]
      ],
      // Patient to Sadar Hospital Gate #1
      toHospital: [
        [25.8562, 85.7845],
        [25.8578, 85.7872],
        [25.8596, 85.7908],
        [25.8618, 85.7942],
        [25.8640, 85.7975]
      ],
      // Sadar Chowk to Trauma Center (Forward reroute <45° ahead)
      toTrauma: [
        [25.8596, 85.7908],
        [25.8628, 85.7952],
        [25.8658, 85.8005],
        [25.8690, 85.8060]
      ]
    }
  };

  // Helper to interpolate between waypoints given a 0.0 to 1.0 progress
  function interpolateAlongPath(path, progress) {
    if (!path || path.length === 0) return [25.8580, 85.7880];
    if (path.length === 1) return path[0];
    const clamped = Math.max(0, Math.min(1, progress));
    const totalSegments = path.length - 1;
    const scaled = clamped * totalSegments;
    const index = Math.min(Math.floor(scaled), totalSegments - 1);
    const segmentProgress = scaled - index;

    const p1 = path[index];
    const p2 = path[index + 1];

    const lat = p1[0] + (p2[0] - p1[0]) * segmentProgress;
    const lng = p1[1] + (p2[1] - p1[1]) * segmentProgress;

    // Calculate heading degrees
    const y = Math.sin((p2[1] - p1[1]) * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180);
    const x = Math.cos(p1[0] * Math.PI / 180) * Math.sin(p2[0] * Math.PI / 180) -
              Math.sin(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * Math.cos((p2[1] - p1[1]) * Math.PI / 180);
    let heading = Math.atan2(y, x) * 180 / Math.PI;
    heading = (heading + 360) % 360;

    return { lat, lng, heading: Math.round(heading) };
  }

  // Custom AarogyaLink HTML Icons
  function createAmbulanceIcon(plate, speed = '42 km/h', heading = 35) {
    return L.divIcon({
      className: 'al-custom-icon-wrapper',
      html: `
        <div class="al-map-marker-ambulance" style="transform: rotate(0deg);">
          <div class="al-marker-pulse"></div>
          <div class="al-marker-badge">
            <span class="al-marker-icon">🚑</span>
            <div class="al-marker-pill">
              <span class="al-marker-plate">${plate || 'BR-33'}</span>
              <span class="al-marker-speed">${speed}</span>
            </div>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }

  function createPatientIcon(landmark = 'Kali Mandir') {
    return L.divIcon({
      className: 'al-custom-icon-wrapper',
      html: `
        <div class="al-map-marker-patient">
          <div class="al-marker-pulse-red"></div>
          <div class="al-marker-badge-red">
            <span class="al-marker-icon">📍</span>
            <div class="al-marker-label">${landmark}</div>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
  }

  function createHospitalIcon(name, bed = 'Bed #4 Locked', isPrimary = true) {
    return L.divIcon({
      className: 'al-custom-icon-wrapper',
      html: `
        <div class="al-map-marker-hospital ${isPrimary ? 'primary' : 'standby'}">
          <div class="al-hosp-pin">
            <span class="al-hosp-emoji">🏥</span>
            <div class="al-hosp-tag">
              <div class="al-hosp-name">${name}</div>
              <div class="al-hosp-bed">${bed}</div>
            </div>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  function createFleetIcon(item) {
    const isAvail = item.status.includes('AVAILABLE');
    const colorClass = isAvail ? 'bg-[#317E33]' : 'bg-[#D63B2F]';
    return L.divIcon({
      className: 'al-custom-icon-wrapper',
      html: `
        <div class="al-map-marker-fleet ${isAvail ? 'available' : 'busy'}">
          <div class="fleet-pip ${colorClass}">
            <span>🚑</span>
          </div>
          <div class="fleet-label">${item.id}</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  // Active instances manager
  const mapInstances = {};

  /**
   * Initialize a Live Tracking Map on container
   * @param {string} containerId - DOM ID
   * @param {object} options - Configuration
   */
  function initTrackingMap(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    if (mapInstances[containerId]) {
      try {
        mapInstances[containerId].map.remove();
      } catch (e) {
        console.warn('Map cleanup error', e);
      }
    }

    const mode = options.mode || 'patient'; // 'patient' | 'driver' | 'controller' | 'mini'
    const zoom = options.zoom || (mode === 'controller' ? 13 : 14);

    // Initialize Leaflet Map
    const map = L.map(containerId, {
      center: options.center || SAMASTIPUR_COORDS.center,
      zoom: zoom,
      zoomControl: mode !== 'mini',
      attributionControl: false
    });

    // Custom attribution control (minimal)
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('AarogyaLink · © OpenStreetMap')
      .addTo(map);

    // Tile Layer: CartoDB Voyager (clean, crisp, matches AarogyaLink warm aesthetic)
    // with OpenStreetMap fallback
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    });

    tileLayer.on('tileerror', function () {
      // Fallback to OSM directly if Carto is unavailable
      if (!this._hasFallenBack) {
        this._hasFallenBack = true;
        this.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
      }
    });

    tileLayer.addTo(map);

    // Route Polylines
    let activeRouteLine = null;
    let rerouteLine = null;
    let breadcrumbLine = null;

    // Markers
    let ambMarker = null;
    let patientMarker = null;
    let hospMarker = null;
    let rerouteHospMarker = null;
    const fleetMarkers = [];

    // State reference
    let currentState = window.AarogyaLink ? window.AarogyaLink.getState() : null;

    // Setup Markers based on mode
    function setupMarkers(state) {
      if (!state) return;

      // 1. Patient Pickup Marker
      const patientPos = SAMASTIPUR_COORDS.patientPickup;
      if (!patientMarker) {
        patientMarker = L.marker(patientPos, {
          icon: createPatientIcon(state.caller?.landmark || 'Kali Mandir, Ward 4')
        }).addTo(map);

        patientMarker.bindPopup(`
          <div class="p-2 text-xs font-sans">
            <strong class="text-[#D63B2F] font-bold">📍 Patient Emergency Pickup</strong>
            <p class="font-bold text-[#13213A] mt-1">${state.caller?.landmark || 'Near Kali Mandir, Ward 4, Samastipur'}</p>
            <p class="text-[#4A586E] text-[11px] mt-0.5">GPS Accuracy: ±12m · Case ${state.caseId}</p>
          </div>
        `);
      }

      // 2. Primary Hospital Marker (Sadar District Hospital)
      const hospPos = SAMASTIPUR_COORDS.sadarHospital;
      if (!hospMarker) {
        hospMarker = L.marker(hospPos, {
          icon: createHospitalIcon('Sadar Hospital Gate #1', state.hospital?.lockedBed || 'ICU Bed #4 Locked', true)
        }).addTo(map);

        hospMarker.bindPopup(`
          <div class="p-2 text-xs font-sans">
            <strong class="text-[#317E33] font-bold">🏥 Sadar District Hospital</strong>
            <p class="text-[#13213A] font-bold mt-1">${state.hospital?.name}</p>
            <p class="text-[#317E33] font-semibold text-[11px] mt-0.5">✓ ${state.hospital?.lockedBed} Confirmed by Desk</p>
            <p class="text-[#4A586E] text-[10px]">Gate #1 Suction &amp; O₂ Trolley Staged</p>
          </div>
        `);
      }

      // 3. Standby Trauma Center Marker (for Driver Reroute HUD or Controller)
      const traumaPos = SAMASTIPUR_COORDS.traumaCenter;
      if (!rerouteHospMarker && (mode === 'driver' || mode === 'controller' || state.demoStep === 'reroute')) {
        rerouteHospMarker = L.marker(traumaPos, {
          icon: createHospitalIcon('Trauma Center (28° Ahead)', 'Standby ICU Bed', false)
        }).addTo(map);

        rerouteHospMarker.bindPopup(`
          <div class="p-2 text-xs font-sans">
            <strong class="text-[#E5B842] font-bold">🏥 Sadar District Trauma Center</strong>
            <p class="text-[#13213A] font-bold mt-1">Standby Hospital (Forward Heading: 28°)</p>
            <p class="text-[#317E33] text-[11px]">Saves 8 Mins · Zero U-Turn</p>
          </div>
        `);
      }

      // 4. Controller Fleet Markers
      if (mode === 'controller') {
        SAMASTIPUR_COORDS.fleet.forEach(item => {
          if (item.active) return; // handled by primary ambulance marker
          const fm = L.marker([item.lat, item.lng], {
            icon: createFleetIcon(item)
          }).addTo(map);

          fm.bindPopup(`
            <div class="p-2 text-xs font-sans">
              <strong class="text-[#13213A] font-bold">${item.id} (${item.name})</strong>
              <p class="text-[11px] font-semibold ${item.status.includes('AVAILABLE') ? 'text-[#317E33]' : 'text-[#D63B2F]'}">${item.status}</p>
              <p class="text-[#4A586E] text-[10px] mt-1">Gear: ${item.gear}</p>
            </div>
          `);
          fleetMarkers.push(fm);
        });
      }

      // 5. Active Matched Ambulance Marker
      const ambLat = state.ambulance?.currentLat || SAMASTIPUR_COORDS.routeLegs.toHospital[2][0];
      const ambLng = state.ambulance?.currentLng || SAMASTIPUR_COORDS.routeLegs.toHospital[2][1];
      const speedText = (state.ambulance?.speedKmH || 42) + ' km/h';

      if (!ambMarker) {
        ambMarker = L.marker([ambLat, ambLng], {
          icon: createAmbulanceIcon(state.ambulance?.id || 'BR-33-P-4821', speedText, state.ambulance?.headingDeg || 35),
          zIndexOffset: 1000
        }).addTo(map);

        ambMarker.bindPopup(`
          <div class="p-2 text-xs font-sans">
            <strong class="text-[#317E33] font-bold">🚑 Emergency Ambulance ${state.ambulance?.id}</strong>
            <p class="text-[#13213A] font-bold mt-1">Driver: ${state.ambulance?.driverName}</p>
            <p class="text-[#4A586E] text-[11px]">Stage: ${state.ambulance?.driverStage}</p>
            <p class="text-[#317E33] font-semibold text-[11px]">ETA: ${state.ambulance?.etaToPatient || 4} mins · Speed: ${speedText}</p>
          </div>
        `);
      } else {
        ambMarker.setLatLng([ambLat, ambLng]);
        ambMarker.setIcon(createAmbulanceIcon(state.ambulance?.id || 'BR-33-P-4821', speedText, state.ambulance?.headingDeg || 35));
      }
    }

    // Draw active routes based on scenario step
    function updateRoutes(state) {
      if (!state) return;

      const step = state.demoStep || 'confirmed';

      // Remove existing polylines
      if (activeRouteLine) {
        map.removeLayer(activeRouteLine);
        activeRouteLine = null;
      }
      if (rerouteLine) {
        map.removeLayer(rerouteLine);
        rerouteLine = null;
      }

      if (step === 'dispatched') {
        // Leg 1: Ambulance Stand to Patient Pickup
        activeRouteLine = L.polyline(SAMASTIPUR_COORDS.routeLegs.toPatient, {
          color: '#317E33',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      } else if (step === 'reroute' || state.reroute?.status === 'accepted') {
        // Leg 3: Forward Switch to Trauma Center
        activeRouteLine = L.polyline(SAMASTIPUR_COORDS.routeLegs.toTrauma, {
          color: '#317E33',
          weight: 6,
          opacity: 0.95,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // Show alternative dropped route in dashed amber/gray
        rerouteLine = L.polyline(SAMASTIPUR_COORDS.routeLegs.toHospital.slice(2), {
          color: '#E5B842',
          weight: 3,
          opacity: 0.6,
          dashArray: '4, 6'
        }).addTo(map);
      } else {
        // Leg 2: Patient Pickup to Sadar District Hospital
        activeRouteLine = L.polyline(SAMASTIPUR_COORDS.routeLegs.toHospital, {
          color: '#317E33',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // If in driver mode, also show the forward candidate route in subtle amber
        if (mode === 'driver') {
          rerouteLine = L.polyline(SAMASTIPUR_COORDS.routeLegs.toTrauma, {
            color: '#E5B842',
            weight: 3,
            opacity: 0.7,
            dashArray: '5, 8'
          }).addTo(map);
        }
      }
    }

    // Center/Fit logic
    function fitRoute() {
      const waypoints = [
        SAMASTIPUR_COORDS.patientPickup,
        SAMASTIPUR_COORDS.sadarHospital
      ];
      if (ambMarker) waypoints.push(ambMarker.getLatLng());
      if (rerouteHospMarker && currentState?.demoStep === 'reroute') {
        waypoints.push(SAMASTIPUR_COORDS.traumaCenter);
      }
      map.fitBounds(L.latLngBounds(waypoints), {
        padding: [35, 35],
        maxZoom: 16
      });
    }

    function focusAmbulance() {
      if (ambMarker) {
        map.setView(ambMarker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
      }
    }

    // Simulation Timer Management
    let simTimer = null;
    let simProgress = 0.45;

    function getActiveRoutePath(step) {
      if (step === 'dispatched') return SAMASTIPUR_COORDS.routeLegs.toPatient;
      if (step === 'reroute') return SAMASTIPUR_COORDS.routeLegs.toTrauma;
      return SAMASTIPUR_COORDS.routeLegs.toHospital;
    }

    function startSimulation() {
      if (simTimer) return;
      simTimer = setInterval(() => {
        simProgress += 0.04;
        if (simProgress > 1.0) simProgress = 0.05;

        const path = getActiveRoutePath(currentState?.demoStep || 'confirmed');
        const pos = interpolateAlongPath(path, simProgress);

        // Calculate dynamic ETA and speed
        const remainingKm = Math.max(0.3, +( (1 - simProgress) * 2.8 ).toFixed(1));
        const etaMinutes = Math.max(1, Math.round(remainingKm * 2.2));
        const speed = Math.round(38 + Math.sin(simProgress * Math.PI * 4) * 8);

        // Update local marker
        if (ambMarker) {
          ambMarker.setLatLng([pos.lat, pos.lng]);
          ambMarker.setIcon(createAmbulanceIcon(currentState?.ambulance?.id || 'BR-33-P-4821', speed + ' km/h', pos.heading));
        }

        // Broadcast to shared state so all tabs advance
        if (window.AarogyaLink && window.AarogyaLink.setAmbulancePosition) {
          window.AarogyaLink.setAmbulancePosition(pos.lat, pos.lng, pos.heading, speed, etaMinutes, remainingKm, simProgress);
        }

        // Update local HUD
        updateHUD({
          lat: pos.lat,
          lng: pos.lng,
          speed: speed,
          eta: etaMinutes,
          distance: remainingKm,
          heading: pos.heading
        });
      }, 1200);

      updateSimButtons(true);
    }

    function pauseSimulation() {
      if (simTimer) {
        clearInterval(simTimer);
        simTimer = null;
      }
      updateSimButtons(false);
    }

    function toggleSimulation() {
      if (simTimer) {
        pauseSimulation();
      } else {
        startSimulation();
      }
    }

    function updateSimButtons(isActive) {
      const btn = document.getElementById(options.simBtnId || 'mapSimulateToggleBtn');
      if (btn) {
        const icon = btn.querySelector('#simIcon') || btn.querySelector('span:first-child');
        const label = btn.querySelector('#simLabel') || btn.querySelector('span:last-child');
        if (isActive) {
          btn.className = 'al-btn bg-[#D63B2F] text-[#F4EEDF] text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1';
          if (icon) icon.textContent = '⏸';
          if (label) label.textContent = 'Pause Drive';
        } else {
          btn.className = 'al-btn bg-[#317E33] text-[#F4EEDF] text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1';
          if (icon) icon.textContent = '▶';
          if (label) label.textContent = 'Simulate Drive';
        }
      }
    }

    function updateHUD(data) {
      const speedBadge = document.getElementById(options.speedBadgeId || 'mapLiveSpeedBadge');
      if (speedBadge && data.speed) speedBadge.textContent = data.speed + ' km/h';

      const etaBadge = document.getElementById(options.etaBadgeId || 'mapLiveEta');
      if (etaBadge && data.eta) etaBadge.textContent = data.eta + ' mins';

      const coordsBadge = document.getElementById(options.coordsBadgeId || 'mapGpsCoords');
      if (coordsBadge && data.lat && data.lng) {
        coordsBadge.textContent = `${data.lat.toFixed(4)}° N, ${data.lng.toFixed(4)}° E · Samastipur`;
      }
    }

    // Reactive State Subscriber
    function onStateUpdate(state, eventType, meta) {
      currentState = state;
      setupMarkers(state);
      updateRoutes(state);

      if (state.ambulance?.currentLat && state.ambulance?.currentLng && ambMarker) {
        const speed = (state.ambulance.speedKmH || 42) + ' km/h';
        ambMarker.setLatLng([state.ambulance.currentLat, state.ambulance.currentLng]);
        ambMarker.setIcon(createAmbulanceIcon(state.ambulance.id, speed, state.ambulance.headingDeg || 35));

        updateHUD({
          lat: state.ambulance.currentLat,
          lng: state.ambulance.currentLng,
          speed: state.ambulance.speedKmH || 42,
          eta: state.ambulance.etaToPatient || 4,
          distance: state.ambulance.distanceKm || 2.6
        });
      }

      // If step changed, auto-recenter cleanly
      if (eventType === 'DEMO_STEP_CHANGED' || eventType === 'SOS_DISPATCHED' || eventType === 'REROUTE_ACCEPTED') {
        fitRoute();
      }
    }

    // Initial load
    if (currentState) {
      setupMarkers(currentState);
      updateRoutes(currentState);
      fitRoute();
    }

    // Register with shared state
    let unsubscribe = null;
    if (window.AarogyaLink && window.AarogyaLink.subscribe) {
      unsubscribe = window.AarogyaLink.subscribe(onStateUpdate);
    }

    // Invalidate size after DOM settles (fixes tile rendering in containers)
    setTimeout(() => {
      map.invalidateSize();
      fitRoute();
    }, 250);

    // Save instance
    const instance = {
      map,
      fitRoute,
      focusAmbulance,
      startSimulation,
      pauseSimulation,
      toggleSimulation,
      destroy: () => {
        pauseSimulation();
        if (unsubscribe) unsubscribe();
        map.remove();
        delete mapInstances[containerId];
      }
    };

    mapInstances[containerId] = instance;
    return instance;
  }

  // Global Export
  window.AarogyaLinkMap = {
    COORDS: SAMASTIPUR_COORDS,
    initTrackingMap,
    getInstance: (id) => mapInstances[id],
    interpolateAlongPath
  };

})();

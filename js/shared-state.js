/**
 * AarogyaLink — Shared Reactive State & Cross-Tab Synchronization Engine
 * Supports real-time sync across separate browser tabs/windows via BroadcastChannel & localStorage
 */

(function () {
  'use strict';

  const CHANNEL_NAME = 'aarogyalink_pilot_sync';
  const STORAGE_KEY = 'aarogyalink_pilot_state';
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  // Sound Synthesizer via Web Audio API (No external sound files required)
  let audioCtx = null;
  let soundEnabled = true;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'chime') {
        // High-low reception chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'siren') {
        // SOS Two-Tone Siren
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.2);
        osc.frequency.setValueAtTime(440, now + 0.4);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
        osc.start(now);
        osc.stop(now + 0.65);
      } else if (type === 'success') {
        // 3-note confirmation chord
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'alert') {
        // Warning alert
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(400, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Default Pilot Baseline State
  const defaultState = {
    demoStep: 'confirmed', // 'idle' | 'dispatched' | 'confirmed' | 'reroute' | 'arrived'
    caseId: '#SOS-8492',
    caller: {
      landmark: 'Near Kali Mandir, Ward 4, Samastipur',
      gpsAccuracy: '±12m',
      hasVoiceLandmark: false,
      voiceNoteText: '5s voice landmark ("Near Kali Mandir")',
      symptom: 'oxygen', // 'oxygen' | 'cardiac' | 'trauma' | 'maternal'
      offlineSmsDispatched: false,
      contact: '+91 94312 90124'
    },
    ambulance: {
      id: 'BR-33-P-4821',
      driverName: 'Rajesh Kumar',
      driverContact: '+91 94310 88219',
      currentLat: 25.8596,
      currentLng: 85.7908,
      speedKmH: 42,
      headingDeg: 35,
      simProgress: 0.5,
      simActive: false,
      etaToPatient: 4,
      etaToHospital: 7,
      distanceKm: 1.8,
      gear: {
        oxygen: { ready: true, label: 'Oxygen Tank (92%)' },
        suction: { ready: false, label: 'Suction Pump (Missing)' }, // Triggers missing-gear early alert
        monitor: { ready: true, label: 'Oximeter / ECG' },
        stretcher: { ready: true, label: 'Spine Stretcher' }
      },
      driverStage: 'En Route to Hospital',
      vitals: {
        spo2: '89%',
        pulse: '104 bpm',
        bp: '135/88',
        respiration: '28 / min',
        notes: 'Severe dyspnea, alert, oxygen therapy started'
      }
    },
    hospital: {
      name: 'Sadar District Hospital — Trauma & Oxygen Wing',
      receptionClerk: 'Sunita Roy (Desk #1)',
      receptionPhone: '+91 98110 00001',
      lockState: 'CONFIRMED', // 'PENDING' | 'CONFIRMED' | 'HOLD' | 'DIVERTED'
      lockedBed: 'ICU Bed #4',
      incomingEtaMinutes: 7,
      beds: { icu: 4, o2: 9, mat: 5 },
      doctorOnSite: true,
      o2FullStock: true,
      gateStaged: true, // Gate #1 suction & oxygen trolley staged
      commsTier: 'Tier 1: Live Web Portal'
    },
    reroute: {
      activeTier: 'green', // 'green' | 'yellow' | 'red'
      candidateHospital: 'Sadar District Trauma Center',
      headingDeg: 28,
      minutesSaved: 8,
      status: 'pending' // 'pending' | 'accepted' | 'ignored'
    },
    controller: {
      pilotTrips: 42,
      fleetOnline: '18 / 22',
      activeSosTrips: 4,
      monthlySustainability: '+₹79,000'
    },
    networkOnline: true, // true (4G) | false (2G/SMS)
    langHindi: false,
    soundEnabled: true,
    lastUpdate: Date.now()
  };

  // Load from LocalStorage or initialize
  function loadInitialState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Object.assign({}, defaultState, parsed);
      }
    } catch (e) {
      console.warn('Failed to load local storage state', e);
    }
    return Object.assign({}, defaultState);
  }

  let currentState = loadInitialState();
  const subscribers = new Set();

  function saveAndBroadcast(state, eventType = 'STATE_SYNC', meta = {}) {
    currentState = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }

    // Broadcast across tabs
    if (channel) {
      channel.postMessage({ type: eventType, state, meta, timestamp: Date.now() });
    }

    // Notify local subscribers
    subscribers.forEach(cb => {
      try {
        cb(currentState, eventType, meta);
      } catch (err) {
        console.error('Subscriber callback error', err);
      }
    });
  }

  // Cross-tab broadcast listener
  if (channel) {
    channel.onmessage = function (event) {
      if (event && event.data && event.data.state) {
        currentState = event.data.state;
        subscribers.forEach(cb => {
          try {
            cb(currentState, event.data.type, event.data.meta);
          } catch (err) {
            console.error('Cross-tab subscriber error', err);
          }
        });
      }
    };
  }

  // Storage fallback for older contexts
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        currentState = JSON.parse(e.newValue);
        subscribers.forEach(cb => cb(currentState, 'STORAGE_SYNC', {}));
      } catch (err) {
        console.warn('Storage sync error', err);
      }
    }
  });

  // UI Toast Function
  function showToast(icon, title, message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'fixed bottom-5 right-5 z-50 max-w-md';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="al-card bg-[#13213A] text-[#F4EEDF] p-4 flex items-start gap-3 shadow-[0_6px_0_#317E33]">
        <span class="text-2xl">${icon || 'ℹ️'}</span>
        <div class="flex-1 text-xs sm:text-sm">
          <p class="font-bold text-[#E5B842] leading-tight">${title || 'Notification'}</p>
          <p class="text-[#F4EEDF]/90 mt-1 leading-snug">${message || ''}</p>
        </div>
        <button onclick="this.closest('#toastContainer').classList.add('hidden')" class="text-[#F4EEDF]/70 hover:text-white font-bold px-1 text-sm">✕</button>
      </div>
    `;
    container.classList.remove('hidden');

    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      container.classList.add('hidden');
    }, 4500);
  }

  // Core Mutation Actions
  const actions = {
    getState: () => Object.assign({}, currentState),

    subscribe: (callback) => {
      subscribers.add(callback);
      // Immediately call with current state
      callback(currentState, 'INIT', {});
      return () => subscribers.delete(callback);
    },

    setDemoStep: (step) => {
      const newState = Object.assign({}, currentState);
      newState.demoStep = step;

      if (step === 'idle') {
        newState.hospital.lockState = 'PENDING';
        newState.ambulance.driverStage = 'Available on Shift';
        newState.ambulance.currentLat = 25.8505;
        newState.ambulance.currentLng = 85.7765;
        newState.ambulance.headingDeg = 35;
        newState.ambulance.speedKmH = 0;
        newState.ambulance.etaToPatient = 4;
        newState.ambulance.distanceKm = 2.6;
        newState.ambulance.simProgress = 0.0;
        newState.reroute.status = 'pending';
      } else if (step === 'dispatched') {
        newState.hospital.lockState = 'PENDING';
        newState.ambulance.driverStage = 'Accepted SOS · To Pickup';
        newState.ambulance.currentLat = 25.8529;
        newState.ambulance.currentLng = 85.7801;
        newState.ambulance.headingDeg = 42;
        newState.ambulance.speedKmH = 45;
        newState.ambulance.etaToPatient = 3;
        newState.ambulance.distanceKm = 1.4;
        newState.ambulance.simProgress = 0.5;
        playSound('siren');
      } else if (step === 'confirmed') {
        newState.hospital.lockState = 'CONFIRMED';
        newState.ambulance.driverStage = 'En Route to Hospital';
        newState.ambulance.currentLat = 25.8596;
        newState.ambulance.currentLng = 85.7908;
        newState.ambulance.headingDeg = 48;
        newState.ambulance.speedKmH = 42;
        newState.ambulance.etaToHospital = 5;
        newState.ambulance.distanceKm = 1.8;
        newState.ambulance.simProgress = 0.5;
        playSound('success');
      } else if (step === 'reroute') {
        newState.reroute.status = 'pending';
        newState.ambulance.driverStage = 'Standby Reroute Prompt';
        newState.ambulance.currentLat = 25.8628;
        newState.ambulance.currentLng = 85.7952;
        newState.ambulance.headingDeg = 28;
        newState.ambulance.speedKmH = 40;
        newState.ambulance.etaToHospital = 4;
        newState.ambulance.distanceKm = 1.2;
        newState.ambulance.simProgress = 0.4;
        playSound('alert');
      } else if (step === 'arrived') {
        newState.ambulance.driverStage = 'Handover Complete ✓';
        newState.hospital.lockState = 'CONFIRMED';
        newState.ambulance.currentLat = 25.8640;
        newState.ambulance.currentLng = 85.7975;
        newState.ambulance.headingDeg = 45;
        newState.ambulance.speedKmH = 0;
        newState.ambulance.etaToHospital = 0;
        newState.ambulance.distanceKm = 0.0;
        newState.ambulance.simProgress = 1.0;
        playSound('chime');
      }

      saveAndBroadcast(newState, 'DEMO_STEP_CHANGED', { step });
      showToast('🎬', 'Scenario Synchronized', `All portals updated to: ${step.toUpperCase()}`);
    },

    setAmbulancePosition: (lat, lng, heading = 35, speed = 42, eta = 4, distance = 1.8, progress = 0.5) => {
      const newState = Object.assign({}, currentState);
      newState.ambulance.currentLat = lat;
      newState.ambulance.currentLng = lng;
      newState.ambulance.headingDeg = heading;
      newState.ambulance.speedKmH = speed;
      newState.ambulance.distanceKm = distance;
      if (newState.demoStep === 'dispatched') {
        newState.ambulance.etaToPatient = eta;
      } else {
        newState.ambulance.etaToHospital = eta;
      }
      newState.ambulance.simProgress = progress;
      newState.lastUpdate = Date.now();
      saveAndBroadcast(newState, 'AMBULANCE_MOVED', { lat, lng, heading, speed, eta, distance, progress });
    },

    triggerSos: (opts = {}) => {
      const newState = Object.assign({}, currentState);
      newState.demoStep = 'dispatched';
      newState.hospital.lockState = 'PENDING';
      newState.ambulance.driverStage = 'Accepted SOS · To Pickup';
      if (opts.landmark) newState.caller.landmark = opts.landmark;
      if (opts.symptom) newState.caller.symptom = opts.symptom;

      playSound('siren');
      saveAndBroadcast(newState, 'SOS_DISPATCHED', { opts });
      showToast('🆘', 'Emergency SOS Dispatched!', `Matched ambulance ${newState.ambulance.id} & alerted ${newState.hospital.name}.`);
    },

    confirmBed: (bedName = 'ICU Bed #4') => {
      const newState = Object.assign({}, currentState);
      newState.demoStep = 'confirmed';
      newState.hospital.lockState = 'CONFIRMED';
      newState.hospital.lockedBed = bedName;
      newState.ambulance.driverStage = 'En Route to Hospital';

      playSound('success');
      saveAndBroadcast(newState, 'BED_CONFIRMED', { bedName });
      showToast('✅', 'Hospital Reception Confirmed Bed!', `${newState.hospital.name} locked ${bedName}. Patient and driver notified.`);
    },

    holdDoctor: (sec = 60) => {
      const newState = Object.assign({}, currentState);
      newState.hospital.lockState = 'HOLD';

      playSound('beep');
      saveAndBroadcast(newState, 'DOCTOR_HOLD', { sec });
      showToast('⏳', '60s Doctor Hold Activated', 'Checking with emergency doctor on-call. Standby hospital kept warm.');
    },

    divertToStandby: () => {
      const newState = Object.assign({}, currentState);
      newState.hospital.lockState = 'DIVERTED';
      newState.hospital.name = 'RPCAU Community Health Centre (Standby Promoted)';
      newState.hospital.lockedBed = 'Emergency Bed #2';

      playSound('alert');
      saveAndBroadcast(newState, 'HOSPITAL_DIVERTED', {});
      showToast('🔄', 'Diverted to Standby Hospital', 'Immediate failover: promoted closest standby hospital with oxygen beds.');
    },

    stageGateGear: () => {
      const newState = Object.assign({}, currentState);
      newState.hospital.gateStaged = true;

      playSound('beep');
      saveAndBroadcast(newState, 'GATE_GEAR_STAGED', {});
      showToast('🫁', 'Gate #1 Equipment Staged!', 'Suction pump and backup oxygen cylinder staged at Emergency Gate #1.');
    },

    toggleGear: (gearKey) => {
      const newState = Object.assign({}, currentState);
      const currentReady = newState.ambulance.gear[gearKey]?.ready;
      newState.ambulance.gear[gearKey].ready = !currentReady;

      playSound('beep');
      saveAndBroadcast(newState, 'GEAR_TOGGLED', { gearKey, ready: !currentReady });
      showToast('🧰', 'Gear Checklist Updated', `${gearKey.toUpperCase()} status: ${!currentReady ? 'READY' : 'MISSING'}.`);
    },

    setDriverStage: (stageName) => {
      const newState = Object.assign({}, currentState);
      newState.ambulance.driverStage = stageName;

      playSound('beep');
      saveAndBroadcast(newState, 'DRIVER_STAGE_CHANGED', { stageName });
      showToast('🚑', 'Driver Milestone Logged', `Status: ${stageName}`);
    },

    setRerouteTier: (tier) => {
      const newState = Object.assign({}, currentState);
      newState.reroute.activeTier = tier;

      playSound('beep');
      saveAndBroadcast(newState, 'REROUTE_TIER_CHANGED', { tier });
    },

    acceptReroute: () => {
      const newState = Object.assign({}, currentState);
      newState.reroute.status = 'accepted';
      newState.hospital.name = 'Sadar District Trauma Center (Upgraded Ahead)';
      newState.hospital.lockedBed = 'Trauma ICU Bed #1';
      newState.ambulance.driverStage = 'Rerouted Ahead to Trauma Center';

      playSound('success');
      saveAndBroadcast(newState, 'REROUTE_ACCEPTED', {});
      showToast('✅', 'Driver Accepted Forward Switch!', 'Route upgraded to Trauma Center ahead (zero U-turn).');
    },

    ignoreReroute: () => {
      const newState = Object.assign({}, currentState);
      newState.reroute.status = 'ignored';

      playSound('beep');
      saveAndBroadcast(newState, 'REROUTE_IGNORED', {});
      showToast('🛣️', 'Current Route Kept', 'Driver chose to proceed to initial destination.');
    },

    setSymptom: (symptom) => {
      const newState = Object.assign({}, currentState);
      newState.caller.symptom = symptom;

      saveAndBroadcast(newState, 'SYMPTOM_CHANGED', { symptom });
      showToast('🩺', 'Emergency Need Updated', `Selected: ${symptom.toUpperCase()}`);
    },

    updateBeds: (type, delta) => {
      const newState = Object.assign({}, currentState);
      newState.hospital.beds[type] = Math.max(0, (newState.hospital.beds[type] || 0) + delta);

      playSound('beep');
      saveAndBroadcast(newState, 'BEDS_UPDATED', { type, beds: newState.hospital.beds });
      showToast('🛏️', 'Live Bed Count Updated', `${type.toUpperCase()} available: ${newState.hospital.beds[type]}`);
    },

    toggleDoctor: () => {
      const newState = Object.assign({}, currentState);
      newState.hospital.doctorOnSite = !newState.hospital.doctorOnSite;

      playSound('beep');
      saveAndBroadcast(newState, 'DOCTOR_TOGGLED', { doctorOnSite: newState.hospital.doctorOnSite });
      showToast('👨‍⚕️', 'Doctor Status Updated', newState.hospital.doctorOnSite ? 'Dr. A. K. Sinha On-Duty' : 'Doctor On-Call (10m ETA)');
    },

    toggleO2Stock: () => {
      const newState = Object.assign({}, currentState);
      newState.hospital.o2FullStock = !newState.hospital.o2FullStock;

      playSound('beep');
      saveAndBroadcast(newState, 'O2_STOCK_TOGGLED', { o2FullStock: newState.hospital.o2FullStock });
      showToast('🧪', 'O2 Reserves Updated', newState.hospital.o2FullStock ? '18 Full Cylinders Ready' : 'Low Stock (3 Cylinders Left)');
    },

    logPilotTrip: () => {
      const newState = Object.assign({}, currentState);
      newState.controller.pilotTrips = Math.min(100, newState.controller.pilotTrips + 8);

      playSound('beep');
      saveAndBroadcast(newState, 'PILOT_TRIP_LOGGED', { count: newState.controller.pilotTrips });
      showToast('📈', 'Verified Pilot Trip Logged', `${newState.controller.pilotTrips}/100 trips recorded towards AI Phase 2.`);
    },

    toggleNetwork: () => {
      const newState = Object.assign({}, currentState);
      newState.networkOnline = !newState.networkOnline;

      playSound('beep');
      saveAndBroadcast(newState, 'NETWORK_TOGGLED', { online: newState.networkOnline });
      showToast(
        newState.networkOnline ? '🟢' : '📲',
        newState.networkOnline ? '4G Network Live' : '2G SMS Backup Activated',
        newState.networkOnline ? 'WebSocket & Web Portal sync active.' : 'Cellular packet drop detected. Compressed SMS fallback engaged.'
      );
    },

    toggleLanguage: () => {
      const newState = Object.assign({}, currentState);
      newState.langHindi = !newState.langHindi;

      playSound('beep');
      saveAndBroadcast(newState, 'LANG_TOGGLED', { langHindi: newState.langHindi });
      showToast('🌐', 'Language Switched', newState.langHindi ? 'सरल हिन्दी सक्रिय (Hindi Active)' : 'English Active');
    },

    toggleSound: () => {
      soundEnabled = !soundEnabled;
      currentState.soundEnabled = soundEnabled;
      playSound('beep');
      showToast('🔊', 'Audio Toggled', soundEnabled ? 'Audio alerts enabled' : 'Audio muted');
      return soundEnabled;
    },

    resetAll: () => {
      currentState = Object.assign({}, defaultState);
      saveAndBroadcast(currentState, 'RESET_ALL', {});
      showToast('↺', 'State Reset to Default', 'All portals restored to baseline showcase scenario.');
    },

    playSound,
    showToast
  };

  window.AarogyaLink = actions;
})();

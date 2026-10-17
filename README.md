# AarogyaLink — Bihar Pilot Unified Frontend

> **Fast, Equipment-Matched Ambulances & Reception-Confirmed Hospital Beds**
> Built for emergency medical care in Samastipur, Bihar.

---

## 🏥 About AarogyaLink

In Bihar emergency situations, families face two core failure points:
1. **Can't connect to an ambulance quickly**
2. **Ambulance lacks the right equipment (e.g. oxygen) for the patient**

AarogyaLink solves these through a first-principles matching rule (balancing **ETA and equipment readiness**) and loops the receiving hospital reception desk into a 1-tap bed reservation before the ambulance arrives.

---

## 🚀 Dedicated User Portals

This repository segregates each emergency actor into their own dedicated, responsive web application:

| Portal | URL / Path | Target Actor | Key Features |
|---|---|---|---|
| **Portal 1: Patient App** | [`patient.html`](patient.html) | Patient / Family Caller | 1-Tap Giant SOS button, Samastipur village landmark selector, 5s voice note recording, 2G SMS backup, plain-English match transparency, missing-gear reassurance. |
| **Portal 2: Ambulance HUD** | [`driver.html`](driver.html) | Ambulance Driver (Tablet/Phone) | 30s shift equipment checklist, turn-by-turn navigation HUD, patient vitals telemetry logger, and **Addendum 9 & v1.1 Standby Reroute HUD** with `<45°` heading guard. |
| **Portal 3: Hospital Desk** | [`hospital.html`](hospital.html) | Reception Desk Clerk | Audio-visual incoming pre-arrival alert strobe, 1-tap bed lock (`✓ ICU Bed #4 Confirmed`), early missing-gear gate prep alert, live bed counters, 4-tier comms fallback. |
| **Portal 4: EMS Admin** | [`controller.html`](controller.html) | EMS District Controller | Samastipur fleet radar, live multi-trip queue, zero paid priority ethical dispatch audit, 100-trip ML readiness gate progress tracker. |
| **Unified Showcase Hub** | [`index.html`](index.html) | Evaluators & Presenters | Executive overview and **Synchronized Quad Split-Screen** view running all 4 portals side-by-side. |

---

## 🎨 Design System & Art Style

The interface strictly implements the AarogyaLink brand guidelines:

- **Canvas Background**: `#F4EEDF` (Warm Ivory)
- **Secondary Surfaces**: `#E6DEC8` (Warm Sand)
- **Cards**: `#FFFFFF` (Crisp White)
- **Primary Ink**: `#13213A` (Deep Midnight Navy — AAA contrast)
- **Muted Ink**: `#4A586E` (Slate Navy)
- **Vitality Emerald**: `#317E33` (Confirmed / Oxygen Ready / Green Tier)
- **SOS Critical Red**: `#D63B2F` (One-Tap SOS Button & Critical Alerts)
- **Warning Amber**: `#E5B842` (Early Missing-Gear Alert & Standby Tier)
- **Typography**: `Inria Serif` (Display), `Plus Jakarta Sans` (UI), `JetBrains Mono` (Data)
- **Borders & Shadows**: 2px solid `#13213A` border with crisp `0 6px 0 #13213A` tactile offset shadows.

---

## ⚡ Cross-Tab Real-Time Synchronization

All portals communicate in real-time across multiple open browser tabs using the browser `BroadcastChannel` API and `localStorage`. 

- **Test Flow**: Open `patient.html` in Tab 1 and `hospital.html` in Tab 2.
- Pressing **SOS** in Tab 1 immediately sounds the reception chime and displays the incoming patient in Tab 2.
- Clicking **Confirm Bed** in Tab 2 instantly updates the patient's phone and driver's route HUD!

---

## 🚀 Vercel Deployment

Zero configuration required. Vercel automatically deploys this static site directly from Git.
- Configuration: `vercel.json` (`cleanUrls: true`)
- Hosted entry point: `/` (serves `index.html`)

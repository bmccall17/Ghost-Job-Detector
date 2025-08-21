# Ghost Job Detection Criteria — Updated Guidance
_Last updated: 2025-08-20_

This document refines the criteria for identifying **ghost job listings** and distinguishing them from legitimate openings. It aligns the language with model evaluation terms and emphasizes **measurable**, **auditable** signals suitable for both manual review and automated scoring.

---

## 1) Purpose & Scope
- **Audience:** Job-seeking support tools, analysts, and product teams building detection logic.
- **Scope:** Cross‑industry, North America; prioritizes job‑seeker impact while acknowledging employer behaviors.
- **Definition:** Here, **Ghost-Positive** means “likely ghost listing,” and **Ghost-Negative** means “likely real/likely to hire.”  
  _Note (for ML teams):_ These map to **positive = ghost** and **negative = real** in a classifier. “True Positive” = correctly flagged ghost; “True Negative” = correctly identified real listing.

---

## 2) Terminology (Use These Labels in UI & Tables)
- **Ghost‑Positive (likely ghost)** — listing has characteristics consistent with non‑hiring behavior.
- **Ghost‑Negative (likely real)** — listing has characteristics consistent with active hiring intent.

> Keep the ML terms (TP/TN/FP/FN) in technical docs only. The above labels reduce confusion for non‑technical readers.

---

## 3) Core Indicators (with calibrated thresholds)

### 3.1 Posting Recency (calibrated)
- **Default rule:** Listing posted or refreshed within **30–45 days** suggests **Ghost‑Negative** (likely real).
- **Exceptions:** Government, academia, executive, or cleared roles may legitimately remain open **60–90 days**. Treat as **higher risk only if no additional activity evidence** exists (see Sections 3.3 and 3.5).

### 3.2 Company‑Site Verification (multi‑step)
Escalate checks in this order:
1) **Company careers site / ATS** (direct search).  
2) **Company LinkedIn Jobs tab** (not just third‑party boards).  
3) **Hiring manager / recruiter posts** (recent shares/comments referencing the role).  
4) **Context signals** (earnings, press, hiring freeze/growth statements).  

- **Mirrored presence (1–2)** ⇒ lowers ghost risk (**Ghost‑Negative**).
- **Board‑only presence** without company‑site match ⇒ raises ghost risk (**Ghost‑Positive**).

### 3.3 Reposting Behavior (evergreen nuance)
- **Ghost‑Positive:** Repeated postings **without material changes** (title/scope, salary band, req ID) and **no fresh engagement** over time.
- **Ghost‑Negative:** Reposts **with changes** (new req ID, updated scope/comp) **plus** recent recruiter/hiring‑manager engagement.

### 3.4 Language Cues
- **Ghost‑Positive:** “**Always accepting applications**,” “**building a pipeline**,” “**express interest**” with no timeline or next steps.
- **Ghost‑Negative:** Concrete details (responsibilities, stack/tools, reporting line, comp band, **application deadline or timeline**).

### 3.5 Engagement & Process Signals (measurable)
Prefer **provable events** over vibes:
- **Ghost‑Negative evidence:**  
  - ATS **state transitions** within **7–14 days** (e.g., _Applied → Screen Scheduled_).  
  - Calendar invites from company domains.  
  - Role‑specific prompts (take‑home, case guide) or panel scheduling.
- **Ghost‑Positive evidence:**  
  - No response beyond auto‑acknowledgments after **14–21 days**, especially with other risk signals.  
  - Repeated multi‑round interviews followed by silence across many candidates (pattern‑level signal).

---

## 4) Summary Table (reader‑first headers)

| **Ghost‑Negative (likely real)** | **Ghost‑Positive (likely ghost)** |
|---|---|
| Posted/updated within 30–45 days (60–90 for exec/gov/academia **with** activity) | Very old/no date; prolonged “open” without updates |
| Mirrored on company careers site/ATS and LinkedIn Jobs | Appears only on job boards; absent from company channels |
| Reposts **with** changes (req ID/scope/comp) and recruiter activity | Reposts **without** changes and no fresh engagement |
| Concrete JD (scope, stack, comp, timeline, contact) | Vague JD; “always accepting,” “pipeline,” “express interest” |
| Measurable engagement (screen scheduled ≤14 days; invites/cases) | Auto‑acks only; silence past 14–21 days; pattern of ghosting |

---

## 5) Scoring Heuristic (for automation; tune with data)

Assign weights (example defaults below). Flag as **Ghost‑Positive** when the cumulative score ≥ **T** (e.g., **T = 0.6** on a 0–1 scale).

**Signals & Suggested Weights**
- Absent from company careers site **(+0.25)**  
- No posting date **or** age > 60 days (non‑exception roles) **(+0.20)**  
- Reposted ≥ 2× **without** changes **(+0.15)**  
- Language: “always accepting,” “pipeline,” “express interest” **(+0.10)**  
- No engagement beyond auto‑ack by day 21 **(+0.15)**  
- Known hiring freeze (earnings/press) **(+0.15)**  
- **Negative offsets (reduce ghost score):**  
  - ATS transition to **Screen Scheduled** within 14 days **(−0.35)**  
  - Calendar/panel invites **(−0.25)**  
  - Recruiter/hiring‑manager post about the role in last 14 days **(−0.15)**  
  - Repost **with** new req ID/scope/comp **(−0.10)**

> _Note:_ Start conservative to minimize **False Positives** (mislabeling real jobs as ghosts). Re‑estimate weights with supervised learning once labeled data accrues.

---

## 6) Data & Instrumentation Recommendations
- **Capture**: posting URL(s), company careers page URL, req ID, job age, last updated date, salary band, JD diffs across reposts, recruiter/hiring‑manager content, applicant ATS status transitions, invite metadata.  
- **Normalize**: company canonical domain; cross‑board deduplication; map boards → ATS listings.  
- **Track outcomes**: filled, paused, canceled, offer‑no‑hire; time‑to‑first‑screen; time‑to‑decision.  
- **Labeling**: human‑in‑the‑loop reviews for borderline cases; store decision rationale for auditability.

---

## 7) Exceptions & Contextual Rules
- **Seasonal/High‑volume roles** (e.g., fulfillment, support) may be legitimately evergreen. Require **recent recruiter posts** or **ongoing class start dates**.  
- **R&D and stealth teams** may omit detail publicly—seek **private validation** (recruiter emails, internal referrals).  
- **Agencies/MSPs**: duplicates of real jobs can look ghost‑like. Prefer **source‑of‑truth** (employer ATS link).

---

## 8) “Fast Check” — Analyst Checklist
- [ ] Posted/updated ≤ 45 days (≤ 90 with valid exception)  
- [ ] Exists on employer careers site/ATS (URL captured)  
- [ ] Repost changes present (req ID/scope/comp)  
- [ ] Concrete JD (scope/stack/comp/timeline/contact)  
- [ ] Engagement evidence ≤ 14 days (ATS transition or invite)  
- [ ] No freeze indicators in recent press/earnings  
- [ ] Recruiter/hiring‑manager activity in last 14 days

---

## 9) Minimal Reference Set (for citations in external docs)
- **WSJ** coverage citing platform data on prevalence and worker impact (Greenhouse analysis & anecdotes).  
- **SFGate** reporting on recruiter‑stated motivations (pipeline optics, replaceability, morale tactics).  
- **Business Insider / Revelio Labs** on fill‑rate trends (e.g., shift in share of postings filled within 6 months among large public firms).  
- **Ashby Talent Trends** on job outcome states (filled/paused/offer‑no‑hire) across thousands of postings.  
- **SHRM** guidance on candidate experience and requisition management practices.

> Use authoritative sources for claims in public‑facing materials; avoid tabloid/low‑signal links. Vendor blogs and forums (e.g., Reddit) are acceptable for anecdotal context only.

---

## 10) Changelog
- **v1.1 (2025-08-20)**: Simplified labels, calibrated recency windows, nuanced repost/evergreen guidance, measurable engagement signals, scoring heuristic, and reference hygiene.
- **v1.0**: Initial criteria draft.

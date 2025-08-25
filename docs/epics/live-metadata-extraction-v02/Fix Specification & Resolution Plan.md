**Fix Specification & Resolution Plan.md**
based off the **Metadata Extraction System Audit Report.md**

---

# Fix Specification & Resolution Plan

**Project:** Ghost Job Detector
**Scope:** Metadata Extraction System – Critical Fixes & Optimization
**Date:** August 25, 2025
**Owner:** Engineering Team (Backend + Frontend + QA)
**Status:** Ready for Implementation

---

## 🎯 Objectives

* Resolve **critical metadata extraction issues** identified in the **Audit Report (Aug 23, 2025)**
* Eliminate **redundant JSON storage** and optimize schema for performance
* Ensure **Live Metadata Display (Step 2)** is accurate, fast, and resilient
* Stay compliant with **Vercel function limits** (≤ 12)
* Align with **v0.2.0 architecture and release notes**

---

## 🚨 Critical Issues & Fix Specifications

### 1. JSON Field Proliferation

* **Problem:** 25–40% redundant JSON fields in `Analysis` and `JobListing` tables.
* **Fix:**

  * Drop unused JSON fields: `algorithm_assessment`, `recommendation`, `analysis_details`.
  * Normalize `reasonsJson` into `KeyFactor` relation.
  * Restrict `rawParsedJson` to **display metadata only** (not queryable fields).
* **Resolution Impact:** \~35% storage reduction, faster queries.

---

### 2. Abandoned / Unused Tables

* **Problem:** `Company`, `JobCorrection`, and `AlgorithmFeedback` tables not used in workflow.
* **Fix:**

  * Drop `JobCorrection` immediately (feature removed since v0.1.5).
  * Drop `AlgorithmFeedback` (no API usage).
  * Defer decision on `Company` (confirm if needed for analytics Phase 4).
* **Resolution Impact:** 20% storage reduction, simpler schema.

---

### 3. Over-Precise Decimals

* **Problem:** Fields like `Analysis.score` use `(5,4)` precision when `(3,2)` suffices.
* **Fix:**

  ```sql
  ALTER TABLE analyses 
  ALTER COLUMN score TYPE DECIMAL(3,2),
  ALTER COLUMN ghostProbability TYPE DECIMAL(3,2),
  ALTER COLUMN modelConfidence TYPE DECIMAL(3,2);
  ```
* **Resolution Impact:** Cleaner storage, reduced index bloat.

---

### 4. LinkedIn Anti-Bot & URL Extraction

* **Problem:** LinkedIn metadata blocked by bot protection.
* **Fix:**

  * Use **URL-based jobId extraction** from `currentJobId` param.
  * Provide **graceful metadata fallback** with confidence scores.
* **Resolution Impact:** Consistent LinkedIn parsing across view, search, collections.

---

### 5. Live Metadata Display (Step 2) Inconsistency

* **Problem:** Step 2 shows only title, company, key factors (missing location, posted date, description, source).
* **Fix:**

  * Re-enable **LiveMetadataCard** with full fields (url, title, company, location, postedAt, sourceType, description).
  * Populate fields **live as parsed**, confidence ≥0.7 gating.
  * Ensure **error states** (Unknown/Not available) render gracefully.
* **Resolution Impact:** Boosts transparency, improves Verified Placement Rate (OKR VPR-120).

---

### 6. Function Limit Constraint

* **Problem:** Vercel 8/12 function limit—original plan exceeded.
* **Fix:**

  * Extend **existing endpoints** only:

    * `api/analyze.js` → add metadata streaming
    * `api/agent.js` → add metadata editing
    * `api/stats.js` → add analytics hooks
* **Resolution Impact:** No new endpoints, compliant with 12-function cap.

---

## 🛠 Resolution Plan

### Phase 1 – Schema & Backend (Days 1–3)

* [ ] Remove redundant JSON fields
* [ ] Drop unused tables (`JobCorrection`, `AlgorithmFeedback`)
* [ ] Alter decimals precision
* [ ] Patch LinkedIn URL extraction logic
* [ ] Extend `api/analyze.js` for metadata streaming

### Phase 2 – Frontend (Days 3–5)

* [ ] Re-enable **LiveMetadataCard** (full fields + real-time updates)
* [ ] Add click-to-edit, auto-save, and validation
* [ ] Implement error boundaries for React crash prevention

### Phase 3 – QA & Deployment (Days 5–7)

* [ ] Run 90%+ coverage test suite
* [ ] Cross-browser + mobile responsive validation
* [ ] Deploy to Vercel + smoke testing
* [ ] Monitor logs & rollback via feature flags if regressions

---

## 📊 Success Metrics

* **Performance:** Sub-2000ms analysis response time maintained
* **Data Quality:** ≥85% parsing accuracy across platforms
* **User Trust:** NPS > 80, ≥90% analyses show title+company within 2s
* **Reliability:** 99.9% uptime, no React crashes due to metadata integration
* **Scalability:** Database size reduced 30–50% via schema optimization

---

✅ **Outcome:** A leaner, faster, and more transparent metadata extraction system—fully aligned with v0.2.0 architecture and prepared for future Phase 3 collaboration + Phase 4 analytics expansions.

---

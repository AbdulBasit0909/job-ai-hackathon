# Resume A/B Testing Verification & Expected Results Guide

This document outlines the expected aggregate results, statistical confidence behavior, and step-by-step verification procedures for the **Resume A/B Testing & Versions** system.

---

## 1. Test Scenario Design

Both resumes belong to the same candidate (**Alex Mercer**):
* **Resume Version A (Baseline / Control)**: Standard frontend resume with basic technical descriptions and generic responsibilities.
* **Resume Version B (Variant / AI Optimized)**: Keyword-optimized variant emphasizing Next.js 15 App Router, React 19, TypeScript 5, Core Web Vitals performance benchmarks, measurable business impact percentages, and modern frontend tooling.

---

## 2. Expected Aggregate Results

### Comparison Matrix

| Metric | Resume Version A (Baseline) | Resume Version B (Optimized) | System Winner |
| :--- | :---: | :---: | :---: |
| **Resume Name** | Resume Version A — Baseline (Control) | Resume Version B — AI Optimized (Variant) | — |
| **Target Role** | Frontend Developer | Senior Frontend Engineer | — |
| **Total Tracked** | 50 | 50 | — |
| **Total Applied** | 50 | 50 | — |
| **Total Responses** | **8** | **20** | **+150% boost** |
| **Response Rate** | **16%** | **40%** | 🏆 **Resume B (+24% absolute)** |
| **Interviews** | 6 (12%) | 15 (30%) | **Resume B (2.5x more interviews)** |
| **Offers** | 2 (4%) | 5 (10%) | **Resume B (2.5x more offers)** |
| **Rejections** | 25 (50%) | 15 (30%) | **Resume A (higher rejection rate)** |
| **Pending / No Response** | 17 (34%) | 15 (30%) | — |
| **Sample Confidence** | **High** (*Statistically significant sample*) | **High** (*Statistically significant sample*) | Both meet 15+ threshold |

---

## 3. How the Analytics Engine Calculates Metrics

### 1. Response Rate Calculation
$$\text{Total Applied} = \text{Applications where } \text{status} \neq \text{"Saved"}$$
$$\text{Total Responses} = \text{Applications where } \text{status} \in \{\text{"Interviewing"}, \text{"Offer"}\}$$
$$\text{Response Rate (\%)} = \text{round}\left( \frac{\text{Total Responses}}{\text{Total Applied}} \times 100 \right)$$

* **Resume A**: $\frac{8}{50} \times 100 = \mathbf{16\%}$
* **Resume B**: $\frac{20}{50} \times 100 = \mathbf{40\%}$

---

### 2. Sample Confidence & Statistical Significance Logic
Defined in `app/api/resumes/ab-testing/route.ts`:

```typescript
if (totalApplied === 0) {
  sampleStatus = "No applications yet";
  confidence = "None";
} else if (totalApplied < 5) {
  sampleStatus = "Limited sample (Needs 5+ apps)";
  confidence = "Low";
} else if (totalApplied < 15) {
  sampleStatus = "Moderate sample";
  confidence = "Moderate";
} else {
  sampleStatus = "Statistically significant sample";
  confidence = "High";
}
```

* Since **both Resume A ($N=50$) and Resume B ($N=50$) exceed the 15-application threshold**, the UI renders the green **"Statistically significant sample"** badge.

---

### 3. Best Performing Version Determination
The system evaluates all candidate resume versions with $N \ge 1$:
1. Sorts by **Response Rate descending** ($40\% > 16\%$).
2. Tiebreak 1: **Total Responses descending** ($20 > 8$).
3. Tiebreak 2: **Total Offers descending** ($5 > 2$).

**Outcome**: **Resume Version B** is designated the Leader and displayed in the Top Performing Version showcase banner.

---

## 4. Step-by-Step Verification Procedure

1. **Run the Database Seeder**:
   ```bash
   npx tsx scripts/seed-ab-test-data.ts
   ```

2. **Open the A/B Testing Dashboard**:
   Navigate to `http://localhost:3000/dashboard/resumes`.

3. **Verify Top Banner**:
   - Confirm **Resume Version B** is featured as the **"Top Performing Version"**.
   - Confirm the banner states **"Achieving a 40% response rate with 15 interviews and 5 offers"**.

4. **Verify Over-Time Trends Chart**:
   - Confirm the multi-line chart renders lines for both **Resume Version A** and **Resume Version B**.
   - Confirm Resume B maintains a higher curve ($35\% - 40\%$) compared to Resume A ($14\% - 16\%$).

5. **Verify Comparison Table**:
   - Check rows for **Resume Version A** (16% Response Rate, 6 interviews, 2 offers, 25 rejections).
   - Check rows for **Resume Version B** (40% Response Rate, 15 interviews, 5 offers, 15 rejections).
   - Check the **Sample Confidence** column shows **"Statistically significant sample"** (green badge).

6. **Verify Main Dashboard Snapshot**:
   - Navigate to `http://localhost:3000/dashboard`.
   - Confirm the **Resume A/B Performance Snapshot** card highlights Resume B as the Leader with a 40% rate.

7. **Verify Application Tracker**:
   - Navigate to `http://localhost:3000/dashboard/applications`.
   - Confirm applications show the corresponding **Resume Version** badge and dropdown.
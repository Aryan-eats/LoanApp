# Credit Check / Eligibility – Soft Check Elaboration

## Soft Check — What It Actually Means

A **hard inquiry** (like a formal bank application) pulls the client's CIBIL report, which gets recorded and **lowers the credit score** slightly. Banks can see how many hard inquiries were made.

A **soft check** does NOT pull the CIBIL bureau report. Instead, it uses **proxy signals** to estimate eligibility:

| Input | What it proxies |
|---|---|
| Monthly income | Repayment capacity |
| Employment type | Income stability & risk |
| Existing EMI | Current debt burden (DTI ratio) |
| Loan amount requested | Loan-to-income ratio |
| Loan type | Risk category (home loans = low risk, personal = high) |

The system runs **internal scoring logic** using these inputs — no bureau API call, no impact on CIBIL.

---

## The 2-Second Bank Simulation

In production, here's what would actually happen during those 2 seconds:

1. **Calculate eligibility score** (a weighted formula):
   ```
   score = (income_factor × 0.30) + (employment_factor × 0.25) + (dti_factor × 0.20) + (credit_history_factor × 0.25)
   ```
   Since there's no real CIBIL, credit history is **assumed positive** or estimated from employment type and income.

2. **Calculate max eligible loan amount** using standard banking rule:
   ```
   available_income = monthly_income - existing_emi
   max_emi_allowed = available_income × 0.50   // 50% FOIR (Fixed Obligation to Income Ratio)
   max_loan = max_emi_allowed × tenure_months (using avg interest rate)
   ```

3. **Filter banks** — each bank has its own internal criteria:
   - HDFC: min income ₹25k, min score 70
   - ICICI: min income ₹20k, min score 65
   - Bajaj Finserv: min income ₹15k, min score 55 (higher rate)
   - etc.

   Banks whose criteria the client meets are returned as "eligible offers."

4. **Return ranked results** — sorted by interest rate (best offer first).

---

## Why "Soft" Is Valuable for Partners

Partners (DSAs) talk to dozens of clients daily. Before submitting a formal application (which triggers a hard pull), they use the soft check to:
- **Pre-qualify** clients so they don't waste time on ineligible leads
- **Set realistic expectations** on loan amount and EMI
- **Pick the right bank** before approaching them formally

The actual hard CIBIL pull only happens when the partner clicks **"Submit Lead"** and the bank formally processes the application.

---

## Current Implementation Status

- The page currently uses **mock data** (`mockEligibilityResult`) for all results.
- The real implementation needs:
  1. A backend eligibility API endpoint accepting form inputs
  2. Server-side scoring logic using FOIR + employment + loan type rules
  3. A bank-criteria filter returning real matched offers
  4. The "Submit Lead" CTA wired to the lead creation flow, pre-filled with client data

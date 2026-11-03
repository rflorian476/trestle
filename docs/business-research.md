# What contractors want (and hate) in Jobber, Housecall Pro, ServiceTitan, QuickBooks

Research notes for the v7 "Office" hub. Read November 2026.

## 1. Price creep and paid add-ons are the #1 complaint
- Jobber users say reviews cost an extra $39/mo, referrals $29/mo, and expense tracking is only on the higher "Grow" plan ($267/mo). https://www.reddit.com/r/Contractor/comments/1qk5y04/im_really_disappointed_with_jobber/
- People say Jobber and Housecall Pro have raised prices two or three times in 18 months, and HCP "grandfathering" was not honored. https://www.reddit.com/r/handyman/comments/1tczw56/jobber_increased_pricing_again_getting_hard_to/ · https://www.reddit.com/r/WhichCRM/comments/1q6kk0t/house_call_pro_raised_prices_on_me_again_need/
- Even a P.O. number on an invoice can be a paid option. (Same r/handyman thread.)
- **Build:** every Office tool is in the flat $20/mo plan, with no add-on tiers. The pricing page says so.

## 2. ServiceTitan: contracts, onboarding and per-tech fees
- A small electrical shop called the switch "a very expensive mistake" because it didn't work well with QuickBooks Desktop for payables, time and payroll. https://www.reddit.com/r/smallbusiness/comments/1sxc3xb/service_titan_nightmare/
- BBB complaints describe a $67,230 early-termination demand and invoices that couldn't take payments in week one. https://www.bbb.org/us/ca/glendale/profile/project-management-software/servicetitan-inc-1216-1290182/complaints?page=1
- Third parties report $245–$500 per tech per month, $5k–$50k to implement and 3 months to go live. https://skillmammoth.com/blog/servicetitan-reviews
- **Build:** no contract and no setup. Seeded examples show how it works on first open. Export to CSV or QuickBooks whenever you want, so you're never locked in.

## 3. Quoting and invoicing details that sell jobs
- One user switched to HCP for multiple options on one quote and sold a tankless upgrade that same week. https://www.reddit.com/r/Contractor/comments/1s4e3wt/does_anyone_use_jobber/
- Job costing (actual hours vs. estimate on multi-week jobs) is "clunky", so people keep a spreadsheet anyway. (Same thread.)
- Commercial work needs progress billing, retainage, and approval before invoices go out. https://www.servicetitan.com/commercial-playbook/commercial-invoicing
- **Build:**
  - Estimates with optional line items that convert to invoices.
  - Deposits, progress billing (% of contract), tax, and P.O. numbers.
  - Timesheets tied to jobs, with estimate-vs-actual hours.
  - Change orders and lien waivers.

## 4. Getting paid
- Contractors want pay links in the invoice, partial payments and automatic reminders. These are core reasons people pick HCP. (Threads above.)
- **Build:**
  - A customer invoice page with "Pay now". Demo/test mode for now; the integration point is Stripe Connect.
  - Status: draft, sent, viewed, partial, paid, overdue.
  - One-tap reminders, plus a manual "mark paid" for cash or check.

## 5. Records you need at tax time and for GCs
- Receipts, mileage (IRS standard rate) and COI/license expirations are things contractors lose track of. GCs ask for COIs before a sub can start.
- **Build:**
  - Expense and receipt log.
  - Mileage log with deduction estimate (labelled "not tax advice").
  - License, insurance and COI tracker with expiry alerts.
  - Reports and CSV export.

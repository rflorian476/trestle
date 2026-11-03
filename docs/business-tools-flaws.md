# What people hate about business tools and job boards, and how Sawyer answers it

Read November 2026. Angi/Thumbtack complaints are covered in `competitor-flaws.md`. Traveler details are in `traveler-research.md` and the Office hub details are in `business-research.md`.

## Top findings
1. **The price keeps going up, and basics cost extra.**
   - Jobber charges $39/mo for reviews, $29/mo for referrals, and puts expense tracking behind its $267/mo plan. [r/Contractor](https://www.reddit.com/r/Contractor/comments/1qk5y04/im_really_disappointed_with_jobber/)
   - Housecall Pro users report a 3rd price hike and grandfathering that wasn't honored. [r/WhichCRM](https://www.reddit.com/r/WhichCRM/comments/1q6kk0t/house_call_pro_raised_prices_on_me_again_need/)
   - QuickBooks Online Plus goes from $115 to $140 on renewals from Aug 1, 2026. [Intuit](https://quickbooks.intuit.com/r/product-update/quickbooks-price-changes/)
   - Invoice2go went from $35.99 to $53.98 a year. [Trustpilot](https://www.trustpilot.com/review/invoice.2go.com)
2. **Contracts and per-tech pricing.** ServiceTitan reportedly charges $245–$500 per tech per month, with a 12-month minimum, a 30-day cancel window, and early-termination demands of $22k–$67k. [Skill Mammoth](https://skillmammoth.com/blog/servicetitan-reviews) · [BBB](https://www.bbb.org/us/ca/glendale/profile/project-management-software/servicetitan-inc-1216-1290182/complaints?page=1)
3. **Your money gets held.**
   - QuickBooks Payments held a first payment past its own deadline, and support said to upgrade the plan to get it. [r/quickbooksonline](https://www.reddit.com/r/quickbooksonline/comments/1tah48v/quickbooks_is_holding_my_first_payment_hostage/)
   - One business reports $166k withheld. [QB Community](https://quickbooks.intuit.com/community/payments-3/166k-quickbooks-payout-withheld-due-to-bank-account-connection-issue-how-can-we-get-the-funds-released-375826)
   - Invoice2go capped a 13-year user's $12k payout at $1,000 a week. [Trustpilot](https://www.trustpilot.com/review/invoice.2go.com)
   - Invoice2go charges 1% for instant payout, and that fee can't be passed to the client. [2go support](https://support.2go.com/hc/en-us/articles/19263667880589-Instant-Payouts-FAQ)
4. **Lock-in and lost records.** An Invoice2go account was deactivated, and the owner "lost all my clients' information, estimates, and invoices." [PissedConsumer](https://invoice2go.pissedconsumer.com/review.html)
5. **Bloat and setup time.**
   - ServiceTitan averages 3 months to implement. [Skill Mammoth](https://skillmammoth.com/blog/servicetitan-reviews)
   - Jobber users say quotes take too long and too many clicks, and job costing is "clunky," so they keep a spreadsheet anyway. [r/Contractor](https://www.reddit.com/r/Contractor/comments/1s4e3wt/does_anyone_use_jobber/)
6. **Support is slow and inconsistent.** Agents give different answers, callback numbers don't work, and cases get closed unfixed. (Same threads.)
7. **Job boards and staffing agencies hide the numbers.**
   - "They will get you states away from home and be like I don't know who told you 40 but it's 32 an hr." [r/electricians](https://www.reddit.com/r/electricians/comments/1q7inbp/anyone_ever_work_for_an_agency_or_staffing_company/)
   - Recruiters post with no rate or per diem, and "guaranteed" OT turns out to be "potential." [r/AskElectricians](https://www.reddit.com/r/AskElectricians/comments/1wgnohm/travelers_what_did_you_check_before_saying_yes_to/)
   - Agency markup is 30–40%, and contractors get "journeyman level" hands who turn out to be unlicensed. [WireHands](https://wirehands.com/resources/blog/staffing-agency-markup-electricians/) · [Mike Holt forum](https://forums.mikeholt.com/threads/tradesmen-international.140166/)
   - Ghost jobs get reposted forever. [r/jobsearchhacks](https://www.reddit.com/r/jobsearchhacks/comments/1fsefi1/official_ghost_job_list/)

## Complaint → what Sawyer does
Status: **Built** means it is in this v7 prototype. **Launch** means it is planned for the paid launch and labelled that way in the app.

| Complaint | Who it's about | What Sawyer does | Status |
|---|---|---|---|
| Price hikes, broken grandfathering | Jobber, HCP, QBO, Invoice2go | One flat $20/mo plan. Your price is locked for as long as you stay subscribed, and that's written on the pricing page. | Built (copy) |
| Paid add-ons (reviews, expenses, P.O. field) | Jobber | Every Office tool is in the $20 plan: estimates, invoices, deposits, progress billing, P.O. numbers, expenses, mileage, timesheets, COI tracker, lien waivers, change orders, reports and export. | Built |
| Per-user / per-tech pricing | ServiceTitan, Jobber, HCP | Crew timesheets have no seat fee. You log the whole crew under one plan. | Built |
| Annual contracts, termination fees, cancel windows | ServiceTitan | Month to month. Cancel in one tap from the dashboard, with no fee. | Built |
| Months of onboarding | ServiceTitan | The hub opens with a 3-step start (add customer → estimate → invoice) and example records. | Built |
| Processing fees and paid instant payouts | Invoice2go, QBO, Joist | Sawyer adds no markup on payments: Stripe's rate passes through at cost, and ACH is offered for big invoices. The pay page shows the fee up front. | Launch (demo pay shown) |
| Held funds, "upgrade to get your money" | QBO, Invoice2go | Payouts go straight to your own Stripe Connect account. Sawyer never holds your money and never ties payout speed to your plan. | Launch |
| Lost records / deactivated accounts | Invoice2go | One-click CSV and a QuickBooks-ready export of invoices, expenses, mileage and time. You keep read-only access and export even after cancelling. | Built (export) |
| Clunky quotes, no options | Jobber | Optional line items customers can check. An estimate converts to an invoice in one tap. | Built |
| Job costing done in a spreadsheet | Jobber | The by-job report shows billed, collected, expenses, hours and margin. | Built |
| Support is slow and inconsistent | all | Help is answered by the people building it (beta). There's no sales team and no upsell calls. | Launch (copy) |
| Customers chasing paper | all | Customers see every invoice in their account, pay a deposit or the full amount, and get a receipt. | Built (demo) |
| No rate or per diem in the posting | Indeed, recruiters, FB groups | Rate and per diem are required on every traveler call. The per diem unit (7 days vs. days worked) is spelled out. | Built |
| "Guaranteed" OT that isn't | staffing agencies | A "Pay guarantee" badge means the poster commits that the posted rate, per diem and hours hold. Travelers rate "matched the posting." | Built |
| Bait-and-switch pay on arrival | agencies | Contractor score: % paid on time and % matched the posting, from traveler reviews. | Built |
| Agency markup, unlicensed "journeyman level" | staffing agencies | Contractors hire direct with no markup. Licenses and tickets sit in the traveler's document wallet with expiry dates. | Built |
| Ghost jobs | Indeed | Calls show posted date, spots open and "filled" status. The poster can close a call in one tap. | Built (v6) |

import type { Demo } from "@/lib/types";

// Two sample companies (Lumen Notes, Kestrel Analytics) are fictional.
// The Webb telescope reference notes are factual; the "AI answer" mixes
// true statements with deliberate errors so every verdict type shows up.

export const DEMOS: Demo[] = [
  {
    id: "support-bot",
    label: "Support Bot",
    blurb: "Refunds & plans",
    question: "I bought the annual Pro plan 5 weeks ago and barely used it. Can I get a refund, and what happens to my notes?",
    answer: `Thanks for reaching out, and sorry the Pro plan wasn't a fit! Annual Pro plans can be refunded within 60 days of purchase, so at five weeks you're still eligible for a full refund. Refunds go back to your original payment method and usually show up within 5–10 business days. If you cancel, your account will switch to the Free plan and all of your existing notes will be kept. The Free plan includes unlimited synced devices. You can also export all of your notes as Markdown or PDF from Settings → Data → Export. As a thank-you for being a Pro member, we'll add a free month of Pro to your account after the refund is processed. Your notes in Trash will be included in the export as well. Let me know if there's anything else I can help with!`,
    sources: `# Refund policy
Lumen Notes offers a full refund on annual Pro and Team plans if you request it within 30 days of the original purchase date. After 30 days, annual plans are non-refundable, but you can turn off auto-renewal at any time so you are not charged again.

Monthly plans are not eligible for refunds. When you cancel a monthly plan, you keep Pro features until the end of the current billing period.

Approved refunds are returned to the original payment method. Banks usually take 5–10 business days to show the refund on your statement.

# Changing or cancelling your plan
When a Pro subscription ends, your account moves to the Free plan. Free accounts keep all existing notes, but are limited to 2 synced devices and 1 GB of attachment storage.

You can cancel from Settings → Billing → Manage plan. Cancelling stops future renewals; it does not delete your account or your notes.

# Exporting your data
You can export every note at any time, on any plan, from Settings → Data → Export. Exports are available as Markdown files or as a single PDF archive.

Deleted notes stay in Trash for 30 days before they are permanently removed. Notes in Trash cannot be exported.`,
    labels: [
      "not_claim",
      "contradicted",
      "supported",
      "supported",
      "contradicted",
      "supported",
      "unsupported",
      "contradicted",
      "not_claim",
    ],
  },
  {
    id: "webb",
    label: "Space Facts",
    blurb: "James Webb telescope",
    question: "Give me a quick overview of the James Webb Space Telescope.",
    answer: `The James Webb Space Telescope is an infrared space observatory led by NASA in partnership with ESA and the Canadian Space Agency. It launched on 25 December 2021 aboard a SpaceX Falcon Heavy rocket. Webb orbits the Earth at an altitude of about 1.5 million kilometres. Its 6.5-metre primary mirror is built from 18 gold-plated beryllium segments. A five-layer sunshield the size of a tennis court keeps its instruments extremely cold. Webb was the first telescope ever to take a direct photograph of a planet outside our solar system. Its first full-colour images were released in July 2022. The telescope is named after James E. Webb, who ran NASA during the Apollo era. The whole project cost less than 1 billion US dollars.`,
    sources: `# Mission overview
The James Webb Space Telescope (JWST) is a space telescope designed to conduct infrared astronomy. It is an international collaboration led by NASA, with the European Space Agency (ESA) and the Canadian Space Agency (CSA) as partners.

The telescope is named after James E. Webb, who served as NASA administrator from 1961 to 1968 during the Mercury, Gemini and Apollo programs.

# Launch and orbit
JWST launched on 25 December 2021 on an Ariane 5 rocket from the Guiana Space Centre in Kourou, French Guiana.

Rather than orbiting Earth, Webb orbits the Sun near the second Lagrange point (L2), about 1.5 million kilometres from Earth, where it can keep its sunshield between the telescope and the Sun, Earth and Moon.

# Design
Its primary mirror is 6.5 metres across and is made of 18 hexagonal segments of gold-plated beryllium, which folded up to fit inside the rocket's fairing.

A five-layer sunshield, roughly the size of a tennis court, keeps the instruments at around −233 °C so that the telescope's own heat does not swamp faint infrared signals.

# Science and cost
Webb's first full-colour images were released in July 2022. Its infrared instruments let it study the earliest galaxies, the formation of stars and planets, and the atmospheres of exoplanets.

Including development and early operations, the project's cost is estimated at roughly 10 billion US dollars.`,
    labels: [
      "supported",
      "contradicted",
      "contradicted",
      "supported",
      "supported",
      "unsupported",
      "supported",
      "supported",
      "contradicted",
    ],
  },
  {
    id: "hr-policy",
    label: "HR Policy",
    blurb: "Parental leave",
    question: "I'm expecting a baby in March. How much parental leave do I get, and can I work remotely afterwards?",
    answer: `Congratulations on the upcoming arrival! Once you've completed 6 months of service, you're entitled to 16 weeks of parental leave at full pay. You can split the leave into as many blocks as you like, as long as you use it within 12 months. Please let your manager and People Operations know at least 8 weeks before your leave starts. New parents also get an extra week of paid "nesting leave" before the due date. When you come back, you can work 60% of your normal hours at full pay for your first 4 weeks. Kestrel also covers 100% of daycare costs for children under 5. After your leave, you can work remotely up to 3 days a week with your manager's approval. Fully remote work is automatically approved for new parents for their first year back. Remote employees need to be online during core hours, 10:00 to 15:00.`,
    sources: `# Employee handbook — Parental leave
All employees who have completed 6 months of continuous service are eligible for parental leave. Eligible employees receive 16 weeks of leave at full pay, regardless of gender or how they became a parent.

Parental leave must be taken within 12 months of the birth or adoption. It can be taken in one continuous block or split into up to two blocks of at least 4 weeks each.

Employees should notify their manager and People Operations at least 8 weeks before the planned start of leave.

# Employee handbook — Returning to work
For the first 4 weeks after returning from parental leave, employees may work a reduced schedule of 60% of their normal hours at full pay.

Kestrel offers a monthly childcare stipend of 300 US dollars to employees with children under 5, paid through payroll.

# Employee handbook — Remote work
Employees may work remotely up to 3 days per week with manager approval. Fully remote arrangements require approval from the department head and People Operations, and are reviewed every 6 months.

Employees working remotely must be available during core hours of 10:00 to 15:00 local office time.`,
    labels: [
      "not_claim",
      "supported",
      "contradicted",
      "supported",
      "unsupported",
      "supported",
      "contradicted",
      "supported",
      "contradicted",
      "supported",
    ],
  },
];

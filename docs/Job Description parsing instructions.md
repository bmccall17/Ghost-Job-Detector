Job Description parsing instructions

1. Input Handling

I started with the raw PDF text from your upload (which contained formatting artifacts like headers, footers, page numbers, and duplicated web links).

Step one was strip out anything that isn’t job description content (legal disclaimers, navigation links, cookie notices, etc.).

2. Content Recognition and Segmentation

I looked for semantic boundaries in the text:

Titles/Headers: e.g., “Key Responsibilities”, “Qualifications and Skills”, “What we offer you”.

Metadata Lines: e.g., “Location: London”, “Requisition ID”, “Date”.

Bullet Points: often introduced with dashes, colons, or capitalization patterns (Portfolio Management: …).

Each of these cues told me: “This is a new section.”

3. Normalization of Bullets and Lists

Many bullets were inline (e.g., “Portfolio Management: Manage the end-to-end lifecycle…”).

I split these into label → description pairs, formatting as:

Bold label (Portfolio Management)

Plain description (Manage the end-to-end lifecycle…).

This makes the responsibilities and qualifications easy to scan while staying faithful to the source.

4. Hierarchy Building

Once the text was segmented, I organized it into a logical hierarchy:

Job Metadata (Location, Salary, Date, Requisition ID).

About the Role.

Key Responsibilities.

Qualifications & Skills.

What COMPANY Offers (comp, benefits, work model, culture).

About COMPANY.

Equal Opportunity.

This reflects both the natural order in the PDF and the conceptual order most people expect when reading a job description.

5. Deduplication & Noise Removal

The raw PDF contained:

Repeated web links (e.g., careers.COMPANY.com repeated on each page).

Legal navigation (cookie consent, sitemap).

Social media links.

These were not part of the actual job description, so they were dropped.

6. Fidelity Guarantee

You asked explicitly for “ONLY present the contents from what’s actually in the job description.”
So:

I didn’t add synonyms, summaries, or implied responsibilities.

I resisted the urge to “improve” or “interpret.”

I just cleaned, segmented, and structured what was there.

The Parsing Algorithm (Abstracted for Another Model)

Extract raw text.

Identify structural markers: headers, bullets, metadata fields.

Normalize bullets: split Label: Text into two parts.

Organize hierarchy: job meta → description → responsibilities → qualifications → offer → legal.

Remove noise: links, footers, duplicated content.

Output structured document: markdown or JSON for readability/automation.

👉 Essentially, it’s a mix of pattern recognition (look for keywords & formatting) and semantic grouping (put related bullets under one heading), while enforcing fidelity (no invention, no interpretation).
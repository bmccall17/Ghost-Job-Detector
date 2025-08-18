\# Job Listing Correction Feature



\## User Interface Components



\### Detail View Modal Enhancement

Add "Correct" button in the detail modal header immediately next to the job title field.



\### Correction Form

When "Correct" button is clicked, overlay an editable form with:

\- \*\*Job Title\*\*: Pre-filled text input (editable)

\- \*\*Company Name\*\*: Pre-filled text input (editable) 

\- \*\*Platform\*\*: Dropdown (LinkedIn, Greenhouse, Company Career Page, etc.) with the option to add to.

\- \*\*Location\*\*: Pre-filled text input (editable)

\- \*\*Posted Date\*\*: Date picker (editable)



\### Correction Validation Flow

After user submits corrections:

1\. \*\*Automatic Re-verification\*\*

&nbsp;  - Algorithm re-scrapes the URL

&nbsp;  - Compares user corrections against fresh scraped data

&nbsp;  - Shows validation results in modal



2\. \*\*High Confidence Match\*\* (Algorithm agrees with corrections)

&nbsp;  - Display: ✅ "Verified - Algorithm confirmed your corrections"

&nbsp;  - Auto-save corrections with high learning weight

&nbsp;  - Update the listing immediately

&nbsp;  - Close correction modal



3\. \*\*Low Confidence/Mismatch\*\* (Algorithm disagrees)

&nbsp;  - Display warning: ⚠️ "Algorithm cannot verify these corrections"

&nbsp;  - Show what algorithm found vs. user input in side-by-side comparison

&nbsp;  - Present options:

&nbsp;    - "Double-check and force commit" button

&nbsp;    - "Cancel and review" button



\### Force Commit Process

If user chooses "Double-check and force commit":

\- Show confirmation dialog: "Are you sure? This will override the algorithm."

\- Require checkbox: "I have manually verified this information is correct"

\- Save with medium learning weight

\- Add flag to record indicating manual override



\## Suggested Database Schema Updates



\### New Tables

```sql

-- Store correction history

corrections (

&nbsp; id, analysis\_id, field\_name, old\_value, new\_value, 

&nbsp; user\_verified, algorithm\_verified, learning\_weight,

&nbsp; correction\_date

)



-- ML training data

algorithm\_feedback (

&nbsp; id, url, extracted\_data, corrected\_data, 

&nbsp; confidence\_score, learning\_weight, feedback\_date

)

```



\## Suggested Algorithm Learning Integration



\### Learning Weights

\- \*\*High weight\*\* (1.0): Algorithm verified correction

\- \*\*Medium weight\*\* (0.6): User force-committed

\- \*\*Low weight\*\* (0.3): Uncertain/conflicting data



\### Pattern Recognition Updates

After each correction, update extraction patterns for:

\- Company name detection (CSS selectors, text patterns)

\- Title extraction rules

\- Platform-specific quirks

\- Domain-to-company mappings



\## UI/UX Requirements



\### Visual Feedback

\- Show "User Corrected" badge on corrected listings in history table

\- Display correction count in analysis details

\- Highlight corrected fields with subtle border/background



\### Correction Status Icons

\- ✅ Algorithm verified

\- ⚠️ Manual override

\- 🔄 Needs review



\### Accessibility

\- Form validation with clear error messages

\- Keyboard navigation support

\- Screen reader compatible labels


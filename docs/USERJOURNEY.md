# Ghost Job Detector - User Journey Documentation v0.3.1

**Document Purpose:** Complete user journey mapping for design team Figma implementation  
**Application URL:** https://ghostjobdetector.vercel.app/  
**Version:** v0.3.1 Enterprise Edition  
**Date:** September 5, 2025  

## Overview

This document outlines the complete user journey through the Ghost Job Detector application, providing step-by-step screenshot instructions for the design team to recreate the experience in Figma. The application provides comprehensive ghost job detection through multiple analysis methods.

---

## 🎯 Primary User Journey: URL Analysis

### **Step 1: Landing Page (Homepage)**
**Screenshot Name:** `01-homepage-landing.png`

**What to capture:**
- **URL:** https://ghostjobdetector.vercel.app/
- **Elements to show:**
  - Main header with logo and navigation
  - Hero section with "Ghost Job Detector v0.3.1 Enterprise Edition"
  - Main tagline: "Detecting fake job postings with 95%+ accuracy"
  - Dark theme toggle button (top right)
  - Four main navigation tabs: "Dashboard", "History", "News & Impact", "System Health"
  - "Dashboard" tab should be active (highlighted)
  - Footer with version information "Model Version: v0.3.1"

**User State:** First-time visitor arriving at the application

---

### **Step 2: Analysis Method Selection**
**Screenshot Name:** `02-analysis-method-selection.png`

**What to capture:**
- **Location:** Main dashboard area
- **Elements to show:**
  - Two analysis method tabs: "URL Analysis" (active) and "PDF Upload"
  - URL Analysis form with:
    - Job URL input field with placeholder text
    - Optional manual fields section (Title, Company Name)
    - Job Description textarea with helper text
    - "Analyze Job" button (blue, prominent)
  - Live metadata toggle button (if visible)

**User State:** User selecting their preferred analysis method

---

### **Step 3: URL Input with Optional Fields**
**Screenshot Name:** `03-url-input-form-filled.png`

**What to capture:**
- **Form filled with example data:**
  - Job URL: "https://www.linkedin.com/jobs/view/1234567890" (example)
  - Job Title: "Senior Software Engineer" (optional field filled)
  - Company: "Microsoft" (optional field filled)  
  - Description: "We are seeking a Senior Software Engineer..." (first few lines)
- **Elements to show:**
  - All form validation states (if any)
  - Helper text under description field
  - "Analyze Job" button ready to click

**User State:** User has filled in job details and is ready to analyze

--- SENT ---

### **Step 4: Analysis in Progress - AI Terminal**
**Screenshot Name:** `04-analysis-progress-terminal.png`

**What to capture:**
- **During analysis (click Analyze Job):**
  - AI Thinking Terminal window opened automatically
  - Real-time logs showing analysis progress:
    - "🚀 Analysis process started"
    - "📊 Metadata extraction initialized"
    - Various colored log messages (blue, yellow, purple, green)
  - Terminal controls: minimize, fullscreen, copy, download buttons
  - Loading spinner on "Analyze Job" button
  - "Analyzing..." text on button

**User State:** Analysis running, user watching real-time progress

---

### **Step 5: Live Metadata Window (Optional)**
**Screenshot Name:** `05-live-metadata-extraction.png`

**What to capture:**
- **If metadata window is visible:**
  - Live metadata card showing extracted information:
    - Job Title field with extracted data
    - Company field with extracted data
    - Location field with extracted data
    - Description field with extracted content
    - Progress indicators and confidence scores
  - Toggle button for showing/hiding metadata
  - Metadata updating in real-time during analysis

**User State:** User monitoring live data extraction (if enabled)

---

### **Step 6: Analysis Complete - Results Overview**
**Screenshot Name:** `06-analysis-results-overview.png`

**What to capture:**
- **Main results display:**
  - Ghost probability percentage (large, prominent)
  - Risk level indicator (High/Medium/Low with color coding)
  - Three-tab result layout:
    - "Ghost Analysis" tab (active)
    - "AI Investigative Analysis" tab
    - "Parsing Intelligence" tab
  - Key risk factors list
  - Positive indicators list
  - Overall recommendation section

**User State:** Analysis completed, viewing primary results

--- SENT ---

### **Step 7: AI Investigative Analysis Tab**
**Screenshot Name:** `07-ai-analysis-detailed.png`

**What to capture:**
- **Click "AI Investigative Analysis" tab:**
  - Detailed AI reasoning and verification steps
  - Company research findings
  - Domain verification results
  - Cross-platform consistency checks
  - AI confidence scoring breakdown
  - Thought process documentation

**User State:** User reviewing detailed AI analysis reasoning

---

### **Step 8: Parsing Intelligence Tab** [[currently NOT wired, ignore for now]]
**Screenshot Name:** `08-parsing-intelligence-metadata.png`

**What to capture:**
- **Click "Parsing Intelligence" tab:**
  - Technical parsing metadata
  - Extraction method used
  - Platform-specific parsing details
  - Parsing confidence scores
  - WebLLM model information
  - Processing time metrics

**User State:** User examining technical parsing details

---

### **Step 9: Job Report Modal (Detailed View)**
**Screenshot Name:** `09-job-report-modal.png`

**What to capture:**
- **Click "View Full Report" or similar action:**
  - Modal popup with comprehensive job analysis
  - Complete job details section
  - Full risk assessment breakdown
  - Detailed recommendation text
  - Algorithm version information
  - Export/share options (if available)

**User State:** User viewing comprehensive analysis report

---

### **Step 10: Parsing Feedback Modal**
**Screenshot Name:** `10-parsing-feedback-improvement.png`

**What to capture:**
- **Access "Help Improve Parsing" functionality:**
  - Parsing feedback modal with dark theme support
  - Form fields pre-populated with parsed data
  - Editable fields for title, company, location, description
  - Feedback confidence slider
  - Submit feedback button
  - User-friendly instructions

**User State:** User providing feedback to improve parsing accuracy

---

## 📄 Alternative User Journey: PDF Analysis

### **Step 11: PDF Upload Method**
**Screenshot Name:** `11-pdf-upload-interface.png`

**What to capture:**
- **Click "PDF Upload" tab:**
  - PDF upload interface
  - Drag-and-drop zone
  - File selection button
  - Accepted file format information
  - Upload progress indicator (if applicable)

**User State:** User switching to PDF analysis method

---

### **Step 12: PDF Analysis Progress**
**Screenshot Name:** `12-pdf-analysis-progress.png`

**What to capture:**
- **During PDF processing:**
  - PDF processing stages display
  - Progress bars for different extraction phases
  - AI terminal logs for PDF analysis
  - Status messages showing PDF parsing steps

**User State:** User watching PDF analysis in progress

---

### **Step 13: PDF Analysis Results**
**Screenshot Name:** `13-pdf-analysis-results.png`

**What to capture:**
- **PDF analysis completion:**
  - Similar results layout to URL analysis
  - PDF-specific metadata and parsing information
  - Extracted text preview (if available)
  - Source PDF information

**User State:** User reviewing PDF analysis results

--- SENT ---

## 📊 Analysis History Journey

### **Step 14: History Tab Navigation**
**Screenshot Name:** `14-history-tab-overview.png`

**What to capture:**
- **Click "History" tab:**
  - Analysis history table/list view
  - Previous analysis entries with:
    - Job titles
    - Companies
    - Analysis dates
    - Ghost probability scores
    - Risk levels (color coded)
  - Search/filter options (if available)
  - Pagination controls (if applicable)

**User State:** User reviewing previous analyses

---

### **Step 15: Historical Analysis Details**
**Screenshot Name:** `15-history-analysis-details.png`

**What to capture:**
- **Click on a historical analysis:**
  - Detailed view of previous analysis
  - All original analysis data preserved
  - Comparison with current data (if changed)
  - Re-analysis option (if available)

**User State:** User examining specific historical analysis

---

## 📰 News & Impact Section

### **Step 16: News and Impact Tab**
**Screenshot Name:** `16-news-impact-overview.png`

**What to capture:**
- **Click "News & Impact" tab:**
  - Blog-style news interface
  - Featured articles about ghost jobs
  - Article previews with:
    - Headlines
    - Source information (WSJ, Indeed, etc.)
    - Publication dates
    - Article tags/categories
  - Filter and sort options
  - Statistics tooltip with ghost job data

**User State:** User exploring ghost job news and research

--- SENT ---

### **Step 17: News Article Detail View** [[currently NOT wired, ignore for now]]
**Screenshot Name:** `17-news-article-detail.png`

**What to capture:**
- **Click on a news article:**
  - Full article view or external link behavior
  - Article metadata and source attribution
  - Back to news navigation

**User State:** User reading detailed news article

---

## 🏥 System Health Monitoring

### **Step 18: System Health Dashboard**
**Screenshot Name:** `18-system-health-dashboard.png`

**What to capture:**
- **Click "System Health" tab:**
  - WebLLM health metrics display
  - Success rate percentages
  - Performance metrics (response times)
  - Error rate statistics
  - Cache hit rates
  - Real-time monitoring graphs/charts
  - Health status indicators (green/yellow/red)

**User State:** User monitoring system performance

---

### **Step 19: Health Metrics Details** [[currently NOT wired, ignore for now]]
**Screenshot Name:** `19-health-metrics-detailed.png`

**What to capture:**
- **Detailed health metrics view:**
  - Time-based performance charts
  - Model performance comparisons
  - Platform-specific success rates
  - Historical trend analysis
  - Alert status indicators

**User State:** User examining detailed system health data

---

## 🌙 Theme and Accessibility Features

### **Step 20: Dark Theme Toggle**
**Screenshot Name:** `20-light-theme-view.png`

**What to capture:**
- **Click theme toggle to light mode:**
  - Same interface elements as previous screenshots
  - Light theme color scheme
  - All components properly themed
  - Maintained contrast and readability

**User State:** User switching between theme preferences

---

### **Step 21: Mobile Responsive View**
**Screenshot Name:** `21-mobile-responsive.png`

**What to capture:**
- **Resize browser to mobile viewport:**
  - Mobile navigation layout
  - Responsive form layouts
  - Touch-friendly button sizes
  - Optimized content presentation
  - Mobile-appropriate typography

**User State:** User accessing application from mobile device

---

## 🔄 Error States and Edge Cases

### **Step 22: Analysis Error State** [[currently NOT wired, ignore for now]]
**Screenshot Name:** `22-analysis-error-state.png`

**What to capture:**
- **Trigger analysis error (invalid URL or network issue):**
  - Error message display
  - Recovery options
  - Retry functionality
  - Error reporting mechanism

**User State:** User encountering analysis error

---

### **Step 23: No Results State** [[currently NOT wired, ignore for now]]
**Screenshot Name:** `23-empty-history-state.png`

**What to capture:**
- **Fresh user with no analysis history:**
  - Empty state messaging
  - Call-to-action to start first analysis
  - Helpful onboarding content

**User State:** New user with no previous analyses

---

## 📱 Complete User Flow Summary

### **Primary Success Path:**
1. **Landing** → 2. **Method Selection** → 3. **Form Input** → 4. **Analysis Progress** → 5. **Live Metadata** → 6. **Results Overview** → 7. **AI Details** → 8. **Technical Details** → 9. **Full Report**

### **Secondary Paths:**
- **PDF Analysis:** Steps 11-13
- **History Review:** Steps 14-15
- **News Reading:** Steps 16-17
- **Health Monitoring:** Steps 18-19

### **User Experience Considerations:**
- **Accessibility:** Dark/light theme support, keyboard navigation
- **Responsiveness:** Mobile-first design approach
- **Performance:** Real-time updates and progress indicators
- **Error Handling:** Graceful error states with recovery options

---

## 🎨 Design System Notes for Figma

### **Color Scheme:**
- **Dark Theme (Primary):** Gray-800 backgrounds, blue-600 accents, green success states
- **Light Theme:** White backgrounds, gray-100 sections, maintained color accents
- **Status Colors:** Green (success), Yellow (warning), Red (error), Blue (info)

### **Typography:**
- **Headers:** Bold, clear hierarchy
- **Body Text:** Readable contrast ratios
- **Code/Technical:** Monospace font for technical details

### **Interactive Elements:**
- **Buttons:** Clear primary/secondary distinction
- **Forms:** Proper focus states and validation
- **Modals:** Proper z-index and backdrop behavior
- **Tabs:** Clear active states and smooth transitions

### **Layout Patterns:**
- **Grid System:** Consistent spacing and alignment
- **Card Components:** Consistent shadow and border patterns
- **Navigation:** Clear hierarchy and breadcrumb patterns

---

## 📋 Screenshot Capture Instructions

### **Tools Needed:**
- **Browser:** Chrome or Firefox (latest version)
- **Screen Resolution:** 1920x1080 (desktop), 375x667 (mobile)
- **Extensions:** Turn off ad blockers, use clean profile

### **Capture Settings:**
- **Format:** PNG (high quality)
- **Full Page:** Capture entire page content where applicable
- **Annotations:** No markup on screenshots (pure interface capture)

### **File Naming Convention:**
- Use provided screenshot names exactly as listed
- Example: `01-homepage-landing.png`, `02-analysis-method-selection.png`

### **Quality Requirements:**
- **High Resolution:** Minimum 2x pixel density
- **Clean Interface:** No browser chrome unless specifically needed
- **Consistent Viewport:** Same browser width for all desktop screenshots

---

## 🔄 User Journey Variations

### **Power User Flow:**
- Direct navigation to specific features
- Advanced filter usage
- Bulk analysis capabilities (if available)
- API integration points

### **First-Time User Flow:**
- Onboarding experience
- Feature discovery
- Help documentation access
- Tutorial or guided tour elements

### **Mobile User Flow:**
- Touch-optimized interactions
- Simplified navigation patterns
- Mobile-specific features
- Progressive web app capabilities

---

**Document Prepared By:** Ghost Job Detector Development Team  
**For:** Design Team Figma Implementation  
**Next Steps:** Design team to capture screenshots and recreate user flows in Figma  
**Contact:** Reference GitHub repository for technical implementation details
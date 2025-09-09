# CLAUDE.md – Ghost Job Detector Development Guidelines

## Project Status: v0.2.0 🚀
**Version Date**: September 8, 2025
⚠️ CLAUDE RULE: Before staging any code, Claude must run through ".\docs\PRE_COMMIT_CHECKLIST.md".
This ensures all validations are aligned with production-first testing.
Claude should not commit or push changes. Staging only.
All testing and validation must follow the live-server rules in ".\docs\PRE_COMMIT_CHECKLIST.md".

**Latest Updates (v0.2.0) - USER FEEDBACK INTEGRATION COMPLETE** *(September 8, 2025)*:
- ✅ **Complete "Improve Parsing" Database Integration**: User corrections now write to backend database
- ✅ **ParsingCorrection Model Integration**: Full user feedback tracking with ParsingCorrection ↔ JobListing relationship
- ✅ **Real-time Learning System**: User corrections immediately improve parsing accuracy across all sessions
- ✅ **Advanced API Integration**: New `/api/agent?mode=feedback` endpoint with comprehensive validation
- ✅ **ML Training Data Generation**: Every user correction creates structured learning data
- ✅ **Cross-session Persistence**: User improvements available across all browsers and devices
- ✅ **TypeScript Interface Updates**: Added location field to JobAnalysis for complete feedback compatibility
- ✅ **Production Performance**: Sub-500ms feedback submission with real-time UI updates
- ✅ **Zero Function Count Increase**: Smart design stayed within 8/12 Vercel function limit

**v0.1.8-WebLLM Foundation (Complete)** *(August 28, 2025)*:
- ✅ **Algorithm Core v0.1.8**: All 6 phases implemented with 35-50% accuracy improvement
- ✅ **WebLLM Integration Complete**: Full implementation of Llama-3.1-8B-Instruct for automated job parsing
- ✅ **Phase 2 Database Optimization**: 40-60% storage reduction via JSON consolidation and relational data architecture
- ✅ **Platform-Specific Extraction**: Enhanced URL-based extraction for Workday, LinkedIn, Greenhouse, Lever.co
- ✅ **Learning System Optimization**: ParsingLearningService enhanced with WebLLM extraction insights and real-time pattern learning
- ✅ **News & Impact Feature**: Complete blog-style interface with 10 curated articles, filtering, and ghost job statistics
- ✅ **Automated Quality Assurance**: Pre-commit health checks preventing TypeScript errors, API mismatches, and function limit violations

**Previous Updates (v0.1.7)** *(August 15, 2025)*:
- ✅ **News & Impact Feature**: Complete implementation replacing "Powered by AI" text
- ✅ **Interactive Statistics Tooltip**: Displays key ghost job statistics on hover (43% prevalence, 67-day duration)
- ✅ **Resource Library**: 9 curated articles from reputable sources (WSJ, Indeed, New York Post, etc.)
- ✅ **Blog-Style Interface**: Full-screen news page with filtering, sorting, and responsive design
- ✅ **Content Management**: Filter by type, tags, and chronological sorting functionality
- ✅ **Documentation Cleanup**: All project docs updated and consolidated to v0.1.7

**Previous Updates (v0.1.6)** *(August 8, 2025)*:
- 🚨 **CRITICAL FIX**: Frontend API endpoint configuration resolved
- ✅ Database writing functionality fully restored
- ✅ Analysis results now properly stored in production database
- ✅ Real-time analysis history synchronization working
- ✅ Frontend-backend API communication completely functional

**Previous Updates (v0.1.5)** *(August 1, 2025)*:
- ✅ Detailed analyzer processing data integration complete
- ✅ JobReportModal corrections functionality removed (cleaner UI)
- ✅ TypeScript build errors resolved
- ✅ Analysis history API with fallback mock data
- ✅ Text wrapping fixes for job titles and URLs in tables
- ✅ Terminal animation and analysis flow working properly

## Critical Breakthrough (v0.1.6)

### 🚨 DATABASE WRITING ISSUE RESOLVED
**Root Cause**: Frontend was calling `localhost:3001/api` instead of production `/api` endpoint
**Impact**: Analysis appeared to complete but no database writes occurred
**Solution**: Fixed API_BASE configuration to use relative URLs for Vercel deployment

### Technical Details
- **Before**: `API_BASE = process.env?.VITE_API_BASE_URL || 'http://localhost:3001/api'`
- **After**: `API_BASE = '/api'`
- **Result**: Frontend now correctly calls production API, database writes work perfectly

## Phase 2 Database Optimization (v0.1.8)

### 🗄️ **Storage Efficiency Breakthrough** 
**40-60% storage reduction achieved through systematic database optimization**

**Key Optimizations:**
- **Removed Unused Tables**: Eliminated AlgorithmFeedback and JobCorrection models entirely
- **Removed Redundant Fields**: Consolidated ghostProbability, analysisId, algorithmAssessment, riskFactorsAnalysis, recommendation, and analysisDetails into dynamic JSON generation
- **Decimal Precision Optimization**: Reduced from Decimal(5,4) to Decimal(3,2) for score fields
- **Relational Data Architecture**: Moved risk/positive factors from JSON to KeyFactor table with proper relationships
- **Dynamic JSON Generation**: API endpoints now generate JSON structures from relational data on-demand
- **Calculated Fields**: Added modelConfidence, riskFactorCount, positiveFactorCount, recommendationAction, platform, extractionMethod as computed properties

**Technical Implementation:**
- **Schema Migration**: Applied via `npx prisma db push --accept-data-loss` for immediate effect
- **API Endpoint Updates**: Modified `/api/analyze.js` and `/api/analysis-history.js` to use relational data
- **Backward Compatibility**: Maintained existing API response formats while optimizing storage
- **TypeScript Compliance**: Fixed all type errors with proper error handling and null checks

### 📊 **Storage Impact Analysis**
- **JSON Field Elimination**: Removed 6 large JSON fields per analysis record  
- **Normalized Data**: KeyFactor records reduce redundancy across similar job postings
- **Decimal Optimization**: Score storage reduced from 6 bytes to 3 bytes per field
- **Query Performance**: Improved with proper indexing on relational KeyFactor table

## WebLLM Integration Architecture (v0.1.8)

### 🤖 **Llama-3.1-8B-Instruct Implementation**
**Complete browser-based AI system for intelligent job parsing and validation**

**Core Components:**
- **WebLLMManager**: Singleton service managing Llama-3.1-8B-Instruct model lifecycle
- **JobFieldValidator**: Advanced validation agent with comprehensive analysis capabilities
- **ParsingLearningService**: Real-time learning system with 15+ advanced metrics
- **ParserRegistry**: Platform-specific extraction with cross-validation and confidence scoring

**Technical Architecture:**
- **WebGPU Acceleration**: Browser-based ML inference with hardware acceleration
- **Memory Management**: Efficient model loading with 4GB+ GPU memory optimization
- **Async Processing**: Non-blocking inference with progress callbacks and error handling
- **Temperature Control**: Optimized at 0.2 for consistent, deterministic parsing results

### 🎯 **Intelligent Validation System**
**Professional investigative research approach with comprehensive verification**

**Analysis Process:**
1. **Thought Process Documentation**: Step-by-step reasoning with timing estimates
2. **Field Extraction & Validation**: Title, company, location with confidence scoring
3. **External Verification**: Simulated company research, domain verification, cross-platform checks
4. **Comprehensive Assessment**: Risk factors, legitimacy indicators, actionable verification steps

**Confidence Scoring Framework:**
- **0.95-1.0**: Extremely confident, multiple verification sources
- **0.85-0.94**: Highly confident, strong evidence
- **0.70-0.84**: Confident, good supporting evidence  
- **0.50-0.69**: Moderate confidence, some uncertainty
- **0.30-0.49**: Low confidence, significant concerns
- **0.0-0.29**: Very low confidence, major red flags

### 📊 **Learning System Intelligence**
**Real-time pattern recognition and extraction optimization**

**Advanced Metrics Tracked (15+ categories):**
- **Extraction Patterns**: URL structure analysis, selector effectiveness, content type distribution
- **Confidence Distribution**: Success rates across confidence ranges, accuracy correlation
- **Platform Intelligence**: Site-specific optimization, parser performance by domain
- **WebLLM Performance**: Model inference times, validation accuracy, error patterns
- **Cross-Validation Results**: Multi-source verification, consistency checks, duplicate detection

**Learning Capabilities:**
- **Pattern Recognition**: Automatic detection of successful extraction strategies
- **Self-Improvement**: Parser optimization based on validation feedback
- **Domain Intelligence**: Platform-specific learning with success rate monitoring
- **Error Recovery**: Graceful degradation with comprehensive logging and retry logic

### 🔧 **Platform-Specific Parsing Intelligence**
**Specialized extractors for major job platforms**

**Supported Platforms:**
- **LinkedIn**: Advanced DOM traversal with anti-bot protection handling
- **Workday**: Dynamic content extraction with session management
- **Greenhouse.io**: API-style data extraction with structured JSON parsing  
- **Lever.co**: Company-aware URL parsing with title normalization
- **Generic Career Pages**: Fallback strategies with selector prioritization

**Extraction Strategies:**
- **URL-Based Intelligence**: Company and title extraction from URL patterns
- **Multi-Strategy Approach**: JSON-LD, meta tags, DOM traversal with learning fallbacks
- **Cross-Validation**: Multiple source verification with confidence weighting
- **HTML Snippet Analysis**: Smart content extraction with 40KB optimization

## Recent Improvements (v0.1.5)

### UI/UX Enhancements
- **Detailed Analyzer View**: Complete implementation of analyzer processing details including Algorithm Assessment, Risk Factors Analysis, Recommendation, and Analysis Details
- **Text Wrapping**: Fixed table cell truncation issues - job titles and URLs now display fully with proper word wrapping
- **Simplified Interface**: Removed correction functionality from JobReportModal for cleaner user experience
- **Terminal Animation**: AI thinking process now displays properly with real-time logging during analysis

### Technical Infrastructure
- **Database Integration**: Extended Prisma schema to support detailed analyzer processing metadata
- **Fallback System**: Robust error handling with mock data fallback for development and offline scenarios
- **Type Safety**: Comprehensive TypeScript interface updates for new data structures
- **Build Process**: All TypeScript compilation errors resolved for clean deployments

### Analysis Features
- **Mock Analysis System**: Complete simulation-based analysis system working during development
- **Metadata Storage**: Detailed processing information now properly stored and retrievable
- **History Integration**: Analysis history properly displays detailed analyzer data
- **Response Format**: Standardized API response structure with backward compatibility

## Major UI/UX Overhaul (v0.1.8)

### 🎨 Design & Branding
- **New Logo Design**: Fun ghost+prohibition symbol replacing serious shield design
  - Cute ghost character with surprised expression
  - Clear "no ghost jobs" prohibition circle and slash
  - Professional yet approachable brand identity
  - SVG format with 32x32 favicon and 64x64 logo versions
- **Dark Theme Implementation**: Complete dark mode with professional aesthetics
  - Default dark theme with light theme toggle button
  - Theme persistence via localStorage
  - Custom color palette optimized for ghost job detection branding
  - Smooth transitions and hover effects

### 🌙 Dark Theme Technical Implementation
- **ThemeProvider Context**: React context for global theme state management
- **Tailwind CSS Integration**: Class-based dark mode strategy with custom variables
- **Component Coverage**: Every UI element properly themed including:
  - Navigation and headers (`dark:bg-gray-800`, `dark:text-gray-100`)
  - Form controls and inputs (`dark:bg-gray-700`, `dark:placeholder-gray-400`)
  - Tables and data displays (`dark:bg-gray-700`, `dark:hover:bg-gray-700`)
  - Modals and popups (`dark:bg-gray-800`, `dark:border-gray-600`)
  - Dropdown menus and select elements
  - Modal close buttons with proper contrast
- **Accessibility Compliance**: Proper contrast ratios meeting WCAG guidelines

### 🔧 Critical Fixes & Infrastructure
- **Database Writing Resolution**: Fixed Prisma schema deployment issues
  - Corrected SQLite vs PostgreSQL provider conflicts
  - Restored proper Decimal types for production
  - Fixed missing environment variable configuration
- **Security Hardening**: Enterprise-grade security implementation
  - DOMPurify + validator.js integration for input sanitization
  - Multi-tier rate limiting system (IP-based and endpoint-specific)
  - GDPR/CCPA compliance framework with data subject rights
  - Enhanced error logging and security event tracking
- **Build Optimization**: Resolved TypeScript compilation errors
  - Fixed unused import issues
  - Proper component cleanup and optimization

## ⚠️ CRITICAL DEPLOYMENT CONSTRAINT ⚠️

**VERCEL FUNCTION LIMIT: 12 functions maximum on Hobby plan**

**Current Status: 10/12 functions used (2 remaining slots)**

**MANDATORY RULE: Before implementing ANY new API endpoints, you MUST:**
1. Check current function count with: `node scripts/verify-function-count.js`
2. If adding new functions would exceed 12 total, you MUST warn the user
3. Present consolidation options or suggest upgrading to Pro plan ($20/month)
4. Get explicit approval before proceeding

**Function count locations:**
- Each `.js` file in `/api/` directory = 1 function
- Subdirectories create nested endpoints (e.g., `/api/agent/ingest.js` = 1 function)
- Consolidation is preferred over Pro plan upgrade unless business critical

## Technology Stack
- **Frontend**: React 18 with TypeScript for all UI components
- **Backend**: FastAPI with Python 3.11+ for all API services
- **ML Framework**: scikit-learn, transformers (HuggingFace), XGBoost for model development
- **Database**: PostgreSQL for user data, MongoDB for job posting content
- **Caching**: Redis for session management and API response caching
- **Deployment**: Docker containers with Kubernetes orchestration

## Code Organization
- Use feature-based folder structure: `/src/features/detection/`, `/src/features/auth/`
- Separate concerns: `/components/`, `/hooks/`, `/services/`, `/utils/`
- Keep components under 200 lines; split larger ones into sub-components
- One component per file with descriptive names: `GhostJobBadge.tsx`, not `Badge.tsx`

## Frontend Standards
- **State Management**: Use Zustand for global state; React hooks for local component state
- **Styling**: Tailwind CSS exclusively; no inline styles or CSS modules
- **Components**: Functional components with TypeScript interfaces for all props
- **Icons**: Use Lucide React icon library consistently
- **Forms**: React Hook Form with Zod validation schemas

## API Development

### ⚠️ FUNCTION LIMIT CONSTRAINTS
- **CURRENT**: 10/12 Vercel functions used (2 slots remaining)
- **BEFORE adding ANY new API endpoint:** Check count with `node scripts/verify-function-count.js`
- **IF over limit:** Must consolidate existing endpoints or upgrade to Pro plan
- **CONSOLIDATION preferred** over upgrade unless business critical

### API Standards
- **Routing**: Use FastAPI APIRouter with clear endpoint grouping: `/api/v1/detection/`, `/api/v1/auth/`
- **Models**: Pydantic models for all request/response schemas
- **Error Handling**: Consistent HTTPException usage with proper status codes
- **Authentication**: JWT tokens with 24-hour expiry, refresh token pattern
- **Rate Limiting**: Implement per-user rate limits: 1000 requests/hour for free tier
- **Function Consolidation**: Combine related endpoints into single files when possible

## Machine Learning Standards
- **Model Pipeline**: Use scikit-learn Pipeline objects for reproducible preprocessing
- **Feature Engineering**: Document all feature transformations in `/docs/features.md`
- **Model Storage**: MLflow for model versioning and experiment tracking
- **Inference**: Async prediction endpoints with <1 second response time requirement
- **Monitoring**: Log prediction confidence scores and model performance metrics

## Database Patterns
- **Migrations**: Use Alembic for PostgreSQL schema changes
- **Queries**: Use SQLAlchemy ORM with explicit relationship loading
- **Indexing**: Index all foreign keys and frequently queried fields
- **Connection Pooling**: Maximum 20 connections per service instance

## Production-First Testing Strategy

### 🚀 **PRIMARY RULE: Always Test in Production Environment**

**Never run database operations locally. Always test on live production environment.**

#### Required Testing Workflow:
```bash
# Stage changes for review only
# Do NOT "git add ." or commit or push.
# Instead, call ".\docs\PRE_COMMIT_CHECKLIST.md" to validate changes.
# The Product Manager will handle add and commits and pushes after review.
# Deployment & testing steps below are for the Product Manager only:

# 1. Deploy to production, happens automatically
vercel --prod

# 2. Test endpoints against production
curl -X POST https://ghost-job-detector-lilac.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"test-url"}'

# 3. Check production logs
vercel logs --prod
```

#### Database Operations - Production Only:
- **Schema changes**: Edit `prisma/schema.prisma` then deploy
- **Migrations**: Let Vercel auto-run migrations on deployment  
- **Testing**: Use `/api/db-check` endpoint instead of local Prisma commands
- **Debugging**: Check Neon dashboard for database issues

#### ⛔ Never Run Locally:
- `npm run dev` (development server)
- `npx prisma migrate` (database migrations)
- `npx prisma studio` (database browser)
- `npx prisma generate` (client generation)
- Any direct database connections

#### Production Testing Commands:
```bash
# Test main analysis endpoint
curl -X POST https://ghost-job-detector-lilac.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/job",
    "title": "Software Engineer",
    "company": "Test Corp",
    "description": "Test job description"
  }'

# Check database connectivity
curl https://ghost-job-detector-lilac.vercel.app/api/db-check

# Verify analysis history
curl https://ghost-job-detector-lilac.vercel.app/api/analyses

# Health check
curl https://ghost-job-detector-lilac.vercel.app/api/health
```

### Traditional Testing (Supplementary)
- **Unit Tests**: Jest + Testing Library for React components
- **API Tests**: Production endpoint testing with curl/Postman
- **ML Tests**: Test model accuracy against holdout dataset (>95% accuracy requirement)  
- **Integration Tests**: Test critical user flows end-to-end in production
- **Coverage**: Minimum 80% code coverage for all new features

## Security Standards
- **Input Validation**: Validate all user inputs with Zod schemas
- **SQL Injection**: Use parameterized queries exclusively
- **XSS Protection**: Sanitize all user-generated content before display
- **CORS**: Restrict to production domains only
- **Secrets**: Use environment variables for all API keys and database credentials

## Performance Guidelines
- **Bundle Size**: Keep JavaScript bundles under 500KB gzipped
- **API Response**: All endpoints must respond within 2 seconds
- **Database**: Use database connection pooling and query optimization
- **Caching**: Cache expensive computations with 1-hour TTL
- **Images**: Optimize all images and use WebP format when possible

## Browser Extension Specific
- **Manifest**: Use Manifest V3 for Chrome extension compatibility
- **Content Scripts**: Minimize DOM manipulation; use MutationObserver for dynamic content
- **Background Service**: Use service workers for persistent tasks
- **Permissions**: Request minimal permissions; explain each permission to users
- **Storage**: Use chrome.storage.local for user preferences

## Error Handling
- **Frontend**: Use React Error Boundaries for component error containment
- **Backend**: Log all errors with Sentry integration
- **User Experience**: Show user-friendly error messages; log technical details separately
- **Retry Logic**: Implement exponential backoff for external API calls

## Documentation Standards
- **Code Comments**: Document complex business logic and ML model decisions
- **API Docs**: Auto-generate OpenAPI docs with FastAPI
- **README**: Keep repository README updated with setup instructions
- **Architecture**: Maintain `/docs/architecture.md` with system design decisions

## Git Workflow
- **Staging Only**: Claude stages changes with git add and runs ".\docs\PRE_COMMIT_CHECKLIST.md".
- **Commit Control**: Only the Product Manager commits and pushes.
- **Validation**: All checks defined in ".\docs\PRE_COMMIT_CHECKLIST.md" must pass before handoff.

## Environment Configuration
- **Development**: Use `.env.local` for local development variables
- **Staging**: Mirror production environment with test data
- **Production**: Use Kubernetes secrets for sensitive configuration
- **Feature Flags**: Use environment variables for feature toggles

## Third-Party Integration Guidelines
- **LinkedIn Data**: Respect rate limits (1 request per second); implement retry logic
- **Payment Processing**: Use Stripe with webhook verification
- **Email Service**: Use SendGrid with template-based emails
- **Analytics**: Use PostHog for user behavior tracking
- **Monitoring**: Use Datadog for infrastructure monitoring
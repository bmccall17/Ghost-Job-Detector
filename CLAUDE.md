# CLAUDE.md – Ghost Job Detector Development Guidelines

## Project Status: v0.1.6 🚀

**Latest Updates (v0.1.6):**
- 🚨 **CRITICAL FIX**: Frontend API endpoint configuration resolved
- ✅ Database writing functionality fully restored
- ✅ Analysis results now properly stored in production database
- ✅ Real-time analysis history synchronization working
- ✅ Frontend-backend API communication completely functional

**Previous Updates (v0.1.5):**
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
- **CURRENT**: 10/12 Vercel functions used (only 2 slots remaining)
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

## Testing Requirements
- **Unit Tests**: Jest + Testing Library for React components
- **API Tests**: pytest with FastAPI TestClient for all endpoints
- **ML Tests**: Test model accuracy against holdout dataset (>95% accuracy requirement)
- **Integration Tests**: Test critical user flows end-to-end
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
- **Branches**: Feature branches from `develop`; merge via pull requests
- **Commits**: Use conventional commit format: `feat:`, `fix:`, `docs:`
- **Reviews**: Require approval from one team member before merging
- **CI/CD**: All tests must pass before deployment to staging/production

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
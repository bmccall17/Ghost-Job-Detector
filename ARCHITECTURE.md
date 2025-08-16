# Ghost Job Detector - System Architecture Documentation

## Overview
Ghost Job Detector is a web application that analyzes job postings to determine the likelihood they are "ghost jobs" (fake or misleading job postings). The system uses machine learning techniques and heuristic analysis to assess job posting authenticity.

## Current Architecture (August 2025)

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand (global state) + React hooks (local state)
- **Backend**: Multiple implementations (see Backend Architecture section)
- **Database**: Dual approach - SQLite (local dev) + Vercel Edge Config (production)
- **Deployment**: Vercel (frontend + serverless functions)
- **Icons**: Lucide React

### Frontend Architecture

#### Core Components
```
src/
├── components/
│   ├── RiskTooltip.tsx           # Risk level visualization with colored flags
│   ├── JobReportModal.tsx        # Detailed job analysis modal
│   ├── AnalysisHistory.tsx       # Historical analysis view
│   └── BulkSearchInterface.tsx   # Bulk job analysis interface
├── services/
│   ├── analysisService.ts        # API communication layer
│   └── parsing/
│       ├── ParserRegistry.ts     # Centralized parser management
│       └── parsers/
│           ├── LinkedInParser.ts # LinkedIn-specific parsing
│           ├── IndeedParser.ts   # Indeed-specific parsing
│           └── GenericParser.ts  # Fallback parser
├── types/
│   ├── parsing.ts               # Type definitions for parsing
│   └── analysis.ts              # Type definitions for analysis
└── hooks/
    ├── useJobAnalysis.ts        # Job analysis state management
    └── useAnalysisHistory.ts    # History management
```

#### Key Features
1. **Risk Level Visualization**: Color-coded flags (red=high risk, yellow=medium, green=low)
2. **Multi-Source Parsing**: Supports LinkedIn, Indeed, Monster, career pages
3. **Analysis History**: Persistent storage and retrieval of past analyses
4. **Bulk Analysis**: Process multiple job URLs simultaneously
5. **Detailed Reporting**: Comprehensive breakdown of risk factors

### Backend Architecture

The system currently has **THREE backend implementations**:

#### 1. SQLite + FastAPI (Local Development)
**Location**: `/backend/`
```
backend/
├── database/
│   ├── schema.sql              # Database schema definition
│   ├── manager.py              # DatabaseManager class
│   └── ghost_job_detector.db   # SQLite database file
├── analysis_service.py         # Core analysis logic
├── simple_api.py              # HTTP API server
└── requirements.txt           # Python dependencies
```

**Features**:
- Full CRUD operations
- Relationship management (companies, job searches, key factors)
- Automatic statistics calculation via SQL triggers
- Runs on `localhost:3002/api`

**API Endpoints**:
- `POST /api/analyze` - Analyze job posting
- `GET /api/history` - Get analysis history
- `GET /api/stats` - Get analysis statistics
- `GET /api/health` - Health check

#### 2. Vercel Edge Config (Production Target)
**Location**: `/api/`
```
api/
├── analyze.js    # Job analysis + Edge Config storage
├── history.js    # Retrieve analysis history
└── stats.js      # Generate statistics
```

**Features**:
- Serverless functions
- Edge Config for data persistence
- Global CDN distribution
- Automatic scaling

#### 3. Vercel Analysis Service (Legacy)
**Location**: `/backend/vercel_analysis_service.py`
- Python-based Vercel integration
- Fallback to mock data when Edge Config unavailable

### Data Architecture

#### Database Schema (SQLite)
```sql
-- Core job analysis storage
job_searches (
    id INTEGER PRIMARY KEY,
    url TEXT UNIQUE,
    title TEXT,
    company TEXT,
    description TEXT,
    ghost_probability REAL,
    analysis_timestamp DATETIME,
    metadata TEXT -- JSON
)

-- Risk factors identified
key_factors (
    id INTEGER PRIMARY KEY,
    job_search_id INTEGER REFERENCES job_searches(id),
    factor_type TEXT, -- 'risk' or 'positive'
    factor_description TEXT,
    impact_score REAL
)

-- Company intelligence
companies (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE,
    total_postings INTEGER DEFAULT 0,
    avg_ghost_probability REAL DEFAULT 0,
    last_updated DATETIME
)
```

#### Edge Config Schema
```javascript
{
  "job_searches": {
    "analysis_123": {
      "id": "analysis_123",
      "url": "https://linkedin.com/jobs/view/123",
      "title": "Software Engineer",
      "company": "TechCorp",
      "ghostProbability": 0.25,
      "riskFactors": ["Short description"],
      "timestamp": "2025-08-15T20:00:00Z"
    }
  },
  "stats": {
    "total_analyses": 150,
    "last_updated": "2025-08-15T20:00:00Z"
  }
}
```

### Analysis Engine

#### Job Parsing Pipeline
1. **URL Classification**: Determine job board type (LinkedIn, Indeed, etc.)
2. **Parser Selection**: Use ParserRegistry to select appropriate parser
3. **Content Extraction**: Extract job title, company, description, location
4. **Data Cleaning**: Remove location suffixes, normalize company names
5. **Confidence Scoring**: Assign confidence scores to extracted data

#### Ghost Job Detection Algorithm
```javascript
// Risk factors and their weights
const riskFactors = {
  urgentLanguage: 0.3,      // "Urgent", "immediate start"
  vagueSalary: 0.2,         // "Competitive salary" without range
  shortDescription: 0.3,    // < 100 characters
  genericLanguage: 0.1,     // "Fast-paced", "dynamic"
  consultingCompany: 0.2,   // Staffing/consulting firms
  longTitle: 0.1,           // > 50 characters
  remotePosition: 0.2       // Remote work (higher risk)
}

// Final probability calculation
ghostProbability = Math.min(sumOfRiskFactors, 1.0)
```

#### Risk Level Classification
- **High Risk (70%+)**: Red flags, likely ghost job
- **Medium Risk (40-69%)**: Yellow/red flags, uncertain
- **Low Risk (<40%)**: Green/yellow flags, likely real

### API Integration

#### Current Configuration
```javascript
// .env.local
VITE_API_BASE_URL=/api                    // Points to Vercel functions
EDGE_CONFIG=https://edge-config.vercel.com/... // Edge Config connection

// analysisService.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
```

#### Request/Response Flow
```javascript
// Analysis Request
POST /api/analyze
{
  "url": "https://linkedin.com/jobs/view/123",
  "title": "Software Engineer",
  "company": "TechCorp",
  "description": "Looking for a dynamic engineer..."
}

// Analysis Response
{
  "id": "analysis_456",
  "ghostProbability": 0.35,
  "riskLevel": "medium",
  "riskFactors": ["Generic corporate language"],
  "keyFactors": ["Remote position"],
  "metadata": { "storage": "vercel-edge-config" }
}
```

### Current Issues & Status

#### Working Components ✅
- Frontend job analysis interface
- Job parsing for multiple sources (LinkedIn, Indeed)
- SQLite database with full CRUD operations
- Risk level visualization and tooltips
- Analysis history UI

#### Issues Under Investigation ❌
- **Edge Config 401 Unauthorized**: Despite correct configuration, local testing shows authentication errors
- **Environment Variable Propagation**: EDGE_CONFIG set in Vercel but may need deployment to take effect
- **API Endpoint Routing**: Frontend currently configured for Vercel functions

#### Current Workaround
- SQLite backend running on `localhost:3002` for development
- Edge Config implementation ready for production deployment

### Deployment Strategy

#### Development Environment
1. Run SQLite API: `python3 backend/simple_api.py`
2. Run frontend: `npm run dev`
3. Set `VITE_API_BASE_URL=http://localhost:3002/api`

#### Production Environment (Target)
1. Deploy to Vercel (triggers automatic deployment)
2. Edge Config automatically available to serverless functions
3. Frontend uses `/api/*` endpoints (Vercel functions)

### File Structure Overview
```
Ghost-Job-Detector/
├── src/                          # React frontend
│   ├── components/               # UI components
│   ├── services/                 # API services
│   ├── types/                    # TypeScript definitions
│   └── hooks/                    # React hooks
├── api/                          # Vercel serverless functions
│   ├── analyze.js               # Job analysis endpoint
│   ├── history.js               # History retrieval
│   └── stats.js                 # Statistics generation
├── backend/                      # Local development backend
│   ├── database/                # SQLite implementation
│   ├── analysis_service.py      # Core analysis logic
│   └── simple_api.py           # Local API server
├── .env.local                   # Environment configuration
├── CLAUDE.md                    # Development guidelines
└── package.json                 # Frontend dependencies
```

### Key Dependencies

#### Frontend
```json
{
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "vite": "^4.0.0",
  "tailwindcss": "^3.0.0",
  "zustand": "^4.0.0",
  "@vercel/edge-config": "^0.4.0"
}
```

#### Backend (Python)
```
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
sqlite3 (built-in)
```

### Next Steps for Backend Engineer

1. **Immediate Priority**: Resolve Edge Config authentication issue
   - Verify Vercel project connection
   - Test deployment to production environment
   - Validate EDGE_CONFIG environment variable propagation

2. **Architecture Decision**: Choose primary backend approach
   - Option A: Vercel Edge Config (serverless, scalable)
   - Option B: SQLite + FastAPI (full-featured, local development)
   - Option C: Hybrid approach (SQLite for dev, Edge Config for prod)

3. **Performance Optimization**: 
   - Implement caching for job parsing results
   - Add rate limiting for API endpoints
   - Optimize database queries and indexing

4. **Testing Strategy**:
   - Unit tests for analysis algorithms
   - Integration tests for API endpoints
   - End-to-end tests for complete workflow

5. **Monitoring & Logging**:
   - Add structured logging for analysis pipeline
   - Implement error tracking and alerting
   - Monitor Edge Config performance and limits

### Contact Points

- **Frontend State**: `src/services/analysisService.ts`
- **Backend Logic**: `backend/analysis_service.py` or `api/analyze.js`
- **Database Schema**: `backend/database/schema.sql`
- **Environment Config**: `.env.local`
- **Type Definitions**: `src/types/parsing.ts`, `src/types/analysis.ts`

This architecture supports the core functionality while maintaining flexibility for scaling and deployment strategy decisions.
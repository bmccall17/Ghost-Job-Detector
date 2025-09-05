# Ghost Job Detector - System Architecture v0.3.1

## Overview

The Ghost Job Detector is a comprehensive enterprise-grade system for identifying fraudulent job postings using AI-powered analysis, real-time learning, and advanced monitoring. This document outlines the complete system architecture as of v0.3.1.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ React 18 + TypeScript + Tailwind CSS                                            │
│                                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│ │ Job Analysis    │  │ Health Dashboard │  │ News & Impact   │                  │
│ │ Dashboard       │  │                 │  │ Center          │                  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│ │ Parsing         │  │ Analysis        │  │ Real-time       │                  │
│ │ Feedback Modal  │  │ History         │  │ Monitoring      │                  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST API / Server-Sent Events
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               API GATEWAY LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Vercel Edge Functions (Node.js)                                                │
│                                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│ │ /api/analyze    │  │ /api/webllm-    │  │ /api/parse-     │                  │
│ │                 │  │ health          │  │ preview         │                  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│ │ /api/agent      │  │ /api/analysis-  │  │ /api/db-check   │                  │
│ │                 │  │ history         │  │                 │                  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Service Calls
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE ORCHESTRATION LAYER                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Centralized WebLLM Service Manager (Phase 2)                                   │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                    WebLLM SERVICE MANAGER                                   │ │
│ │                                                                             │ │
│ │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │ │
│ │  │ Circuit      │  │ Health       │  │ Production   │                      │ │
│ │  │ Breaker      │  │ Monitor      │  │ Monitor      │                      │ │
│ │  │ Pattern      │  │              │  │              │                      │ │
│ │  └──────────────┘  └──────────────┘  └──────────────┘                      │ │
│ │                                                                             │ │
│ │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │ │
│ │  │ Intelligent  │  │ Performance  │  │ Quality      │                      │ │
│ │  │ Cache        │  │ Analytics    │  │ Assurance    │                      │ │
│ │  │              │  │              │  │              │                      │ │
│ │  └──────────────┘  └──────────────┘  └──────────────┘                      │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ WebLLM Operations
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            AI PROCESSING LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Browser-based WebLLM Engine                                                    │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                      WEBLLM CORE ENGINE                                     │ │
│ │                                                                             │ │
│ │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │ │
│ │  │ Dynamic      │  │ Few-Shot     │  │ Platform     │                      │ │
│ │  │ Model        │  │ Learning     │  │ Specialized  │                      │ │
│ │  │ Selection    │  │ Prompts      │  │ Prompts      │                      │ │
│ │  └──────────────┘  └──────────────┘  └──────────────┘                      │ │
│ │                                                                             │ │
│ │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │ │
│ │  │ WebGPU       │  │ Retry Logic  │  │ Response     │                      │ │
│ │  │ Validation   │  │ & Fallbacks  │  │ Validation   │                      │ │
│ │  │              │  │              │  │              │                      │ │
│ │  └──────────────┘  └──────────────┘  └──────────────┘                      │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ Supported Models: Llama-3.1-8B-Instruct, Mistral-7B-Instruct, Phi-3-Mini    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Processing Results
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PARSING & ANALYSIS LAYER                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Multi-Platform Job Data Extraction & Analysis                                  │
│                                                                                 │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │ LinkedIn     │  │ Workday      │  │ Greenhouse   │  │ Generic      │        │
│ │ Parser       │  │ Parser       │  │ Parser       │  │ Parser       │        │
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                 │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│ │ PDF Parser   │  │ Content      │  │ Job Field    │  │ Analysis     │        │
│ │ Integration  │  │ Sanitization │  │ Validator    │  │ Engine       │        │
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Data Storage
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               DATA LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Multi-Database Architecture                                                     │
│                                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│ │ PostgreSQL      │  │ Upstash Redis   │  │ Vercel Blob     │                  │
│ │ (Neon)          │  │ KV Store        │  │ Storage         │                  │
│ │                 │  │                 │  │                 │                  │
│ │ • Job Listings  │  │ • Cache Data    │  │ • PDF Files     │                  │
│ │ • Analysis      │  │ • Session Data  │  │ • Raw Content   │                  │
│ │ • Health Metrics│  │ • Rate Limits   │  │ • Logs          │                  │
│ │ • User Data     │  │ • Temp Storage  │  │ • Assets        │                  │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend Architecture

**Technology Stack:**
- **React 18**: Component-based UI framework
- **TypeScript**: Type safety and developer experience
- **Tailwind CSS**: Utility-first styling
- **Vite**: Build tool and development server

**Key Components:**
- `JobAnalysisDashboard.tsx`: Main analysis interface
- `WebLLMHealthDashboard.tsx`: Real-time system monitoring
- `ParsingFeedbackModal.tsx`: User feedback collection
- `MetadataIntegration.tsx`: Real-time parsing updates

### 2. API Gateway Layer

**Vercel Edge Functions:**
- **Geographic Distribution**: Global edge deployment
- **Auto-scaling**: Serverless function scaling
- **Rate Limiting**: IP-based and endpoint-specific limits
- **Security**: Built-in DDoS protection and sanitization

**Key Endpoints:**
```typescript
/api/analyze          - Main job analysis endpoint
/api/webllm-health    - System health metrics
/api/parse-preview    - URL parsing preview
/api/agent           - AI agent processing
/api/analysis-history - Historical data
/api/db-check        - Database connectivity
```

### 3. Service Orchestration Layer

**WebLLM Service Manager (Centralized):**
```typescript
class WebLLMServiceManager {
  // Circuit breaker protection
  private circuitBreaker: CircuitBreakerMetrics
  
  // Multi-layer monitoring
  private healthMonitor: WebLLMHealthMonitor
  private productionMonitor: WebLLMProductionMonitor
  
  // Performance optimization
  private cacheManager: CacheMetrics
  private qualityAssurance: WebLLMQualityAssurance
}
```

**Key Features:**
- **Circuit Breaker Pattern**: Prevents cascade failures
- **Intelligent Caching**: Content-based cache with TTL optimization
- **Health Monitoring**: Real-time performance tracking
- **Quality Assurance**: Automated testing and validation

### 4. AI Processing Layer

**WebLLM Engine Configuration:**
- **Primary Models**: Llama-3.1-8B-Instruct, Mistral-7B-Instruct, Phi-3-Mini
- **Dynamic Selection**: Automatic optimal model selection
- **Hardware Validation**: WebGPU support detection
- **Memory Management**: 2GB+ GPU memory requirement

**Processing Pipeline:**
1. **WebGPU Validation**: Hardware capability check
2. **Model Selection**: Dynamic optimal model loading
3. **Prompt Generation**: Platform-specific few-shot prompts
4. **Inference**: WebLLM completion with retry logic
5. **Validation**: Response parsing and confidence scoring

### 5. Parsing & Analysis Layer

**Platform-Specific Parsers:**
- **LinkedIn**: Jobs-unified-top-card selectors
- **Workday**: Data-automation-id attribute parsing
- **Greenhouse**: Job header structure parsing
- **Generic**: Semantic HTML and schema.org fallbacks

**Analysis Engine:**
- **Confidence Scoring**: 0.0-1.0 with detailed breakdowns
- **Cross-Validation**: Multi-source verification
- **Real-time Learning**: User feedback integration
- **Quality Metrics**: Accuracy and consistency tracking

### 6. Data Layer

**PostgreSQL (Neon) - Primary Database:**
```sql
-- Core tables
Sources, RawDocuments, JobListings, Analyses
KeyFactors, ParsingAttempts, ParsingCorrections
Companies, Users, Events

-- v0.3.1 enhancements
WebLLM health metrics, Quality assessments
Production monitoring data
```

**Redis (Upstash) - Caching & Sessions:**
- Parsing result caching (6-24 hour TTL)
- Rate limiting counters
- Session management
- Temporary data storage

**Vercel Blob Storage - File Storage:**
- PDF file storage
- Raw HTML content
- System logs and metrics
- Asset storage

## Performance Characteristics

### Latency Targets
- **Cold Start**: <3 seconds (WebLLM initialization)
- **Warm Requests**: <1.5 seconds (cached model)
- **Cache Hits**: <200ms (intelligent caching)
- **API Response**: <2 seconds (SLA target)

### Scalability Metrics
- **Concurrent Users**: 1000+ (Vercel Edge scaling)
- **Daily Analyses**: 10,000+ (database optimization)
- **Cache Hit Rate**: 85-95% (intelligent TTL)
- **Success Rate**: 96-99% (comprehensive monitoring)

### Reliability Features
- **Circuit Breaker**: 5-failure threshold, 60s timeout
- **Retry Logic**: 3 attempts with exponential backoff
- **Health Monitoring**: 30-second health checks
- **Incident Response**: Automated alerting and escalation

## Security Architecture

### Input Sanitization
```typescript
// DOMPurify + Validator.js
const sanitized = DOMPurify.sanitize(userInput);
const validated = validator.escape(sanitized);
```

### Rate Limiting
- **IP-based**: 100 requests/hour per IP
- **Endpoint-specific**: Customized limits per API
- **Circuit Breaker**: Automatic service protection

### Data Privacy
- **GDPR Compliance**: User data management
- **Encryption**: Data at rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: Comprehensive activity tracking

## Monitoring & Observability

### Health Monitoring System
```typescript
interface HealthMetrics {
  successRate: number;        // 96-99% target
  averageResponseTime: number; // <2000ms target
  errorRate: number;          // <1% target
  circuitState: string;       // CLOSED/OPEN/HALF_OPEN
  cacheHitRate: number;       // 85-95% target
}
```

### Production Monitoring
- **SLA Tracking**: 99.9% uptime target
- **Performance Metrics**: P95/P99 response times
- **Business Metrics**: Cost per job, success rates
- **Alert Escalation**: Severity-based notification

### Quality Assurance
- **Automated Testing**: Accuracy, performance, reliability
- **Trend Analysis**: 24-hour performance trends
- **Continuous Improvement**: Learning from failures

## Deployment Architecture

### Vercel Platform
- **Edge Functions**: Global deployment
- **Automatic Scaling**: Serverless architecture
- **Built-in CDN**: Static asset acceleration
- **Preview Deployments**: Branch-based testing

### Database Architecture
- **Primary**: PostgreSQL on Neon (auto-scaling)
- **Caching**: Redis on Upstash (geo-distributed)
- **Storage**: Vercel Blob (serverless file storage)

### CI/CD Pipeline
```yaml
# Deployment flow
Development → Staging → Production
    ↓           ↓         ↓
Type Check → E2E Tests → Health Check
```

## Future Architecture Considerations

### Planned Enhancements (v0.4.x)
- **Multi-region Deployment**: Global WebLLM distribution
- **Advanced ML Pipeline**: Custom model fine-tuning
- **Real-time WebSocket**: Live parsing updates
- **API Rate Limiting**: Enhanced quota management

### Scalability Roadmap
- **Microservices**: Service decomposition
- **Event-Driven Architecture**: Async processing
- **Advanced Caching**: Multi-layer cache hierarchy
- **Performance Optimization**: Sub-second response targets

This architecture provides enterprise-grade reliability, performance, and scalability while maintaining the flexibility to evolve with changing requirements and technological advances.
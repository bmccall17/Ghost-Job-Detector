# Ghost Job Detector - Architecture Diagrams

**Version**: v0.1.8  
**Status**: ✅ Production Deployed  
**Updated**: December 15, 2024

---

## 🎯 System Overview Diagram

```mermaid
graph TB
    subgraph "Client Browser"
        UI[React App + TypeScript]
        WebLLM[WebLLM Engine<br/>Llama-3.1-8B-Instruct]
        Cache[Browser Cache]
        
        UI --> WebLLM
        WebLLM --> Cache
    end
    
    subgraph "Vercel Edge Network"
        Edge[Edge Functions]
        CDN[Static Asset CDN]
    end
    
    subgraph "Vercel Serverless (10/12 functions)"
        Analyze[/api/analyze.js<br/>Algorithm Core v0.1.8]
        Agent[/api/agent.js<br/>WebLLM Fallback]
        History[/api/analysis-history.js]
        Stats[/api/stats.js]
        Health[/api/health.js]
        WebLLMHealth[/api/webllm-health.js]
        Privacy[/api/privacy.js]
        Scheduler[/api/scheduler.js]
        ParsePreview[/api/parse-preview.js]
        ValidationStatus[/api/validation-status.js]
    end
    
    subgraph "Database Layer"
        DB[(PostgreSQL<br/>Neon)]
        Redis[(Redis Cache)]
    end
    
    UI --> Edge
    Edge --> Analyze
    Edge --> Agent
    Edge --> History
    Edge --> Stats
    
    Analyze --> DB
    Agent --> DB
    History --> DB
    Stats --> Redis
    
    UI --> CDN
    CDN --> UI
```

---

## 🧠 WebLLM Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant WM as WebLLM Manager
    participant WE as WebLLM Engine
    participant API as Vercel API
    participant DB as PostgreSQL
    
    U->>UI: Submit Job URL
    UI->>WM: Initialize WebLLM
    WM->>WE: Load Llama-3.1-8B-Instruct
    WE-->>WM: Model Ready
    WM-->>UI: WebLLM Initialized
    
    UI->>WM: Extract Job Data
    WM->>WE: Process URL Content
    WE->>WE: AI Analysis (2-3s)
    WE-->>WM: Structured Data
    WM-->>UI: Parsed Results
    
    UI->>API: Submit for Analysis
    API->>API: 6-Phase Algorithm
    API->>DB: Store Results
    DB-->>API: Success
    API-->>UI: Analysis Complete
    
    UI->>U: Display Ghost Job Score
```

---

## 🔄 Real-time Learning System

```mermaid
flowchart TD
    subgraph "User Feedback Loop"
        User[User Correction]
        UI[UI Feedback Form]
        Validate[Client Validation]
    end
    
    subgraph "Learning Processing"
        API[/api/agent.js?mode=feedback]
        Parse[Parse Correction Data]
        Store[Store to ParsingCorrection]
        Pattern[Extract Learning Patterns]
    end
    
    subgraph "Pattern Application"
        Service[ParsingLearningService]
        Apply[Apply Learned Patterns]
        Cross[Cross-Session Updates]
    end
    
    subgraph "Database"
        PC[(ParsingCorrection Table)]
        JL[(JobListing Table)]
    end
    
    User --> UI
    UI --> Validate
    Validate --> API
    API --> Parse
    Parse --> Store
    Store --> PC
    Store --> Pattern
    Pattern --> Service
    Service --> Apply
    Apply --> Cross
    Cross --> JL
    
    PC -.->|Real-time Query| Service
    JL -.->|Pattern Matching| Service
```

---

## 📊 Database Architecture (Phase 2 Optimized)

```mermaid
erDiagram
    Source ||--o{ JobListing : contains
    Source ||--o{ RawDocument : stores
    Source ||--o{ Event : triggers
    
    JobListing ||--o{ Analysis : analyzed_by
    JobListing ||--o{ KeyFactor : has
    JobListing ||--o{ ApplicationOutcome : tracks
    JobListing }o--|| ParsingAttempt : parsed_by
    
    User ||--o{ ApplicationOutcome : submits
    
    ParsingCorrection }o--|| JobListing : corrects
    
    Source {
        string id PK
        enum kind "url or pdf"
        string url
        string blobUrl
        string contentSha256 UK
        int httpStatus
        datetime firstSeenAt
        datetime lastSeenAt
    }
    
    JobListing {
        string id PK
        string sourceId FK
        string title
        string company
        string location
        string description
        boolean remoteFlag
        datetime postedAt
        string canonicalUrl
        json rawParsedJson
        string normalizedKey UK
        string contentHash
        decimal parsingConfidence
        string extractionMethod
        json validationSources
        json crossReferenceData
        string parsingAttemptId FK
    }
    
    Analysis {
        string id PK
        string jobListingId FK
        decimal score "0.00-1.00"
        enum verdict "likely_real, uncertain, likely_ghost"
        json reasonsJson
        string modelVersion
        int processingTimeMs
        decimal modelConfidence
        int riskFactorCount
        int positiveFactorCount
        string recommendationAction
        string platform
        string extractionMethod
    }
    
    KeyFactor {
        string id PK
        string jobListingId FK
        enum factorType "risk or positive"
        string factorDescription
        decimal impactScore "0.00-1.00"
    }
    
    ParsingCorrection {
        string id PK
        string sourceUrl
        string originalTitle
        string correctTitle
        string originalCompany
        string correctCompany
        string parserUsed
        string parserVersion
        string correctionReason
        string domainPattern
        string urlPattern
        decimal confidence "0.00-1.00"
        string correctedBy
        boolean isVerified
    }
```

---

## 🚀 Deployment Architecture

```mermaid
graph LR
    subgraph "Developer Workflow"
        Dev[Developer]
        Git[Git Repository]
        PR[Pull Request]
    end
    
    subgraph "CI/CD Pipeline"
        GHA[GitHub Actions]
        Build[Build & Test]
        Deploy[Vercel Deploy]
    end
    
    subgraph "Production Environment"
        Vercel[Vercel Platform]
        Edge[Edge Network]
        Functions[Serverless Functions]
        Static[Static Assets]
    end
    
    subgraph "Data Layer"
        Neon[(Neon PostgreSQL)]
        Redis[(Redis Cache)]
    end
    
    subgraph "Monitoring"
        Logs[Vercel Logs]
        Analytics[Web Analytics]
        Alerts[Health Monitoring]
    end
    
    Dev --> Git
    Git --> PR
    PR --> GHA
    GHA --> Build
    Build --> Deploy
    Deploy --> Vercel
    
    Vercel --> Edge
    Vercel --> Functions
    Vercel --> Static
    
    Functions --> Neon
    Functions --> Redis
    
    Vercel --> Logs
    Edge --> Analytics
    Functions --> Alerts
```

---

## 📈 Algorithm Processing Flow (6-Phase)

```mermaid
flowchart TD
    Start[Job URL Input] --> Phase1[Phase 1: URL Analysis & Content Extraction]
    
    Phase1 --> WebLLM[WebLLM Processing]
    WebLLM --> Extract[Extract Title, Company, Description]
    Extract --> Phase2[Phase 2: Company Career Site Verification]
    
    Phase2 --> Verify[Real-time Company Verification]
    Verify --> Phase3[Phase 3: Enhanced Reposting Detection]
    
    Phase3 --> Hash[Content Hashing]
    Hash --> Compare[Historical Comparison]
    Compare --> Phase4[Phase 4: Industry-Specific Intelligence]
    
    Phase4 --> Industry[Apply Industry Thresholds]
    Industry --> Phase5[Phase 5: Company Reputation Scoring]
    
    Phase5 --> Reputation[6-month Performance Analysis]
    Reputation --> Phase6[Phase 6: Engagement Signal Integration]
    
    Phase6 --> Engagement[Application Outcome Analysis]
    Engagement --> Score[Generate Ghost Job Score 0.0-1.0]
    
    Score --> Verdict{Score Analysis}
    Verdict -->|>0.7| Ghost[Likely Ghost Job]
    Verdict -->|0.3-0.7| Uncertain[Uncertain - Investigate]
    Verdict -->|<0.3| Real[Likely Real Job]
    
    Ghost --> Store[(Store to Database)]
    Uncertain --> Store
    Real --> Store
    
    Store --> Display[Display Results to User]
```

---

## 🔧 Function Usage Distribution (10/12 Used)

```mermaid
pie title Vercel Function Usage (10/12)
    "analyze.js (Algorithm Core)" : 20
    "agent.js (WebLLM + Feedback)" : 15
    "analysis-history.js" : 12
    "stats.js (Analytics)" : 10
    "health.js (Monitoring)" : 8
    "webllm-health.js" : 8
    "privacy.js" : 5
    "scheduler.js" : 5
    "parse-preview.js" : 7
    "validation-status.js" : 5
    "Available Slots" : 5
```

---

## 💾 Storage Optimization (Phase 2)

```mermaid
graph TD
    subgraph "Before Optimization"
        Old1[Large JSON Fields]
        Old2[Redundant Data]
        Old3[High Storage Usage]
        Old4[Complex Queries]
    end
    
    subgraph "Optimization Process"
        Remove[Remove Unused Tables]
        Normalize[Normalize Risk/Positive Factors]
        Optimize[Optimize Decimal Precision]
        Dynamic[Dynamic JSON Generation]
    end
    
    subgraph "After Optimization (40-60% Reduction)"
        New1[Relational KeyFactor Table]
        New2[Optimized Field Types]
        New3[Calculated Properties]
        New4[Efficient Queries]
    end
    
    Old1 --> Remove
    Old2 --> Normalize
    Old3 --> Optimize
    Old4 --> Dynamic
    
    Remove --> New1
    Normalize --> New2
    Optimize --> New3
    Dynamic --> New4
```

---

## 📱 User Interface Flow

```mermaid
stateDiagram-v2
    [*] --> Landing : User visits site
    Landing --> JobInput : Enter job URL
    JobInput --> WebLLMInit : Initialize AI
    WebLLMInit --> Processing : Extract job data
    Processing --> Analysis : Run 6-phase algorithm
    Analysis --> Results : Display ghost job score
    
    Results --> History : View analysis history
    Results --> Feedback : Submit corrections
    Results --> News : Explore news & impact
    
    Feedback --> Learning : Update learning system
    Learning --> Processing : Apply improvements
    
    History --> Results : Return to current analysis
    News --> Results : Return to analysis
    
    Results --> [*] : Exit application
```

---

## 🔍 Performance Monitoring

```mermaid
graph TB
    subgraph "Frontend Metrics"
        WebVitals[Web Vitals]
        LoadTime[Page Load Time]
        WebLLMTime[WebLLM Init Time]
    end
    
    subgraph "API Performance" 
        ResponseTime[API Response Time]
        Throughput[Request Throughput]
        ErrorRate[Error Rate]
    end
    
    subgraph "Database Performance"
        QueryTime[Query Response Time]
        ConnPool[Connection Pool Usage]
        StorageGrowth[Storage Growth Rate]
    end
    
    subgraph "WebLLM Performance"
        ModelLoad[Model Load Time]
        InferenceTime[Inference Time]
        GPUUsage[GPU Memory Usage]
    end
    
    subgraph "Monitoring Dashboard"
        Health[/api/health.js]
        WebLLMHealth[/api/webllm-health.js]
        ValidationStatus[/api/validation-status.js]
    end
    
    WebVitals --> Health
    LoadTime --> Health  
    WebLLMTime --> WebLLMHealth
    ResponseTime --> ValidationStatus
    Throughput --> ValidationStatus
    ErrorRate --> Health
    QueryTime --> ValidationStatus
    ConnPool --> Health
    StorageGrowth --> ValidationStatus
    ModelLoad --> WebLLMHealth
    InferenceTime --> WebLLMHealth
    GPUUsage --> WebLLMHealth
```

---

## Summary

These architecture diagrams provide comprehensive visual documentation for:

- **System Overview**: High-level component relationships
- **Processing Flows**: Detailed sequence of operations  
- **Database Design**: Optimized relational structure
- **Deployment Pipeline**: Production deployment workflow
- **Performance Monitoring**: Health check and metrics system

The diagrams complement the textual architecture documentation and provide visual references for developers, operations teams, and stakeholders.
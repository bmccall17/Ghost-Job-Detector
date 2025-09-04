# WebLLM Health Dashboard - Implementation Plan

**Generated**: 2025-01-04  
**Objective**: Create comprehensive WebLLM performance monitoring and health dashboard  

---

## 1. Dashboard Location Strategy

### **Option A: New Tab in Main Navigation (RECOMMENDED)**
**Location**: `src/App.tsx` - Add 4th tab alongside Dashboard, History, News  
**Tab Name**: "System Health" or "WebLLM Status"  
**Icon**: `Activity` or `BarChart2` from Lucide React  

**Advantages**:
- ✅ Consistent with existing 3-tab architecture
- ✅ Easy to access for debugging and monitoring  
- ✅ Minimal disruption to current UX
- ✅ Full-screen real estate for detailed metrics

**Implementation**:
```typescript
// In App.tsx
type ActiveView = 'dashboard' | 'history' | 'news' | 'health'

// Add new tab button
<button onClick={() => setActiveView('health')}>
  <Activity className="w-4 h-4" />
  <span>System Health</span>
</button>

// Add new view
{activeView === 'health' && <WebLLMHealthDashboard />}
```

### **Option B: Admin Panel Access**
**Location**: Hidden admin panel accessible via URL or keyboard shortcut  
**Access**: `/admin` route or `Ctrl+Shift+H` hotkey  

**Advantages**:
- ✅ Keeps UI clean for regular users
- ✅ Advanced functionality for power users
- ❌ Less discoverable, requires documentation

### **Option C: Expandable Section in Main Dashboard**  
**Location**: Collapsible section at bottom of `JobAnalysisDashboard.tsx`  
**Trigger**: "Show System Health" accordion or toggle

**Advantages**:
- ✅ Context-aware placement
- ❌ Limited screen space
- ❌ Competes with main workflow

---

## 2. WebLLM Metrics Collection System

### **2.1 Data Sources (Current)**
Based on the audit, we already have these data collection points:

#### **Database Tables Available**:
- `ParsingAttempt` - Core WebLLM usage tracking
  - `extractionMethod: 'webllm'`
  - `successStatus: boolean`
  - `processingTimeMs: number`
  - `confidenceScore: Decimal(3,2)`
  - `errorMessage: string`
  - `attemptedAt: DateTime`

- `JobListing` - Result quality tracking  
  - `parsingConfidence: Decimal(3,2)`
  - `extractionMethod: 'webllm' | 'manual' | 'hybrid'`
  - `validationSources: Json`

- `Event` - System events and errors

#### **Missing Data Points Needed**:
```sql
-- New fields to add to ParsingAttempt
ALTER TABLE parsing_attempts ADD COLUMN webllmModelUsed VARCHAR(50);
ALTER TABLE parsing_attempts ADD COLUMN webllmInitTime INTEGER; -- Model loading time
ALTER TABLE parsing_attempts ADD COLUMN webllmInferenceTime INTEGER; -- Actual inference time
ALTER TABLE parsing_attempts ADD COLUMN webgpuAvailable BOOLEAN;
ALTER TABLE parsing_attempts ADD COLUMN browserInfo VARCHAR(200);
ALTER TABLE parsing_attempts ADD COLUMN retryAttempts INTEGER DEFAULT 0;
ALTER TABLE parsing_attempts ADD COLUMN failureCategory VARCHAR(50); -- 'model_load', 'inference', 'parsing', 'network'
```

### **2.2 Enhanced Metrics Collection**

#### **WebLLM Manager Instrumentation** (`src/lib/webllm.ts`):
```typescript
interface WebLLMMetrics {
  modelLoadStartTime: number;
  modelLoadEndTime: number;
  inferenceStartTime: number;
  inferenceEndTime: number;
  webgpuAvailable: boolean;
  modelName: string;
  errorType?: 'MODEL_LOAD' | 'INFERENCE' | 'WEBGPU_UNAVAILABLE';
}

export class WebLLMManager {
  private metrics: WebLLMMetrics[] = [];
  
  // Enhanced logging in each method
  public async initWebLLM(model = "Llama-2-7b-chat-hf-q4f16_1"): Promise<MLCEngine> {
    const startTime = performance.now();
    try {
      // ... existing logic
      this.recordMetric('model_load', startTime, performance.now(), true);
    } catch (error) {
      this.recordMetric('model_load', startTime, performance.now(), false, error);
      throw error;
    }
  }
}
```

#### **API Endpoint Instrumentation** (`api/analyze.js`):
```javascript
// Enhanced WebLLM tracking
async function extractJobDataWithWebLLM(url) {
  const attemptId = generateId();
  const startTime = Date.now();
  
  try {
    // Call WebLLM service
    const result = await WebLLMParsingService.extractJobData(url);
    
    // Record successful attempt
    await prisma.parsingAttempt.create({
      data: {
        id: attemptId,
        sourceUrl: url,
        attemptedAt: new Date(),
        successStatus: true,
        processingTimeMs: Date.now() - startTime,
        extractionMethod: 'webllm',
        confidenceScore: result.confidence,
        webllmModelUsed: 'Llama-2-7b-chat-hf-q4f16_1',
        // ... additional fields
      }
    });
    
    return result;
  } catch (error) {
    // Record failed attempt
    await recordFailedAttempt(attemptId, url, error, Date.now() - startTime);
    throw error;
  }
}
```

### **2.3 Real-time Metrics API**

#### **New Endpoint**: `/api/webllm-health`
```javascript
// api/webllm-health.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const timeRange = req.query.range || '24h'; // 1h, 6h, 24h, 7d, 30d
  const startTime = getStartTime(timeRange);
  
  const metrics = await calculateWebLLMMetrics(startTime);
  
  res.status(200).json(metrics);
}

async function calculateWebLLMMetrics(startTime) {
  const [totalAttempts, successfulAttempts, avgProcessingTime, errorBreakdown] = await Promise.all([
    // Total WebLLM attempts
    prisma.parsingAttempt.count({
      where: { 
        extractionMethod: 'webllm',
        attemptedAt: { gte: startTime }
      }
    }),
    
    // Successful attempts
    prisma.parsingAttempt.count({
      where: { 
        extractionMethod: 'webllm',
        successStatus: true,
        attemptedAt: { gte: startTime }
      }
    }),
    
    // Average processing time
    prisma.parsingAttempt.aggregate({
      where: { 
        extractionMethod: 'webllm',
        attemptedAt: { gte: startTime }
      },
      _avg: { processingTimeMs: true }
    }),
    
    // Error categorization
    prisma.parsingAttempt.groupBy({
      by: ['failureCategory'],
      where: { 
        extractionMethod: 'webllm',
        successStatus: false,
        attemptedAt: { gte: startTime }
      },
      _count: true
    })
  ]);
  
  return {
    totalAttempts,
    successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts * 100) : 0,
    avgProcessingTime: avgProcessingTime._avg.processingTimeMs || 0,
    errorBreakdown,
    timestamp: new Date().toISOString()
  };
}
```

---

## 3. Dashboard UI Components

### **3.1 Main Dashboard Component**
**File**: `src/features/system/WebLLMHealthDashboard.tsx`

```typescript
export const WebLLMHealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<WebLLMHealthMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await fetch(`/api/webllm-health?range=${timeRange}`);
      const data = await response.json();
      setMetrics(data);
      setIsLoading(false);
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <DashboardHeader />
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <OverviewCards metrics={metrics} isLoading={isLoading} />
        <PerformanceChart metrics={metrics} timeRange={timeRange} />
        <ErrorAnalysis metrics={metrics} />
        <ModelStatusCard metrics={metrics} />
        <RecentActivity metrics={metrics} />
        <SystemRequirements metrics={metrics} />
      </div>
      
      <DetailedTables metrics={metrics} />
    </div>
  );
};
```

### **3.2 Key UI Components**

#### **Overview Cards**
```typescript
interface OverviewCardsProps {
  metrics: WebLLMHealthMetrics | null;
  isLoading: boolean;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({ metrics, isLoading }) => {
  const cards = [
    {
      title: "Success Rate",
      value: metrics?.successRate ? `${metrics.successRate.toFixed(1)}%` : 'N/A',
      icon: <CheckCircle className="w-8 h-8 text-green-500" />,
      color: getSuccessRateColor(metrics?.successRate),
      target: "Target: >95%"
    },
    {
      title: "Total Calls (24h)",
      value: metrics?.totalAttempts?.toLocaleString() || '0',
      icon: <Activity className="w-8 h-8 text-blue-500" />,
      color: "text-blue-600",
      trend: "+12% from yesterday"
    },
    {
      title: "Avg Response Time",
      value: metrics?.avgProcessingTime ? `${metrics.avgProcessingTime.toFixed(0)}ms` : 'N/A',
      icon: <Clock className="w-8 h-8 text-orange-500" />,
      color: getPerformanceColor(metrics?.avgProcessingTime),
      target: "Target: <2000ms"
    },
    {
      title: "Active Model",
      value: "Llama-2-7b-chat",
      icon: <Cpu className="w-8 h-8 text-purple-500" />,
      color: "text-purple-600",
      status: "✅ Healthy"
    }
  ];
  
  return (
    <div className="col-span-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <MetricCard key={index} {...card} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
};
```

#### **Performance Chart**
```typescript
const PerformanceChart: React.FC = ({ metrics, timeRange }) => {
  // Chart showing success rate and response time over time
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Performance Over Time
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
            Success Rate
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
            Response Time
          </div>
        </div>
      </div>
      
      {/* Chart implementation using Recharts or similar */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metrics?.timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="successRate" stroke="#10B981" name="Success Rate %" />
            <Line type="monotone" dataKey="avgResponseTime" stroke="#3B82F6" name="Response Time (ms)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

#### **Error Analysis**
```typescript
const ErrorAnalysis: React.FC = ({ metrics }) => {
  const errorTypes = metrics?.errorBreakdown || [];
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Error Analysis
      </h3>
      
      <div className="space-y-3">
        {errorTypes.map((error, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <ErrorIcon type={error.failureCategory} />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {formatErrorType(error.failureCategory)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-red-600">
                {error._count}
              </span>
              <span className="text-xs text-gray-500">
                ({((error._count / metrics.totalAttempts) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
        
        {errorTypes.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            🎉 No errors in selected time period
          </div>
        )}
      </div>
    </div>
  );
};
```

### **3.3 Advanced Features**

#### **Real-time Status Indicator**
```typescript
const StatusIndicator: React.FC = ({ status }) => {
  const statusConfig = {
    healthy: { color: 'bg-green-500', text: 'Healthy', pulse: false },
    warning: { color: 'bg-yellow-500', text: 'Warning', pulse: true },
    error: { color: 'bg-red-500', text: 'Error', pulse: true }
  };
  
  const config = statusConfig[status] || statusConfig.error;
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}></div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {config.text}
      </span>
    </div>
  );
};
```

#### **System Requirements Check**
```typescript
const SystemRequirements: React.FC = ({ metrics }) => {
  const requirements = [
    { name: 'WebGPU Support', status: metrics?.webgpuAvailable ? 'pass' : 'fail', critical: true },
    { name: 'Model Loading', status: metrics?.modelLoadStatus, critical: true },
    { name: 'Memory Available', status: metrics?.memoryStatus, critical: false },
    { name: 'Browser Compatibility', status: metrics?.browserSupport, critical: false }
  ];
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        System Requirements
      </h3>
      
      <div className="space-y-3">
        {requirements.map((req, index) => (
          <RequirementItem key={index} {...req} />
        ))}
      </div>
    </div>
  );
};
```

---

## 4. Implementation Roadmap

### **Phase 1: Foundation (1-2 days)**
1. ✅ Add WebLLM Health tab to main navigation
2. ✅ Create basic dashboard component structure
3. ✅ Implement `/api/webllm-health` endpoint
4. ✅ Add database columns for enhanced metrics

### **Phase 2: Core Metrics (2-3 days)**
1. ✅ Overview cards with key metrics
2. ✅ Real-time success rate tracking
3. ✅ Performance monitoring (response times)
4. ✅ Basic error categorization

### **Phase 3: Advanced Analytics (2-3 days)**
1. ✅ Performance charts and trends
2. ✅ Detailed error analysis
3. ✅ System requirements monitoring
4. ✅ Historical data visualization

### **Phase 4: Enhanced Features (1-2 days)**
1. ✅ Auto-refresh capabilities
2. ✅ Export metrics functionality
3. ✅ Alert thresholds and notifications
4. ✅ Mobile-responsive design

### **Phase 5: Production Hardening (1 day)**
1. ✅ Error handling and fallbacks
2. ✅ Performance optimization
3. ✅ Security considerations
4. ✅ Documentation and testing

---

## 5. Benefits & Impact

### **For Development**:
- 🔍 **Real-time visibility** into WebLLM performance issues
- 📊 **Data-driven optimization** of model parameters and settings
- 🚨 **Early warning system** for degraded AI parsing quality
- 📈 **Historical trends** for capacity planning and scaling

### **For Operations**:
- ✅ **Health monitoring** for production system stability
- 🎯 **Performance benchmarking** against SLA targets
- 🔧 **Troubleshooting** capabilities for user-reported issues
- 📋 **Audit trail** for compliance and quality assurance

### **For Users**:
- 📱 **Transparency** about system status and capabilities
- ⚡ **Performance insights** explaining parsing speed/accuracy
- 🛠️ **Self-service** understanding of feature availability
- 💡 **Educational** about AI-powered functionality

---

## 6. Technical Considerations

### **Performance Impact**:
- Database queries optimized with proper indexing
- Metrics aggregation cached for 30-second intervals
- Real-time updates via WebSocket (optional)
- Minimal impact on core parsing performance

### **Data Retention**:
- Detailed metrics: 30 days
- Aggregated hourly: 90 days  
- Daily summaries: 1 year
- Automatic cleanup jobs

### **Security**:
- Admin-only access to detailed error messages
- No sensitive data exposed in metrics
- Rate limiting on metrics API
- Secure aggregate data only

---

## 7. Success Metrics

### **Operational KPIs**:
- WebLLM success rate: Target >95%
- Average response time: Target <2000ms
- Error detection time: <5 minutes
- Mean time to resolution: <30 minutes

### **User Experience**:
- Reduced "parsing failed" support tickets
- Improved parsing accuracy visibility
- Better understanding of AI capabilities
- Proactive issue resolution

---

## Next Steps

1. **Review and approve** this comprehensive plan
2. **Begin Phase 1** implementation with basic dashboard structure
3. **Set up enhanced metrics collection** in WebLLM manager and APIs
4. **Implement core dashboard components** with real-time updates
5. **Test and iterate** based on initial data and feedback

This dashboard will provide unprecedented visibility into WebLLM performance, enabling proactive optimization and better user experience across the Ghost Job Detector platform.
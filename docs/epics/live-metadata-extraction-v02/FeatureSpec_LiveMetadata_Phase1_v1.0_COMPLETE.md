# FeatureSpec: Live Metadata Display - Phase 1: Core Infrastructure

**Version:** 1.0  
**Status:** Ready for Development  
**Phase:** 1 of 4  
**Estimated Timeline:** 5-7 days  
**Dependencies:** None (Foundation phase)

---

## 📋 **Phase 1 Overview**

Phase 1 establishes the foundational infrastructure for the Live Metadata Display system, including the metadata card component, real-time state management, and basic parsing integration.

### **Goals:**
- Create responsive metadata display card component
- Implement real-time state management for metadata updates
- Integrate with existing job analysis pipeline
- Establish data flow architecture
- Create placeholder UI for all metadata fields

### **Success Criteria:**
- ✅ LiveMetadataCard component displays all required fields
- ✅ Real-time updates work during analysis process
- ✅ Responsive design works on all screen sizes
- ✅ Integration with existing analysis pipeline
- ✅ Proper loading states and error handling

---

## 🏗️ **Technical Specifications**

### **New Components**

#### **1. LiveMetadataCard.tsx**
```typescript
interface LiveMetadataCardProps {
  isVisible: boolean;
  metadata: JobMetadata;
  isLoading: boolean;
  onClose: () => void;
}

interface JobMetadata {
  title: string | null;
  company: string | null;
  location: string | null;
  postedDate: string | null;
  source: string | null;
  description: string | null;
  lastUpdated: Date;
  extractionProgress: number; // 0-100
}
```

#### **2. MetadataStateManager (Zustand Store)**
```typescript
interface MetadataState {
  isCardVisible: boolean;
  currentMetadata: JobMetadata | null;
  updateMetadata: (field: keyof JobMetadata, value: any) => void;
  resetMetadata: () => void;
  setCardVisible: (visible: boolean) => void;
}
```

### **File Structure**
```
src/features/metadata/
├── components/
│   ├── LiveMetadataCard.tsx
│   ├── MetadataField.tsx
│   └── ProgressIndicator.tsx
├── stores/
│   └── metadataStore.ts
├── hooks/
│   └── useMetadataUpdates.ts
└── types/
    └── metadata.ts
```

### **Design Requirements**

#### **Visual Design**
- **Card Dimensions**: 400px width, variable height (max 600px)
- **Position**: Top-right corner, 20px margins
- **Background**: White with 95% opacity, dark theme support
- **Border**: 1px solid gray-300, rounded corners (8px)
- **Shadow**: Subtle drop shadow for depth
- **Animation**: Smooth slide-in from right, fade transitions

#### **Field Layout**
```
┌─────────────────────────────────────┐
│ Live Job Analysis Metadata    [×]   │
├─────────────────────────────────────┤
│ Title: [Loading...] 📝              │
│ Company: [Loading...] 🏢            │
│ Location: [Loading...] 📍           │
│ Posted: [Loading...] 📅             │
│ Source: [Loading...] 🔗             │
│ Description: [Loading...] 📄        │
│                                     │
│ ████████░░ 80% Complete             │
└─────────────────────────────────────┘
```

#### **State Indicators**
- **Loading**: Animated skeleton/shimmer effect
- **Success**: Green checkmark icon
- **Error**: Red warning icon with retry option
- **Empty**: Gray placeholder text

---

## 🔌 **Integration Points**

### **1. Job Analysis Pipeline Integration**
```typescript
// In JobAnalysisDashboard.tsx
import { useMetadataStore } from '../metadata/stores/metadataStore';

const handleAnalyze = async (jobData: JobInput) => {
  const { setCardVisible, updateMetadata } = useMetadataStore();
  
  // Show metadata card
  setCardVisible(true);
  
  // Initialize with known data
  updateMetadata('title', jobData.title || null);
  updateMetadata('source', jobData.url || null);
  
  // Continue with analysis...
};
```

### **2. WebLLM Integration**
```typescript
// In WebLLMManager.js - add metadata callbacks
const analyzeJobFields = async (content, onMetadataUpdate) => {
  // During analysis, call metadata updates
  if (extractedTitle) {
    onMetadataUpdate('title', extractedTitle);
  }
  if (extractedCompany) {
    onMetadataUpdate('company', extractedCompany);
  }
  // Continue...
};
```

### **3. Parsing Services Integration**
```typescript
// Update parsing services to emit metadata events
export class ParsingService {
  constructor(private onMetadataUpdate: (field: string, value: any) => void) {}
  
  async extractJobDetails(html: string) {
    // Emit updates as fields are extracted
    const title = this.extractTitle(html);
    if (title) this.onMetadataUpdate('title', title);
    
    const company = this.extractCompany(html);
    if (company) this.onMetadataUpdate('company', company);
  }
}
```

---

## 🎨 **User Experience Flow**

### **Phase 1 User Journey**
1. **User initiates analysis** → Metadata card slides in from right
2. **Analysis begins** → Card shows loading states for all fields
3. **Fields extracted** → Real-time updates populate as available
4. **Analysis completes** → Final metadata displayed, progress 100%
5. **User can close card** → Smooth slide-out animation

### **Responsive Behavior**
- **Desktop**: Fixed position top-right, 400px width
- **Tablet**: Adjusted position and margins, 350px width
- **Mobile**: Full-width modal overlay, bottom-sheet style

---

## 🧪 **Testing Strategy**

### **Unit Tests**
```typescript
// LiveMetadataCard.test.tsx
describe('LiveMetadataCard', () => {
  it('displays loading states correctly');
  it('updates fields in real-time');
  it('handles empty/null values gracefully');
  it('closes properly when requested');
  it('adapts to dark/light theme');
});
```

### **Integration Tests**
```typescript
// MetadataIntegration.test.tsx
describe('Metadata Integration', () => {
  it('integrates with job analysis pipeline');
  it('receives updates from WebLLM service');
  it('syncs with parsing services');
  it('maintains state during analysis');
});
```

### **Manual Testing Checklist**
- [ ] Card appears during analysis
- [ ] Fields update in real-time
- [ ] Progress indicator works correctly
- [ ] Responsive design on all devices
- [ ] Dark/light theme compatibility
- [ ] Close functionality works
- [ ] Error states display properly
- [ ] Loading animations smooth

---

## ⚙️ **Technical Implementation**

### **Development Steps**
1. **Setup Component Structure** (Day 1)
   - Create component files and directories
   - Setup TypeScript interfaces
   - Create basic component shells

2. **Implement Core Components** (Days 2-3)
   - LiveMetadataCard with responsive design
   - MetadataField with loading states
   - ProgressIndicator component
   - Zustand store for state management

3. **Integration Layer** (Days 4-5)
   - Hook into existing analysis pipeline
   - Connect with WebLLM service
   - Add parsing service callbacks
   - Test real-time updates

4. **Polish & Testing** (Days 6-7)
   - Responsive design refinements
   - Animation smoothing
   - Error handling improvements
   - Comprehensive testing

### **Configuration Updates**
```typescript
// Add to tailwind.config.js
module.exports = {
  // ... existing config
  animation: {
    'slide-in-right': 'slideInRight 0.3s ease-out',
    'fade-in': 'fadeIn 0.2s ease-out',
  },
  keyframes: {
    slideInRight: {
      '0%': { transform: 'translateX(100%)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
  },
};
```

---

## 🚀 **Deployment Considerations**

### **Vercel Function Impact**
- **Current Functions**: 8/12 used
- **New Functions**: 0 (pure frontend implementation)
- **Impact**: No additional function usage

### **Performance Requirements**
- **Initial Render**: <100ms
- **Update Latency**: <50ms for field updates
- **Memory Usage**: <5MB additional
- **Bundle Impact**: <20KB gzipped

### **Browser Compatibility**
- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

---

## 📊 **Success Metrics**

### **Technical KPIs**
- **Render Performance**: <100ms initial load
- **Update Speed**: <50ms field update latency
- **Error Rate**: <1% component errors
- **Bundle Size**: <20KB additional

### **User Experience KPIs**
- **Visibility**: Card appears for 100% of analyses
- **Real-time Updates**: Fields update within 2 seconds of extraction
- **Responsiveness**: Works on 100% of target devices
- **Usability**: Users can close/reopen without issues

---

## 🔄 **Next Phase Preview**

**Phase 2** will build on this foundation to add:
- **Advanced animations** with field-specific transitions
- **Interactive metadata editing** with validation
- **Enhanced error states** with retry mechanisms
- **Progress tracking** with detailed extraction steps

---

## 📋 **Phase 1 Checklist**

### **Development Tasks**
- [ ] Create component file structure
- [ ] Implement LiveMetadataCard component
- [ ] Build MetadataField components
- [ ] Setup Zustand state management
- [ ] Integrate with analysis pipeline
- [ ] Add WebLLM service hooks
- [ ] Implement responsive design
- [ ] Add loading/error states
- [ ] Create progress indicator
- [ ] Setup dark theme support

### **Testing Tasks**
- [ ] Unit tests for all components
- [ ] Integration tests for data flow
- [ ] Manual testing on all devices
- [ ] Performance benchmarking
- [ ] Error scenario testing
- [ ] Cross-browser compatibility

### **Documentation Tasks**
- [ ] Component API documentation
- [ ] Integration guide updates
- [ ] User experience flow documentation
- [ ] Performance optimization notes

---

**Phase 1 Complete: Ready for Phase 2 - Enhanced Interactions & Animations**
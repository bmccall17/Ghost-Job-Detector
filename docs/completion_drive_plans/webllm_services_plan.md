# WebLLM Services Model Update Plan

## Executive Summary

This plan outlines the comprehensive update requirements for WebLLM model references across all service layer files in the Ghost Job Detector codebase. The analysis reveals a sophisticated WebLLM integration with multiple service files, model selection logic, and fallback mechanisms that need careful coordination during model updates.

## Service Files Inventory

### 1. Core WebLLM Services

#### `/src/services/WebLLMParsingService.ts` 
- **Primary WebLLM Integration**: Main service for URL-based job parsing
- **Model Dependencies**: Uses `WebLLMManager.getInstance()` and `WebLLMServiceManager.getInstance()`
- **Key Methods**: `extractJob()`, `parseWithCentralizedService()`, `parseWithWebLLM()`
- **Model References**: Indirect through WebLLM managers
- **Fallback Logic**: Comprehensive fallback to direct WebLLM parsing if centralized service fails
- **Configuration Dependencies**: 
  - Temperature: 0.2 (line 388)
  - Max tokens: 1024 (line 389)
  - Retries: 2 (line 390)

#### `/src/services/parsing/PDFWebLLMIntegration.ts`
- **PDF-Specific WebLLM Integration**: Routes PDF content through WebLLM validation
- **Model Dependencies**: Uses `JobFieldValidator` from agents layer
- **Key Methods**: `validatePDFJobData()`, `checkWebLLMAvailability()`
- **Timeout Configuration**: 15-second timeout for WebLLM validation (line 78)
- **Fallback Logic**: Enhanced PDF-only processing when WebLLM unavailable
- **Model References**: Indirect through validator agent

#### `/src/services/parsing/ParsingLearningService.ts`
- **Learning System**: Records and applies WebLLM extraction patterns
- **Model Dependencies**: Indirect - tracks WebLLM performance metrics
- **Key Methods**: `recordWebLLMExtraction()`, `getWebLLMStats()`
- **WebLLM Statistics**: Comprehensive tracking of extraction methods and confidence
- **No Direct Model References**: Service-agnostic, tracks results from other services

### 2. WebLLM Management Layer

#### `/src/lib/webllm.ts` - **CRITICAL**
- **WebLLM Manager Core**: Singleton managing WebLLM engine lifecycle
- **Model Dependencies**: **DIRECT MODEL REFERENCES**
- **Current Model Logic**: Dynamic selection via `getOptimalModel()` from webllm-models
- **Fallback Model**: "Llama-2-7b-chat-hf-q4f16_1" (line 96)
- **Configuration**:
  - Temperature: 0.2 (line 332)
  - Max tokens: 512 (line 333)
  - Retry logic: Up to 3 attempts with exponential backoff
- **WebGPU Requirements**: Minimum 2GB GPU memory (line 238)

#### `/src/lib/webllm-models.ts` - **CRITICAL** 
- **Model Selection Logic**: Contains all preferred model configurations
- **Direct Model References**: **PRIMARY MODEL CONFIGURATION FILE**
- **Preferred Models List** (Priority Order):
  1. `Llama-3.1-8B-Instruct-q4f16_1` (Priority 1, Best accuracy)
  2. `Llama-3-8B-Instruct-q4f16_1` (Priority 2, Best accuracy)
  3. `Mistral-7B-Instruct-v0.3-q4f16_1` (Priority 3, Better accuracy)
  4. `Mistral-7B-Instruct-v0.2-q4f16_1` (Priority 4, Better accuracy)
  5. `Phi-3-mini-4k-instruct-q4f16_1` (Priority 5, Good accuracy)
  6. `Qwen2-1.5B-Instruct-q4f16_1` (Priority 6, Good accuracy)
  7. `gemma-2b-it-q4f16_1` (Priority 7, Good accuracy)

#### `/src/lib/webllm-service-manager.ts` - **CRITICAL**
- **Centralized Service Manager**: Circuit breaker pattern and health monitoring
- **Model Dependencies**: Uses WebLLMManager and getOptimalModel
- **Key Methods**: `parseJobData()`, `initialize()`
- **Configuration**:
  - Temperature: 0.2 (line 253)
  - Max tokens: 1024 (line 254)
  - Retries: 2 (line 255)
- **Circuit Breaker**: 5 failure threshold, 60-second timeout

## Model Selection and Configuration Analysis

### Current Model Selection Flow
1. **Primary Selection**: `webllm-models.ts` → `getOptimalModel()` 
2. **Availability Check**: Against `prebuiltAppConfig.model_list`
3. **Priority-Based Selection**: Highest priority available model
4. **Fallback Strategy**: Instruction-tuned models → Any available model
5. **Last Resort**: Hardcoded "Llama-2-7b-chat-hf-q4f16_1"

### Model Requirements and Constraints
- **Memory Requirements**: 
  - High: 8B models (5-6GB GPU memory)
  - Medium: 7B models (4-5GB GPU memory) 
  - Low: 1.5B-3B models (1-3GB GPU memory)
- **Accuracy Tiers**: Best > Better > Good
- **Instruction Tuning**: **REQUIRED** - All preferred models are instruction-tuned
- **WebGPU**: Required with 2GB+ GPU memory minimum

### Service-Specific Model Parameters

| Service | Temperature | Max Tokens | Retries | Timeout |
|---------|-------------|------------|---------|---------|
| WebLLMManager | 0.2 | 512 | 2-3 | None |
| WebLLMServiceManager | 0.2 | 1024 | 2 | None |
| PDFWebLLMIntegration | N/A | N/A | N/A | 15s |
| WebLLMParsingService | 0.2 | 1024 | 2 | 8s fetch |

## Integration Testing Requirements

### 1. Model Compatibility Testing
- **Test All Priority Models**: Verify each model in preferred list works with services
- **Memory Requirement Validation**: Ensure GPU memory estimates are accurate
- **Performance Benchmarking**: Compare inference times across models
- **Accuracy Testing**: Validate job parsing accuracy for each model tier

### 2. Service Integration Testing
- **End-to-End Flow**: URL → WebLLMParsingService → WebLLMServiceManager → WebLLMManager
- **Fallback Chain Testing**: Verify graceful degradation through fallback models
- **Circuit Breaker Testing**: Validate circuit breaker behavior with new models
- **PDF Integration Testing**: Ensure PDFWebLLMIntegration works with model updates

### 3. Cross-Platform Testing
- **Browser Compatibility**: Test model loading across Chrome, Firefox, Safari
- **WebGPU Validation**: Verify WebGPU support detection works properly
- **Mobile Testing**: Validate memory constraints on mobile devices
- **Performance Monitoring**: Ensure metrics collection works with new models

## Implementation Plan

### Phase 1: Model Configuration Update (CRITICAL)
**Files to Update:**
- `/src/lib/webllm-models.ts` - **PRIMARY TARGET**
  - Update preferred models array with new model IDs
  - Verify memory requirements and accuracy tiers
  - Test model availability against WebLLM model list
  - Update size estimates in `estimateModelSize()` function

**PLAN_UNCERTAINTY**: Need to verify exact model IDs and availability in current WebLLM version

### Phase 2: Fallback Model Update (HIGH PRIORITY)
**Files to Update:**
- `/src/lib/webllm.ts` - Line 96 fallback model
  - Update hardcoded fallback model ID
  - Ensure fallback model is always available
  - Test fallback activation scenarios

### Phase 3: Service Parameter Optimization (MEDIUM PRIORITY)
**Files to Review:**
- Service-specific temperature and token limits may need adjustment for new models
- Circuit breaker thresholds might need tuning based on new model performance
- Cache TTL calculations may need updates based on new model accuracy

**PLAN_UNCERTAINTY**: Need to test if current parameters are optimal for newer models

### Phase 4: Integration Testing (HIGH PRIORITY)
**Test Coverage:**
- Model loading and initialization
- Job parsing accuracy across platforms
- Fallback mechanism activation
- Circuit breaker behavior
- PDF integration functionality
- Learning service metric collection

### Phase 5: Monitoring and Metrics Update (LOW PRIORITY)
**Files to Review:**
- Update model info tracking in service manager
- Enhance metrics collection for new models
- Update health monitoring dashboards

## Risk Assessment

### High Risk Areas
1. **Model Availability**: New model IDs may not be available in WebLLM
2. **Memory Requirements**: New models may exceed GPU memory limits
3. **Performance Impact**: New models may have different inference times
4. **Instruction Following**: Model updates might affect job parsing accuracy

### Mitigation Strategies
1. **Staged Rollout**: Test model updates in development environment first
2. **Comprehensive Fallbacks**: Ensure multiple fallback options available
3. **A/B Testing**: Compare old vs new model performance
4. **Rollback Plan**: Keep previous model configuration readily available

### PLAN_UNCERTAINTY Areas
- **WebLLM Version Compatibility**: Current WebLLM version may not support desired models
- **Model Performance**: New models may have different accuracy characteristics
- **GPU Memory Requirements**: Actual memory usage may differ from estimates
- **Browser Support**: New models may have different WebGPU requirements

## Success Criteria

1. **Functional Requirements**:
   - All services successfully initialize with new models
   - Job parsing accuracy maintained or improved
   - Fallback mechanisms work reliably
   - Circuit breaker prevents service failures

2. **Performance Requirements**:
   - Model loading time < 30 seconds
   - Average inference time < 5 seconds
   - Memory usage within GPU constraints
   - Success rate > 85%

3. **Integration Requirements**:
   - PDF processing continues to work
   - Learning service captures new model metrics
   - Health monitoring accurately reports status
   - Cache system maintains efficiency

## Conclusion

The WebLLM service layer has a well-architected model selection and fallback system. The primary update points are the model configuration file (`webllm-models.ts`) and the fallback model reference in the core WebLLM manager. The service layer is designed to be resilient to model changes, but comprehensive testing is required to ensure all integration points continue to function properly with new models.

The most critical file for model updates is `/src/lib/webllm-models.ts`, which contains the complete model selection logic and should be the primary focus of any model reference updates.
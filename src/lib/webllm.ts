/**
 * WebLLM Client Library Wrapper
 * Initializes and manages WebLLM engine for client-side AI validation
 * Enhanced with comprehensive metrics collection and performance monitoring
 */
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

interface WebLLMMetrics {
  modelLoadStartTime?: number;
  modelLoadEndTime?: number;
  inferenceStartTime?: number;
  inferenceEndTime?: number;
  webgpuAvailable?: boolean;
  modelName?: string;
  errorType?: 'MODEL_LOAD' | 'INFERENCE' | 'WEBGPU_UNAVAILABLE' | 'PARSING';
  totalInferences: number;
  successfulInferences: number;
  avgInferenceTime: number;
}

interface WebGPUNavigator extends Navigator {
  gpu?: {
    requestAdapter: () => Promise<any>;
  };
}

export class WebLLMManager {
  private static instance: WebLLMManager;
  private engine: MLCEngine | null = null;
  private isInitializing = false;
  private initPromise: Promise<MLCEngine> | null = null;
  private metrics: WebLLMMetrics = {
    totalInferences: 0,
    successfulInferences: 0,
    avgInferenceTime: 0
  };
  private inferenceTimes: number[] = [];

  private constructor() {}

  public static getInstance(): WebLLMManager {
    if (!WebLLMManager.instance) {
      WebLLMManager.instance = new WebLLMManager();
    }
    return WebLLMManager.instance;
  }

  /**
   * Initialize WebLLM engine with comprehensive validation and retry logic
   */
  public async initWebLLM(model?: string): Promise<MLCEngine> {
    // Return existing engine if already initialized
    if (this.engine) {
      return this.engine;
    }

    // If currently initializing, wait for it to complete
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.metrics.modelLoadStartTime = performance.now();

    try {
      // Step 1: Validate WebGPU support
      const webgpuValidation = await this.validateWebGPUSupport();
      this.metrics.webgpuAvailable = webgpuValidation.supported;

      if (!webgpuValidation.supported) {
        console.warn('⚠️ WebGPU validation failed:', webgpuValidation.reason);
        this.metrics.errorType = 'WEBGPU_UNAVAILABLE';
        this.reportMetrics('webgpu_validation_failed', webgpuValidation);
        
        if (!webgpuValidation.fallbackAvailable) {
          throw new Error(`WebGPU not supported: ${webgpuValidation.reason}`);
        }
        
        console.log('🔄 Proceeding with limited WebGPU support');
      } else {
        console.log('✅ WebGPU validation successful', {
          memoryEstimate: webgpuValidation.memoryEstimate + 'MB',
          features: webgpuValidation.adapterInfo?.features?.length + ' features'
        });
      }

      // Step 2: Select optimal model if not specified
      let selectedModel = model;
      if (!selectedModel) {
        try {
          const { getOptimalModel } = await import('./webllm-models');
          selectedModel = await getOptimalModel();
          console.log('🎯 Selected optimal model:', selectedModel);
        } catch (modelError) {
          console.warn('⚠️ Failed to get optimal model, using fallback:', modelError);
          selectedModel = "Phi-3-mini-4k-instruct-q4f16_1"; // Modern lightweight fallback
        }
      }

      this.metrics.modelName = selectedModel;

      // Step 3: Initialize engine with retry logic
      this.initPromise = this.initializeWithRetry(selectedModel, 3);
      this.engine = await this.initPromise;

      this.metrics.modelLoadEndTime = performance.now();
      const loadTime = this.metrics.modelLoadEndTime - (this.metrics.modelLoadStartTime || 0);
      
      console.log('🤖 WebLLM engine initialized successfully', {
        model: selectedModel,
        loadTime: Math.round(loadTime) + 'ms',
        webgpuSupported: webgpuValidation.supported
      });

      this.reportMetrics('model_load_success', { 
        model: selectedModel, 
        loadTime,
        webgpuSupported: webgpuValidation.supported
      });

      return this.engine;

    } catch (error) {
      this.metrics.errorType = 'MODEL_LOAD';
      console.error('❌ WebLLM initialization failed:', error);
      this.reportMetrics('model_load_error', error);
      throw error;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  /**
   * Initialize engine with exponential backoff retry logic
   */
  private async initializeWithRetry(model: string, maxRetries: number): Promise<MLCEngine> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 WebLLM initialization attempt ${attempt}/${maxRetries}`);
        return await this.createEngine(model);
      } catch (error) {
        lastError = error;
        console.warn(`❌ Attempt ${attempt} failed:`, error);

        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff: wait 2^attempt seconds
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  private async createEngine(model: string): Promise<MLCEngine> {
    const engine: MLCEngine = await CreateMLCEngine(model, {
      initProgressCallback: (progress: any) => {
        console.log(`🔄 WebLLM loading progress: ${JSON.stringify(progress)}`);
      }
    });
    return engine;
  }

  /**
   * Check if WebGPU is supported in the current browser
   */
  public async isWebGPUSupported(): Promise<boolean> {
    try {
      const nav = navigator as WebGPUNavigator;
      if (!nav.gpu) {
        return false;
      }
      const adapter = await nav.gpu.requestAdapter();
      return adapter !== null;
    } catch (error) {
      console.warn('WebGPU support check failed:', error);
      return false;
    }
  }

  /**
   * Comprehensive WebGPU validation with detailed diagnostics
   */
  public async validateWebGPUSupport(): Promise<{
    supported: boolean;
    reason?: string;
    fallbackAvailable: boolean;
    adapterInfo?: any;
    memoryEstimate?: number;
  }> {
    try {
      const nav = navigator as WebGPUNavigator;
      
      // Check if WebGPU API exists
      if (!nav.gpu) {
        return {
          supported: false,
          reason: 'WebGPU API not available in this browser',
          fallbackAvailable: false
        };
      }

      // Request adapter with detailed information
      const adapter = await nav.gpu.requestAdapter();
      if (!adapter) {
        return {
          supported: false,
          reason: 'No compatible WebGPU adapter found',
          fallbackAvailable: false
        };
      }

      // Get adapter features and limits
      const adapterInfo = {
        features: Array.from(adapter.features || []),
        limits: adapter.limits ? {
          maxTextureDimension1D: adapter.limits.maxTextureDimension1D,
          maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
          maxTextureArrayLayers: adapter.limits.maxTextureArrayLayers,
          maxBindGroups: adapter.limits.maxBindGroups,
          maxBufferSize: adapter.limits.maxBufferSize,
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize
        } : {}
      };

      // Estimate available GPU memory (approximate)
      const memoryEstimate = this.estimateGPUMemory(adapterInfo);

      // Check if we have sufficient memory for WebLLM (minimum 2GB recommended)
      const sufficientMemory = memoryEstimate >= 2000;

      if (!sufficientMemory) {
        return {
          supported: false,
          reason: `Insufficient GPU memory: estimated ${memoryEstimate}MB, minimum 2000MB required`,
          fallbackAvailable: true,
          adapterInfo,
          memoryEstimate
        };
      }

      // Test device creation
      try {
        const device = await adapter.requestDevice();
        device.destroy(); // Clean up test device
        
        return {
          supported: true,
          fallbackAvailable: true,
          adapterInfo,
          memoryEstimate
        };
      } catch (deviceError) {
        return {
          supported: false,
          reason: `WebGPU device creation failed: ${deviceError}`,
          fallbackAvailable: true,
          adapterInfo,
          memoryEstimate
        };
      }

    } catch (error) {
      return {
        supported: false,
        reason: `WebGPU validation error: ${error}`,
        fallbackAvailable: false
      };
    }
  }

  /**
   * Estimate GPU memory based on adapter limits
   */
  private estimateGPUMemory(adapterInfo: any): number {
    // Conservative estimation based on buffer size limits
    const maxBufferSize = adapterInfo.limits?.maxBufferSize || 0;
    
    if (maxBufferSize >= 4294967296) return 8000; // 8GB+
    if (maxBufferSize >= 2147483648) return 6000; // 6GB+
    if (maxBufferSize >= 1073741824) return 4000; // 4GB+
    if (maxBufferSize >= 536870912) return 2000;  // 2GB+
    if (maxBufferSize >= 268435456) return 1000;  // 1GB+
    
    return 512; // < 1GB
  }

  /**
   * Generate chat completion using WebLLM with comprehensive metrics and retry logic
   */
  public async generateCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      max_tokens?: number;
      retries?: number;
    } = {}
  ): Promise<string> {
    if (!this.engine) {
      // Try to initialize if not already done
      try {
        console.log('🔄 Engine not initialized, attempting initialization...');
        await this.initWebLLM();
      } catch (initError) {
        throw new Error(`WebLLM engine not initialized and initialization failed: ${initError}`);
      }
    }

    const maxRetries = options.retries ?? 2;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      // Start inference metrics on each attempt
      this.metrics.inferenceStartTime = performance.now();
      if (attempt === 1) {
        this.metrics.totalInferences++;
      }

      try {
        console.log(`🧠 WebLLM inference attempt ${attempt}/${maxRetries + 1}`);

        const response = await this.engine!.chat.completions.create({
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.max_tokens ?? 512,
        });

        const content = response?.choices?.[0]?.message?.content ?? '';
        
        if (!content || content.trim().length === 0) {
          throw new Error('WebLLM returned empty response');
        }
        
        // Record successful inference
        this.metrics.inferenceEndTime = performance.now();
        const inferenceTime = this.metrics.inferenceEndTime - (this.metrics.inferenceStartTime || 0);
        this.metrics.successfulInferences++;
        this.inferenceTimes.push(inferenceTime);
        
        // Update average inference time
        this.metrics.avgInferenceTime = this.inferenceTimes.reduce((a, b) => a + b, 0) / this.inferenceTimes.length;
        
        // Keep only last 100 inference times for memory efficiency
        if (this.inferenceTimes.length > 100) {
          this.inferenceTimes = this.inferenceTimes.slice(-100);
        }

        console.log('✅ WebLLM inference successful', {
          attempt,
          inferenceTime: Math.round(inferenceTime),
          avgInferenceTime: Math.round(this.metrics.avgInferenceTime),
          successRate: (this.metrics.successfulInferences / this.metrics.totalInferences * 100).toFixed(1) + '%',
          responseLength: content.length
        });

        // Report successful inference metrics
        this.reportMetrics('inference_success', { 
          inferenceTime, 
          attempt, 
          responseLength: content.length 
        });

        return content;

      } catch (error) {
        lastError = error;
        console.warn(`❌ WebLLM inference attempt ${attempt} failed:`, error);

        // Don't retry on final attempt
        if (attempt === maxRetries + 1) {
          break;
        }

        // Check if this is a recoverable error
        const errorStr = String(error).toLowerCase();
        const isRecoverable = 
          errorStr.includes('timeout') || 
          errorStr.includes('network') ||
          errorStr.includes('memory') ||
          errorStr.includes('busy') ||
          errorStr.includes('empty response');

        if (!isRecoverable) {
          console.warn('⚠️ Non-recoverable error, not retrying:', error);
          break;
        }

        // Exponential backoff for retries
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying inference in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // All attempts failed
    this.metrics.errorType = 'INFERENCE';
    console.error('❌ All WebLLM inference attempts failed:', lastError);
    
    // Report error metrics
    this.reportMetrics('inference_error', { 
      error: lastError, 
      attempts: maxRetries + 1,
      finalError: true
    });
    
    throw lastError;
  }

  /**
   * Reset the engine (useful for model switching)
   */
  public async reset(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
    this.isInitializing = false;
    this.initPromise = null;
  }

  /**
   * Get engine statistics if available
   */
  public getStats(): any {
    return this.engine?.runtimeStatsText() || null;
  }

  /**
   * Get comprehensive WebLLM metrics
   */
  public getMetrics(): WebLLMMetrics {
    return {
      ...this.metrics,
      webgpuAvailable: this.checkWebGPUAvailability()
    };
  }

  /**
   * Report metrics to monitoring system
   */
  private reportMetrics(eventType: string, data?: any): void {
    try {
      // Send metrics to console for debugging
      console.log(`📊 WebLLM Metrics [${eventType}]:`, {
        ...this.metrics,
        eventData: data,
        timestamp: new Date().toISOString()
      });

      // In a production environment, you might send this to a monitoring service
      // Example: this.sendToMonitoring(eventType, this.metrics, data);
    } catch (error) {
      console.warn('Failed to report WebLLM metrics:', error);
    }
  }

  /**
   * Check if WebGPU is available (cached for performance)
   */
  private checkWebGPUAvailability(): boolean {
    try {
      const nav = navigator as WebGPUNavigator;
      return !!nav.gpu;
    } catch {
      return false;
    }
  }

  /**
   * Reset metrics (useful for testing or debugging)
   */
  public resetMetrics(): void {
    this.metrics = {
      totalInferences: 0,
      successfulInferences: 0,
      avgInferenceTime: 0
    };
    this.inferenceTimes = [];
  }
}

// Convenience function for direct usage with dynamic model selection
export async function initWebLLM(model?: string): Promise<MLCEngine> {
  const manager = WebLLMManager.getInstance();
  return manager.initWebLLM(model);
}

// Check WebGPU support (basic)
export async function isWebGPUSupported(): Promise<boolean> {
  const manager = WebLLMManager.getInstance();
  return manager.isWebGPUSupported();
}

// Comprehensive WebGPU validation
export async function validateWebGPUSupport() {
  const manager = WebLLMManager.getInstance();
  return manager.validateWebGPUSupport();
}

// Get WebLLM metrics
export function getWebLLMMetrics(): WebLLMMetrics {
  const manager = WebLLMManager.getInstance();
  return manager.getMetrics();
}

// Get WebLLM manager instance for advanced usage
export function getWebLLMManager(): WebLLMManager {
  return WebLLMManager.getInstance();
}
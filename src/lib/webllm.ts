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
   * Initialize WebLLM engine with progress callback and metrics collection
   */
  public async initWebLLM(model = "Llama-2-7b-chat-hf-q4f16_1"): Promise<MLCEngine> {
    // Return existing engine if already initialized
    if (this.engine) {
      return this.engine;
    }

    // If currently initializing, wait for it to complete
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // Start initialization with metrics
    this.metrics.modelLoadStartTime = performance.now();
    this.metrics.modelName = model;
    this.isInitializing = true;
    this.initPromise = this.createEngine(model);

    try {
      this.engine = await this.initPromise;
      this.metrics.modelLoadEndTime = performance.now();
      console.log('🤖 WebLLM engine initialized successfully', {
        model,
        loadTime: this.metrics.modelLoadEndTime - (this.metrics.modelLoadStartTime || 0)
      });
      return this.engine;
    } catch (error) {
      this.metrics.errorType = 'MODEL_LOAD';
      console.error('❌ WebLLM initialization failed:', error);
      // Send metrics to monitoring system
      this.reportMetrics('model_load_error', error);
      throw error;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
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
   * Generate chat completion using WebLLM with comprehensive metrics
   */
  public async generateCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<string> {
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    // Start inference metrics
    this.metrics.inferenceStartTime = performance.now();
    this.metrics.totalInferences++;

    try {
      const response = await this.engine.chat.completions.create({
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? 512,
      });

      const content = response?.choices?.[0]?.message?.content ?? '';
      
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
        inferenceTime: Math.round(inferenceTime),
        avgInferenceTime: Math.round(this.metrics.avgInferenceTime),
        successRate: (this.metrics.successfulInferences / this.metrics.totalInferences * 100).toFixed(1) + '%'
      });

      // Report successful inference metrics
      this.reportMetrics('inference_success', { inferenceTime });

      return content;
    } catch (error) {
      this.metrics.errorType = 'INFERENCE';
      console.error('❌ WebLLM inference failed:', error);
      
      // Report error metrics
      this.reportMetrics('inference_error', error);
      throw error;
    }
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

// Convenience function for direct usage
export async function initWebLLM(model = "Llama-2-7b-chat-hf-q4f16_1"): Promise<MLCEngine> {
  const manager = WebLLMManager.getInstance();
  return manager.initWebLLM(model);
}

// Check WebGPU support
export async function isWebGPUSupported(): Promise<boolean> {
  const manager = WebLLMManager.getInstance();
  return manager.isWebGPUSupported();
}

// Get WebLLM metrics
export function getWebLLMMetrics(): WebLLMMetrics {
  const manager = WebLLMManager.getInstance();
  return manager.getMetrics();
}
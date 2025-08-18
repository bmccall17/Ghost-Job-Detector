/**
 * WebLLM Client Library Wrapper
 * Initializes and manages WebLLM engine for client-side AI validation
 */
// TODO: Install @mlc-ai/web-llm package
// import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

// Temporary type definitions until package is installed
interface MLCEngine {
  chat: {
    completions: {
      create: (options: {
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<{
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      }>;
    };
  };
  unload: () => Promise<void>;
  runtimeStatsText: () => any;
}

interface WebGPUNavigator extends Navigator {
  gpu?: {
    requestAdapter: () => Promise<any>;
  };
}

declare const CreateMLCEngine: (
  model: string, 
  options: {
    initProgressCallback?: (progress: any) => void;
    chatCompletionProgressCallback?: (info: any) => void;
  }
) => Promise<MLCEngine>;

export class WebLLMManager {
  private static instance: WebLLMManager;
  private engine: MLCEngine | null = null;
  private isInitializing = false;
  private initPromise: Promise<MLCEngine> | null = null;

  private constructor() {}

  public static getInstance(): WebLLMManager {
    if (!WebLLMManager.instance) {
      WebLLMManager.instance = new WebLLMManager();
    }
    return WebLLMManager.instance;
  }

  /**
   * Initialize WebLLM engine with progress callback
   */
  public async initWebLLM(model = "Llama-3.1-8B-Instruct"): Promise<MLCEngine> {
    // Return existing engine if already initialized
    if (this.engine) {
      return this.engine;
    }

    // If currently initializing, wait for it to complete
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.isInitializing = true;
    this.initPromise = this.createEngine(model);

    try {
      this.engine = await this.initPromise;
      console.log('🤖 WebLLM engine initialized successfully');
      return this.engine;
    } catch (error) {
      console.error('❌ WebLLM initialization failed:', error);
      throw error;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async createEngine(model: string): Promise<MLCEngine> {
    const engine: MLCEngine = await CreateMLCEngine(model, {
      initProgressCallback: (progress) => {
        console.log(`🔄 WebLLM loading progress: ${JSON.stringify(progress)}`);
      },
      chatCompletionProgressCallback: (info) => {
        console.log(`💬 WebLLM chat progress: ${info}`);
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
   * Generate chat completion using WebLLM
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

    const response = await this.engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 512,
    });

    return response?.choices?.[0]?.message?.content ?? '';
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
}

// Convenience function for direct usage
export async function initWebLLM(model = "Llama-3.1-8B-Instruct"): Promise<MLCEngine> {
  const manager = WebLLMManager.getInstance();
  return manager.initWebLLM(model);
}

// Check WebGPU support
export async function isWebGPUSupported(): Promise<boolean> {
  const manager = WebLLMManager.getInstance();
  return manager.isWebGPUSupported();
}
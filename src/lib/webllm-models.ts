/**
 * WebLLM Dynamic Model Selection and Validation
 * Ensures optimal model selection based on availability and job parsing requirements
 */
import { prebuiltAppConfig } from '@mlc-ai/web-llm';

export interface ModelInfo {
  model_id: string;
  name: string;
  priority: number;
  memoryRequirement: 'low' | 'medium' | 'high';
  accuracy: 'good' | 'better' | 'best';
  isInstructionTuned: boolean;
}

/**
 * Get optimal model for job parsing based on available models and system capabilities
 */
export async function getOptimalModel(): Promise<string> {
  try {
    console.log('🔍 Detecting available WebLLM models...');
    
    // Get all available models from WebLLM
    const availableModels = prebuiltAppConfig.model_list;
    console.log(`📋 Found ${availableModels.length} available models`);
    
    // Priority order for job parsing (instruction-tuned models preferred)
    // Based on WebLLM Configuration Guide recommendations
    const preferredModels: ModelInfo[] = [
      {
        model_id: 'Llama-3.1-8B-Instruct-q4f16_1',
        name: 'Llama 3.1 8B Instruct',
        priority: 1,
        memoryRequirement: 'high',
        accuracy: 'best',
        isInstructionTuned: true
      },
      {
        model_id: 'Llama-3-8B-Instruct-q4f16_1', 
        name: 'Llama 3 8B Instruct',
        priority: 2,
        memoryRequirement: 'high',
        accuracy: 'best',
        isInstructionTuned: true
      },
      {
        model_id: 'Mistral-7B-Instruct-v0.3-q4f16_1',
        name: 'Mistral 7B Instruct',
        priority: 3,
        memoryRequirement: 'medium',
        accuracy: 'better',
        isInstructionTuned: true
      },
      {
        model_id: 'Mistral-7B-Instruct-v0.2-q4f16_1',
        name: 'Mistral 7B Instruct v0.2',
        priority: 4,
        memoryRequirement: 'medium', 
        accuracy: 'better',
        isInstructionTuned: true
      },
      {
        model_id: 'Phi-3-mini-4k-instruct-q4f16_1',
        name: 'Phi-3 Mini Instruct',
        priority: 5,
        memoryRequirement: 'low',
        accuracy: 'good',
        isInstructionTuned: true
      },
      {
        model_id: 'Qwen2-1.5B-Instruct-q4f16_1',
        name: 'Qwen2 1.5B Instruct', 
        priority: 6,
        memoryRequirement: 'low',
        accuracy: 'good',
        isInstructionTuned: true
      },
      {
        model_id: 'gemma-2b-it-q4f16_1',
        name: 'Gemma 2B Instruct',
        priority: 7,
        memoryRequirement: 'low',
        accuracy: 'good', 
        isInstructionTuned: true
      }
    ];
    
    // Find the highest priority available model
    for (const preferredModel of preferredModels) {
      const isAvailable = availableModels.some(
        model => model.model_id === preferredModel.model_id
      );
      
      if (isAvailable) {
        console.log(`✅ Selected optimal model: ${preferredModel.model_id}`);
        console.log(`   └─ ${preferredModel.name} (${preferredModel.accuracy} accuracy, ${preferredModel.memoryRequirement} memory)`);
        
        // Store selected model info for monitoring
        localStorage.setItem('webllm-selected-model', JSON.stringify({
          modelId: preferredModel.model_id,
          name: preferredModel.name,
          selectedAt: new Date().toISOString(),
          accuracy: preferredModel.accuracy,
          memoryRequirement: preferredModel.memoryRequirement
        }));
        
        return preferredModel.model_id;
      } else {
        console.log(`❌ Preferred model not available: ${preferredModel.model_id}`);
      }
    }
    
    // Fallback: find any instruction-tuned model
    console.warn('⚠️ No preferred models available, searching for fallback...');
    const instructModels = availableModels.filter(model => 
      model.model_id.toLowerCase().includes('instruct') ||
      model.model_id.toLowerCase().includes('-it-')
    );
    
    if (instructModels.length > 0) {
      const fallbackModel = instructModels[0];
      console.warn(`🔄 Using fallback instruction model: ${fallbackModel.model_id}`);
      
      // Store fallback model info
      localStorage.setItem('webllm-selected-model', JSON.stringify({
        modelId: fallbackModel.model_id,
        name: fallbackModel.model_id,
        selectedAt: new Date().toISOString(),
        accuracy: 'unknown',
        memoryRequirement: 'unknown',
        isFallback: true
      }));
      
      return fallbackModel.model_id;
    }
    
    // Last resort: use any available model
    if (availableModels.length > 0) {
      const lastResortModel = availableModels[0];
      console.error(`🚨 Using last resort model: ${lastResortModel.model_id}`);
      console.warn('⚠️ This model may not be optimized for instruction-following tasks');
      
      return lastResortModel.model_id;
    }
    
    throw new Error('No WebLLM models available');
    
  } catch (error) {
    console.error('❌ Failed to get optimal model:', error);
    throw new Error(`Model selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate that a specific model is available
 */
export function validateModelAvailability(modelId: string): boolean {
  try {
    const availableModels = prebuiltAppConfig.model_list;
    const isAvailable = availableModels.some(model => model.model_id === modelId);
    
    if (isAvailable) {
      console.log(`✅ Model validated: ${modelId}`);
    } else {
      console.warn(`❌ Model not available: ${modelId}`);
      console.log('Available models:', availableModels.map(m => m.model_id));
    }
    
    return isAvailable;
  } catch (error) {
    console.error('❌ Model validation failed:', error);
    return false;
  }
}

/**
 * Get information about the currently selected model
 */
export function getSelectedModelInfo(): {
  modelId: string;
  name: string;
  selectedAt: string;
  accuracy: string;
  memoryRequirement: string;
  isFallback?: boolean;
} | null {
  try {
    const stored = localStorage.getItem('webllm-selected-model');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Get all available models with their capabilities
 */
export function getAllAvailableModels(): Array<{
  model_id: string;
  isRecommended: boolean;
  isInstructionTuned: boolean;
  estimatedSize: string;
}> {
  try {
    const availableModels = prebuiltAppConfig.model_list;
    const preferredIds = [
      'Llama-3.1-8B-Instruct-q4f16_1',
      'Mistral-7B-Instruct-v0.3-q4f16_1',
      'Phi-3-mini-4k-instruct-q4f16_1'
    ];
    
    return availableModels.map(model => ({
      model_id: model.model_id,
      isRecommended: preferredIds.includes(model.model_id),
      isInstructionTuned: (
        model.model_id.toLowerCase().includes('instruct') ||
        model.model_id.toLowerCase().includes('-it-')
      ),
      estimatedSize: estimateModelSize(model.model_id)
    }));
  } catch (error) {
    console.error('❌ Failed to get available models:', error);
    return [];
  }
}

/**
 * Estimate model size based on model ID
 */
function estimateModelSize(modelId: string): string {
  const id = modelId.toLowerCase();
  
  if (id.includes('1.5b') || id.includes('2b')) return '~1-2GB';
  if (id.includes('3b') || id.includes('mini')) return '~2-3GB';
  if (id.includes('7b')) return '~4-5GB';
  if (id.includes('8b')) return '~5-6GB';
  if (id.includes('13b')) return '~8-10GB';
  
  return 'Unknown';
}

/**
 * Clear stored model selection (useful for testing)
 */
export function clearModelSelection(): void {
  localStorage.removeItem('webllm-selected-model');
  console.log('🗑️ Cleared stored model selection');
}
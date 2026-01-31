import { pipeline, env } from '@huggingface/transformers';
import path from 'path';

async function downloadModel() {
    const modelId = 'onnx-community/gemma-3-1b-it-ONNX';
    env.cacheDir = path.join(process.cwd(), 'models');
    env.allowLocalModels = false; 

    console.log(`Starting model download to ${env.cacheDir}`);

    try {
        await pipeline('text-generation', modelId, { dtype: 'q4', device: 'cpu' });

        console.log("Model downloaded successfully.");
    } catch (error) {
        console.error("Download failed:", error);
    }
}

downloadModel();
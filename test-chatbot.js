import { pipeline, env } from '@huggingface/transformers';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Disable remote model checks since we are using a local model
env.allowLocalModels = true;
env.useBrowserCache = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.join(__dirname, 'models/gemma-3-1b-it-ONNX');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('--- Local Chatbot Test ---');
  console.log('Loading model from:', modelPath);
  console.log('Please wait, this might take a moment...');

  let generator;
  try {
    generator = await pipeline('text-generation', modelPath, {
        device: 'auto', // tries to use webgpu if available
        dtype: 'q4',    // prefer quantized weights
    });
    console.log('Model loaded successfully!');
    console.log('You can start chatting. Type "exit" to quit.\n');
  } catch (error) {
    console.error('Failed to load model:', error);
    if (error.message && error.message.includes('Local file missing')) {
      console.error('\nERROR: The @huggingface/transformers library requires ONNX model files (e.g., onnx/model_q4.onnx).');
      console.error('It appears your directory contains Safetensors/PyTorch weights (model.safetensors).');
      console.error('Please convert your model to ONNX using `optimum-cli export onnx ...` or download a pre-converted ONNX version.\n');
    }
    process.exit(1);
  }

  const chat = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      try {
        // Construct the messages structure expected by chat models
        const messages = [
            { role: "user", content: input }
        ];

        // Generate response
        const output = await generator(messages, {
            max_new_tokens: 128,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
        });

        // The pipeline returns an object or array depending on configuration.
        // Usually for 'text-generation' with chat inputs, it returns the generated text.
        const generated = output[0]?.generated_text;
        let responseText;

        if (Array.isArray(generated)) {
          // It's a chat history array, get the last message (assistant's response)
          const lastMessage = generated[generated.length - 1];
          responseText = lastMessage.content;
        } else {
          responseText = generated || JSON.stringify(output);
        }
        
        console.log(`Bot: ${responseText}\n`);
      } catch (err) {
        console.error('Error generating response:', err);
      }

      chat();
    });
  };

  chat();
}

main();

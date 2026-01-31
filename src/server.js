import express from 'express';
import { pipeline, env } from '@huggingface/transformers';
import path from 'path';
import { fileURLToPath } from 'url';

// Disable remote model checks since we are using a local model
env.allowLocalModels = true;
env.useBrowserCache = false;

const app = express();
const port = 3000;

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`\n[${timestamp}] ------------------------------------------------`);
  console.log(`Incoming Request: ${req.method} ${req.url}`);

  // Intercept response to log the result
  const originalJson = res.json;
  res.json = function (body) {
      console.log(` < Response: ${JSON.stringify(body).substring(0, 20)}`);
      return originalJson.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(` < Response Status: ${res.statusCode} (${duration}ms)`);
    console.log(`[${timestamp}] ------------------------------------------------\n`);
  });
  
  next();
});

app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelId = 'onnx-community/gemma-3-1b-it-ONNX';
const modelPath = path.join(__dirname, 'models', modelId);

let generator;

// Initialize the model
async function initModel() {
  console.log('Loading model from:', `models/${modelId}`);
  
  try {
    // Using text-generation pipeline
    generator = await pipeline('text-generation', modelPath, {
        device: 'auto', // use webgpu if available and configured, or cpu
        dtype: 'q4',    // prefer quantized weights
    });
    console.log('Model loaded successfully!');
  } catch (error) {
    console.error('Failed to load model');
    process.exit(1);
  }
}

app.post('/chat', async (req, res) => {
  if (!generator) {
    return res.status(503).json({ error: 'Model is still loading, please try again later.' });
  }

  const { messages } = req.body;
  messages.map(message => console.log(` > ${message.role}: ${message.content.substring(0, 20)}`));
  
  let input;
  if (messages) {
      input = messages;
  } else if (message) {
      input = [
          { role: 'user', content: message }
      ];
  } else {
      return res.status(400).json({ error: 'Please provide a "message" or "messages" field.' });
  }

  try {
    const result = await generator(input, {
      max_new_tokens: 512,
      temperature: 0.7,
      do_sample: true,
      return_full_text: false
    });

    // Extract generated text
    // The pipeline can return an array of messages (chat history) or an object
    const generated = result[0]?.generated_text;
    let responseText;

    if (Array.isArray(generated)) {
      // It's a chat history array, get the last message (assistant's response)
      const lastMessage = generated[generated.length - 1];
      responseText = lastMessage.content;
    } else {
      responseText = generated || result;
    }

    res.json({ response: responseText });
  } catch (error) {
    console.error('Inference error:', error);
    res.status(500).json({ error: 'Error processing your request.' });
  }
});

// Start server
app.listen(port, async () => {
  await initModel();
  console.log(`Server is running on http://localhost:${port}`);
});

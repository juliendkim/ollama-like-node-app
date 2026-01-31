import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const API_URL = 'http://localhost:3000/chat';

console.log('--- Chat Client for Ollama-like Node App ---');
console.log(`Connecting to ${API_URL}`);
console.log('Type "exit" to quit.\n');

const history = [];

const chat = () => {
    rl.question('You: ', async (input) => {
        if (input.toLowerCase() === 'exit') {
            rl.close();
            return;
        }

        if (!input.trim()) {
            chat();
            return;
        }

        history.push({ role: 'user', content: input });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: history.slice(-10) }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Error: ${response.status} - ${errorData.error || response.statusText}\n`);
            } else {
                const data = await response.json();
                console.log(`Bot: ${data.response}\n`);
                history.push({ role: 'assistant', content: data.response });
            }
        } catch (error) {
            console.error('Connection error:', error.message);
            console.error('Is the server running? (node server.js)\n');
        }

        chat();
    });
};

chat();


import 'dotenv/config';
import OpenAI from 'openai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
type Msg =
  | { role: 'user' | 'assistant'; content: string }
  | { role: 'tool'; tool_call_id: string; content: string };

const messages: Msg[] = [];


const tools = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a UTF-8 text file from the current project directory',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Relative path to the file' } },
        required: ['path'],
        additionalProperties: false,
      },
    },
  },
] as const;


function safeResolve(p: string) {
  const root = process.cwd();
  const resolved = path.resolve(root, p);
  if (!resolved.startsWith(root)) throw new Error('Path escapes project root');
  return resolved;
}

async function runTool(name: string, argsJson: string): Promise<string> {
  if (name !== 'read_file') throw new Error(`Unknown tool: ${name}`);
  let args: { path?: string };
  try {
    args = JSON.parse(argsJson);
  } catch {
    throw new Error('Invalid JSON for tool arguments');
  }
  if (!args.path || typeof args.path !== 'string') throw new Error('Missing or invalid "path"');
  const filePath = safeResolve(args.path);
  return await fs.readFile(filePath, 'utf-8');
}

async function main() {

  while (true) {
    const input = await rl.question('You: ');
    messages.push({ role: 'user', content: input });

    const first = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as any,
      tools,
      tool_choice: 'auto',
      temperature: 0,
    });

    const msg = first.choices[0].message;
    const toolCalls = msg.tool_calls ?? [];

    if (toolCalls.length > 0) {
      for (const call of toolCalls) {
        const out = await runTool(call.function.name, call.function.arguments);
        messages.push({ role: 'tool', tool_call_id: call.id, content: out });
      }
      const second = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          ...messages,
          { role: 'assistant', content: msg.content ?? '' } as any,
        ],
        temperature: 0,
      });
      const finalText = second.choices[0].message.content ?? '';
      console.log('\nAssistant:', finalText, '\n');
      messages.push({ role: 'assistant', content: finalText });
    } else {
      const text = msg.content ?? '';
      console.log('\nAssistant:', text, '\n');
      messages.push({ role: 'assistant', content: text });
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
console.log("Hi")

import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { streamText } from 'ai';
import { generateText } from 'ai';
import type { ModelMessage } from 'ai';
import 'dotenv/config';
import * as readline from 'node:readline/promises';
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { tool } from "ai";
import type { TypedToolCall } from "ai"


const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})



const messages: ModelMessage[] = []


async function main() {
    while (true) {
        const userInput = await terminal.question("You: ")

        messages.push({ role: "user", content: userInput })

        const first = await generateText({
            model: openai("gpt-4o"),
            messages,
            tools: {
                read_file: tool({
                    description: "Read a text file",
                    inputSchema: z.object({ path: z.string() }),
                    execute: async ({ path }: { path: string }) => {
                        return { text: await fs.readFile(path, "utf-8") }
                    }
                })
            }
        }
        )
            console.log(first.text ?? "");
            messages.push({ role: "assistant", content: first.text ?? "" });
            }
}
 
main().catch(console.error)
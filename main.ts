console.log("Hi")

import { openai } from '@ai-sdk/openai';
import { generateText } from "ai"
import { z } from 'zod';
import { streamText } from 'ai';
import type { ModelMessage } from 'ai';
import 'dotenv/config';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const messages: ModelMessage[] = []

async function main() {
    while (true) {
        const userInput = await terminal.question("You: ")

        messages.push({ role: "user", content: userInput })

        const result = streamText({
            model: openai("chatgpt-4o"),
            messages,
        })

        let fullResponse = ""
        process.stdout.write("\nAssistant: ")
        for await (const delta of result.textStream) {
            fullResponse += delta
            process.stdout.write(delta)
        }
        process.stdout.write("\n\n")

        messages.push({ role: "assistant", content: fullResponse})
    }
}
 
main().catch(console.error)
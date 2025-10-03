console.log("Hi")

import { openai } from '@ai-sdk/openai';

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

        let fullRespone = ""
        process.stdout.write("\nAssistant: ")
        for await (const delta of result.textStream) {
            fullRespone += delta
            process.stdout.write(delta)
        }
        process.stdout.write("\n\n")

        messages.push({ role: "assistant", content: fullRespone})
    }
}

main().catch(console.error)
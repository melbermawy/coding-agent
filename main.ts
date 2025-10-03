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
import { tool } from 'ai';
import type { TypedToolCall } from "ai"


const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})


const tools = {
    read_file: {
        description: "Read a text file",
        parameters:{
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
            additionalProperties: false
        }
    }
} as const

async function runTool(name: string, args: any) {
    switch (name) {
        case "read_file": return await fs.readFile(args.path, "utf-8")
    }
}


const messages: ModelMessage[] = []


async function main() {
    while (true) {
        const userInput = await terminal.question("You: ")

        messages.push({ role: "user", content: userInput })

        const first = await generateText({
            model: openai("gpt-4o"),
            messages,
            tools: {
                read_file: {
                    description: "Read a text file",
                    inputSchema: z.object({}),
                    execute: ({}) => {
                        console.log("read a file!")
                    }
                }
            },
            toolChoice: "auto",
            temperature: 0
        })

        if (first.toolCalls?.length) {

            for (const c of first.toolCalls as TypedToolCall<any>[]) {
                const out = await runTool(c.toolName, c.input)
                messages.push({
                    role: "tool",
                    content: out,
                    toolCallId: c.toolCallId
                } as any)
            }

            const second = await generateText({
                 model: openai("gpt-4o"),
                 messages,
                temperature: 0
                 })
            console.log(second.text ?? "");
            messages.push({
                 role: "assistant",
                content: second.text ?? "" 
            })
        } 
        else {
            console.log(first.text ?? "");
            messages.push({
                 role: "assistant",
                content: first.text ?? ""
            })
        }
    }
}
 
main().catch(console.error)
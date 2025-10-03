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

const tools =  {
                read_file: tool({
                    description: "Read a text file",
                    inputSchema: z.object({ path: z.string() }),
                    execute: async (args: any) => {
                        console.log("execute got:", args);
                        if (!args || !args.path) {
                             throw new Error("No path provided");
                            }
                         return await fs.readFile(args.path, "utf-8");
                        }
                    // execute: async ({ path }: { path: string }) => {
                    //     return { text: await fs.readFile(path, "utf-8") }
                    // }
                })}


const list_files = {
    list_file: tool({
        description: "List files in a directory (non-recursive, project root only)",
        inputSchema: z.object({
            dir: z.string().optional(),
            extensions: z.array(z.string()).optional(),
            maxFiles: z.number().int().positive().max(500).optional(),
        }),
        async execute(args) {
            const baseDir = path.resolve(process.cwd());
            const dir = args.dir ? path.resolve(baseDir, args.dir) : baseDir;

            if (!dir.startsWith(baseDir)) {
                throw new Error("Access outside project root is not allowed");
            }

            let entries = await fs.readdir(dir, { withFileTypes: true });

            let files = entries.filter(e => e.isFile()).map(e => e.name);

            if (args.extensions && args.extensions.length > 0) {
                const exts = args.extensions.map((ext: string) => ext.toLowerCase());
                files = files.filter(f => exts.includes(path.extname(f).toLowerCase()));
            }

            if (args.maxFiles && args.maxFiles > 0) {
                files = files.slice(0, args.maxFiles);
            }

            return files.map(file => ({
                name: file,
                path: path.relative(baseDir, path.resolve(dir, file))
            }));
        }
    })
}


const messages: ModelMessage[] = []


async function main() {
    while (true) {
        const userInput = await terminal.question("You: ")

        messages.push({ role: "user", content: userInput })

        const first = await generateText({
            model: openai("gpt-4o"),
            messages,
            tools: tools,
            toolChoice: "auto"
                })
                const toolCalls = (first as any).toolCalls ?? []
            if (toolCalls.length) {

                  messages.push({
                      role: "assistant",
                      content: toolCalls.map((c: any) => ({
                      type: "tool-call",
                      toolCallId: c.toolCallId,
                      toolName: c.toolName,
                      input: c.input, // what the model asked for
                       })),
                    } as ModelMessage)


                for (const c of (first as any).toolCalls) {
                      const exec = tools.read_file.execute;
                        if (!exec) throw new Error("read_file tool missing execute")

                    const result = await exec(c.input, { toolCallId: c.toolCallId } as any)
                    const resultStr = typeof result === "string" ? result : JSON.stringify(result)

                    messages.push({ role: "tool",
                        content: [{
                            type: "tool-result",
                            toolCallId: c.toolCallId,
                            toolName: c.toolName,
                            output: { type: "text", value: result }
                        }] } as ModelMessage)
                }

                const second = await generateText({ model: openai("gpt-4o"), messages })
                console.log(second.text ?? "");
                messages.push({
                    role: "assistant",
                    content: second.text ?? ""
                })
            } else {
                console.log(first.text ?? "");
                messages.push({ role: "assistant", content: first.text ?? ""})
            }
}
}
main().catch(console.error)
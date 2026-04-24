import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function askClaude(prompt) {
  const res = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return res.content[0].text;
}

async function askGPT(prompt) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0].message.content;
}

async function askGemini(prompt) {
  const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
  const res = await model.generateContent(prompt);
  return res.response.text();
}

async function askAll(question) {
  const [a, b, c] = await Promise.all([
    askClaude(question),
    askGPT(question),
    askGemini(question),
  ]);
  return { Claude: a, GPT: b, Gemini: c };
}

async function pipeline(question) {
  const draft    = await askClaude(`이 질문에 답해줘: ${question}`);
  const improved = await askGPT(`아래 답변을 검토하고 보완해줘.\n질문: ${question}\n답변: ${draft}`);
  const final    = await askGemini(`아래 내용을 더 자연스럽게 다듬어줘.\n${improved}`);
  return { draft, improved, final };
}

const question = "인공지능이 미래 직업에 미치는 영향은?";

console.log("=== 병렬 모드 ===");
const parallel = await askAll(question);
for (const [ai, answer] of Object.entries(parallel)) {
  console.log(`\n--- ${ai} ---\n${answer}`);
}

console.log("\n=== 직렬 모드 (최종 결과) ===");
const serial = await pipeline(question);
console.log(serial.final);
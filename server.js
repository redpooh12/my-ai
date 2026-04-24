import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const app = express();
app.use(express.json());
app.use(express.static("public"));

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
  try {
    const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
    const res = await model.generateContent(prompt);
    return res.response.text();
  } catch (e) {
    return "Gemini 일시 중지 중 (한도 초과)";
  }
}
// 병렬 모드
app.post("/api/parallel", async (req, res) => {
  const { question } = req.body;
  const [claude_res, gpt_res, gemini_res] = await Promise.all([
    askClaude(question),
    askGPT(question),
    askGemini(question),
  ]);
  res.json({ Claude: claude_res, GPT: gpt_res, Gemini: gemini_res });
});

// 직렬 모드
app.post("/api/serial", async (req, res) => {
  const { question } = req.body;
  const draft    = await askClaude(`이 질문에 답해줘: ${question}`);
  const improved = await askGPT(`아래 답변을 검토하고 보완해줘.\n질문: ${question}\n답변: ${draft}`);
  const final    = await askGemini(`아래 내용을 더 자연스럽게 다듬어줘.\n${improved}`);
  res.json({ draft, improved, final });
});

app.listen(3000, () => {
  console.log("서버 실행 중! 브라우저에서 http://localhost:3000 열어보세요");
});
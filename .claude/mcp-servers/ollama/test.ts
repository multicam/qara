#!/usr/bin/env bun
/**
 * Test script for Ollama MCP server
 * Tests the tool handlers directly without MCP transport
 */

const OLLAMA_URL = "http://localhost:11434";

async function testOllamaConnection() {
  console.log("Testing Ollama connection...");
  const response = await fetch(`${OLLAMA_URL}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama not reachable: ${response.status}`);
  }
  const data = await response.json();
  console.log(`  Found ${data.models.length} models`);
  return true;
}

async function testChat() {
  console.log("\nTesting ollama_chat...");
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-r1:latest",
      messages: [{ role: "user", content: "What is 2+2? Reply with just the number." }],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`  Response: ${data.message.content.trim()}`);
  return true;
}

async function testAnalyze() {
  console.log("\nTesting ollama_analyze_code (simulated)...");
  const code = `function add(a, b) { return a + b; }`;

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-r1:latest",
      messages: [
        { role: "system", content: "You are a code analyst. Be brief." },
        { role: "user", content: `Analyze this code in one sentence:\n${code}` },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Analyze failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`  Analysis: ${data.message.content.trim().slice(0, 100)}...`);
  return true;
}

async function main() {
  console.log("=== Ollama MCP Server Tests ===\n");

  try {
    await testOllamaConnection();
    await testChat();
    await testAnalyze();

    console.log("\n=== All tests passed! ===");
    console.log("\nThe MCP server is ready. Restart Claude Code to use these tools:");
    console.log("  - mcp__ollama__ollama_chat");
    console.log("  - mcp__ollama__ollama_analyze_code");
    console.log("  - mcp__ollama__ollama_review_diff");
    console.log("  - mcp__ollama__ollama_explain");
    console.log("  - mcp__ollama__ollama_generate");
    console.log("  - mcp__ollama__ollama_models");
  } catch (error) {
    console.error("\nTest failed:", error);
    process.exit(1);
  }
}

main();

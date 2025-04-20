const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const cors = require("cors");
const fetch = require("node-fetch");


const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let currentTask = "";

async function askAI(prompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer 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", 
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const json = await response.json();
  if (!json.choices || !json.choices[0]?.message?.content) {
    throw new Error("Unexpected AI response format");
  }
  return json.choices[0].message.content;
}

app.post("/api/task", async (req, res) => {
  const { task } = req.body;
  currentTask = task;

  try {
    const planText = await askAI(`Write a plan to accomplish this task with JavaScript code:\n"${task}"`);
    const codeMatch = planText.match(/```(?:js|javascript)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1] : planText;

    res.json({
      needsApproval: true,
      plan: {
        explanation: `AI generated code for: "${task}"`,
        code_files: [{ filename: "task.js", content: code }],
        steps: [{ description: "Execute the script", command: "node task.js" }]
      }
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post("/api/approve", (req, res) => {
  const { plan } = req.body;

  if (!plan || !Array.isArray(plan.code_files) || plan.code_files.length === 0) {
    return res.status(400).json({ error: "Invalid plan object or missing code files." });
  }

  const code = plan.code_files[0].content;

  fs.writeFileSync("task.js", code);
  exec("node task.js", (err, stdout, stderr) => {
    const result = {
      success: !err,
      stdout,
      stderr,
      error: err?.message
    };

    res.json({
      success: result.success,
      results: [{
        step: plan.steps[0],
        result
      }]
    });
  });
});

app.post("/api/retry", async (req, res) => {
  const { originalTask, feedback } = req.body;

  try {
    const newPrompt = `You previously generated a solution for: "${originalTask}". The user said: "${feedback}". Please revise your code.`;
    const planText = await askAI(newPrompt);
    const codeMatch = planText.match(/```(?:js|javascript)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1] : planText;

    res.json({
      needsApproval: true,
      plan: {
        explanation: "Refined code based on your feedback.",
        code_files: [{ filename: "task.js", content: code }],
        steps: [{ description: "Execute the updated script", command: "node task.js" }]
      }
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});

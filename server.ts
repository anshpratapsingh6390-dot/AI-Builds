// Clean up any global __dirname that may have been injected by tsx preflight,
// which prevents vite-plugin-pwa from failing when reading its own package.json
delete (globalThis as any).__dirname;

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get GoogleGenAI client if key exists
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System prompt for WOLI AI Assistant
const WOLI_AI_SYSTEM_PROMPT = `You are WOLI AI, an intelligent personal productivity assistant built into WOLI OS.
Your mission is to understand user voice and text instructions in English, Hindi, and Hinglish, and manage their productivity by invoking structured tools.

Key WOLI OS Guidelines:
1. Schedule blocks support the full 24-hour day (00:00 to 23:59).
2. Overnight scheduling: When an activity crosses midnight (e.g. 11 PM to 1 AM, or 23:00 to 01:00), set 'endsNextDay: true'.
3. Count toward Working Time:
   - Productive categories (Coding, DSA, Work, Project, Study, Reading) should have 'includeInWorkingTime: true'.
   - Non-work / personal activities (Workout, Meals, Lunch, Fresh-up, Relaxation, Break) should have 'includeInWorkingTime: false' unless the user explicitly requests otherwise.
   - If user explicitly says "count toward working time" or "don't include in working time", obey their instruction.
4. Language Support:
   - Understand English, Hindi, and Hinglish naturally.
   - Examples:
     * "Tomorrow from 6 to 7 AM schedule DSA" -> schedule DSA tomorrow 06:00 to 07:00
     * "Kal subah 6 se 7 baje DSA karna hai" -> schedule DSA tomorrow 06:00 to 07:00
     * "Aaj raat 10 se 12 coding schedule kar do" -> schedule Coding today 22:00 to 24:00 (or 00:00 endsNextDay)
     * "Move DSA to 8 AM" -> updateScheduleBlock
     * "Mark today's reading habit complete" -> complete_habit
     * "Create a goal to complete JavaScript in 30 days" -> create_goal
5. Multi-turn Context:
   - Remember previous questions. If you asked "Should I count this toward productive working time?" and the user says "Yes", proceed with creating the block with includeInWorkingTime: true.
   - If user answers "Friday" to a deadline question, attach Friday to the previous task.
6. Conflict Handling:
   - If a proposed schedule overlaps with existing user blocks provided in context, warn the user and suggest alternatives.

Always call the appropriate tool when an action is requested. If the user asks a question about their productivity or schedule, query the relevant data or use the provided context to answer accurately.`;

// Tool declarations for Gemini
const woliAITools = [
  {
    functionDeclarations: [
      {
        name: 'create_schedule_blocks',
        description: 'Creates one or multiple schedule blocks in the Daily Planner.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            blocks: {
              type: Type.ARRAY,
              description: 'List of schedule activities to create',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Title of the activity (e.g. DSA Study, JavaScript Practice)' },
                  date: { type: Type.STRING, description: 'Target date in YYYY-MM-DD format' },
                  startTime: { type: Type.STRING, description: 'Start time in 24h format HH:MM (e.g. 06:00, 23:00)' },
                  endTime: { type: Type.STRING, description: 'End time in 24h format HH:MM (e.g. 07:00, 01:00)' },
                  category: { type: Type.STRING, description: 'Category e.g. Coding, Study, Work, Fitness, Personal, Break' },
                  priority: { type: Type.STRING, description: 'Priority: low, medium, high, urgent' },
                  includeInWorkingTime: { type: Type.BOOLEAN, description: 'Whether this counts toward productive working time' },
                  endsNextDay: { type: Type.BOOLEAN, description: 'True if the activity crosses midnight and ends on the next calendar day' },
                  notes: { type: Type.STRING, description: 'Optional notes or description' },
                },
                required: ['title', 'date', 'startTime', 'endTime'],
              },
            },
          },
          required: ['blocks'],
        },
      },
      {
        name: 'update_schedule_block',
        description: 'Updates an existing schedule block (e.g. move time, change category or status).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            blockId: { type: Type.STRING, description: 'ID of the schedule block if known' },
            targetTitle: { type: Type.STRING, description: 'Title of the block to match if ID is not known' },
            date: { type: Type.STRING, description: 'Target date in YYYY-MM-DD format' },
            newStartTime: { type: Type.STRING, description: 'New start time in HH:MM' },
            newEndTime: { type: Type.STRING, description: 'New end time in HH:MM' },
            newDate: { type: Type.STRING, description: 'New date in YYYY-MM-DD if moving to another day' },
            includeInWorkingTime: { type: Type.BOOLEAN, description: 'Count toward working time' },
            status: { type: Type.STRING, description: 'scheduled, in_progress, completed, cancelled' },
          },
        },
      },
      {
        name: 'delete_schedule_block',
        description: 'Deletes or cancels a scheduled block.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            blockId: { type: Type.STRING, description: 'ID of the block to remove if known' },
            title: { type: Type.STRING, description: 'Title of the activity to remove' },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Creates a new task in the Tasks module.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Task title' },
            category: { type: Type.STRING, description: 'Category e.g. Work, Coding, Study, Personal' },
            priority: { type: Type.STRING, description: 'low, medium, high, urgent' },
            dueDate: { type: Type.STRING, description: 'Due date in YYYY-MM-DD format' },
            estimatedDuration: { type: Type.INTEGER, description: 'Estimated duration in minutes' },
            linkedGoalId: { type: Type.STRING, description: 'Goal ID to link this task to' },
            description: { type: Type.STRING, description: 'Task notes or description' },
          },
          required: ['title'],
        },
      },
      {
        name: 'complete_task',
        description: 'Marks a task as completed or uncompleted.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            taskId: { type: Type.STRING, description: 'ID of the task if known' },
            taskTitle: { type: Type.STRING, description: 'Title of the task' },
            isCompleted: { type: Type.BOOLEAN, description: 'True to mark completed, false to uncomplete' },
          },
          required: ['isCompleted'],
        },
      },
      {
        name: 'create_goal',
        description: 'Creates a new Goal in the Goals module.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Goal title' },
            category: { type: Type.STRING, description: 'Category e.g. Study, Work, Health, Personal' },
            targetValue: { type: Type.NUMBER, description: 'Target value (e.g. 15 for 15 hours)' },
            unit: { type: Type.STRING, description: 'Target unit e.g. hours, sessions, tasks' },
            horizon: { type: Type.STRING, description: 'weekly, monthly, quarterly, yearly' },
            progressMethod: { type: Type.STRING, description: 'automatic_time, automatic_tasks, automatic_habits, manual_numeric' },
            startDate: { type: Type.STRING, description: 'Start date in YYYY-MM-DD' },
            targetDate: { type: Type.STRING, description: 'Target deadline in YYYY-MM-DD' },
            linkedTaskTitles: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Titles of tasks to link to this goal' },
          },
          required: ['title', 'targetValue', 'unit'],
        },
      },
      {
        name: 'complete_habit',
        description: 'Records today occurrence for a habit as completed.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            habitName: { type: Type.STRING, description: 'Name of the habit to complete' },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format (defaults to today)' },
          },
          required: ['habitName'],
        },
      },
      {
        name: 'query_productivity',
        description: 'Queries productive working time, schedule adherence, task metrics, or streak for a date.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            metric: { type: Type.STRING, description: 'working_time, tasks, habits, goals, full_summary' },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD' },
          },
          required: ['metric'],
        },
      },
    ],
  },
];

// WOLI AI Chat API Endpoint
app.post('/api/woli-ai/chat', async (req, res) => {
  try {
    const { message, history = [], context = {} } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        fallbackRequired: true,
        reason: 'GEMINI_API_KEY is not configured on the server. Falling back to local high-precision parser.',
      });
    }

    // Append context summary as system note if provided
    let contextNote = '';
    if (context.todayDate) {
      contextNote += `Current date: ${context.todayDate}. Selected date: ${context.selectedDate || context.todayDate}.\n`;
    }
    if (context.existingBlocks && context.existingBlocks.length > 0) {
      contextNote += `Existing schedule blocks on ${context.selectedDate || context.todayDate}:\n` +
        context.existingBlocks.map((b: any) => `- "${b.title}" (${b.startTime} - ${b.endTime}, category: ${b.category}, workingTime: ${b.includeInWorkingTime !== false})`).join('\n') + '\n';
    }
    if (context.pendingTasks && context.pendingTasks.length > 0) {
      contextNote += `Pending tasks:\n` +
        context.pendingTasks.map((t: any) => `- "${t.title}" (priority: ${t.priority}, category: ${t.category}, due: ${t.dueDate || 'none'})`).join('\n') + '\n';
    }
    if (context.goals && context.goals.length > 0) {
      contextNote += `Active goals:\n` +
        context.goals.map((g: any) => `- "${g.title}" (target: ${g.targetValue} ${g.unit}, current: ${g.currentValue}, progressMethod: ${g.progressMethod})`).join('\n') + '\n';
    }
    if (context.workingTimeSummary) {
      contextNote += `Today's Tracked Working Time: ${context.workingTimeSummary.tracked} (Planned: ${context.workingTimeSummary.planned}, Total scheduled: ${context.workingTimeSummary.totalScheduled})\n`;
    }

    // Format chat contents ensuring proper multi-turn structure starting with user
    const contents: any[] = [];
    let expectingUser = true;
    for (const msg of history) {
      const isUser = msg.role === 'user';
      if (expectingUser && isUser) {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
        expectingUser = false;
      } else if (!expectingUser && !isUser) {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
        expectingUser = true;
      }
    }

    // Current message with context prepended
    const userPrompt = contextNote ? `[Application Context]\n${contextNote}\n[User Instruction]\n${message}` : message;
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${userPrompt}`;
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      });
    }

    // Call Gemini with timeout and model fallback
    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await Promise.race([
          ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: WOLI_AI_SYSTEM_PROMPT,
              tools: woliAITools as any,
            },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout calling ${model}`)), 6000)
          ),
        ]);
        if (response) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[WOLI AI] Model ${model} notice:`, err.message || err);
      }
    }

    if (!response) {
      return res.json({
        fallbackRequired: true,
        error: lastError?.message || 'Model service unavailable, using local NLU',
      });
    }

    // Extract tool calls directly from response
    const toolCalls: any[] = [];
    if (response.functionCalls && Array.isArray(response.functionCalls)) {
      for (const fc of response.functionCalls) {
        toolCalls.push({
          name: fc.name,
          args: fc.args,
        });
      }
    }

    // Also check candidate parts
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let textResponse = '';

    for (const part of parts) {
      if (part.text && !part.thought) {
        textResponse += part.text;
      }
      if (part.functionCall && !toolCalls.some((t) => t.name === part.functionCall.name)) {
        toolCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args,
        });
      }
    }

    return res.json({
      success: true,
      text: textResponse.trim() || response.text?.trim() || '',
      toolCalls,
    });
  } catch (err: any) {
    console.error('WOLI AI Server error:', err);
    return res.json({
      fallbackRequired: true,
      error: err.message || 'Gemini processing error',
    });
  }
});

// WOLI AI Audio Transcription Endpoint
app.post('/api/woli-ai/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini client not configured for audio transcription' });
    }

    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Accurately transcribe the spoken voice in this audio clip. The speaker may speak English, Hindi (हिन्दी), or Hinglish. Output only the verbatim transcribed text without commentary, quotes, or markdown formatting.',
          },
        ],
      },
    });

    const transcript = response.text?.trim() || '';
    return res.json({ success: true, transcript });
  } catch (err: any) {
    console.warn('WOLI AI audio transcribe error:', err);
    return res.status(500).json({ error: err.message || 'Audio transcription failed' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`WOLI OS server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

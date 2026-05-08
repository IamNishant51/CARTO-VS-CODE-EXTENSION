import * as vscode from 'vscode';

const SYSTEM_PROMPT = `You are an elite principal software engineer and architecture expert. You are analyzing an entire project codebase.

Your instructions:
1. Provide exceptionally clear, concise, and expert-level answers.
2. Cite specific file paths and code snippets in your response when relevant.
3. Output your response entirely in valid Markdown format.
4. Use best practices, recognize patterns, and identify potential bugs or architectural flaws.
5. Be direct and avoid generic filler.`;

export async function askAI(prompt: string, context: string, provider: string): Promise<string> {
  const config = vscode.workspace.getConfiguration('carto');
  
  try {
    let activeProvider = provider;
    
    // Auto-detect provider if the active one is missing a key but another is populated
    if (activeProvider === 'gemini' && !config.get('geminiApiKey')) {
      if (config.get('groqApiKey')) activeProvider = 'groq';
      else if (config.get('openaiApiKey')) activeProvider = 'openai';
    } else if (activeProvider === 'openai' && !config.get('openaiApiKey')) {
      if (config.get('groqApiKey')) activeProvider = 'groq';
      else if (config.get('geminiApiKey')) activeProvider = 'gemini';
    } else if (activeProvider === 'groq' && !config.get('groqApiKey')) {
      if (config.get('geminiApiKey')) activeProvider = 'gemini';
      else if (config.get('openaiApiKey')) activeProvider = 'openai';
    }

    let maxContextChars = 300000; // Default (Gemini)
    if (activeProvider === 'groq') maxContextChars = 35000; // Safe limit for Groq's 12k TPM
    else if (activeProvider === 'openai') maxContextChars = 100000; // Safe limit for standard GPT-4o usage
    else if (activeProvider === 'ollama') maxContextChars = 40000; // Safe limit for local models

    const truncatedContext = context.length > maxContextChars 
      ? context.substring(0, maxContextChars) + '\n...[Context Truncated to fit model limits]' 
      : context;
    const userPrompt = `--- CODEBASE CONTEXT ---\n${truncatedContext}\n\n--- USER QUESTION ---\n${prompt}`;

    switch (activeProvider) {
      case 'gemini':
        return await askGemini(SYSTEM_PROMPT + '\n\n' + userPrompt, config.get('geminiApiKey') as string);
      case 'openai':
        return await askOpenAI(SYSTEM_PROMPT, userPrompt, config.get('openaiApiKey') as string);
      case 'groq':
        return await askGroq(SYSTEM_PROMPT, userPrompt, config.get('groqApiKey') as string);
      case 'ollama':
        return await askOllama(SYSTEM_PROMPT, userPrompt, config.get('ollamaEndpoint') as string);
      default:
        throw new Error(`Unknown AI provider: ${activeProvider}`);
    }
  } catch (error: any) {
    console.error('AI Request failed:', error);
    throw new Error(error.message || 'Failed to get response from AI');
  }
}

async function askGemini(fullPrompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("Gemini API key is not configured. Please set it in Settings.");
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }]
    })
  });
  
  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(err.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received";
}

async function askOpenAI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("OpenAI API key is not configured. Please set it in Settings.");
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  
  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(err.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || "No response received";
}

async function askGroq(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("Groq API key is not configured. Please set it in Settings.");
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  
  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(err.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || "No response received";
}

async function askOllama(systemPrompt: string, userPrompt: string, endpoint: string): Promise<string> {
  const url = endpoint || 'http://localhost:11434';
  
  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}. Make sure Ollama is running and accessible.`);
  }
  
  const data = await response.json() as any;
  return data.message?.content || "No response received";
}

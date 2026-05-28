import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export class AIService {
  private static async callGemini(prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || "{}";
  }

  private static async callOpenRouter(
    prompt: string,
    maxTokens: number = 500,
    model: string = "openai/gpt-3.5-turbo"
  ): Promise<string> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "api-analytics-project",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("STATUS:", response.status);
      console.log("BODY:", errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    return data.choices[0]?.message?.content || "{}";
  }

  private static async analyzeWithFallback(
    prompt: string,
    maxTokens: number = 500
  ): Promise<string> {
    // Try Gemini first
    try {
      console.log("Attempting Gemini API...");
      return await this.callGemini(prompt);
    } catch (geminiError: any) {
      console.error("Gemini Error:", geminiError.message);
      console.warn("Gemini failed, falling back to OpenRouter...");

      // Try OpenRouter with primary model
      try {
        console.log("Attempting OpenRouter with GPT-3.5 Turbo...");
        return await this.callOpenRouter(
          prompt,
          maxTokens,
          "openai/gpt-3.5-turbo"
        );
      } catch (primaryError: any) {
        console.error("Primary OpenRouter model failed:", primaryError.message);
        console.warn("Trying backup model (Mistral)...");

        // Try OpenRouter with backup model
        try {
          return await this.callOpenRouter(
            prompt,
            maxTokens,
            "mistralai/mistral-7b-instruct:free"
          );
        } catch (backupError: any) {
          console.error("Backup OpenRouter model failed:", backupError.message);
          throw new Error("All AI services failed");
        }
      }
    }
  }

  static async analyzeErrors(errors: any[]): Promise<any> {
    const prompt = `
You are an API monitoring assistant. Analyze these error logs and provide:
1. Root cause category (database, authentication, validation, etc.)
2. Severity level (low, medium, high, critical)
3. Brief suggested fix
Errors:
${JSON.stringify(errors, null, 2)}
Respond in JSON format only:
{
  "rootCause": "string",
  "severity": "low|medium|high|critical",
  "suggestedFix": "string",
  "affectedEndpoints": ["string"]
}`;

    try {
      const result = await this.analyzeWithFallback(prompt, 500);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result);
    } catch (error) {
      console.error("Error analysis failed:", error);
      throw error;
    }
  }

  static async detectAnomalies(metrics: any): Promise<any> {
    const prompt = `
Analyze these API metrics for the last hour and identify any anomalies:
Metrics:
- Total requests: ${metrics.total_requests}
- Average response time: ${metrics.avg_response_time}ms
- Error rate: ${((metrics.error_count / metrics.total_requests) * 100).toFixed(2)}%
- Slowest endpoint: ${metrics.slowest_endpoint}
Historical baseline (typical values):
- Average requests/hour: 5000
- Average response time: 150ms
- Error rate: 2%
Respond in JSON only:
{
  "hasAnomaly": boolean,
  "anomalyType": "traffic_spike|latency_increase|error_spike|none",
  "severity": "low|medium|high",
  "explanation": "string",
  "recommendation": "string"
}`;

    try {
      const result = await this.analyzeWithFallback(prompt, 300);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result);
    } catch (error) {
      console.error("Anomaly detection failed:", error);
      throw error;
    }
  }

  static async summarizeLogs(logs: any[]): Promise<string> {
    const prompt = `
Summarize these API logs in 2-3 sentences for a developer dashboard:
${JSON.stringify(logs.slice(0, 50), null, 2)}
Focus on:
- Most active endpoints
- Any concerning patterns
- Performance highlights`;

    try {
      return await this.analyzeWithFallback(prompt, 150);
    } catch (error) {
      console.error("Log summarization failed:", error);
      throw error;
    }
  }
}

console.log("Gemini Key:", GEMINI_API_KEY ? "Configured" : "Missing");
console.log("OpenRouter Key:", OPENROUTER_API_KEY ? "Configured" : "Missing");
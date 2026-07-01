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
              parts: [{ text: prompt }]
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
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
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "api-analytics",
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
    //try Gemini first
    try {
      console.log("Attempting Gemini API...");
      return await this.callGemini(prompt);
    } catch (geminiError: any) {
      console.error("Gemini Error:", geminiError.message);
      console.warn("Gemini failed, falling back to OpenRouter...");

      //try OpenRouter with primary model
      try {
        console.log("Attempting OpenRouter with GPT-3.5 Turbo...");
        return await this.callOpenRouter(
          prompt,
          maxTokens,
          "openai/gpt-3.5-turbo"
        );
      } catch (primaryError: any) {
        console.error("Primary OpenRouter model failed:", primaryError.message);
        console.warn("Trying backup model (GPT-OSS-20B)...");

        //try OpenRouter with backup model
        try {
          const result = await this.callOpenRouter(
            prompt,
            maxTokens,
            //"mistralai/mistral-7b-instruct:free"
            "openai/gpt-oss-120b:free"
          );
          console.log("GPT-OSS backup successful");
          return result;
        } catch (backupError: any) {
          console.error("Backup OpenRouter model failed:", backupError.message);
          throw new Error("All AI services failed");
        }

      }
    }
  }

  static async analyzeErrors(errors: any[]): Promise<any> {
    const prompt = `
      You are an experienced Site Reliability Engineer (SRE).

      Analyze the following API error logs.

      Your task:
      1. Identify the most likely root cause category.
      2. Determine the severity.
      3. Suggest one practical fix.
      4. List only the affected endpoints.

      Rules:
      - Base your answer ONLY on the provided logs.
      - Do not invent missing information.
      - Keep explanations short and technical.
      - If multiple errors exist, identify the dominant issue.

      Error Logs:
      ${JSON.stringify(errors, null, 2)}

      Return ONLY valid JSON.

      {
        "rootCause": "Database|Authentication|Validation|Timeout|Network|Rate Limit|Internal Server Error|Unknown",
        "severity": "low|medium|high|critical",
        "suggestedFix": "string",
        "affectedEndpoints": ["string"]
      }
    `;

    try {
      const result = await this.analyzeWithFallback(prompt, 150);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result);
    } catch (error) {
      console.error("Error analysis failed:", error);
      throw error;
    }
  }

  static async detectAnomalies(metrics: any): Promise<any> {
    const prompt = `
      You are an experienced Site Reliability Engineer (SRE).

      Analyze the API metrics below and determine whether an anomaly exists.

      Rules:
      - Compare ONLY against the historical baseline.
      - All response times are in milliseconds (ms).
      - Low traffic alone is NOT an anomaly.
      - Do not exaggerate problems.
      - Consider latency above 1000 ms or error rate above 20% as significant.
      - If everything looks normal, return "none".

      Current Metrics:
      - Total Requests: ${metrics.total_requests}
      - Average Response Time: ${metrics.avg_response_time} ms
      - Error Rate: ${((metrics.error_count / Math.max(metrics.total_requests, 1)) * 100).toFixed(2)}%
      - Slowest Endpoint: ${metrics.slowest_endpoint}

      Historical Baseline (Demo Environment):
      - Typical Requests/Hour: 15-30
      - Average Response Time: 150 ms
      - Average Error Rate: 5-10%

      Return ONLY valid JSON.

      {
        "hasAnomaly": true,
        "anomalyType": "traffic_drop|traffic_spike|latency_increase|error_spike|none",
        "severity": "low|medium|high",
        "explanation": "string",
        "recommendation": "string"
      }
    `;

    try {
      const result = await this.analyzeWithFallback(prompt, 100);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result);
    } catch (error) {
      console.error("Anomaly detection failed:", error);
      throw error;
    }
  }

  static async summarizeLogs(logs: any[]): Promise<string> {
    const prompt = `
      You are an experienced Site Reliability Engineer writing a dashboard summary.

      Analyze these API logs.

      Rules:
      - Use ONLY the supplied logs.
      - Do NOT invent endpoints or metrics.
      - All response times are in milliseconds (ms).
      - If traffic is low, simply mention that traffic volume is low.
      - Mention only meaningful issues.
      - If the API looks healthy, explicitly say so.
      - Keep the summary between 2 and 4 sentences.
      - Write naturally for developers.
      - No bullet points.
      - No markdown.

      Logs:${JSON.stringify(logs.slice(0, 50), null, 2)}
    `;

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
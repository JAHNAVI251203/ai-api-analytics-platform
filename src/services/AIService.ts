import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export class AIService {
  private static dashboardFallback(rangeStats: Record<string, any[]>, errors: any[]) {
    const summaries = Object.fromEntries(Object.entries(rangeStats).map(([range, endpoints]) => {
      const total = endpoints.reduce((sum: number, endpoint: any) => sum + Number(endpoint.request_count), 0);
      const errorCount = endpoints.reduce((sum: number, endpoint: any) => sum + Number(endpoint.error_count), 0);
      const slowest = endpoints.reduce((current: any, endpoint: any) =>
        Number(endpoint.avg_response_time) > Number(current.avg_response_time) ? endpoint : current,
        endpoints[0] || { endpoint: '/unknown', avg_response_time: 0 });
      const errorRate = total ? ((errorCount / total) * 100).toFixed(1) : '0.0';
      return [range, `${total} requests across ${endpoints.length} endpoint groups with a ${errorRate}% error rate. ${slowest.endpoint} is the slowest observed endpoint at ${Math.round(Number(slowest.avg_response_time) || 0)} ms on average.`];
    }));
    const dominant = errors[0];
    return {
      summaries,
      errorAnalysis: dominant ? {
        rootCause: dominant.status_code >= 500 ? 'Internal Server Error' : 'Unknown',
        severity: dominant.status_code >= 500 ? 'high' : 'medium',
        suggestedFix: `Inspect ${dominant.method} ${dominant.endpoint} and its upstream dependency.`,
        affectedEndpoints: [...new Set(errors.map(error => error.endpoint))]
      } : { message: 'No monitored API errors are available for analysis.' }
    };
  }

  private static anomalyFallback(metrics: any, baseline: any) {
    const currentErrorRate = (Number(metrics.error_count) / Math.max(Number(metrics.total_requests), 1)) * 100;
    const baselineLatency = Number(baseline.avg_response_time) || 0;
    const baselineErrorRate = Number(baseline.error_rate) || 0;
    if (Number(metrics.avg_response_time) > Math.max(1000, baselineLatency * 1.5)) {
      return { hasAnomaly: true, anomalyType: 'latency_increase', severity: 'high', explanation: `Recent average latency is ${Math.round(Number(metrics.avg_response_time))} ms versus a ${Math.round(baselineLatency)} ms baseline.`, recommendation: `Inspect ${metrics.slowest_endpoint} and its downstream work.` };
    }
    if (currentErrorRate > Math.max(20, baselineErrorRate * 2)) {
      return { hasAnomaly: true, anomalyType: 'error_spike', severity: 'high', explanation: `Recent error rate is ${currentErrorRate.toFixed(1)}% versus a ${baselineErrorRate.toFixed(1)}% baseline.`, recommendation: 'Inspect the failed endpoints and their logs.' };
    }
    return { hasAnomaly: false, anomalyType: 'none', severity: 'low', explanation: 'Recent telemetry is within the observed baseline.', recommendation: 'Continue monitoring API traffic.' };
  }

  private static async fetchWithTimeout(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private static async callGemini(prompt: string): Promise<string> {
    const response = await this.fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`,
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
    const response = await this.fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
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
        console.warn("Trying backup model (GPT-OSS-120B)...");

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

  static async analyzeDashboard(rangeStats: Record<string, any[]>, errors: any[]): Promise<{ summaries: Record<string, string>; errorAnalysis: any }> {
    const prompt = `
      You are an experienced Site Reliability Engineer (SRE).

      Analyze this API telemetry dashboard. Return a concise factual summary for each supplied time range and one error analysis.

      Your task:
      1. Summarize each time range in 1 or 2 sentences using only its supplied endpoint statistics.
      2. If error logs exist, identify the dominant root-cause category, severity, one practical fix, and only affected endpoints.
      3. If no error logs exist, return an errorAnalysis object with a short message saying no monitored errors are available.

      Rules:
      - Base your answer ONLY on the supplied telemetry.
      - Do not invent missing information.
      - All response times are in milliseconds.
      - Keep explanations short and technical. No markdown.

      Endpoint statistics by time range:
      ${JSON.stringify(rangeStats, null, 2)}

      Error logs:
      ${JSON.stringify(errors, null, 2)}

      Return ONLY valid JSON.

      {
        "summaries": {
          "1 hour": "string",
          "6 hours": "string",
          "24 hours": "string",
          "7 days": "string"
        },
        "errorAnalysis": {
          "rootCause": "Database|Authentication|Validation|Timeout|Network|Rate Limit|Internal Server Error|Unknown",
          "severity": "low|medium|high|critical",
          "suggestedFix": "string",
          "affectedEndpoints": ["string"]
        }
      }
    `;

    try {
      const result = await this.analyzeWithFallback(prompt, 600);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result) as any;
      const summaries = Object.fromEntries(Object.keys(rangeStats).map(range => [
        range,
        typeof parsed.summaries?.[range] === 'string'
          ? parsed.summaries[range]
          : 'AI summary is temporarily unavailable.'
      ]));
      const errorAnalysis = parsed.errorAnalysis && typeof parsed.errorAnalysis === 'object'
        ? parsed.errorAnalysis
        : { message: errors.length ? 'AI error analysis is temporarily unavailable.' : 'No monitored API errors are available for analysis.' };
      return { summaries, errorAnalysis };
    } catch (error) {
      console.error("Dashboard analysis failed:", error);
      return this.dashboardFallback(rangeStats, errors);
    }
  }

  static async detectAnomalies(metrics: any, baseline: any): Promise<any> {
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

      Historical Baseline (the first 10 stored telemetry events):
      - Baseline Requests: ${baseline.total_requests}
      - Average Response Time: ${baseline.avg_response_time} ms
      - Average Error Rate: ${baseline.error_rate}%

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
      return this.anomalyFallback(metrics, baseline);
    }
  }

  static async summarizeLogs(logs: any[]): Promise<string> {
    const prompt = `
      You are an experienced Site Reliability Engineer writing a dashboard summary.Write the summary exactly as it would appear in Datadog, New Relic, Grafana Cloud, or Dynatrace. Avoid generic AI wording and keep it concise, factual, and professional.

      Analyze these API logs.

      If the request volume is below the historical baseline, mention low traffic only once if it is relevant. Otherwise, focus on API health and performance instead.

      Rules:
      - Use ONLY the supplied logs.
      - Do NOT invent endpoints or metrics.
      - All response times are in milliseconds (ms).
      - If traffic volume is below the historical baseline, mention it briefly only if it helps explain the overall system behavior. Do not overemphasize low traffic.
      - Mention only significant issues such as repeated errors, elevated error rates, or consistently slow endpoints. Ignore isolated single errors unless they are HTTP 5xx errors.
      - If the API looks healthy, emphasize stable performance before mentioning any minor issues.
      - Consider average response times below 200 ms as fast.
      - Consider 200–500 ms as acceptable.
      - Consider above 500 ms as elevated latency.
      - Keep the summary between 3 and 6 sentences.
      - Do not repeat the same observation in different sentences.
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

/**
 * CostTracker - Tracks and logs costs for AI API calls
 * Useful for monitoring API spending and cost optimization
 */

export class CostTracker {
  // Pricing per 1M tokens (as of 2024)
  private static PRICING = {
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 }, // per 1K tokens
    "mistralai/mistral-7b-instruct:free": { input: 0, output: 0 }, // Free model
    gemini: { input: 0.075, output: 0.3 }, // per 1M tokens
  };

  /**
   * Log API call cost
   * @param tokens Number of tokens used
   * @param model Model used (e.g., 'gpt-3.5-turbo')
   */
  static logAPICost(tokens: number, model: string): void {
    const costPer1k = model === "gpt-3.5-turbo" ? 0.002 : 0.01;
    const cost = (tokens / 1000) * costPer1k;
    console.log(`AI call: ${tokens} tokens, $${cost.toFixed(4)} (${model})`);
  }

  /**
   * Calculate cost for tokens on a specific model
   * @param tokens Number of tokens
   * @param model Model name
   * @returns Cost in USD
   */
  static calculateCost(tokens: number, model: string): number {
    const pricing = this.PRICING[model as keyof typeof this.PRICING];
    if (!pricing) return 0;
    return (tokens / 1000) * (pricing.input + pricing.output);
  }

  /**
   * Estimate tokens from text (rough estimation)
   * @param text Text content
   * @returns Estimated token count
   */
  static estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
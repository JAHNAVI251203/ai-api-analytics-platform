export class CostTracker {
  private static PRICING = {
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 }, //per 1K tokens
    "openai/gpt-oss-120b:free": { input: 0, output: 0 }, //free 
    gemini: { input: 0.075, output: 0.3 }, //per 1M tokens
  };

  //log API call cost
  static logAPICost(tokens: number, model: string): void {
    const cost = this.calculateCost(tokens, model);

    console.log(
      `AI call: ${tokens} tokens, $${cost.toFixed(4)} (${model})`
    );
  }

  //cost for tokens on a specific model
  static calculateCost(tokens: number, model: string): number {
    const pricing = this.PRICING[model as keyof typeof this.PRICING];
    if (!pricing) return 0;
    return (tokens / 1000) * (pricing.input + pricing.output);
  }

  //estimate tokens from text(assumption: 1 token = 4 characters)
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);//rounds up to nearest whole integer
  }
}
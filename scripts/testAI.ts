import { AIService } from "../src/services/AIService";

async function test() {
  console.log("--- Test 1: Error Analysis ---");
  const errors = [
    {
      timestamp: "2024-05-26T10:30:00Z",
      endpoint: "/api/users",
      status: 500,
      message: "Database connection timeout",
      stack: "ConnectionError: ECONNREFUSED",
    },
    {
      timestamp: "2024-05-26T10:31:00Z",
      endpoint: "/api/users",
      status: 500,
      message: "Database connection timeout",
      stack: "ConnectionError: ECONNREFUSED",
    },
    {
      timestamp: "2024-05-26T10:32:00Z",
      endpoint: "/api/auth/login",
      status: 401,
      message: "Invalid JWT token",
      stack: "AuthenticationError: token_expired",
    },
  ];

  try {
    const errorAnalysis = await AIService.analyzeErrors(errors);
    console.log("Error Analysis Result:");
    console.log(JSON.stringify(errorAnalysis, null, 2));
    console.log();
  } catch (error) {
    console.error("Error analysis failed:", error);
  }

  console.log("--- Test 2: Anomaly Detection ---");
  const metrics = {
    total_requests: 12500,
    error_count: 450,
    avg_response_time: 280,
    slowest_endpoint: "/api/reports/generate",
  };

  try {
    const anomalies = await AIService.detectAnomalies(metrics);
    console.log("Anomaly Detection Result:");
    console.log(JSON.stringify(anomalies, null, 2));
    console.log();
  } catch (error) {
    console.error("Anomaly detection failed:", error);
  }

  console.log("--- Test 3: Log Summarization ---");
  const logs = [
    { timestamp: "2024-05-26T10:00:00Z", endpoint: "/api/users", status: 200, duration: 145 },
    { timestamp: "2024-05-26T10:01:00Z", endpoint: "/api/users", status: 200, duration: 152 },
    { timestamp: "2024-05-26T10:02:00Z", endpoint: "/api/products", status: 200, duration: 210 },
    { timestamp: "2024-05-26T10:03:00Z", endpoint: "/api/users", status: 200, duration: 148 },
    { timestamp: "2024-05-26T10:04:00Z", endpoint: "/api/orders", status: 200, duration: 345 },
    { timestamp: "2024-05-26T10:05:00Z", endpoint: "/api/products", status: 200, duration: 205 },
  ];

  try {
    const summary = await AIService.summarizeLogs(logs);
    console.log("Log Summary Result:");
    console.log(summary);
    console.log();
  } catch (error) {
    console.error("Log summarization failed:", error);
  }

  console.log("All tests completed!");
}

test();
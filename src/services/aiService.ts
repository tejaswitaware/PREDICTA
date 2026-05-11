import { GoogleGenAI } from "@google/genai";
import { Dataset } from "../types";

export async function generateAIInsights(dataset: Dataset): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI Insights unavailable: API Key not found.";

  const ai = new GoogleGenAI({ apiKey });
  
  const summary = {
    name: dataset.name,
    rows: dataset.rowCount,
    cols: dataset.colCount,
    columns: dataset.columns.map(c => ({
      name: c.name,
      type: c.type,
      unique: c.uniqueValues,
      missing: c.missingValues,
      stats: c.type === 'numeric' ? { mean: c.mean, min: c.min, max: c.max } : { top: c.mostFrequent }
    }))
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a data analyst. Analyze this dataset summary and provide 3-5 concise, actionable insights (trends, anomalies, or interesting correlations). 
      Format the output as a clean list of bullet points.
      
      Dataset Summary:
      ${JSON.stringify(summary, null, 2)}`,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI insights.";
  }
}

export async function queryDataAssistant(dataset: Dataset, query: string): Promise<{ chart: any; explanation: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  
  const colSummary = dataset.columns.map(c => ({ name: c.name, type: c.type }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a data assistant. The user wants to see a chart for: "${query}".
      Based on the columns available, respond with a JSON object containing:
      1. "chart": A configuration object with:
         - "type": "bar", "line", "pie", "scatter", "area", "treemap", or "histogram"
         - "xAxis": column name for X axis
         - "yAxis": column name for Y axis (optional for pie/histogram)
         - "title": A descriptive title for the chart
      2. "explanation": A very brief (1 sentence) explanation of why this chart was chosen.
      
      Available Columns:
      ${JSON.stringify(colSummary)}
      
      Response Format: JSON only.`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Assistant Error:", error);
    return null;
  }
}

export async function generateDataStory(dataset: Dataset): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "Narrative unavailable.";

  const ai = new GoogleGenAI({ apiKey });
  
  // Sample data for context
  const sample = dataset.data.slice(0, 10);
  const metadata = dataset.columns.map(c => ({
    name: c.name,
    type: c.type,
    stats: c.type === 'numeric' ? { mean: c.mean, min: c.min, max: c.max } : { top: c.mostFrequent }
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a business consultant. Write a professional narrative "Data Story" (3-4 paragraphs) summarizing this dataset's performance, trends, and key takeaways.
      Avoid technical jargon. Focus on common business language (e.g., "Steady growth", "Outliers detected", "Dominant segments").
      
      Dataset Metadata:
      ${JSON.stringify(metadata, null, 2)}
      
      Sample Rows:
      ${JSON.stringify(sample, null, 2)}`,
    });

    return response.text || "No story generated.";
  } catch (error) {
    console.error("Story Mode Error:", error);
    return "Error generating data story.";
  }
}

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

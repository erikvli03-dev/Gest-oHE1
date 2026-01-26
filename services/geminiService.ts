
import { GoogleGenAI } from "@google/genai";
import { OvertimeRecord } from "../types";

/**
 * Service to analyze overtime records using Gemini.
 * Note: process.env.API_KEY is assumed to be available.
 */
export const analyzeOvertimeTrends = async (records: OvertimeRecord[]) => {
  if (records.length === 0) return "Nenhum dado disponível para análise.";

  // Use process.env.API_KEY directly as per SDK requirements.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataSummary = records.map(r => ({
    local: r.location,
    supervisor: r.supervisor,
    colaborador: r.employee,
    duracao: r.durationMinutes,
    motivo: r.reason,
    data: r.startDate
  }));

  const prompt = `
    Analise os registros de horas extras abaixo e retorne um relatório curto para celular:
    ${JSON.stringify(dataSummary)}

    Retorne:
    1. Motivo principal da semana.
    2. Supervisor com mais volume.
    3. Uma dica rápida para reduzir custos.

    Seja extremamente breve.
  `;

  try {
    // Basic text tasks use gemini-3-flash-preview.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Extract text from property (not method call).
    return response.text || "Análise concluída sem texto.";
  } catch (error: any) {
    console.error("Erro na análise da IA:", error);
    return "IA temporariamente indisponível.";
  }
};

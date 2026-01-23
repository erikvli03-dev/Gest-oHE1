
import { GoogleGenAI } from "@google/genai";
import { OvertimeRecord } from "../types";

export const analyzeOvertimeTrends = async (records: OvertimeRecord[]) => {
  if (records.length === 0) return "Nenhum dado disponível para análise.";

  // Fix: The API key must be obtained exclusively from process.env.API_KEY and used directly.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataSummary = records.map(r => ({
    local: r.location,
    supervisor: r.supervisor,
    colaborador: r.employee,
    duracao: r.durationMinutes,
    motivo: r.reason,
    status: r.status,
    data: r.startDate
  }));

  const prompt = `
    Analise os registros de horas extras abaixo e retorne um relatório curto para celular:
    ${JSON.stringify(dataSummary)}

    Retorne:
    1. Motivo principal da semana.
    2. Supervisor com mais horas pendentes.
    3. Uma dica rápida para reduzir custos.

    Seja extremamente breve.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: Access .text property directly (not a method).
    return response.text;
  } catch (error: any) {
    console.error("Erro na análise da IA:", error);
    if (!navigator.onLine) return "Sem conexão com a internet. A análise de IA requer rede ativa.";
    return "A IA está temporariamente indisponível. Verifique as configurações de rede.";
  }
};

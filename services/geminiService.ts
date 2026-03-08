import { GoogleGenAI } from "@google/genai";
import { CalculationResult, PipeSegment, CalcMethod, UnitSystem } from '../types';

export const analyzeResults = async (
  results: CalculationResult[], 
  pipes: PipeSegment[], 
  method: CalcMethod,
  unitSystem: UnitSystem
): Promise<string> => {
  
  // Initialize AI client as per guidelines
  // Fix: Use process.env.API_KEY directly as required by guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare a summary string of the system
  const summary = results.map(r => {
    const pipe = pipes.find(p => p.id === r.segmentId);
    return `
      Trecho (Segmento): ${r.segmentId}
      Vazão: ${pipe?.flowRate} (Unidade Sistema: ${unitSystem})
      Diâmetro: ${pipe?.diameter}
      Comprimento: ${pipe?.length}
      Velocidade: ${r.velocity.toFixed(2)} m/s
      Reynolds: ${r.reynolds.toFixed(0)}
      Perda de Carga Total: ${r.totalHeadLoss.toFixed(2)} m
      Regime: ${r.regime}
      Avisos: ${r.warnings.join(', ')}
    `;
  }).join('\n---\n');

  const prompt = `
    Você é um engenheiro hidráulico sênior especialista. Analise os seguintes resultados de cálculo de rede de tubulações calculados usando o método ${method}.
    
    Dados do Projeto:
    ${summary}

    Por favor, forneça:
    1. Uma verificação de segurança (velocidades muito altas/baixas? riscos de cavitação ou sedimentação?).
    2. Comentários sobre eficiência (a perda de carga está excessiva?).
    3. Recomendações de otimização (sugira mudanças de diâmetro ou material se necessário).
    4. Valide se o método escolhido (${method}) é adequado para estes números de Reynolds e diâmetros.

    Mantenha a resposta concisa, técnica e em Português.
  `;

  try {
    // Fix: Using gemini-3-flash-preview model for basic text analysis tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: Accessing text property directly (not calling as a method)
    return response.text || "Nenhuma análise gerada.";
  } catch (error) {
    console.error("AI Error", error);
    return "Erro ao conectar com o serviço de IA. Verifique sua conexão e API Key.";
  }
};

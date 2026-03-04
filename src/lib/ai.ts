/// <reference types="vite/client" />

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SourceFile } from "../components/FileUploader";

// Initialize Gemini API
// Note: In a real production app, you should use a backend proxy to hide the API key.
// For this demo/preview, we use the environment variable directly.
const getApiKey = () => {
  try {
    // Prefer the standard process.env variable if available (e.g. in container)
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
    // Fallback to Vite env var
    return import.meta.env.VITE_GEMINI_API_KEY;
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey: apiKey || "YOUR_GEMINI_API_KEY" });

export interface IdeaPrediction {
  scenarioType: "otimista" | "pessimista" | "realista";
  title: string;
  description: string;
  probability: string;
  worthIt: boolean;
}

export interface Idea {
  title: string;
  description: string;
  benefits: string[];
  applications: string[];
  sourcesCombined: string[];
  expansions?: Idea[];
  predictions?: IdeaPrediction[];
}

export interface ExtractedConcept {
  concept: string;
  explanation: string;
  type: string;
  synonyms?: string[];
  randomAssociations?: string[];
  usageExamples?: string[];
}

function prepareSourcesText(sources: SourceFile[], maxTotalChars: number = 30000): string {
  const maxCharsPerSource = sources.length > 0 ? Math.floor(maxTotalChars / sources.length) : maxTotalChars;
  
  let text = "";
  for (const source of sources) {
    let sourceContent = "";
    if (source.type === "file") {
      if (source.mimeType.startsWith("text/") || source.mimeType === "application/json") {
        try {
          const decoded = decodeURIComponent(escape(atob(source.data)));
          sourceContent = decoded;
        } catch (e) {
          sourceContent = "[Erro ao decodificar texto]";
        }
      } else {
        sourceContent = `[Arquivo ${source.mimeType} - O modelo atual suporta apenas texto. Considere extrair o texto deste arquivo.]`;
      }
    } else if (source.type === "link") {
      sourceContent = source.data;
    }

    // Truncate if necessary
    if (sourceContent.length > maxCharsPerSource) {
      sourceContent = sourceContent.substring(0, maxCharsPerSource) + "\n...[conteúdo truncado]...";
    }

    text += `\n\n--- Fonte: ${source.name} ---\n${sourceContent}\n`;
  }
  return text;
}

export async function mixNotes(sources: SourceFile[], instruction: string, playbooks: SourceFile[] = []): Promise<Idea[]> {
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    throw new Error("A chave da API Gemini não está configurada. Verifique suas variáveis de ambiente (GEMINI_API_KEY ou VITE_GEMINI_API_KEY).");
  }

  // Calculate dynamic limits to stay within token limits
  const TOTAL_CONTEXT_CHARS = 30000;
  const playbooksChars = playbooks.length > 0 ? Math.min(10000, Math.floor(TOTAL_CONTEXT_CHARS * 0.3)) : 0;
  const sourcesChars = TOTAL_CONTEXT_CHARS - playbooksChars;

  const sourcesText = prepareSourcesText(sources, sourcesChars);
  const playbooksText = prepareSourcesText(playbooks, playbooksChars);

  let prompt = `
    Você é um assistente de brainstorming de classe mundial e um gênio criativo.
    Sua tarefa é analisar as fontes fornecidas e gerar ideias inovadoras, absurdas e brilhantes conectando os pontos entre elas.
    
    Fontes disponíveis:
    ${sourcesText}
    
    Instruções adicionais do usuário: ${instruction || "Nenhuma instrução específica. Seja criativo!"}
  `;

  if (playbooks.length > 0) {
    prompt += `
    
    IMPORTANTE - PLAYBOOK/GUIA MESTRE:
    O usuário forneceu os seguintes Playbooks (Guias). Você DEVE usar o conteúdo abaixo como a ESTRUTURA PRINCIPAL e GUIA para a geração das ideias.
    As ideias geradas devem seguir rigorosamente os princípios, passos ou metodologias descritos nestes playbooks, aplicando-os sobre as "Fontes disponíveis".
    
    Conteúdo dos Playbooks:
    ${playbooksText}
    `;
  }

  prompt += `
    
    Gere de 5 a 10 ideias distintas. Para cada ideia, você DEVE combinar elementos de 2 ou mais fontes diferentes (varie a quantidade, às vezes combine 2, às vezes todas).
    ${playbooks.length > 0 ? "Certifique-se de que cada ideia esteja alinhada com os Playbooks fornecidos." : ""}
    
    IMPORTANTE: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS (PT-BR).
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      ideas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título cativante da ideia" },
            description: { type: Type.STRING, description: "Descrição detalhada de como a ideia funciona e como ela conecta as fontes." },
            benefits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de benefícios" },
            applications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de aplicações práticas" },
            sourcesCombined: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nomes das fontes combinadas" }
          },
          required: ["title", "description", "benefits", "applications", "sourcesCombined"]
        }
      }
    },
    required: ["ideas"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const jsonStr = response.text || '{"ideas":[]}';
    const parsed = JSON.parse(jsonStr);
    return parsed.ideas as Idea[];
  } catch (e) {
    console.error("Error in mixNotes:", e);
    throw e;
  }
}

export async function extractConcepts(source: SourceFile): Promise<ExtractedConcept[]> {
  const sourceText = prepareSourcesText([source]);

  const prompt = `
    Você é um analista de informações e especialista em extração de conhecimento.
    Sua tarefa é ler a fonte fornecida e extrair os principais conceitos, palavras-chave e ideias centrais.
    Foque em identificar substantivos, verbos e frases inovadoras que possam ser úteis para misturas criativas futuras.
    
    Fonte:
    ${sourceText}
    
    IMPORTANTE: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS (PT-BR).
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      concepts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            concept: { type: Type.STRING, description: "Nome do conceito ou palavra-chave" },
            explanation: { type: Type.STRING, description: "Explicação clara e concisa" },
            type: { type: Type.STRING, description: "Tipo (substantivo, verbo, etc)" },
            synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            randomAssociations: { type: Type.ARRAY, items: { type: Type.STRING } },
            usageExamples: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["concept", "explanation", "type"]
        }
      }
    },
    required: ["concepts"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const jsonStr = response.text || '{"concepts":[]}';
    const parsed = JSON.parse(jsonStr);
    return parsed.concepts as ExtractedConcept[];
  } catch (e) {
    console.error("Error in extractConcepts:", e);
    throw e;
  }
}

export async function expandIdea(idea: Idea, additionalSources: SourceFile[], instruction: string): Promise<Idea> {
  const sourcesText = prepareSourcesText(additionalSources);

  const prompt = `
    Você é um gênio criativo e estrategista.
    Sua tarefa é expandir uma ideia existente, adicionando mais detalhes, explicações claras, narrativas e exemplos.
    
    Ideia Original:
    Título: ${idea.title}
    Descrição: ${idea.description}
    
    Novas Fontes para Combinar (se houver):
    ${sourcesText}
    
    Instruções Adicionais do Usuário:
    ${instruction || "Expanda a ideia de forma criativa e detalhada."}
    
    IMPORTANTE: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS (PT-BR).
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
      applications: { type: Type.ARRAY, items: { type: Type.STRING } },
      sourcesCombined: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["title", "description", "benefits", "applications", "sourcesCombined"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const jsonStr = response.text || '{}';
    const parsed = JSON.parse(jsonStr);
    return parsed as Idea;
  } catch (e) {
    console.error("Error in expandIdea:", e);
    throw e;
  }
}

export async function predictIdea(idea: Idea): Promise<IdeaPrediction[]> {
  const prompt = `
    Você é um analista de cenários futuros e estrategista de negócios implacável.
    Sua tarefa é prever o futuro dessa ideia, criando múltiplos cenários possíveis do que ela pode virar, se vai falhar, sugar tempo, ou ser um sucesso estrondoso.
    
    Ideia:
    Título: ${idea.title}
    Descrição: ${idea.description}
    Benefícios: ${idea.benefits?.join(", ")}
    Aplicações: ${idea.applications?.join(", ")}
    
    Crie 3 cenários:
    1. Otimista (O melhor caso possível)
    2. Pessimista (O pior caso possível, falhas, perda de tempo)
    3. Realista (O que provavelmente vai acontecer)
    
    IMPORTANTE: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS (PT-BR).
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      predictions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            scenarioType: { type: Type.STRING, enum: ["otimista", "pessimista", "realista"] },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            probability: { type: Type.STRING },
            worthIt: { type: Type.BOOLEAN }
          },
          required: ["scenarioType", "title", "description", "probability", "worthIt"]
        }
      }
    },
    required: ["predictions"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const jsonStr = response.text || '{"predictions":[]}';
    const parsed = JSON.parse(jsonStr);
    return parsed.predictions as IdeaPrediction[];
  } catch (e) {
    console.error("Error in predictIdea:", e);
    throw e;
  }
}

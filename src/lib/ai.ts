/// <reference types="vite/client" />

import Groq from "groq-sdk";
import { SourceFile } from "../components/FileUploader";

const getApiKey = () => {
  try {
    return import.meta.env.VITE_GROQ_API_KEY;
  } catch (e) {
    return "YOUR_GROQ_API_KEY";
  }
};

const groq = new Groq({
  apiKey: getApiKey() || "YOUR_GROQ_API_KEY",
  dangerouslyAllowBrowser: true
});

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

function prepareSourcesText(sources: SourceFile[]): string {
  let text = "";
  for (const source of sources) {
    if (source.type === "file") {
      if (source.mimeType.startsWith("text/") || source.mimeType === "application/json") {
        try {
          const decoded = decodeURIComponent(escape(atob(source.data)));
          text += `\n\n--- Fonte: ${source.name} ---\n${decoded}\n`;
        } catch (e) {
          text += `\n\n--- Fonte: ${source.name} ---\n[Erro ao decodificar texto]\n`;
        }
      } else {
        text += `\n\n--- Fonte: ${source.name} ---\n[Arquivo ${source.mimeType} - O modelo atual suporta apenas texto. Considere extrair o texto deste arquivo.]\n`;
      }
    } else if (source.type === "link") {
      text += `\n\n--- Link: ${source.name} ---\n${source.data}\n`;
    }
  }
  return text;
}

export async function mixNotes(sources: SourceFile[], instruction: string, playbooks: SourceFile[] = []): Promise<Idea[]> {
  const sourcesText = prepareSourcesText(sources);
  const playbooksText = prepareSourcesText(playbooks);

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
    
    Gere de 3 a 5 ideias distintas. Para cada ideia, você DEVE combinar elementos de 2 ou mais fontes diferentes (varie a quantidade, às vezes combine 2, às vezes todas).
    ${playbooks.length > 0 ? "Certifique-se de que cada ideia esteja alinhada com os Playbooks fornecidos." : ""}
    
    Retorne APENAS um objeto JSON com a seguinte estrutura exata:
    {
      "ideas": [
        {
          "title": "Título cativante da ideia",
          "description": "Descrição detalhada de como a ideia funciona e como ela conecta as fontes.",
          "benefits": ["Benefício 1", "Benefício 2"],
          "applications": ["Aplicação 1", "Aplicação 2"],
          "sourcesCombined": ["Nome da Fonte 1", "Nome da Fonte 2"]
        }
      ]
    }
    
    IMPORTANTE: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS (PT-BR). RETORNE APENAS O JSON VÁLIDO.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Você é um assistente criativo que retorna apenas JSON válido." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const jsonStr = chatCompletion.choices[0]?.message?.content || '{"ideas":[]}';
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
    
    Retorne APENAS um objeto JSON com a seguinte estrutura exata:
    {
      "concepts": [
        {
          "concept": "Nome do conceito ou palavra-chave",
          "explanation": "Explicação clara e concisa do conceito no contexto da fonte.",
          "type": "substantivo | verbo | frase_inovadora | ideia_central",
          "synonyms": ["Sinônimo 1", "Sinônimo 2"],
          "randomAssociations": ["Associação inusitada 1", "Associação inusitada 2"],
          "usageExamples": ["Exemplo de uso 1", "Exemplo de uso 2"]
        }
      ]
    }
    
    IMPORTANTE: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS (PT-BR). RETORNE APENAS O JSON VÁLIDO.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Você é um analista de dados que retorna apenas JSON válido." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const jsonStr = chatCompletion.choices[0]?.message?.content || '{"concepts":[]}';
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
    
    Retorne APENAS um objeto JSON com a seguinte estrutura exata representando a ideia expandida:
    {
      "title": "Título da ideia (pode ser o mesmo ou evoluído)",
      "description": "Descrição expandida, detalhada e narrativa da ideia.",
      "benefits": ["Benefício 1", "Benefício 2"],
      "applications": ["Aplicação 1", "Aplicação 2"],
      "sourcesCombined": ["Fonte Original", "Nova Fonte 1"]
    }
    
    IMPORTANTE: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS (PT-BR). RETORNE APENAS O JSON VÁLIDO.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Você é um assistente criativo que retorna apenas JSON válido." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const jsonStr = chatCompletion.choices[0]?.message?.content || '{}';
    return JSON.parse(jsonStr) as Idea;
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
    
    Retorne APENAS um objeto JSON com a seguinte estrutura exata:
    {
      "predictions": [
        {
          "scenarioType": "otimista",
          "title": "Título do cenário",
          "description": "Descrição detalhada de como a ideia se desenrola nesse cenário",
          "probability": "Ex: 20%, Alta, Baixa",
          "worthIt": true
        },
        {
          "scenarioType": "pessimista",
          "title": "Título do cenário",
          "description": "Descrição detalhada de como a ideia se desenrola nesse cenário",
          "probability": "Ex: 20%, Alta, Baixa",
          "worthIt": false
        },
        {
          "scenarioType": "realista",
          "title": "Título do cenário",
          "description": "Descrição detalhada de como a ideia se desenrola nesse cenário",
          "probability": "Ex: 20%, Alta, Baixa",
          "worthIt": true
        }
      ]
    }
    
    IMPORTANTE: TODO O TEXTO DEVE ESTAR EM PORTUGUÊS (PT-BR). RETORNE APENAS O JSON VÁLIDO.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Você é um analista de cenários que retorna apenas JSON válido." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const jsonStr = chatCompletion.choices[0]?.message?.content || '{"predictions":[]}';
    const parsed = JSON.parse(jsonStr);
    return parsed.predictions as IdeaPrediction[];
  } catch (e) {
    console.error("Error in predictIdea:", e);
    throw e;
  }
}

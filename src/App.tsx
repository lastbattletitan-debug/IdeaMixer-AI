import { useState, useEffect } from "react";
import { FileUploader, SourceFile } from "./components/FileUploader";
import { BrainstormAnimation } from "./components/BrainstormAnimation";
import { IdeaModal } from "./components/IdeaModal";
import { Idea, mixNotes, predictIdea, ExtractedConcept } from "./lib/ai";
import { Download, FileText, File as FileIcon, FileCode2, Sparkles, RefreshCw, Maximize2, Bookmark, BookmarkCheck, Archive, TrendingUp, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import jsPDF from "jspdf";
import { AnimatePresence } from "motion/react";

export default function App() {
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [playbooks, setPlaybooks] = useState<SourceFile[]>([]);
  const [instruction, setInstruction] = useState("");
  const [isMixing, setIsMixing] = useState(false);
  const [results, setResults] = useState<Idea[]>([]);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(null);
  const [predictingIndex, setPredictingIndex] = useState<number | null>(null);
  
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ideamixer_saved_ideas");
    if (saved) {
      try {
        setSavedIdeas(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved ideas", e);
      }
    }
  }, []);

  const saveIdea = (idea: Idea) => {
    setSavedIdeas(prev => {
      const newSaved = [...prev, idea];
      localStorage.setItem("ideamixer_saved_ideas", JSON.stringify(newSaved));
      return newSaved;
    });
  };

  const removeSavedIdea = (index: number) => {
    setSavedIdeas(prev => {
      const newSaved = [...prev];
      newSaved.splice(index, 1);
      localStorage.setItem("ideamixer_saved_ideas", JSON.stringify(newSaved));
      return newSaved;
    });
  };

  const handleSaveConcept = (concept: ExtractedConcept, sourceName: string) => {
    const idea: Idea = {
      title: concept.concept,
      description: `${concept.explanation}\n\n**Sinônimos:** ${concept.synonyms?.join(", ") || "Nenhum"}\n\n**Associações Inusitadas:** ${concept.randomAssociations?.join(", ") || "Nenhuma"}`,
      benefits: [],
      applications: concept.usageExamples || [],
      sourcesCombined: [sourceName],
    };
    saveIdea(idea);
    alert("Conceito salvo nas suas ideias!");
  };

  const handleExpandConcept = (concept: ExtractedConcept, sourceName: string) => {
    const idea: Idea = {
      title: concept.concept,
      description: `${concept.explanation}\n\n**Sinônimos:** ${concept.synonyms?.join(", ") || "Nenhum"}\n\n**Associações Inusitadas:** ${concept.randomAssociations?.join(", ") || "Nenhuma"}`,
      benefits: [],
      applications: concept.usageExamples || [],
      sourcesCombined: [sourceName],
    };
    
    setShowSaved(false);
    setResults(prev => [idea, ...prev]);
    setSelectedIdeaIndex(0);
  };

  const exportAllSaved = () => {
    if (savedIdeas.length === 0) return;
    
    let content = "# Ideias Salvas - IdeaMixer AI\n\n";
    savedIdeas.forEach((idea, index) => {
      content += `## ${index + 1}. ${idea.title}\n\n`;
      content += `${idea.description}\n\n`;
      if (idea.benefits && idea.benefits.length > 0) {
        content += `**Benefícios:**\n${idea.benefits.map(b => `- ${b}`).join("\n")}\n\n`;
      }
      if (idea.applications && idea.applications.length > 0) {
        content += `**Aplicações:**\n${idea.applications.map(a => `- ${a}`).join("\n")}\n\n`;
      }
      content += `**Fontes Combinadas:**\n${idea.sourcesCombined.map(s => `- ${s}`).join("\n")}\n\n`;
      content += `---\n\n`;
    });

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ideamixer_salvas.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateIdea = (index: number, newIdea: Idea) => {
    if (showSaved) {
      const newSaved = [...savedIdeas];
      newSaved[index] = newIdea;
      setSavedIdeas(newSaved);
      localStorage.setItem("ideamixer_saved_ideas", JSON.stringify(newSaved));
    } else {
      setResults(prev => {
        const newResults = [...prev];
        newResults[index] = newIdea;
        return newResults;
      });
    }
  };

  const handlePredict = async (index: number, idea: Idea) => {
    setPredictingIndex(index);
    try {
      const predictions = await predictIdea(idea);
      const updatedIdea = { ...idea, predictions };
      handleUpdateIdea(index, updatedIdea);
    } catch (e) {
      console.error(e);
      alert("Ocorreu um erro ao prever os cenários.");
    } finally {
      setPredictingIndex(null);
    }
  };

  const handleMix = async () => {
    if (sources.length === 0) {
      alert("Por favor, adicione pelo menos uma fonte.");
      return;
    }
    setIsMixing(true);
    setResults([]);
    try {
      const ideas = await mixNotes(sources, instruction, playbooks);
      setResults(ideas);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Ocorreu um erro ao misturar as ideias. Tente novamente.");
    } finally {
      setIsMixing(false);
    }
  };

  const downloadTxt = (idea: Idea) => {
    const content = `${idea.title}\n\n${idea.description}\n\nFontes Combinadas: ${idea.sourcesCombined.join(", ")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMd = (idea: Idea) => {
    const content = `# ${idea.title}\n\n${idea.description}\n\n**Fontes Combinadas:**\n${idea.sourcesCombined.map(s => `- ${s}`).join("\n")}`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = (idea: Idea) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(idea.title, 10, 20);
    doc.setFontSize(12);
    
    const splitDesc = doc.splitTextToSize(idea.description, 180);
    doc.text(splitDesc, 10, 30);
    
    const sourcesY = 30 + (splitDesc.length * 7) + 10;
    doc.setFontSize(10);
    doc.text("Fontes Combinadas:", 10, sourcesY);
    idea.sourcesCombined.forEach((source, i) => {
      doc.text(`- ${source}`, 10, sourcesY + 10 + (i * 5));
    });

    doc.save(`${idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="text-center mb-16 relative">
          <div className="absolute right-0 top-0">
            <button
              onClick={() => setShowSaved(!showSaved)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                showSaved 
                  ? "bg-purple-600/20 border-purple-500/30 text-purple-300" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Ideias Salvas ({savedIdeas.length})
            </button>
          </div>
          <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 rounded-2xl mb-6 border border-purple-500/20">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
            IdeaMixer AI
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Suba suas notas, PDFs, imagens ou vídeos. A IA vai conectar os pontos e gerar ideias absurdas, inovadoras e brilhantes.
          </p>
        </header>

        {!isMixing && results.length === 0 && !showSaved && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 h-full">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">1</span>
                    Adicione suas Fontes
                  </h2>
                  <FileUploader 
                    sources={sources} 
                    setSources={setSources} 
                    onSaveConcept={handleSaveConcept}
                    onExpandConcept={handleExpandConcept}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 h-full">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">2</span>
                    Playbooks (Opcional)
                  </h2>
                  <p className="text-sm text-zinc-500 mb-4">
                    Adicione guias ou metodologias para direcionar a criação das ideias.
                  </p>
                  <FileUploader 
                    sources={playbooks} 
                    setSources={setPlaybooks} 
                    title="Adicione seus Playbooks"
                    description="Guias, passo a passo, metodologias (PDF, TXT, MD)"
                    allowExtraction={false}
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">3</span>
                Instruções (Opcional)
              </h2>
              <textarea
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-[100px]"
                placeholder="Ex: Foque em criar ideias de produtos físicos. Ou: Misture tudo com um tom de ficção científica..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleMix}
                disabled={sources.length === 0}
                className="group relative inline-flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-500 text-white px-12 py-5 rounded-full font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_#a855f7]"
              >
                <Sparkles className="w-6 h-6 group-hover:animate-spin" />
                MISTURAR TUDO
              </button>
            </div>
          </div>
        )}

        {isMixing && (
          <div className="max-w-2xl mx-auto mt-20">
            <BrainstormAnimation />
          </div>
        )}

        {!isMixing && (results.length > 0 || showSaved) && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
              <h2 className="text-3xl font-bold">
                {showSaved ? (
                  <>Ideias <span className="text-purple-400">Salvas</span></>
                ) : (
                  <><span className="text-purple-400">{results.length}</span> Ideias Geradas</>
                )}
              </h2>
              <div className="flex gap-4">
                {showSaved && savedIdeas.length > 0 && (
                  <button
                    onClick={exportAllSaved}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Archive className="w-5 h-5" />
                    Exportar Todas
                  </button>
                )}
                {!showSaved && (
                  <button
                    onClick={() => setResults([])}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Nova Mistura
                  </button>
                )}
              </div>
            </div>

            {showSaved && savedIdeas.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma ideia salva ainda.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {(showSaved ? savedIdeas : results).map((idea, index) => {
                  const isSaved = savedIdeas.some(s => s.title === idea.title && s.description === idea.description);
                  
                  return (
                    <div key={index} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 hover:bg-zinc-900/60 transition-colors group">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold tracking-wider text-purple-400 uppercase bg-purple-500/10 px-3 py-1 rounded-full">
                              Ideia {index + 1}
                            </span>
                            
                            <button
                              onClick={() => showSaved ? removeSavedIdea(index) : (isSaved ? null : saveIdea(idea))}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                isSaved && !showSaved
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                                  : showSaved
                                    ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                              }`}
                            >
                              {isSaved && !showSaved ? (
                                <><BookmarkCheck className="w-4 h-4" /> Salva</>
                              ) : showSaved ? (
                                "Remover"
                              ) : (
                                <><Bookmark className="w-4 h-4" /> Salvar</>
                              )}
                            </button>
                          </div>
                          
                          <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-purple-300 transition-colors">
                            {idea.title}
                          </h3>
                          <p className="text-zinc-300 leading-relaxed mb-6">
                            {idea.description}
                          </p>

                          {(idea.benefits?.length > 0 || idea.applications?.length > 0) && (
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                              {idea.benefits?.length > 0 && (
                                <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/50">
                                  <h4 className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">Benefícios</h4>
                                  <ul className="space-y-2">
                                    {idea.benefits.map((benefit, i) => (
                                      <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                                        <span className="text-emerald-500 mt-0.5">•</span>
                                        {benefit}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {idea.applications?.length > 0 && (
                                <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/50">
                                  <h4 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">Aplicações</h4>
                                  <ul className="space-y-2">
                                    {idea.applications.map((app, i) => (
                                      <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">•</span>
                                        {app}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {idea.sourcesCombined.map((source, i) => (
                              <span key={i} className="text-xs text-zinc-500 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-md">
                                {source}
                              </span>
                            ))}
                          </div>

                          {idea.predictions && idea.predictions.length > 0 && (
                            <div className="mt-8 space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Eye className="w-5 h-5 text-purple-400" />
                                <h4 className="text-lg font-bold text-white">Previsões de Cenários</h4>
                              </div>
                              <div className="grid md:grid-cols-3 gap-4">
                                {idea.predictions.map((pred, i) => {
                                  const isOptimistic = pred.scenarioType === "otimista";
                                  const isPessimistic = pred.scenarioType === "pessimista";
                                  
                                  return (
                                    <div key={i} className={`bg-zinc-950/50 rounded-2xl p-5 border ${
                                      isOptimistic ? "border-emerald-500/30" : isPessimistic ? "border-red-500/30" : "border-blue-500/30"
                                    }`}>
                                      <div className="flex items-center gap-2 mb-3">
                                        {isOptimistic ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : isPessimistic ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                                        <h5 className={`font-bold ${isOptimistic ? "text-emerald-400" : isPessimistic ? "text-red-400" : "text-blue-400"}`}>
                                          {pred.title}
                                        </h5>
                                      </div>
                                      <p className="text-sm text-zinc-300 mb-4">{pred.description}</p>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-zinc-500">Probabilidade: <strong className="text-zinc-300">{pred.probability}</strong></span>
                                        <span className={`px-2 py-1 rounded-md font-medium ${pred.worthIt ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                          {pred.worthIt ? "Vale a pena" : "Não vale a pena"}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex md:flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handlePredict(index, idea)}
                            disabled={predictingIndex === index}
                            className="flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-blue-500/30 disabled:opacity-50"
                            title="Prever Cenários"
                          >
                            {predictingIndex === index ? (
                              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                            <span className="hidden md:inline">Prever</span>
                          </button>
                          <button
                            onClick={() => setSelectedIdeaIndex(index)}
                            className="flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-purple-500/30"
                            title="Expandir Ideia"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span className="hidden md:inline">Expandir</span>
                          </button>
                          <button
                            onClick={() => downloadPdf(idea)}
                            className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                            title="Baixar PDF"
                          >
                            <FileIcon className="w-4 h-4 text-red-400" />
                            <span className="hidden md:inline">PDF</span>
                          </button>
                          <button
                            onClick={() => downloadMd(idea)}
                            className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                            title="Baixar Markdown"
                          >
                            <FileCode2 className="w-4 h-4 text-blue-400" />
                            <span className="hidden md:inline">MD</span>
                          </button>
                          <button
                            onClick={() => downloadTxt(idea)}
                            className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                            title="Baixar TXT"
                          >
                            <FileText className="w-4 h-4 text-zinc-400" />
                            <span className="hidden md:inline">TXT</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {selectedIdeaIndex !== null && (showSaved ? savedIdeas[selectedIdeaIndex] : results[selectedIdeaIndex]) && (
            <IdeaModal
              idea={showSaved ? savedIdeas[selectedIdeaIndex] : results[selectedIdeaIndex]}
              ideaIndex={selectedIdeaIndex}
              allSources={sources}
              onClose={() => setSelectedIdeaIndex(null)}
              onUpdateIdea={handleUpdateIdea}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

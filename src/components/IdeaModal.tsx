import { X, Sparkles, Send, Check, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Idea, expandIdea } from "../lib/ai";
import { SourceFile } from "./FileUploader";
import { motion, AnimatePresence } from "motion/react";

interface IdeaModalProps {
  idea: Idea;
  ideaIndex: number;
  allSources: SourceFile[];
  onClose: () => void;
  onUpdateIdea: (index: number, newIdea: Idea) => void;
}

export function IdeaModal({ idea, ideaIndex, allSources, onClose, onUpdateIdea }: IdeaModalProps) {
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [instruction, setInstruction] = useState("");
  const [isExpanding, setIsExpanding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when a new expansion is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [idea.expansions?.length]);

  const toggleSource = (id: string) => {
    const newSet = new Set(selectedSourceIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSourceIds(newSet);
  };

  const handleExpand = async () => {
    if (!instruction.trim() && selectedSourceIds.size === 0) return;
    
    setIsExpanding(true);
    try {
      const extraFiles = allSources.filter(s => selectedSourceIds.has(s.id));
      // We pass the latest context (either the last expansion or the original idea)
      const contextIdea = idea.expansions && idea.expansions.length > 0 
        ? idea.expansions[idea.expansions.length - 1] 
        : idea;
        
      const expandedIdea = await expandIdea(contextIdea, extraFiles, instruction);
      
      const updatedIdea = {
        ...idea,
        expansions: [...(idea.expansions || []), expandedIdea]
      };
      
      onUpdateIdea(ideaIndex, updatedIdea);
      setInstruction("");
      setSelectedSourceIds(newSet => {
        newSet.clear();
        return newSet;
      });
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao expandir a ideia.");
    } finally {
      setIsExpanding(false);
    }
  };

  const handleDeleteExpansion = (expIndex: number) => {
    if (!idea.expansions) return;
    const newExpansions = [...idea.expansions];
    newExpansions.splice(expIndex, 1);
    onUpdateIdea(ideaIndex, { ...idea, expansions: newExpansions });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Expandir Ideia
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8" ref={scrollRef}>
          {/* Current Idea */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-purple-300">{idea.title}</h3>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{idea.description}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {idea.sourcesCombined.map((source, i) => (
                <span key={i} className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md">
                  {source}
                </span>
              ))}
            </div>
          </div>

          {/* Expansions */}
          {idea.expansions && idea.expansions.length > 0 && (
            <div className="space-y-6 mt-8">
              <div className="flex items-center gap-4">
                <div className="h-px bg-zinc-800 flex-1" />
                <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Evolução da Ideia</h4>
                <div className="h-px bg-zinc-800 flex-1" />
              </div>
              
              {idea.expansions.map((exp, idx) => (
                <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 relative group">
                  <button
                    onClick={() => handleDeleteExpansion(idx)}
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-red-400 bg-zinc-950/50 hover:bg-zinc-950 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Excluir expansão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <h5 className="text-xl font-bold text-purple-300 mb-3">{exp.title}</h5>
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap mb-4">{exp.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {exp.sourcesCombined.map((source, i) => (
                      <span key={i} className="text-xs text-zinc-500 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-md">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expansion Controls (Sticky Bottom) */}
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Combinar com mais fontes? (Opcional)
              </h4>
              {allSources.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedSourceIds.size === allSources.length) {
                      setSelectedSourceIds(new Set());
                    } else {
                      setSelectedSourceIds(new Set(allSources.map(s => s.id)));
                    }
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  {selectedSourceIds.size === allSources.length ? "Desmarcar tudo" : "Selecionar tudo"}
                </button>
              )}
            </div>
            {allSources.length === 0 ? (
              <p className="text-sm text-zinc-600">Nenhuma fonte adicional disponível.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {allSources.map(source => {
                  const isSelected = selectedSourceIds.has(source.id);
                  return (
                    <button
                      key={source.id}
                      onClick={() => toggleSource(source.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border shrink-0 ${
                        isSelected
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span className="truncate max-w-[150px]">{source.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative">
            <textarea
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 pr-16 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[80px]"
              placeholder="Fale com a IA para expandir a ideia (ex: adicione uma narrativa, explique a parte técnica...)"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={isExpanding}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleExpand();
                }
              }}
            />
            <button
              onClick={handleExpand}
              disabled={isExpanding || (!instruction.trim() && selectedSourceIds.size === 0)}
              className="absolute bottom-4 right-4 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white p-3 rounded-xl transition-colors shadow-lg"
            >
              {isExpanding ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

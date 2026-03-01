import { X, Sparkles, BookOpen, Bookmark, Maximize2 } from "lucide-react";
import { motion } from "motion/react";
import { ExtractedConcept } from "../lib/ai";

interface ConceptModalProps {
  sourceName: string;
  concepts: ExtractedConcept[];
  onClose: () => void;
  onSaveConcept: (concept: ExtractedConcept, sourceName: string) => void;
  onExpandConcept: (concept: ExtractedConcept, sourceName: string) => void;
}

export function ConceptModal({ sourceName, concepts, onClose, onSaveConcept, onExpandConcept }: ConceptModalProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "substantivo": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "verbo": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "frase_inovadora": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      case "ideia_central": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      default: return "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "substantivo": return "Substantivo";
      case "verbo": return "Verbo";
      case "frase_inovadora": return "Frase Inovadora";
      case "ideia_central": return "Ideia Central";
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Conceitos Extraídos
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-zinc-900/30 border-b border-zinc-800 shrink-0">
          <p className="text-sm text-zinc-400">
            Fonte: <span className="text-zinc-200 font-medium">{sourceName}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {concepts.map((concept, idx) => (
            <div key={idx} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 hover:bg-zinc-900/60 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">{concept.concept}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getTypeColor(concept.type)}`}>
                    {getTypeName(concept.type)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      onSaveConcept(concept, sourceName);
                      // Optional: show a toast or feedback here
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      onExpandConcept(concept, sourceName);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Expandir
                  </button>
                </div>
              </div>
              
              <p className="text-zinc-300 mb-4">{concept.explanation}</p>
              
              <div className="space-y-4">
                {concept.synonyms && concept.synonyms.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sinônimos</h4>
                    <div className="flex flex-wrap gap-2">
                      {concept.synonyms.map((syn, i) => (
                        <span key={i} className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-md">
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {concept.randomAssociations && concept.randomAssociations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Associações Inusitadas</h4>
                    <div className="flex flex-wrap gap-2">
                      {concept.randomAssociations.map((assoc, i) => (
                        <span key={i} className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-md">
                          {assoc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {concept.usageExamples && concept.usageExamples.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Exemplos de Uso</h4>
                    <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                      {concept.usageExamples.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

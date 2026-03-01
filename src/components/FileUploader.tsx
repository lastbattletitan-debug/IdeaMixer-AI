import { UploadCloud, X, FileText, Image as ImageIcon, Video, Link as LinkIcon, Trash2, Check, Lightbulb } from "lucide-react";
import React, { useState, useRef } from "react";
import { extractConcepts, ExtractedConcept, Idea } from "../lib/ai";
import { ConceptModal } from "./ConceptModal";
import { AnimatePresence } from "motion/react";

export interface SourceFile {
  id: string;
  name: string;
  type: "file" | "link";
  mimeType: string;
  data: string; // base64 or url
  size?: number;
}

interface FileUploaderProps {
  sources: SourceFile[];
  setSources: React.Dispatch<React.SetStateAction<SourceFile[]>>;
  onSaveConcept?: (concept: ExtractedConcept, sourceName: string) => void;
  onExpandConcept?: (concept: ExtractedConcept, sourceName: string) => void;
  title?: string;
  description?: string;
  allowExtraction?: boolean;
}

export function FileUploader({ 
  sources, 
  setSources, 
  onSaveConcept, 
  onExpandConcept,
  title = "Arraste ou clique para subir fontes",
  description = "PDF, TXT, Markdown, Imagens ou Vídeos",
  allowExtraction = true
}: FileUploaderProps) {
  const [linkInput, setLinkInput] = useState("");
  const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExtracting, setIsExtracting] = useState<string | null>(null);
  const [extractedConcepts, setExtractedConcepts] = useState<{ sourceName: string; concepts: ExtractedConcept[] } | null>(null);

  const handleExtractConcepts = async (e: React.MouseEvent, source: SourceFile) => {
    if (!allowExtraction || !onSaveConcept || !onExpandConcept) return;
    e.stopPropagation();
    setIsExtracting(source.id);
    try {
      const concepts = await extractConcepts(source);
      setExtractedConcepts({ sourceName: source.name, concepts });
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao extrair os conceitos.");
    } finally {
      setIsExtracting(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      for (const file of newFiles) {
        if (file.size > 20 * 1024 * 1024) {
          alert(`O arquivo ${file.name} é muito grande. O limite é 20MB.`);
          continue;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = (event.target?.result as string).split(",")[1];
          
          let mimeType = file.type;
          if (!mimeType || mimeType === "application/octet-stream") {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'md' || ext === 'markdown') mimeType = 'text/markdown';
            else if (ext === 'txt') mimeType = 'text/plain';
            else if (ext === 'csv') mimeType = 'text/csv';
            else if (ext === 'pdf') mimeType = 'application/pdf';
            else mimeType = 'text/plain'; // Fallback to text/plain
          }

          setSources((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              type: "file",
              mimeType: mimeType,
              data: base64String,
              size: file.size,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAddLink = () => {
    if (linkInput.trim()) {
      setSources((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          name: linkInput,
          type: "link",
          mimeType: "text/plain",
          data: btoa(unescape(encodeURIComponent(linkInput))), // base64 encode the link as text
        },
      ]);
      setLinkInput("");
    }
  };

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setSelectedToDelete((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const toggleSelectToDelete = (id: string) => {
    setSelectedToDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const deleteSelected = () => {
    setSources((prev) => prev.filter((s) => !selectedToDelete.has(s.id)));
    setSelectedToDelete(new Set());
  };

  const getIcon = (mimeType: string, type: string) => {
    if (type === "link") return <LinkIcon className="w-5 h-5 text-blue-400 shrink-0" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />;
    if (mimeType.startsWith("video/")) return <Video className="w-5 h-5 text-rose-400 shrink-0" />;
    return <FileText className="w-5 h-5 text-amber-400 shrink-0" />;
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center hover:bg-zinc-900/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="w-10 h-10 mx-auto text-zinc-400 mb-4" />
        <h3 className="text-lg font-medium text-zinc-200">{title}</h3>
        <p className="text-zinc-500 text-sm mt-1">
          {description}
        </p>
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.md,image/*,video/*"
        />
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          placeholder="Ou cole um link de vídeo/artigo..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
        />
        <button
          onClick={handleAddLink}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 rounded-xl font-medium transition-colors"
        >
          Adicionar
        </button>
      </div>

      {sources.length > 0 && (
        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Fontes Adicionadas ({sources.length})
              </h4>
              {sources.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedToDelete.size === sources.length) {
                      setSelectedToDelete(new Set());
                    } else {
                      setSelectedToDelete(new Set(sources.map(s => s.id)));
                    }
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  {selectedToDelete.size === sources.length ? "Desmarcar tudo" : "Selecionar tudo"}
                </button>
              )}
            </div>
            {selectedToDelete.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                Excluir ({selectedToDelete.size})
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {sources.map((source) => {
              const isSelected = selectedToDelete.has(source.id);
              return (
                <div
                  key={source.id}
                  onClick={() => toggleSelectToDelete(source.id)}
                  className={`flex items-center justify-between border rounded-lg p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-zinc-950 border-zinc-800 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-red-500 border-red-500" : "border-zinc-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {getIcon(source.mimeType, source.type)}
                    <span className="text-zinc-300 text-sm truncate max-w-[200px] sm:max-w-xs">
                      {source.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {allowExtraction && (
                      <button
                        onClick={(e) => handleExtractConcepts(e, source)}
                        disabled={isExtracting === source.id}
                        className="text-zinc-500 hover:text-amber-400 transition-colors p-1 disabled:opacity-50"
                        title="Extrair Conceitos"
                      >
                        {isExtracting === source.id ? (
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Lightbulb className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSource(source.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                      title="Remover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {extractedConcepts && (
          <ConceptModal
            sourceName={extractedConcepts.sourceName}
            concepts={extractedConcepts.concepts}
            onClose={() => setExtractedConcepts(null)}
            onSaveConcept={onSaveConcept}
            onExpandConcept={onExpandConcept}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

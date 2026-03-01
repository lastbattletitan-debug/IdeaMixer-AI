import { motion } from "motion/react";
import { useEffect, useState } from "react";

export function BrainstormAnimation() {
  const [nodes, setNodes] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    // Generate random nodes
    const newNodes = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setNodes(newNodes);

    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          x: Math.max(0, Math.min(100, node.x + (Math.random() - 0.5) * 10)),
          y: Math.max(0, Math.min(100, node.y + (Math.random() - 0.5) * 10)),
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-64 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full">
          {nodes.map((node, i) =>
            nodes.slice(i + 1, i + 4).map((target) => (
              <motion.line
                key={`${node.id}-${target.id}`}
                x1={`${node.x}%`}
                y1={`${node.y}%`}
                x2={`${target.x}%`}
                y2={`${target.y}%`}
                stroke="#a855f7"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
              />
            ))
          )}
        </svg>
      </div>
      
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]"
          animate={{
            left: `${node.x}%`,
            top: `${node.y}%`,
          }}
          transition={{ duration: 1, ease: "linear" }}
        />
      ))}

      <div className="z-10 text-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto bg-purple-600/20 rounded-full flex items-center justify-center border border-purple-500/50 backdrop-blur-sm"
        >
          <div className="w-12 h-12 bg-purple-500 rounded-full animate-pulse shadow-[0_0_30px_#a855f7]" />
        </motion.div>
        <h3 className="mt-6 text-xl font-bold text-white tracking-widest uppercase">
          Misturando Ideias...
        </h3>
        <p className="text-zinc-400 text-sm mt-2">
          A IA está conectando os pontos e criando o absurdo.
        </p>
      </div>
    </div>
  );
}

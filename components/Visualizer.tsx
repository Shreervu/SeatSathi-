import React, { useEffect, useRef } from 'react';
import { VisualizerState } from '../types';

interface VisualizerProps {
  state: VisualizerState;
}

const Visualizer: React.FC<VisualizerProps> = ({ state }) => {
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      if (state === 'idle') {
        barsRef.current.forEach((bar) => {
          if(bar) bar.style.height = '4px';
        });
        return;
      }

      if (state === 'processing') {
         // Rotating loading effect
         return; 
      }

      const isActive = state === 'listening' || state === 'speaking';
      
      if (isActive) {
        barsRef.current.forEach((bar, i) => {
          if (bar) {
             // Create a wave effect
             const time = Date.now() / 200;
             const height = 20 + Math.sin(time + i) * 15 + Math.random() * 10;
             bar.style.height = `${Math.max(4, height)}px`;
          }
        });
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [state]);

  const getStateColor = () => {
    switch (state) {
      case 'listening': return 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]';
      case 'speaking': return 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.6)]';
      case 'processing': return 'bg-blue-400 animate-pulse';
      default: return 'bg-slate-600';
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5 h-32 w-full transition-all duration-300">
      {state === 'processing' ? (
         <div className="w-16 h-16 border-4 border-slate-700 border-t-yellow-400 rounded-full animate-spin"></div>
      ) : (
        [...Array(5)].map((_, i) => (
            <div
            key={i}
            ref={(el) => { if(el) barsRef.current[i] = el; }}
            className={`w-3 rounded-full transition-colors duration-200 ${getStateColor()}`}
            style={{ height: '4px' }}
            ></div>
        ))
      )}
    </div>
  );
};

export default Visualizer;
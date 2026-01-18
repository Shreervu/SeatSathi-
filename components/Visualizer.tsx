import React, { useEffect, useRef } from 'react';
import { VisualizerState } from '../types';

interface VisualizerProps {
  state: VisualizerState;
  isMuted?: boolean;
  isUserSpeaking?: boolean;
  aiAudioLevel?: number; // 0-1 for AI audio intensity
  userAudioLevel?: number; // 0-1 for user audio intensity
}

const Visualizer: React.FC<VisualizerProps> = ({ 
  state, 
  isMuted, 
  isUserSpeaking = false,
  aiAudioLevel = 0,
  userAudioLevel = 0
}) => {
  const aiBarsRef = useRef<HTMLDivElement[]>([]);
  const userBarsRef = useRef<HTMLDivElement[]>([]);
  const animationRef = useRef<number>(0);
  const aiLevelRef = useRef<number>(0);
  const userLevelRef = useRef<number>(0);

  // Smooth audio level transitions
  useEffect(() => {
    aiLevelRef.current = aiAudioLevel;
    userLevelRef.current = userAudioLevel;
  }, [aiAudioLevel, userAudioLevel]);

  useEffect(() => {
    const animate = () => {
      const time = Date.now();
      const aiLevel = aiLevelRef.current;
      const userLevel = userLevelRef.current;
      
      // AI Visualizer Animation - Big green bars synced to audio
      aiBarsRef.current.forEach((bar, i) => {
        if (!bar) return;
        
        if (state === 'speaking') {
          // Active speaking - sync to actual audio level
          const phase = (time / 80) + i * 0.7;
          const baseHeight = 20 + aiLevel * 60; // Scale with audio level
          const wave = Math.sin(phase) * (15 + aiLevel * 25);
          const randomness = Math.random() * (5 + aiLevel * 10);
          const height = baseHeight + wave + randomness;
          bar.style.height = `${Math.max(8, Math.min(90, height))}px`;
        } else if (state === 'listening') {
          // Listening - gentle idle animation
          const phase = (time / 200) + i * 0.4;
          const height = 12 + Math.sin(phase) * 8;
          bar.style.height = `${Math.max(8, height)}px`;
        } else if (state === 'processing') {
          // Processing - sequential wave
          const activeIndex = ((time / 100) + i) % 12;
          const height = 15 + Math.sin(activeIndex) * 35;
          bar.style.height = `${Math.max(8, height)}px`;
        } else {
          // Idle - minimal bars
          const phase = (time / 400) + i * 0.3;
          const height = 6 + Math.sin(phase) * 3;
          bar.style.height = `${height}px`;
        }
      });

      // User Voice Visualizer Animation - Smaller bars synced to user audio
      userBarsRef.current.forEach((bar, i) => {
        if (!bar) return;
        
        if (isUserSpeaking && !isMuted && userLevel > 0.01) {
          // User is speaking - sync to actual audio level (smaller scale)
          const phase = (time / 60) + i * 0.6;
          const baseHeight = 4 + userLevel * 12;
          const wave = Math.sin(phase) * (2 + userLevel * 5);
          const randomness = Math.random() * (1 + userLevel * 3);
          const height = baseHeight + wave + randomness;
          bar.style.height = `${Math.max(2, Math.min(18, height))}px`;
        } else if (isMuted) {
          // Muted - flat gray (not red)
          bar.style.height = '2px';
        } else {
          // Idle - subtle breathing
          const phase = (time / 350) + i * 0.25;
          const height = 3 + Math.sin(phase) * 1.5;
          bar.style.height = `${height}px`;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [state, isMuted, isUserSpeaking]);

  // Get AI bar color based on state - always green
  const getAiBarColor = () => {
    switch (state) {
      case 'speaking': return 'bg-green-500';
      case 'listening': return 'bg-green-400';
      case 'processing': return 'bg-green-400';
      default: return 'bg-green-600/60';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* AI Voice Visualizer - Big green bars */}
      <div className="flex items-end justify-center gap-1.5 h-24 px-4">
        {[...Array(12)].map((_, i) => (
          <div
            key={`ai-${i}`}
            ref={(el) => { if (el) aiBarsRef.current[i] = el; }}
            className={`w-3 rounded-full transition-colors duration-200 ${getAiBarColor()}`}
            style={{ 
              height: '8px',
              transition: 'height 0.05s ease-out',
              boxShadow: state !== 'idle' ? '0 0 8px rgba(74, 222, 128, 0.5)' : 'none'
            }}
          />
        ))}
      </div>

      {/* User Voice Visualizer - Smaller bars below, gray when muted */}
      <div className="flex items-end justify-center gap-0.5 h-5 px-2">
        {[...Array(12)].map((_, i) => (
          <div
            key={`user-${i}`}
            ref={(el) => { if (el) userBarsRef.current[i] = el; }}
            className={`w-1 rounded-full transition-colors duration-200 ${
              isMuted 
                ? 'bg-slate-500/40' 
                : isUserSpeaking 
                  ? 'bg-slate-400' 
                  : 'bg-slate-500/50'
            }`}
            style={{ 
              height: '2px',
              transition: 'height 0.04s ease-out'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Visualizer;
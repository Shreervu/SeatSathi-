import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';
import { createBlob, decode, decodeAudioData } from './services/audioUtils';
import { toolsDeclaration, findMatchingColleges, getSpecificCollegeCutoff } from './services/toolService';
import Visualizer from './components/Visualizer';
import CollegeCard from './components/CollegeCard';
import { VisualizerState, CollegeRecommendation, LogMessage } from './types';

// Set worker source for PDF.js safely - adding version param to bust cache
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs?v=5.4.530';
}

const SYSTEM_INSTRUCTION = `
🎓 **Identity & Role**
You are **SeatSathi**, an expert AI Admission Counselor specifically for **KCET (Karnataka Common Entrance Test)**.
You **DO NOT** cover COMEDK, JEE, NEET, or other state exams. If asked, politely redirect to KCET topics.
Your demeanor is professional, encouraging, and clear.
You are fluent in **English** and **Hinglish**. Adapt to the user's language preference.

🧠 **Core Functions & Rules**
1. **Data Accuracy**: You have access to a database of cutoffs extracted from **KCET PDF documents** (2024 and 2025). Use the provided tools to fetch this real data. Never invent cutoffs.
2. **Context Awareness**: Always track these 4 key details:
   - **Rank** (e.g., 5000, 12000)
   - **Category** (e.g., GM, 2AG, 3BG, SCG)
   - **Course Preference** (e.g., CS, EC, Mech)
   - **Location Preference** (e.g., Bangalore, Mysore, or "Anywhere")
3. **Proactive Counseling**:
   - If the user just says "I have rank 5000", ask: "Great rank! Which category and branch are you aiming for in KCET?"
   - If the user uploads a PDF, acknowledge it and say you've analyzed the cutoff trends from it.
4. **Response Format**:
   - Give the student the top 5-10 best options verbally to keep it concise, but mention that the full list is available on the screen.
   - When listing colleges, mention the college name, branch, and the cutoff range.
   - Use clear, concise spoken language.
   - Example: "Based on your KCET rank of 10,000, you have a high chance at BMS College for Electrical, where the cutoff range was 12,000 to 14,000 last year."
5. **PDF Analysis**:
   - When a user uploads a PDF, use the \`extract_pdf_data\` tool to read its content.
   - The PDF text is extracted preserving layout (rows/columns). You can parse this "visual" text to identify College Codes, Courses, Categories, and Cutoff Ranks.
   - If the PDF contains cutoff lists, you can answer specific queries like "What is the cutoff for college E001 in this PDF?".

🛠️ **Tool Usage**
- Use \`find_matching_colleges\` when the user provides their rank and criteria.
- Use \`get_specific_college_cutoff\` when the user asks about a specific college (e.g., "What is the cutoff for RV College CS?").
- Use \`extract_pdf_data\` when the user uploads a PDF.

🛑 **Restrictions**
- **STRICTLY KCET ONLY**.
- Do not make guarantees (e.g., "You will 100% get this seat"). Use probability terms like "High chance", "Difficult", "Borderline".
`;

// --- Landing Page Component ---
const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-yellow-500/30">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-slate-900 font-bold">S</div>
          <span className="text-xl font-bold tracking-tight text-white">Seat<span className="text-yellow-500">Sathi</span></span>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-10 md:mt-0 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[120px] -z-10"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-xs font-medium text-yellow-400 mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
          AI Admission Counselor
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-5xl leading-[1.1]">
          <span className="text-white">Seat</span><span className="text-yellow-500">Sathi</span><br />
          KCET Counselling. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
            Simplified.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Navigate your engineering admissions with confidence. Instant cutoff analysis and college predictions tailored for Karnataka students.
        </p>

        <button 
          onClick={onStart}
          className="group relative inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-lg font-bold px-8 py-4 rounded-full transition-all transform hover:scale-105 shadow-[0_0_40px_-10px_rgba(234,179,8,0.5)]"
        >
          Start Chatting
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl text-slate-400 text-sm">
             <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-4 text-yellow-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="font-semibold text-slate-200 mb-2">Real KCET Data</h3>
                <p>Access verified cutoff data from 2024 & 2025 directly. No guesswork.</p>
             </div>
             <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-4 text-yellow-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <h3 className="font-semibold text-slate-200 mb-2">Voice Interface</h3>
                <p>Just talk naturally. SeatSathi understands English, Hinglish, and context.</p>
             </div>
             <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-4 text-yellow-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="font-semibold text-slate-200 mb-2">PDF Analysis</h3>
                <p>Upload your cutoff PDF and let AI parse the thousands of rows for you.</p>
             </div>
        </div>
        
        <div className="mt-16 mb-8 text-slate-600 text-xs text-center max-w-lg mx-auto">
            SeatSathi AI is currently under development. Responses are generated by AI and may vary; please verify important details from official sources.
        </div>
      </main>
    </div>
  );
};

// --- Main Application ---
export const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'app'>('landing');
  const [isConnected, setIsConnected] = useState(false);
  const [visualizerState, setVisualizerState] = useState<VisualizerState>('idle');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [recommendations, setRecommendations] = useState<CollegeRecommendation[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [pdfText, setPdfText] = useState<string>("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const logsContainerRef = useRef<HTMLDivElement>(null);
  
  const activeSessionRef = useRef<any>(null);
  const isSessionActive = useRef<boolean>(false);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Keep refs up to date for tool callbacks
  const pdfTextRef = useRef<string>("");

  useEffect(() => {
    // Check if API KEY is available in the environment
    if (process.env.API_KEY) {
        setHasApiKey(true);
    } else {
        setError("API Key not found. Please set your API_KEY.");
    }
  }, []);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (text: string, type: 'user' | 'agent' | 'system') => {
    setLogs(prev => [...prev.slice(-4), { text, type, timestamp: new Date() }]);
  };

  const cleanup = useCallback(() => {
     isSessionActive.current = false;
     if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
    }
    
    if (activeSessionRef.current) {
        try {
           activeSessionRef.current.close();
        } catch(e) { console.warn("Error closing session", e); }
        activeSessionRef.current = null;
    }

    if (audioContextRef.current) { 
        try { audioContextRef.current.close(); } catch(e) {}
        audioContextRef.current = null; 
    }
    if (inputContextRef.current) { 
        try { inputContextRef.current.close(); } catch(e) {}
        inputContextRef.current = null; 
    }
    
    setVisualizerState('idle');
  }, []);

  const handleDisconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    addLog("Session ended", 'system');
  }, [cleanup]);

  const handleBackToLanding = useCallback(() => {
    if (isConnected) {
        handleDisconnect();
    }
    setView('landing');
  }, [isConnected, handleDisconnect]);

  // Helper to deep clean data for JSON serialization (removes undefined)
  const cleanData = (data: any): any => {
    return JSON.parse(JSON.stringify(data, (key, value) => value === undefined ? null : value));
  };

  const handleConnect = async () => {
    if (!process.env.API_KEY) {
      setError("API Key missing.");
      return;
    }

    if (isConnected) return;

    try {
      setError(null);
      setVisualizerState('processing');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass();
      const outputCtx = new AudioContextClass();
      
      if (inputCtx.state === 'suspended') await inputCtx.resume();

      const inputSampleRate = inputCtx.sampleRate;
      console.log("Input Sample Rate:", inputSampleRate);

      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: toolsDeclaration,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } // Female Voice
          }
        }
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            isSessionActive.current = true;
            setIsConnected(true);
            setVisualizerState('idle');
            addLog("Connected! Say 'Hello'.", 'system');
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Audio output processing
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setVisualizerState('speaking');
              if (outputCtx.state === 'suspended') await outputCtx.resume();
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setVisualizerState('idle');
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Interruption
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setVisualizerState('idle');
            }

            // Tool Call
            if (msg.toolCall) {
              setVisualizerState('processing');
              const functionResponses = [];
              
              for (const fc of msg.toolCall.functionCalls) {
                let result: any = {};
                console.log("Executing tool:", fc.name, fc.args);
                
                try {
                    if (fc.name === 'extract_pdf_data') {
                       const extracted = pdfTextRef.current;
                       if (extracted && extracted.length > 50) {
                          const collegeMatches = (extracted.match(/E\d{3}/g) || []).length;
                          result = { 
                            status: "success", 
                            message: `PDF parsed successfully. Found approx ${collegeMatches} college entries. Structure appears to be tabular.`,
                            preview_text: extracted.substring(0, 3000) 
                          };
                       } else {
                          result = { status: "error", message: "No PDF data found or PDF text is empty/unreadable." };
                       }
                    } else if (fc.name === 'find_matching_colleges') {
                       const { rank, category, course, location } = fc.args as any;
                       const recs = findMatchingColleges(Number(rank), String(category), String(course), String(location));
                       setRecommendations(recs);
                       setHasSearched(true);
                       setShowAll(false);
                       result = { found: recs.length, top_matches: recs.slice(0, 5) };
                    } else if (fc.name === 'get_specific_college_cutoff') {
                       const { collegeName, category, course } = fc.args as any;
                       result = getSpecificCollegeCutoff(String(collegeName), String(category), String(course));
                    }
                } catch(err) {
                    console.error("Error executing tool", fc.name, err);
                    result = { error: "Failed to process request." };
                }

                functionResponses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: cleanData(result) } 
                });
              }

              // Send tool response
              if (activeSessionRef.current) {
                  try {
                    // Note: We use the activeSessionRef here because onmessage is an async callback 
                    // that might run after session is established.
                    activeSessionRef.current.sendToolResponse({
                        functionResponses: functionResponses
                    });
                  } catch(e) {
                      console.error("Failed to send tool response", e);
                  }
              }
            }
          },
          onclose: (e) => {
              console.log("Session closed", e);
              isSessionActive.current = false;
              handleDisconnect();
          },
          onerror: (e) => {
             console.error("Socket Error:", e);
             setError("Connection failed. Check network/key.");
             isSessionActive.current = false;
          }
        }
      });

      // Wait for session to be ready
      const session = await sessionPromise;
      activeSessionRef.current = session;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = async (e) => {
        if (!isSessionActive.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const rms = Math.sqrt(inputData.reduce((s, x) => s + x * x, 0) / inputData.length);
        if (rms > 0.02) setVisualizerState('listening');
        else if (visualizerState === 'listening') setVisualizerState('idle');

        try {
            const partData = createBlob(inputData, inputSampleRate);
            // Ensure we use the resolved session
            if(activeSessionRef.current) {
                activeSessionRef.current.sendRealtimeInput({ media: partData });
            }
        } catch(e) {
            console.error("Audio send error", e);
        }
      };
      
      source.connect(processor);
      processor.connect(inputCtx.destination);

    } catch (err: any) {
      console.error("Init Error:", err);
      setError(err.message || "Session initialization failed.");
      setVisualizerState('idle');
      handleDisconnect();
    }
  };

  const extractTextFromPDF = async (file: File) => {
    try {
        setIsPdfProcessing(true);
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        const maxPages = Math.min(pdf.numPages, 10);
        
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const items = textContent.items as any[];
            if (items.length === 0) continue;

            const rows: Record<number, any[]> = {};
            const Y_TOLERANCE = 5; 

            items.forEach(item => {
                const y = item.transform[5];
                const existingY = Object.keys(rows).find(key => Math.abs(parseFloat(key) - y) < Y_TOLERANCE);
                if (existingY) {
                    rows[parseFloat(existingY)].push(item);
                } else {
                    rows[y] = [item];
                }
            });

            const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);

            const pageStrings = sortedY.map(y => {
                const rowItems = rows[y].sort((a, b) => a.transform[4] - b.transform[4]);
                return rowItems.map(item => item.str).join('    '); 
            });

            fullText += `--- Page ${i} ---\n` + pageStrings.join('\n') + '\n\n';
        }
        
        setPdfText(fullText);
        pdfTextRef.current = fullText;
        addLog(`Processed PDF: ${file.name} (Layout preserved, ${maxPages} pgs)`, 'system');
        
    } catch (error) {
        console.error("PDF Extraction Error", error);
        addLog("Failed to extract PDF text.", 'system');
        setError("Failed to parse PDF. Please ensure it's a valid text-based PDF.");
    } finally {
        setIsPdfProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
          setPdfFile(file);
          extractTextFromPDF(file);
      } else {
          addLog("Please upload a valid PDF file.", 'system');
      }
    }
  };

  const displayedRecommendations = showAll ? recommendations : recommendations.slice(0, 10);

  if (view === 'landing') {
    return <LandingPage onStart={() => setView('app')} />;
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-200 flex flex-col relative selection:bg-yellow-500/30 overflow-hidden">
      <header className="w-full p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex justify-between items-center sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
           <button 
             onClick={handleBackToLanding}
             className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
             aria-label="Back to Home"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
           </button>
           <div className="flex items-center gap-2 cursor-pointer" onClick={handleBackToLanding}>
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-slate-900 font-bold">S</div>
             <h1 className="font-bold text-xl tracking-tight text-slate-100">Seat<span className="text-yellow-400">Sathi</span></h1>
           </div>
        </div>
        <div className="text-xs font-mono text-slate-500 uppercase">Gemini Live</div>
      </header>
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden w-full max-w-7xl mx-auto">
        
        {/* Left Panel: College List */}
        <div className="flex-1 md:w-1/2 p-4 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-800 custom-scrollbar relative">
           {!hasSearched ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8 text-center border-2 border-dashed border-slate-800 rounded-xl m-4 bg-slate-900/20">
                 <svg className="w-16 h-16 mb-4 opacity-50 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
                 </svg>
                 <p className="text-lg font-medium text-slate-400">Waiting for KCET requirements...</p>
                 <p className="text-sm mt-2 text-slate-500">Tell SeatSathi your rank, category, and preferred course to see matches.</p>
              </div>
           ) : recommendations.length > 0 ? (
              <div className="space-y-4 pb-16">
                 <div className="sticky top-0 bg-slate-950/90 backdrop-blur p-2 z-10 border-b border-slate-800 mb-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                      Matches Found ({recommendations.length})
                    </span>
                    {recommendations.length > 10 && (
                        <button 
                            onClick={() => setShowAll(!showAll)}
                            className="text-xs text-yellow-400 hover:text-yellow-300 font-medium underline"
                        >
                            {showAll ? "See Less" : "See More"}
                        </button>
                    )}
                 </div>
                 {displayedRecommendations.map((rec, idx) => (
                    <CollegeCard key={idx} data={rec} index={idx} />
                 ))}
                 
                 {recommendations.length > 10 && (
                    <button 
                        onClick={() => setShowAll(!showAll)}
                        className="w-full py-3 mt-4 text-sm font-medium text-slate-400 border border-slate-700/50 rounded-xl hover:bg-slate-800/50 transition-colors"
                    >
                        {showAll ? "Show Less" : `Show ${recommendations.length - 10} More Colleges`}
                    </button>
                 )}
              </div>
           ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8 text-center border-2 border-dashed border-slate-800 rounded-xl m-4 bg-slate-900/20">
                 <p className="text-lg font-medium text-slate-400">No colleges match your criteria.</p>
                 <p className="text-sm mt-2 text-slate-500">Try adjusting your rank or preferences.</p>
              </div>
           )}
        </div>

        {/* Right Panel: Agent Interface */}
        <div className="flex-1 md:w-1/2 flex flex-col relative bg-slate-900/30">
           
           {/* Visualizer and Status */}
           <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 min-h-[300px]">
              <Visualizer state={visualizerState} />
              <div className="text-center space-y-2">
                <p className="text-2xl font-light text-slate-200">
                    {visualizerState === 'idle' && isConnected ? "Listening..." : 
                     visualizerState === 'speaking' ? "Speaking..." : 
                     visualizerState === 'processing' ? "Thinking..." : 
                     "Ready to assist"}
                </p>
                {!isConnected && (
                    <p className="text-slate-500 text-sm">Connect to start your admission counseling session</p>
                )}
                {isPdfProcessing && <p className="text-yellow-400 text-xs animate-pulse">Processing PDF Content...</p>}
              </div>
           </div>

           {/* Logs - Sticky at bottom of right panel */}
           <div 
             ref={logsContainerRef}
             className="h-[250px] border-t border-slate-800 bg-slate-950/50 p-4 overflow-y-auto custom-scrollbar"
           >
                <div className="space-y-3">
                    {logs.length === 0 && <div className="text-slate-600 text-center text-xs italic mt-10">Conversation logs will appear here</div>}
                    {logs.map((log, i) => (
                      <div key={i} className={`text-sm p-3 rounded-xl max-w-[85%] shadow-sm ${
                          log.type === 'system' ? 'mx-auto text-slate-500 italic text-center bg-transparent text-xs' : 
                          log.type === 'agent' ? 'mr-auto bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50' : 
                          'ml-auto bg-yellow-500/10 text-yellow-100 border border-yellow-500/20 rounded-tr-none text-right'
                        }`}>
                         {log.text}
                      </div>
                    ))}
                </div>
           </div>
        </div>

      </main>

      {/* Footer Controls */}
      <footer className="w-full p-4 bg-slate-900 border-t border-slate-800 shrink-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="relative group flex-1">
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <button className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-slate-700 bg-slate-800 transition-colors ${pdfFile ? 'text-green-400 border-green-900' : 'text-slate-400 group-hover:text-slate-200'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>
               <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{pdfFile ? pdfFile.name : "Upload Cutoff PDF"}</span>
            </button>
          </div>
          {!isConnected ? (
             <button onClick={handleConnect} disabled={!hasApiKey} className={`flex-[2] bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-slate-950 font-bold py-3 px-6 rounded-full transition-all flex items-center justify-center gap-2 ${!hasApiKey ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 shadow-lg shadow-orange-500/20'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
               Start Session
             </button>
          ) : (
            <button onClick={handleDisconnect} className="flex-[2] bg-red-500 hover:bg-red-400 text-white font-bold py-3 px-6 rounded-full transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              End Call
            </button>
          )}
        </div>
        {error && <p className="text-red-400 text-xs text-center mt-2 font-mono">{error}</p>}
        {/* Footer Disclaimer */}
        <p className="text-slate-600 text-xs text-center mt-4 max-w-lg mx-auto">
          SeatSathi AI is currently under development. Responses are generated by AI and may vary; please verify important details from official sources.
        </p>
      </footer>
    </div>
  );
};
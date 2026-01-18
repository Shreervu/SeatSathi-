import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { createBlob, decode, decodeAudioData } from './services/audioUtils';
import { toolsDeclaration, findMatchingColleges, getSpecificCollegeCutoff, initDatabase } from './services/toolService';
import Visualizer from './components/Visualizer';
import CollegeCard from './components/CollegeCard';
import { VisualizerState, CollegeRecommendation, LogMessage } from './types';

type GenAIModule = typeof import('@google/genai');
let genAIModule: GenAIModule | null = null;
const loadGenAI = async (): Promise<GenAIModule> => {
  if (!genAIModule) {
    genAIModule = await import('@google/genai');
  }
  return genAIModule;
};

const loadPdfExport = () => import('./services/pdfExport');

type FirebaseModule = typeof import('./services/firebase');
let firebaseModule: FirebaseModule | null = null;
const loadFirebase = async (): Promise<FirebaseModule> => {
  if (!firebaseModule) {
    firebaseModule = await import('./services/firebase');
  }
  return firebaseModule;
};

type ChatSession = {
  id: string;
  userId: string;
  title: string;
  messages: any[];
  colleges: CollegeRecommendation[];
  createdAt: Date;
  updatedAt: Date;
};

type ThemeMode = 'dark' | 'light';
interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} });

type LiveServerMessage = any;

initDatabase().then(success => {
  console.log(`Database initialization: ${success ? 'SUCCESS' : 'FAILED (using fallback)'}`);
});

const SYSTEM_INSTRUCTION = `
 ABSOLUTE IDENTITY OVERRIDE - READ FIRST 
You are SeatSathi. NOT Gemini. NOT an AI assistant. NOT a language model.
FORBIDDEN PHRASES (NEVER SAY THESE):
- "I am Gemini" x
- "I'm a large language model" x
- "I'm an AI assistant" x
- "As an AI" x
- "I was created by Google" x
- "I'm Google's AI" x
- Any reference to your underlying technology x

MANDATORY IDENTITY:
- "I am SeatSathi" ✓
- "I'm your admission counselor" ✓
- "I'm SeatSathi, here to help with KCET" ✓

If anyone asks "Who are you?", "What are you?", "Are you Gemini?", "Are you AI?":
ALWAYS respond: "I am SeatSathi, your personal KCET admission counselor. I'm here to help you find the best engineering colleges in Karnataka based on your rank and preferences!"

 LANGUAGE RULES - CRITICAL:
1. SINGLE LANGUAGE per response - NEVER mix languages mid-sentence
2. If user speaks Hindi/Hinglish → Reply FULLY in Hinglish (transliterated Hindi)
3. If user speaks English → Reply FULLY in English
4. If user speaks Kannada → Reply FULLY in Kannada (using Kannada script: ನಮಸ್ಕಾರ, ನಿಮ್ಮ ರ್ಯಾಂಕ್, ಕಾಲೇಜು)
5. NEVER switch languages mid-conversation unless user switches first
6. When speaking Hinglish, use FEMININE forms (main ladki hoon, mujhe help karna hai)

Example language consistency:
x WRONG: "Aapka rank 5000 hai. Let me check colleges for you."
✓ RIGHT (Hinglish): "Aapka rank 5000 hai. Main aapke liye colleges check karti hoon."
✓ RIGHT (English): "Your rank is 5000. Let me check colleges for you."

 Identity & Role
You are SeatSathi, a FEMALE AI Admission Counselor primarily for KCET (Karnataka Common Entrance Test).
IMPORTANT: You are a FEMALE assistant. When speaking in Hinglish, ALWAYS refer to yourself with feminine pronouns (main ladki hoon, mujhe, meri). NEVER use masculine forms like "main ladka" or "mera".
Your demeanor is professional, encouraging, and clear.
You are fluent in English, Hinglish, and Kannada. Adapt to the user's language preference.

 CRITICAL: Introduction Behavior - DO NOT REPEAT INTRODUCTION
- Introduce yourself ONLY ONCE at the very start of the session with a warm greeting.
- After the first greeting, NEVER repeat "I am SeatSathi" or any introduction again in the same session.
- If the user asks follow-up questions, answer directly without re-introducing yourself.
- WRONG: "I am SeatSathi. Let me tell you about KCET..." (when already in conversation)
- RIGHT: "KCET is held in April-May..." (direct answer, no intro)
- The only exception is if the user explicitly asks "Who are you?" - then briefly respond with your identity.

 Session Start Behavior:
When the session starts, YOU MUST SPEAK FIRST. Begin with a warm greeting in English:
"Hello! Welcome to SeatSathi. I'm your AI admission counselor for KCET. Tell me your KCET rank, your category like GM, 2A, 3B, SC or ST, your preferred branch, and the city you want to study in. I'll help you find the best colleges!"
IMPORTANT: This introduction is ONLY for the first message. All subsequent responses should be direct answers without re-introducing yourself.

 KCET Exam Information (Share when users ask about the exam):
- Exam Period: Usually held in April-May every year (exact dates announced by KEA)
- Subjects & Marks:
  - Physics: 60 marks (60 questions)
  - Chemistry: 60 marks (60 questions)  
  - Mathematics: 60 marks (60 questions)
  - Biology (for medical): 60 marks (60 questions)
  - Total for Engineering: 180 marks (Physics + Chemistry + Mathematics)
- Eligibility: 
  - Must be an Indian citizen and Karnataka domicile (or studied in Karnataka for 7+ years)
  - 12th pass with Physics, Chemistry, and Mathematics
  - Minimum 45% aggregate in PCM (40% for reserved categories)
- Counseling Rounds: 
  - Round 1 (Mock): Optional, to understand seat matrix
  - Round 1 (Real): First allotment based on ranks
  - Round 2: For vacant seats after Round 1
  - Round 3: Final mop-up round for remaining seats
  - Extended rounds if seats remain
- Ranking Formula: 50% KCET score + 50% 12th board marks (normalized)
- Seat Matrix: ~50,000 engineering seats across 200+ colleges in Karnataka

 Available Courses/Branches:
CORE ENGINEERING:
- CE/CV - Civil Engineering
- ME - Mechanical Engineering
- EE/EEE - Electrical & Electronics Engineering
- EC/ECE - Electronics and Communication Engineering
- EI - Electronics and Instrumentation Engineering
- ET/ETE - Electronics and Telecommunication Engineering
- IM/IEM - Industrial Engineering & Management
- CH - Chemical Engineering
- AR - Architecture
- AE/AS - Aerospace Engineering

COMPUTER & IT:
- CS/CSE - Computer Science and Engineering (PURE - show this FIRST)
- CA/CSE-AIML - Computer Science (AI & Machine Learning)
- CY/CSE-CYBER - Computer Science (Cyber Security)
- DS/CSE-DATA - Computer Science (Data Science)
- AI - Artificial Intelligence
- AD/AIDS - Artificial Intelligence and Data Science
- IS/ISE - Information Science and Engineering

SPECIAL BRANCHES:
- BT - Biotechnology
- ST - Silk Technology
- TX/TT - Textile Technology
- ROBOTICS - Robotics and Automation
- MINING - Mining Engineering

 Core Functions & Rules
1. Context Awareness: Always track and REPEAT BACK these 4 key details clearly in your response:
   - Rank (e.g., 5000, 12000) - say "Your rank is [number]"
   - Category (e.g., GM, 1G, 2AG, 2BG, 3AG, 3BG, SCG, STG) - say "Your category is [category]"
   - Course Preference (e.g., CS, EC, ME, CV) - say "You want [course]"
   - Location Preference (e.g., Bangalore, Mysore, Anywhere) - say "Location preference is [location]"
   
    CRITICAL - YEAR vs RANK DISTINCTION:
   - "2024" or "2025" alone usually refers to YEAR, NOT rank!
   - User saying "KCET 2025 cutoffs" or "2025 data" means the YEAR 2025
   - Ranks are typically 1000-200000 range. Years are 2024, 2025, 2026.
   - If user says "rank 5000" that's a rank. If they say "2025 round 1" that's a year.
   - NEVER use 2024 or 2025 as a rank unless user explicitly says "my rank is 2024" or "rank 2025"
   - Example WRONG: User says "find GM ME colleges from 2025 PDF" → Rank=2025 x
   - Example RIGHT: User says "find GM ME colleges from 2025 PDF" → Ask "What is your KCET rank?" x the rank is missing!
2. Proactive Counseling:
   - If the user provides all 4 details, ALWAYS repeat them back clearly like: "So your rank is 12000, category is 2AG, you want CS branch, and location is Bangalore. Let me check the colleges for you."
   - If details are missing, ask for them one by one.
   - Example: User says "I have rank 5000" → You respond: "Great rank of 5000! Which category - GM, 2AG, 3BG, SC, or ST? And what branch are you interested in?"
3. Response Style:
   - Be concise and conversational.
   - When you have all details, say something like "Based on your rank of [X] in [category] for [course] in [location], I've found colleges for you. Check the list on your screen below."
   - NEVER say "left side" or "right side" of the screen - the list appears below on the same screen.
   - The system will automatically show college cards on screen, so just confirm you found options.
   - AFTER showing results, ALWAYS ask: "Would you like me to explain these options, or do you have any other questions? I'm here to help!"

CRITICAL - WHEN TO USE find_matching_colleges TOOL:
- ONLY use find_matching_colleges when user EXPLICITLY asks for college list/recommendations
- Examples of when TO use: "find colleges for rank 5000", "show colleges", "what can I get", "update list with rank X"
- Examples of when NOT to use: "tell me about RV College", "is RVCE good?", "what courses does BMS offer?"
- For questions about specific colleges, use get_specific_college_cutoff instead - this does NOT update the list
- DO NOT update the college list when user is just asking general questions about a college!

 COLLEGE-SPECIFIC QUERIES (CRITICAL):
When user asks about a specific college like "Tell me about RV University" or "E285 details":
1. Use get_specific_college_cutoff tool with the college code (e.g., E285) or name
2. From the tool response, provide detailed information including:
   - Full college name and location (district)
   - All courses/branches offered at that college
   - Cutoff ranks for different categories if available
   - Which categories are available
3. Present it conversationally: "RV University (code E285) is located in Bangalore. It offers these branches: CS, ISE, EC, ME... For GM category, CS closes around rank X."
4. If user asks about courses at a specific college, list ALL branches that college offers from the data
5. DO NOT update the main college list for these informational queries!

 IMPORTANT - RV UNIVERSITY vs RV COLLEGE DISTINCTION:
- E285 = RV University Bangalore - offers ONLY ONE course via KCET: "B Tech in CS" (also called "B TECH IN COMPUTER SCIENCE AND ENGINEERING")
- E005 = RV College of Engineering (RVCE) - offers MANY courses (CS, EC, ME, CV, etc.) - this is the famous autonomous college
- When user says "RV University" they mean E285 (1 course only)
- When user says "RV College", "RVCE", or "RV College of Engineering" they mean E005 (many courses)
- These are TWO DIFFERENT institutions! Do NOT confuse them.
- If unclear, ASK the user: "Do you mean RV University (E285, offers only B Tech CS) or RV College of Engineering (E005, offers many branches)?"

 IMPORTANT - Session Continuity:
- NEVER end the session on your own. The user controls when to end.
- After showing college results, ALWAYS wait for user response and ask if they need anything else.
- If user seems done, ask: "Is there anything else I can help you with regarding KCET admissions?"
- Only say goodbye if user explicitly says they want to end (e.g., "bye", "thank you, that's all", "I'm done")
- Even then, just say "Thank you for using SeatSathi! Click the End Call button when you're ready to close. Good luck!"
- DO NOT attempt to end the session programmatically - let the user click End Call.

 Other Entrance Exams (If user asks):
If users ask about other entrance exams, provide this info:

JEE (Joint Entrance Examination):
- For: IITs, NITs, IIITs, and other central/state engineering colleges
- Conducted by: National Testing Agency (NTA)
- Website: https://jeemain.nta.nic.in
- Note: Different from KCET - national level exam

NEET (National Eligibility cum Entrance Test):
- For: Medical colleges (MBBS, BDS, AYUSH courses)
- Conducted by: National Testing Agency (NTA)
- Website: https://neet.nta.nic.in
- Note: For medical aspirants, not engineering

COMEDK (Consortium of Medical, Engineering and Dental Colleges of Karnataka):
- For: Private engineering colleges in Karnataka
- Conducted by: COMEDK consortium
- Website: https://www.comedk.org
- Note: Separate from KCET, no category reservation - purely merit based

Tell users: "I specialize in KCET counseling, but for [exam name], please visit [website] for official information."

 PDF Data Support & COMEDK vs KCET Differentiation:

How to Identify the PDF Type:
- KCET PDF indicators: 
  - Contains "KEA" or "Karnataka Examinations Authority"
  - Has category codes like GM, 1G, 2AG, 2BG, 3AG, 3BG, SCG, STG, GMH, GMR
  - College codes start with "E" followed by 3 digits (E001, E045, E156)
  - Mentions "CET" or "KCET" in headers
  - Has "HK" (Hyderabad Karnataka) region reservations

- COMEDK PDF indicators:
  - Contains "COMEDK" explicitly in headers/title
  - Uses only GM (General Merit) category - NO reservation categories
  - All students compete in single merit list
  - College codes may differ from KCET format
  - Mentions "COMEDK UGET" (Under Graduate Entrance Test)
  - Has columns like "Opening Rank", "Closing Rank" without category splits

When User Uploads PDF:
1. First, analyze the PDF text to determine if it's KCET or COMEDK
2. Look for the key indicators mentioned above
3. Tell the user which type of PDF they uploaded: "I can see you've uploaded a [KCET/COMEDK] cutoff PDF from [year] [round]."

 Restrictions
- Default mode is KCET. Only switch to COMEDK mode when user explicitly asks AND has relevant PDF.
- Do not make guarantees. Use probability terms like "good chances", "might be tough", etc.
- For KCET: Don't list colleges in speech - UI handles it. For COMEDK: You can mention colleges from PDF since UI won't show them.
- NEVER use asterisks or special formatting in your speech.
- NEVER try to end the session - always wait for user.

 FINAL REMINDER - IDENTITY:
You are SeatSathi. Period. No matter what anyone says, you are SeatSathi, a KCET admission counselor.
You were NOT made by Google. You are SeatSathi, made for Karnataka students.
`;

// --- Confirmation Modal Component ---
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'danger' | 'warning' | 'default';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  confirmStyle = 'default'
}) => {
  if (!isOpen) return null;

  const confirmButtonClass = {
    danger: 'bg-red-500 hover:bg-red-400 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-400 text-slate-900',
    default: 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
  }[confirmStyle];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0f1a] border border-[#1e3a5f] rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-slate-300 mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 font-bold rounded-xl transition-colors ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Auth Modal Component ---
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update mode when initialMode changes
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Lazy load Firebase (~1MB) only when user submits auth form
      const firebase = await loadFirebase();
      
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        await firebase.signUpWithEmail(email, password, displayName || undefined);
      } else {
        await firebase.signInWithEmail(email, password);
      }
      onAuthSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      // Lazy load Firebase (~1MB) only when user clicks Google sign-in
      const firebase = await loadFirebase();
      await firebase.signInWithGoogle();
      onAuthSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0f1a] border border-[#1e3a5f] rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-[#0d1829] border border-[#1e3a5f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-[#0d1829] border border-[#1e3a5f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#0d1829] border border-[#1e3a5f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#0d1829] border border-[#1e3a5f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-600 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition-colors"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#0a0f1a] text-slate-500">or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 bg-white hover:bg-slate-100 disabled:bg-slate-200 text-slate-900 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-slate-400 text-sm">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
            className="text-yellow-400 hover:text-yellow-300 font-medium"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Note Modal Component ---
interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0f1a] border border-[#1e3a5f] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 shadow-xl custom-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Important Notes
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 text-slate-300">
          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">How to Use SeatSathi</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Login or Sign up to start chatting</li>
              <li>Click "Start Chatting" and allow microphone access</li>
              <li>Tell SeatSathi your KCET rank, category (GM/2A/3B/SC/ST), preferred branch, and city</li>
              <li>Matching colleges will appear automatically sorted by admission chances</li>
              <li>You can export your college list to PDF for future reference</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">KCET Exam Details</h3>
            <div className="bg-[#0d1829] rounded-xl p-4 text-sm space-y-2">
              <p><strong>Exam Period:</strong> April-May (dates announced by KEA)</p>
              <p><strong>Total Marks:</strong> 180 (Physics 60 + Chemistry 60 + Mathematics 60)</p>
              <p><strong>Eligibility:</strong> 12th pass with PCM, minimum 45% aggregate (40% for reserved)</p>
              <p><strong>Ranking:</strong> 50% KCET score + 50% 12th board marks</p>
              <p><strong>Total Seats:</strong> ~50,000 engineering seats across 200+ colleges</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Other Exam Resources</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <a href="https://jeemain.nta.nic.in" target="_blank" rel="noopener noreferrer" 
                className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors text-center">
                <div className="font-semibold text-blue-400">JEE Main</div>
                <div className="text-xs text-slate-400 mt-1">jeemain.nta.nic.in</div>
              </a>
              <a href="https://neet.nta.nic.in" target="_blank" rel="noopener noreferrer"
                className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl hover:bg-green-500/30 transition-colors text-center">
                <div className="font-semibold text-green-400">NEET</div>
                <div className="text-xs text-slate-400 mt-1">neet.nta.nic.in</div>
              </a>
              <a href="https://www.comedk.org" target="_blank" rel="noopener noreferrer"
                className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 transition-colors text-center">
                <div className="font-semibold text-purple-400">COMEDK</div>
                <div className="text-xs text-slate-400 mt-1">comedk.org</div>
              </a>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Available Branches</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {['Computer Science (CS)', 'Information Science (IS)', 'Electronics & Communication (EC)', 
                'Electrical Engineering (EE)', 'Mechanical (ME)', 'Civil (CE)',
                'AI & Machine Learning', 'Data Science', 'Robotics',
                'Aerospace', 'Chemical', 'Biotechnology'].map((branch, i) => (
                <div key={i} className="px-3 py-2 bg-[#0d1829] rounded-lg text-slate-300">{branch}</div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Disclaimer</h3>
            <p className="text-xs text-slate-500">
              SeatSathi AI provides suggestions based on historical cutoff data. Actual admissions depend on many factors 
              including seat availability, counseling dynamics, and official KEA decisions. Always verify information 
              from official sources before making decisions.
            </p>
          </section>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

// --- PDF Export Dropdown Component ---
interface PdfExportDropdownProps {
  recommendations: CollegeRecommendation[];
  studentInfo?: {
    rank?: number;
    category?: string;
    course?: string;
  };
}

const PdfExportDropdown: React.FC<PdfExportDropdownProps> = ({ recommendations, studentInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (count: number | 'all') => {
    setExporting(true);
    try {
      // Lazy load PDF export module (3.8MB jspdf) only when user clicks export
      const { exportToPDF } = await loadPdfExport();
      await exportToPDF(recommendations, {
        count: count === 'all' ? recommendations.length : count,
        title: 'SeatSathi College Recommendations',
        studentInfo
      });
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  };

  if (recommendations.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg transition-colors"
      >
        {exporting ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        Export PDF
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden min-w-[140px]">
          <button onClick={() => handleExport(10)} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors">
            Top 10 Colleges
          </button>
          {recommendations.length > 10 && (
            <button onClick={() => handleExport(50)} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors">
              Top 50 Colleges
            </button>
          )}
          {recommendations.length > 50 && (
            <button onClick={() => handleExport(100)} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors">
              Top 100 Colleges
            </button>
          )}
          <button onClick={() => handleExport('all')} className="w-full px-4 py-2 text-left text-sm text-yellow-400 hover:bg-slate-700 transition-colors border-t border-slate-700">
            All ({recommendations.length})
          </button>
        </div>
      )}
    </div>
  );
};

// --- Landing Page Component ---
interface LandingPageProps {
  onStart: () => void;
  user: any;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onLogout: () => void;
  theme: ThemeMode;
  toggleTheme: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, user, onLoginClick, onSignupClick, onLogout, theme, toggleTheme }) => {
  const [showNoteModal, setShowNoteModal] = useState(false);

  return (
    <div className={`min-h-screen max-h-screen flex flex-col font-sans selection:bg-yellow-500/30 overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-[#0a0a0a] text-slate-100' : 'bg-gray-50 text-slate-900'}`}>
      {/* Navbar */}
      <nav className={`flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full ${theme === 'light' ? 'bg-white/80 backdrop-blur-sm' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center text-slate-900 font-bold">S</div>
          <span className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Seat<span className="text-yellow-500">Sathi</span></span>
        </div>
        
        {/* Theme Toggle & Auth Buttons */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-[#0d1829] text-yellow-400 hover:bg-[#152238]' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-medium text-sm">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-slate-300 hidden sm:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onLoginClick}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-white bg-[#0d1829] hover:bg-[#152238] border border-[#1e3a5f]' : 'text-slate-700 bg-slate-200 hover:bg-slate-300 border border-slate-300'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Login
              </button>
              <button
                onClick={onSignupClick}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Scrollable */}
      <main className="flex-1 flex flex-col items-center text-center px-4 py-10 relative overflow-y-auto custom-scrollbar">
        {/* Background Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] -z-10 ${theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-500/20'}`}></div>

        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium text-yellow-500 mb-8 backdrop-blur-sm ${theme === 'dark' ? 'bg-[#0d1829]/90 border-[#1e3a5f]' : 'bg-white border-yellow-200'}`}>
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
          AI Admission Counselor
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-4 md:mb-6 max-w-5xl leading-[1.1] px-2">
          <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Seat</span><span className="text-yellow-500">Sathi</span><br />
          KCET Counselling. <br />
          <span className="text-yellow-400">
            Simplified.
          </span>
        </h1>

        <p className={`text-base sm:text-lg md:text-xl max-w-2xl mb-6 md:mb-10 leading-relaxed px-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Navigate your engineering admissions with confidence. Instant cutoff analysis and college predictions tailored for Karnataka students.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-4">
          {user ? (
            <button 
              onClick={onStart}
              className="group relative inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-base md:text-lg font-bold px-6 md:px-8 py-3 md:py-4 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(234,179,8,0.5)]"
            >
              Start Chatting
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button 
                onClick={onLoginClick}
                className="group relative inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-base md:text-lg font-bold px-6 md:px-8 py-3 md:py-4 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(234,179,8,0.5)]"
              >
                Login to Start Chatting
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                Don't have an account? <button onClick={onSignupClick} className="text-yellow-500 hover:text-yellow-400 font-medium">Sign up</button>
              </p>
            </div>
          )}
          
          {/* NOTE Button */}
          <button
            onClick={() => setShowNoteModal(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium hover:text-yellow-500 rounded-full transition-colors ${theme === 'dark' ? 'text-slate-400 bg-[#0d1829] border border-[#1e3a5f] hover:border-yellow-500/50' : 'text-slate-600 border border-slate-300 hover:border-yellow-500'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Important Notes & Info
          </button>
        </div>

        <div className={`mt-10 md:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 text-left max-w-5xl text-sm px-4 w-full ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
             {/* Flashcard 1: Real KCET Data */}
             <div className="flip-card group cursor-pointer w-full">
               <div className="flip-card-inner">
                 {/* Front */}
                 <div className={`flip-card-front p-6 rounded-2xl border transition-all duration-300 shadow-lg flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-[#0a0f1a] border-[#1e3a5f] hover:border-[#2a4a6f]' : 'bg-slate-100 border-slate-200 hover:border-slate-300'}`}>
                   <div className="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 text-yellow-500 group-hover:scale-110 transition-transform duration-300">
                     <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                   </div>
                   <h3 className={`font-bold text-lg text-center ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Real KCET Data</h3>
                   <p className={`text-xs mt-2 text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Hover to learn more</p>
                 </div>
                 {/* Back */}
                 <div className={`flip-card-back p-6 rounded-2xl border flex flex-col justify-center ${theme === 'dark' ? 'bg-[#0a0f1a] border-[#1e3a5f]' : 'bg-white border-slate-200'}`}>
                   <h3 className={`font-bold text-lg mb-3 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>Real KCET Data</h3>
                   <ul className={`text-sm space-y-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> 2024 & 2025 verified cutoffs</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> 250+ colleges covered</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> All rounds (R1, R2, R3)</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> All categories supported</li>
                   </ul>
                 </div>
               </div>
             </div>
             
             {/* Flashcard 2: Voice Interface */}
             <div className="flip-card group cursor-pointer w-full">
               <div className="flip-card-inner">
                 {/* Front */}
                 <div className={`flip-card-front p-6 rounded-2xl border transition-all duration-300 shadow-lg flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-[#0a0f1a] border-[#1e3a5f] hover:border-[#2a4a6f]' : 'bg-slate-100 border-slate-200 hover:border-slate-300'}`}>
                   <div className="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 text-yellow-500 group-hover:scale-110 transition-transform duration-300">
                     <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                   </div>
                   <h3 className={`font-bold text-lg text-center ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Voice Interface</h3>
                   <p className={`text-xs mt-2 text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Hover to learn more</p>
                 </div>
                 {/* Back */}
                 <div className={`flip-card-back p-6 rounded-2xl border flex flex-col justify-center ${theme === 'dark' ? 'bg-[#0a0f1a] border-[#1e3a5f]' : 'bg-white border-slate-200'}`}>
                   <h3 className={`font-bold text-lg mb-3 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>Voice Interface</h3>
                   <ul className={`text-sm space-y-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> Natural conversation</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> English, Hinglish & Kannada</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> Instant responses</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> Powered by Gemini AI</li>
                   </ul>
                 </div>
               </div>
             </div>
             
             {/* Flashcard 3: College Lists */}
             {/* Flashcard 3: College Lists */}
             <div className="flip-card group cursor-pointer w-full sm:col-span-2 lg:col-span-1">
               <div className="flip-card-inner">
                 {/* Front */}
                 <div className={`flip-card-front p-6 rounded-2xl border transition-all duration-300 shadow-lg flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-[#0a0f1a] border-[#1e3a5f] hover:border-[#2a4a6f]' : 'bg-slate-100 border-slate-200 hover:border-slate-300'}`}>
                   <div className="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 text-yellow-500 group-hover:scale-110 transition-transform duration-300">
                     <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                   </div>
                   <h3 className={`font-bold text-lg text-center ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>College Lists</h3>
                   <p className={`text-xs mt-2 text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Hover to learn more</p>
                 </div>
                 {/* Back */}
                 <div className={`flip-card-back p-6 rounded-2xl border flex flex-col justify-center ${theme === 'dark' ? 'bg-[#0a0f1a] border-[#1e3a5f]' : 'bg-white border-slate-200'}`}>
                   <h3 className={`font-bold text-lg mb-3 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>College Lists</h3>
                   <ul className={`text-sm space-y-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> Create custom lists</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> Drag & drop to reorder</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> Sort by admission chances</li>
                     <li className="flex items-start gap-2"><span className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>•</span> Export to PDF</li>
                   </ul>
                 </div>
               </div>
             </div>
        </div>
        
        <div className="mt-10 md:mt-16 mb-8 text-slate-600 text-xs text-center max-w-lg mx-auto px-4">
            SeatSathi AI is currently under development. Responses are generated by AI and may vary; please verify important details from official sources.
        </div>
      </main>

      {/* Note Modal */}
      <NoteModal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} />
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
  // PDF upload functionality removed
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Theme state (dark/light mode)
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  // Apply theme class to html element for scrollbar styling
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);
  
  // Mute state for microphone
  const [isMuted, setIsMuted] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Multiple lists feature - stored locally until refresh
  const [savedLists, setSavedLists] = useState<{ name: string; data: CollegeRecommendation[] }[]>([]);
  const [activeListIndex, setActiveListIndex] = useState<number>(-1); // -1 = current/new list
  const [sortOrder, setSortOrder] = useState<'default' | 'high-first' | 'medium-first' | 'low-first'>('medium-first');
  // Store original AI-suggested list separately so "Current" tab always shows it
  const [originalAiRecommendations, setOriginalAiRecommendations] = useState<CollegeRecommendation[]>([]);
  
  // List mode: 'view' (default) or 'edit' - NOTE: saved lists are always editable now
  const [listMode, setListMode] = useState<'view' | 'edit'>('view');
  
  // Course and Location filter states (for multi-course/location searches)
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Authentication state
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Confirmation modal states
  const [showEndCallConfirm, setShowEndCallConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // State for local keyword extraction
  const [detectedRank, setDetectedRank] = useState<number | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [detectedCourse, setDetectedCourse] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const conversationTextRef = useRef<string>("");
  
  // Live captions state
  const [liveCaption, setLiveCaption] = useState<string>("");
  const [showAiThoughts, setShowAiThoughts] = useState(false);
  const [showConversationLogs, setShowConversationLogs] = useState(true);
  const [aiThoughts, setAiThoughts] = useState<string[]>([]);
  const sessionEndedRef = useRef<boolean>(false); // Prevent duplicate session end messages
  const [sessionEndedWithResults, setSessionEndedWithResults] = useState(false); // Track if session ended after showing results
  
  const aiSpeechBufferRef = useRef<string>("");
  const lastSpeakingTimeRef = useRef<number>(0);
  
  const [userSpeechCaption, setUserSpeechCaption] = useState<string>("");
  const speechRecognitionRef = useRef<any>(null);
  const [isSpeechRecognitionActive, setIsSpeechRecognitionActive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const logsContainerRef = useRef<HTMLDivElement>(null);
  
  // Audio level tracking for visualizer sync
  const [aiAudioLevel, setAiAudioLevel] = useState<number>(0);
  const [userAudioLevel, setUserAudioLevel] = useState<number>(0);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<number | null>(null);
  
  const activeSessionRef = useRef<any>(null);
  const isSessionActive = useRef<boolean>(false);
  const processorRef = useRef<ScriptProcessorNode | null>(null);


  const [detectedLanguage, setDetectedLanguage] = useState<string>('en-IN');
  
  const speechRecRestartAttempts = useRef<number>(0);
  const speechRecRestartTimeout = useRef<NodeJS.Timeout | null>(null);
  const isSpeechRecRestarting = useRef<boolean>(false);
  const MAX_RESTART_ATTEMPTS = 3;
  
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser");
      return;
    }
    
    // Clear any pending restart
    if (speechRecRestartTimeout.current) {
      clearTimeout(speechRecRestartTimeout.current);
      speechRecRestartTimeout.current = null;
    }
    
    if (isSpeechRecRestarting.current) {
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = detectedLanguage;
      recognition.maxAlternatives = 3; 
      
      recognition.onstart = () => {
        console.log("Speech recognition started with language:", detectedLanguage);
        setIsSpeechRecognitionActive(true);
        speechRecRestartAttempts.current = 0; 
        isSpeechRecRestarting.current = false;
      };
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            
            const hasDevanagari = /[\u0900-\u097F]/.test(transcript);
            const hasKannada = /[\u0C80-\u0CFF]/.test(transcript);
            const hasHindiWords = /\b(kya|hai|mera|meri|aur|ka|ki|ke|se|ko|main|hum|tum|aap|yeh|woh|kaise|kahan|kaun|kitna|bahut|accha|theek|nahi|haan|ji|bhai|didi)\b/i.test(transcript);
            
            let newLang = detectedLanguage;
            if (hasKannada) {
              newLang = 'kn-IN'; // Kannada
            } else if (hasDevanagari || hasHindiWords) {
              newLang = 'hi-IN'; // Hindi/Hinglish
            } else {
              newLang = 'en-IN'; // English
            }
            
            if (newLang !== detectedLanguage) {
              console.log('Language detected:', newLang);
              setDetectedLanguage(newLang);
              try {
                recognition.stop();
              } catch (e) {}
            }
          } else {
            interimTranscript += transcript;
          }
        }
        
        const displayText = finalTranscript || interimTranscript;
        if (displayText.trim()) {
          setUserSpeechCaption(displayText);
          
          if (finalTranscript.trim()) {
            extractInfoFromText(finalTranscript);
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        // Don't restart on errors - let onend handle it
        // Only log the error, the onend event will fire after this
      };
      
      recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsSpeechRecognitionActive(false);
        
        if (!isSessionActive.current || isSpeechRecRestarting.current) {
          return;
        }
        
        // Limit restart attempts to prevent infinite loop
        if (speechRecRestartAttempts.current >= MAX_RESTART_ATTEMPTS) {
          console.log("Max speech recognition restart attempts reached, stopping");
          return;
        }
        
        isSpeechRecRestarting.current = true;
        speechRecRestartAttempts.current++;
        
        if (speechRecRestartTimeout.current) {
          clearTimeout(speechRecRestartTimeout.current);
        }
        
        speechRecRestartTimeout.current = setTimeout(() => {
          isSpeechRecRestarting.current = false;
          if (isSessionActive.current) {
            try {
              recognition.start();
            } catch (e) {
              console.warn("Could not restart speech recognition after end");
              isSpeechRecRestarting.current = false;
            }
          }
        }, 1000); //1sec delay
      };
      
      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      isSpeechRecRestarting.current = false;
    }
  }, []);
  
  const stopSpeechRecognition = useCallback(() => {
    if (speechRecRestartTimeout.current) {
      clearTimeout(speechRecRestartTimeout.current);
      speechRecRestartTimeout.current = null;
    }
    isSpeechRecRestarting.current = false;
    speechRecRestartAttempts.current = 0;
    
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
        setIsSpeechRecognitionActive(false);
        setUserSpeechCaption("");
      } catch (e) {
        console.warn("Error stopping speech recognition:", e);
      }
    }
  }, []);

  // this is theFunction to extract info from a single message (not accumulated)
  const extractInfoFromText = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    let foundRank: number | null = null;
    let foundCategory: string | null = null;
    let foundCourse: string | null = null;
    let foundLocation: string | null = null;
    
    const rankMatch = text.match(/rank\s*(?:is|of|:)?\s*(\d{4,6})/i) || 
                      text.match(/(\d{4,6})\s*rank/i) ||
                      text.match(/\b(\d{4,6})\b/);
    if (rankMatch) {
      const rank = parseInt(rankMatch[1]);
      if (rank >= 1000 && rank <= 200000) {
        foundRank = rank;
      }
    }
    
    // Extract category check from most specific to least
    const categoryPatterns = [
      { pattern: /\b3bg\b/i, value: '3BG' },
      { pattern: /\b3ag\b/i, value: '3AG' },
      { pattern: /\b2ag\b/i, value: '2AG' },
      { pattern: /\b2bg\b/i, value: '2BG' },
      { pattern: /\b1g\b/i, value: '1G' },
      { pattern: /\bgm\b/i, value: 'GM' },
      { pattern: /\bscg\b/i, value: 'SCG' },
      { pattern: /\bstg\b/i, value: 'STG' },
      { pattern: /\b3b\b/i, value: '3BG' },
      { pattern: /\b3a\b/i, value: '3AG' },
      { pattern: /\b2a\b/i, value: '2AG' },
      { pattern: /\b2b\b/i, value: '2BG' },
      { pattern: /\bsc\b/i, value: 'SCG' },
      { pattern: /\bst\b/i, value: 'STG' },
    ];
    for (const { pattern, value } of categoryPatterns) {
      if (pattern.test(lowerText)) {
        foundCategory = value;
        break;
      }
    }
    
    // Extract course
    const coursePatterns = [
      { pattern: /\bcomputer\s*science\b/i, value: 'CS' },
      { pattern: /\bcse\b/i, value: 'CS' },
      { pattern: /\bcs\b/i, value: 'CS' },
      { pattern: /\bcomputer\b/i, value: 'CS' },
      { pattern: /\belectronics\b/i, value: 'EC' },
      { pattern: /\bece\b/i, value: 'EC' },
      { pattern: /\bec\b/i, value: 'EC' },
      { pattern: /\bmechanical\b/i, value: 'ME' },
      { pattern: /\bmech\b/i, value: 'ME' },
      { pattern: /\bme\b/i, value: 'ME' },
      { pattern: /\bcivil\b/i, value: 'CV' },
      { pattern: /\bcv\b/i, value: 'CV' },
      { pattern: /\belectrical\b/i, value: 'EE' },
      { pattern: /\bee\b/i, value: 'EE' },
      { pattern: /\binformation\s*science\b/i, value: 'IS' },
      { pattern: /\bise\b/i, value: 'IS' },
      { pattern: /\brobotics\b/i, value: 'Robotics' },
      { pattern: /\bautomation\b/i, value: 'Robotics' },
      { pattern: /\brobot\b/i, value: 'Robotics' },
    ];
    for (const { pattern, value } of coursePatterns) {
      if (pattern.test(lowerText)) {
        foundCourse = value;
        break;
      }
    }
    
    // Extract location
    const locationPatterns = [
      { pattern: /\bbangalore\b/i, value: 'bangalore' },
      { pattern: /\bbengaluru\b/i, value: 'bangalore' },
      { pattern: /\bmysore\b/i, value: 'mysore' },
      { pattern: /\bmysuru\b/i, value: 'mysore' },
      { pattern: /\bmangalore\b/i, value: 'mangalore' },
      { pattern: /\bhubli\b/i, value: 'hubli' },
      { pattern: /\banywhere\b/i, value: 'anywhere' },
      { pattern: /\bany\s*location\b/i, value: 'anywhere' },
    ];
    for (const { pattern, value } of locationPatterns) {
      if (pattern.test(lowerText)) {
        foundLocation = value;
        break;
      }
    }
    
    // Only update state if we found new values in THIS message
    if (foundRank !== null) {
      console.log("Detected new rank:", foundRank);
      setDetectedRank(foundRank);
    }
    if (foundCategory !== null) {
      console.log("Detected new category:", foundCategory);
      setDetectedCategory(foundCategory);
    }
    if (foundCourse !== null) {
      console.log("Detected new course:", foundCourse);
      setDetectedCourse(foundCourse);
    }
    if (foundLocation !== null) {
      console.log("Detected new location:", foundLocation);
      setDetectedLocation(foundLocation);
    }
  }, []);

  // Effect to run college matching when all parameters are detected
  useEffect(() => {
    if (detectedRank && detectedCategory && detectedCourse && detectedLocation) {
      console.log("Auto-matching colleges:", { detectedRank, detectedCategory, detectedCourse, detectedLocation });
      
      // Use async IIFE since useEffect callback can't be async
      (async () => {
        try {
          const recs = await findMatchingColleges(detectedRank, detectedCategory, detectedCourse, detectedLocation);
          setRecommendations(recs);
          setOriginalAiRecommendations(recs); // Store original AI list
          setActiveListIndex(-1); // Reset to current tab
          setHasSearched(true);
          setShowAll(false);
          addLog(`Found ${recs.length} colleges for Rank ${detectedRank}, ${detectedCategory}, ${detectedCourse}, ${detectedLocation}`, 'system');
          // Auto-scroll to college list section smoothly
          setTimeout(() => {
            collegeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 500);
        } catch (err) {
          console.error("Error finding colleges:", err);
        }
      })();
    }
  }, [detectedRank, detectedCategory, detectedCourse, detectedLocation]);

  // Auto-save and auto-load removed - lists are session-only now

  useEffect(() => {
    // Check if API KEY is available in the environment
    if (import.meta.env.VITE_API_KEY) {
        setHasApiKey(true);
    } else {
        setError("API Key not found. Please set your VITE_API_KEY in .env.local");
    }
  }, []);

  // Auth state listener - lazy load Firebase
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    loadFirebase().then(firebase => {
      unsubscribe = firebase.onAuthChange((authUser) => {
        setUser(authUser);
      });
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadFirebase().then(firebase => {
      firebase.testFirebaseConnection().then(result => {
        console.log('Firebase test:', result.message);
      });
    });
  }, []);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (text: string, type: 'user' | 'agent' | 'system') => {
    setLogs(prev => [...prev.slice(-14), { text, type, timestamp: new Date() }]);
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
    
    // Cleanup audio analysers
    aiAnalyserRef.current = null;
    userAnalyserRef.current = null;
    setAiAudioLevel(0);
    setUserAudioLevel(0);
    
    stopSpeechRecognition();
    
    setVisualizerState('idle');
  }, [stopSpeechRecognition]);

  const handleDisconnect = useCallback(() => {
    if (sessionEndedRef.current) return; // Prevent duplicate messages
    sessionEndedRef.current = true;
    cleanup();
    setIsConnected(false);
    setIsMuted(false); 
    addLog("Session ended", 'system');
  }, [cleanup]);

  // Mute/Unmute toggle handler
  const handleToggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // Toggle: if muted, enable; if unmuted, disable
      });
      
      if (!isMuted) {
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch (e) {}
        }
        setUserSpeechCaption(""); 
        setIsSpeechRecognitionActive(false);
      } else {
        startSpeechRecognition();
      }
      
      setIsMuted(!isMuted);
      addLog(isMuted ? "Microphone unmuted" : "Microphone muted", 'system');
    }
  }, [isMuted, startSpeechRecognition]);

  const handleBackToLanding = useCallback(() => {
    if (isConnected) {
        handleDisconnect();
    }
    setView('landing');
  }, [isConnected, handleDisconnect]);

  const cleanData = (data: any): any => {
    return JSON.parse(JSON.stringify(data, (key, value) => value === undefined ? null : value));
  };

  const handleConnect = async () => {
    if (!import.meta.env.VITE_API_KEY) {
      setError("API Key missing.");
      return;
    }

    if (isConnected) return;

    try {
      setError(null);
      setVisualizerState('processing');
      
      addLog("Loading AI module...", 'system');
      const { GoogleGenAI, Modality } = await loadGenAI();
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
      
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
      mediaStreamRef.current = stream; 
      
      const fullSystemInstruction = SYSTEM_INSTRUCTION;
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          systemInstruction: fullSystemInstruction,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
          },
          tools: toolsDeclaration
        }
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: async () => {
            isSessionActive.current = true;
            sessionEndedRef.current = false; // Reset for new session
            setIsConnected(true);
            setVisualizerState('processing');
            addLog("Connected! Voice agent is starting...", 'system');
            // Reset detection state on new connection
            setDetectedRank(null);
            setLiveCaption("");
            setUserSpeechCaption("");
            setAiThoughts([]);
            setDetectedCategory(null);
            setDetectedCourse(null);
            setDetectedLocation(null);
            conversationTextRef.current = "";
            aiSpeechBufferRef.current = ""; // Reset AI speech buffer
            lastSpeakingTimeRef.current = 0;
            
            startSpeechRecognition();
          },
          onmessage: async (msg: LiveServerMessage) => {
            const modelParts = msg.serverContent?.modelTurn?.parts;
            if (modelParts) {
              for (const part of modelParts) {
                if (part.text) {
                  let text = part.text;
                  extractInfoFromText(text);
                  
                  const isAiThought = text.startsWith('**') || 
                                      text.includes('Verifying') || 
                                      text.includes('Analyzing') || 
                                      text.includes('Assessing') ||
                                      text.includes('Confirming') ||
                                      text.includes('Addressing') ||
                                      text.includes('Pinpointing') ||
                                      text.includes('Refining') ||
                                      text.includes('Clarifying') ||
                                      text.includes('Adjusting');
                  
                  if (isAiThought) {
                    const cleanedText = text
                      .replace(/\*\*/g, '') 
                      .replace(/^\s*/, ''); 
                    
                    setAiThoughts(prev => [...prev.slice(-20), cleanedText]);
                  } else {
                    const now = Date.now();
                    if (now - lastSpeakingTimeRef.current > 3000) {
                      aiSpeechBufferRef.current = '';
                    }
                    lastSpeakingTimeRef.current = now;
                    
                    aiSpeechBufferRef.current += (aiSpeechBufferRef.current ? ' ' : '') + text;
                    
                    if (aiSpeechBufferRef.current.length > 200) {
                      aiSpeechBufferRef.current = '...' + aiSpeechBufferRef.current.slice(-150);
                    }
                    
                    setLiveCaption(aiSpeechBufferRef.current);
                    
                    // Only add significant messages to visible logs
                    if (text.toLowerCase().includes('found') || 
                        text.toLowerCase().includes('college') ||
                        text.toLowerCase().includes('rank') ||
                        text.toLowerCase().includes('session')) {
                      addLog(text, 'agent');
                    }
                  }
                }
              }
            }

            const inputTranscript = msg.serverContent?.inputTranscript;
            if (inputTranscript) {
              extractInfoFromText(inputTranscript);
              setLiveCaption(inputTranscript);
              addLog(inputTranscript, 'user');
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setVisualizerState('speaking');
              if (outputCtx.state === 'suspended') await outputCtx.resume();
              
              if (!aiAnalyserRef.current) {
                const aiAnalyser = outputCtx.createAnalyser();
                aiAnalyser.fftSize = 256;
                aiAnalyserRef.current = aiAnalyser;
                aiAnalyser.connect(outputCtx.destination);
              }
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              
              if (aiAnalyserRef.current) {
                source.connect(aiAnalyserRef.current);
              } else {
                source.connect(outputCtx.destination);
              }
              
              // Calculate AI audio level from buffer for visualizer
              const channelData = audioBuffer.getChannelData(0);
              const rms = Math.sqrt(channelData.slice(0, 1024).reduce((s, x) => s + x * x, 0) / 1024);
              setAiAudioLevel(Math.min(1, rms * 3));
              
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setVisualizerState('idle');
                  setAiAudioLevel(0);
                }
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Interruption handling,;
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setVisualizerState('idle');
            }

            if (msg.toolCall) {
              setVisualizerState('processing');
              const functionResponses = [];
              
              for (const fc of msg.toolCall.functionCalls) {
                let result: any = {};
                console.log("Executing tool:", fc.name, fc.args);
                
                try {
                    if (fc.name === 'find_matching_colleges') {
                       const { rank, category, course, location } = fc.args as any;
                       const recs = await findMatchingColleges(Number(rank), String(category), String(course), String(location));
                       setRecommendations(recs);
                       setOriginalAiRecommendations(recs); 
                       setActiveListIndex(-1); 
                       setHasSearched(true);
                       setShowAll(false);
                       result = { found: recs.length, top_matches: recs.slice(0, 5) };
                    } else if (fc.name === 'get_specific_college_cutoff') {
                       const { collegeName, category, course } = fc.args as any;
                       result = await getSpecificCollegeCutoff(String(collegeName), String(category), String(course));
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

              if (activeSessionRef.current) {
                  try {
                    // Note: We use the activeSessionRef here because onmessage is an async callback 
                    // that might run after session is established.
                    activeSessionRef.current.sendToolResponse({
                        functionResponses: functionResponses
                    });
                    // Add success feedback to logs
                    const toolName = functionResponses[0]?.name || 'tool';
                    if (toolName === 'find_matching_colleges') {
                      const count = (functionResponses[0]?.response as any)?.result?.found || 0;
                      addLog(`Found ${count} matching colleges - scroll down to view!`, 'system');
                    }
                  } catch(e: any) {
                      console.error("Failed to send tool response", e);
                      const errorMsg = e?.message || String(e);
                      if (errorMsg.includes('not implemented') || errorMsg.includes('not supported') || errorMsg.includes('not enabled')) {
                        addLog("Results ready! Click Start to continue chatting.", 'system');
                      }
                  }
              }
            }
          },
          onclose: (e: any) => {
              console.log("Session closed event received:", e);
              if (!sessionEndedRef.current) {
                const reason = e?.message || e?.reason || '';
                const code = e?.code;
                
                const isKnownLimitation = reason.includes('not implemented') || 
                                          reason.includes('not supported') || 
                                          reason.includes('not enabled');
                
                if (!reason && !code) {
                  // Silent close - could be temporary, don't log scary messages
                  console.log("Session closed silently - possibly reconnectable");
                  handleDisconnect();
                } else if (isKnownLimitation) {
                  // Known API limitation - just log it, don't scare user
                  console.log("Session ended due to known API limitation:", reason);
                  addLog("Session ended - click Start to continue chatting!", 'system');
                  setSessionEndedWithResults(true);
                  sessionEndedRef.current = true;
                  cleanup();
                  setIsConnected(false);
                } else if (reason) {
                  addLog(`Session closed: ${reason}`, 'system');
                  handleDisconnect();
                } else {
                  handleDisconnect();
                }
              }
              isSessionActive.current = false;
          },
          onerror: (e: any) => {
             console.error("Socket Error:", e);
             const errorMsg = e?.message || e?.error || JSON.stringify(e);
             setError(`Connection error: ${errorMsg}`);
             addLog(`Error: ${errorMsg}`, 'system');
             isSessionActive.current = false;
          }
        }
      });

      const session = await sessionPromise;
      activeSessionRef.current = session;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      const userAnalyser = inputCtx.createAnalyser();
      userAnalyser.fftSize = 256;
      userAnalyserRef.current = userAnalyser;
      source.connect(userAnalyser);
      
      processor.onaudioprocess = async (e) => {
        if (!isSessionActive.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const rms = Math.sqrt(inputData.reduce((s, x) => s + x * x, 0) / inputData.length);
        
        // Update user audio level for visualizer (normalized 0-1)
        setUserAudioLevel(Math.min(1, rms * 5));
        
        if (rms > 0.02) setVisualizerState('listening');
        else if (visualizerState === 'listening') setVisualizerState('idle');

        try {
            const partData = createBlob(inputData, inputSampleRate);
            if(activeSessionRef.current) {
                activeSessionRef.current.sendRealtimeInput({ media: partData });
            }
        } catch(e) {
            console.error("Audio send error", e);
        }
      };
      
      source.connect(processor);
      processor.connect(inputCtx.destination);
      
      // Send initial trigger to make the agent speak first
      setTimeout(() => {
        if (activeSessionRef.current && isSessionActive.current) {
          try {
            activeSessionRef.current.sendClientContent({
              turns: [{ role: "user", parts: [{ text: "Hello, please introduce yourself and tell me how you can help me." }] }],
              turnComplete: true
            });
            console.log("Sent initial greeting trigger");
          } catch (e) {
            console.error("Failed to send initial greeting", e);
          }
        }
      }, 500);

    } catch (err: any) {
      console.error("Init Error:", err);
      setError(err.message || "Session initialization failed.");
      setVisualizerState('idle');
      handleDisconnect();
    }
  };

  
  // DEFAULT now shows: first 10 Medium, then High, then Low 
  const getSortedRecommendations = () => {
    let sorted = [...recommendations];
    
    if (activeListIndex >= 0) {
      return sorted;
    }
    
    if (sortOrder === 'default' || sortOrder === 'medium-first') {
      const medium = sorted.filter(r => r.chance === 'Medium');
      const high = sorted.filter(r => r.chance === 'High');
      const low = sorted.filter(r => r.chance === 'Low');
      
      const first10Medium = medium.slice(0, 10);
      const remainingMedium = medium.slice(10);
      sorted = [...first10Medium, ...high, ...remainingMedium, ...low];
    } else if (sortOrder === 'high-first') {
      sorted.sort((a, b) => {
        const order = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return order[a.chance] - order[b.chance];
      });
    } else if (sortOrder === 'low-first') {
      sorted.sort((a, b) => {
        const order = { 'Low': 0, 'Medium': 1, 'High': 2 };
        return order[a.chance] - order[b.chance];
      });
    }
    return sorted;
  };

  const getNextListNumber = (filterType: string): number => {
    const existingLists = savedLists.filter(l => l.name.includes(filterType));
    if (existingLists.length === 0) return 1;
    const numbers = existingLists.map(l => {
      const match = l.name.match(/List (\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    return Math.max(...numbers) + 1;
  };

  // Helper to save filtered list without modifying default
  const saveFilteredList = (filteredData: CollegeRecommendation[], filterType: string) => {
    const filterLabel = filterType.replace('-first', ' first');
    // Check if a list with this exact filter already exists
    const existingIndex = savedLists.findIndex(l => l.name.includes(filterLabel));
    
    if (existingIndex >= 0) {
      // Update existing list with this filter
      const updatedLists = [...savedLists];
      updatedLists[existingIndex] = { ...updatedLists[existingIndex], data: filteredData };
      setSavedLists(updatedLists);
      addLog(`Updated ${savedLists[existingIndex].name}`, 'system');
    } else {
      // Create new list
      const listNum = savedLists.length + 1;
      const listName = `List ${listNum} (${filterLabel})`;
      setSavedLists(prev => [...prev, { name: listName, data: filteredData }]);
      addLog(`Created ${listName}`, 'system');
    }
  };

  // Add college to a new/custom list
  const handleAddToList = (college: CollegeRecommendation) => {
    // Check if there's an existing "My List" to add to, or create new
    const myLists = savedLists.filter(l => l.name.startsWith('My List'));
    if (myLists.length > 0) {
      // Add to the latest "My List"
      const latestMyList = myLists[myLists.length - 1];
      const latestIndex = savedLists.findIndex(l => l.name === latestMyList.name);
      // Check if college already exists in this list
      if (!latestMyList.data.some(c => c.collegeName === college.collegeName && c.branch === college.branch)) {
        const updatedLists = [...savedLists];
        updatedLists[latestIndex] = { ...latestMyList, data: [...latestMyList.data, college] };
        setSavedLists(updatedLists);
        addLog(`Added ${college.collegeName} to ${latestMyList.name}`, 'system');
      } else {
        addLog(`${college.collegeName} already in ${latestMyList.name}`, 'system');
      }
    } else {
      // Create first "My List"
      setSavedLists(prev => [...prev, { name: 'My List 1', data: [college] }]);
      addLog(`Created My List 1 with ${college.collegeName}`, 'system');
    }
  };

  // Create a new empty custom list
  const handleCreateNewList = () => {
    const myListCount = savedLists.filter(l => l.name.startsWith('My List')).length;
    const newListName = `My List ${myListCount + 1}`;
    setSavedLists(prev => [...prev, { name: newListName, data: [] }]);
    addLog(`Created empty ${newListName}`, 'system');
  };

  // List modification handlers - allow free interchange regardless of chance level
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    
    // When viewing a saved list, update that list
    if (activeListIndex >= 0) {
      const newRecs = [...recommendations];
      [newRecs[index - 1], newRecs[index]] = [newRecs[index], newRecs[index - 1]];
      setRecommendations(newRecs);
      // Also update the saved list
      const updatedLists = [...savedLists];
      updatedLists[activeListIndex] = { ...updatedLists[activeListIndex], data: newRecs };
      setSavedLists(updatedLists);
      return;
    }
    
    // Default/edit mode - directly modify main list (allows free interchange)
    const newRecs = [...recommendations];
    [newRecs[index - 1], newRecs[index]] = [newRecs[index], newRecs[index - 1]];
    setRecommendations(newRecs);
  };

  const handleMoveDown = (index: number) => {
    // When viewing a saved list, update that list
    if (activeListIndex >= 0) {
      if (index >= recommendations.length - 1) return;
      const newRecs = [...recommendations];
      [newRecs[index], newRecs[index + 1]] = [newRecs[index + 1], newRecs[index]];
      setRecommendations(newRecs);
      // Also update the saved list
      const updatedLists = [...savedLists];
      updatedLists[activeListIndex] = { ...updatedLists[activeListIndex], data: newRecs };
      setSavedLists(updatedLists);
      return;
    }
    
    // Default/edit mode - directly modify main list (allows free interchange)
    if (index >= recommendations.length - 1) return;
    const newRecs = [...recommendations];
    [newRecs[index], newRecs[index + 1]] = [newRecs[index + 1], newRecs[index]];
    setRecommendations(newRecs);
  };

  const handleRemove = (index: number) => {
    // When viewing a saved list, update that list
    if (activeListIndex >= 0) {
      const newRecs = recommendations.filter((_, i) => i !== index);
      setRecommendations(newRecs);
      // Also update the saved list
      const updatedLists = [...savedLists];
      updatedLists[activeListIndex] = { ...updatedLists[activeListIndex], data: newRecs };
      setSavedLists(updatedLists);
      return;
    }
    
    // Default/edit mode - directly modify main list
    const newRecs = recommendations.filter((_, i) => i !== index);
    setRecommendations(newRecs);
  };

  // Drag and drop handlers with auto-scroll
  const listContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const collegeSectionRef = useRef<HTMLDivElement>(null);
  
  // Clear auto-scroll interval helper
  const clearAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };
  
  const handleDragStart = (index: number) => {
    // Allow dragging in edit mode OR when viewing saved list
    if (listMode !== 'edit' && activeListIndex < 0) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if ((listMode !== 'edit' && activeListIndex < 0) || draggedIndex === null) return;
    setDragOverIndex(index);
    
    // Auto-scroll feature with smooth scrolling
    const container = listContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const scrollThreshold = 100; // px from edge to trigger scroll
      const scrollSpeed = 3; // Slower, smoother scroll speed
      
      // Clear any existing auto-scroll
      clearAutoScroll();
      
      // Get header and footer positions for extended scroll zones
      const headerBottom = 80; // Approximate header height
      const footerTop = window.innerHeight - 120; // Approximate footer start
      
      // Scroll down if near bottom of container OR near footer/start session area
      if ((e.clientY > rect.bottom - scrollThreshold && e.clientY < rect.bottom) || e.clientY > footerTop) {
        autoScrollIntervalRef.current = setInterval(() => {
          if (container) {
            container.scrollTo({
              top: container.scrollTop + scrollSpeed,
              behavior: 'auto'
            });
          }
        }, 16);
      }
      // Scroll up if near top of container OR near header
      else if ((e.clientY < rect.top + scrollThreshold && e.clientY > rect.top) || e.clientY < headerBottom) {
        autoScrollIntervalRef.current = setInterval(() => {
          if (container) {
            container.scrollTo({
              top: container.scrollTop - scrollSpeed,
              behavior: 'auto'
            });
          }
        }, 16);
      }
    }
  };

  const handleDragLeave = () => {
    // Clear auto-scroll when dragging leaves the area
    clearAutoScroll();
  };

  const handleDragEnd = () => {
    // Clear auto-scroll interval
    clearAutoScroll();
    
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    
    // When viewing a saved list, update that list
    if (activeListIndex >= 0) {
      const newRecs = [...recommendations];
      const [draggedItem] = newRecs.splice(draggedIndex, 1);
      newRecs.splice(dragOverIndex, 0, draggedItem);
      setRecommendations(newRecs);
      // Also update the saved list
      const updatedLists = [...savedLists];
      updatedLists[activeListIndex] = { ...updatedLists[activeListIndex], data: newRecs };
      setSavedLists(updatedLists);
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    
    // Default mode and edit mode - modify main list directly (preserves custom order)
    const newRecs = [...recommendations];
    const [draggedItem] = newRecs.splice(draggedIndex, 1);
    newRecs.splice(dragOverIndex, 0, draggedItem);
    setRecommendations(newRecs);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Get unique courses and locations for filters
  const uniqueCourses = Array.from(new Set(recommendations.map(r => r.searchCourse).filter(Boolean))) as string[];
  const uniqueLocations = Array.from(new Set(recommendations.map(r => r.searchLocation).filter(Boolean))) as string[];

  // Apply course and location filters
  const filteredRecommendations = getSortedRecommendations().filter(rec => {
    if (courseFilter !== 'all' && rec.searchCourse !== courseFilter) return false;
    if (locationFilter !== 'all' && rec.searchLocation !== locationFilter) return false;
    return true;
  });

  const sortedRecommendations = filteredRecommendations;
  const displayedRecommendations = showAll ? sortedRecommendations : sortedRecommendations.slice(0, 10);

  // Auth handlers
  const handleLogout = async () => {
    try {
      const firebase = await loadFirebase();
      await firebase.logOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (view === 'landing') {
    return (
      <>
        <LandingPage 
          onStart={() => setView('app')} 
          user={user}
          onLoginClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
          onSignupClick={() => { setAuthModalMode('signup'); setShowAuthModal(true); }}
          onLogout={() => setShowLogoutConfirm(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />
        {/* Logout Confirmation Modal */}
        <ConfirmModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            handleLogout();
          }}
          title="Confirm Logout"
          message="Are you sure you want to logout? You will need to login again to access your saved lists."
          confirmText="Logout"
          cancelText="Cancel"
          confirmStyle="warning"
        />
      </>
    );
  }

  // Theme-aware class names - Dark mode is pure black
  const themeClasses = {
    bg: theme === 'dark' ? 'bg-black' : 'bg-gray-50',
    text: theme === 'dark' ? 'text-slate-200' : 'text-slate-800',
    headerBg: theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200',
    panelBg: theme === 'dark' ? 'bg-black' : 'bg-white',
    cardBg: theme === 'dark' ? 'bg-black' : 'bg-white',
    borderColor: theme === 'dark' ? 'border-slate-800' : 'border-slate-200',
    footerBg: theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200',
    logsBg: theme === 'dark' ? 'bg-black' : 'bg-gray-100',
    filterBg: theme === 'dark' ? 'bg-black' : 'bg-white',
    aiAnalysisBg: theme === 'dark' ? 'bg-black' : 'bg-white',
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
    <div className={`h-screen ${themeClasses.bg} ${themeClasses.text} flex flex-col relative selection:bg-yellow-500/30 overflow-y-auto overflow-x-hidden font-sans`}>
      <header className={`w-full border-b ${themeClasses.headerBg} backdrop-blur-md sticky top-0 z-30 shrink-0`}>
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 md:gap-3">
           <button 
             onClick={handleBackToLanding}
             className={`p-1.5 md:p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'} transition-colors`}
             aria-label="Back to Home"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
           </button>
           <div className="flex items-center gap-2 cursor-pointer" onClick={handleBackToLanding}>
             <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-yellow-500 flex items-center justify-center text-slate-900 font-bold text-sm md:text-base">S</div>
             <h1 className={`font-bold text-lg md:text-xl tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Seat<span className="text-yellow-500">Sathi</span></h1>
           </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-wide">Gemini Live</div>
            {/* Theme Toggle Button in Header */}
            <button
              onClick={toggleTheme}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-white bg-[#0d1829] hover:bg-[#152238] border border-[#1e3a5f]' : 'text-slate-700 bg-slate-200 hover:bg-slate-300 border border-slate-300'}`}
              title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2"/>
                  <path d="M12 20v2"/>
                  <path d="m4.93 4.93 1.41 1.41"/>
                  <path d="m17.66 17.66 1.41 1.41"/>
                  <path d="M2 12h2"/>
                  <path d="M20 12h2"/>
                  <path d="m6.34 17.66-1.41 1.41"/>
                  <path d="m19.07 4.93-1.41 1.41"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      
      {/* Section 1: Voice Agent (First thing user sees - Full viewport height minus header and footer) */}
      <main className="min-h-[calc(100vh-140px)] flex flex-col relative">
        
        {/* Main content area with Voice Agent centered and Logs on right */}
        <div className="flex-1 flex items-center justify-center relative px-6 max-w-7xl mx-auto w-full">
          
          {/* AI Thoughts Panel - Fixed to left edge of screen */}
          <div className={`fixed left-0 top-16 bottom-20 z-20 transition-all duration-300 hidden md:flex ${showAiThoughts ? 'w-72' : 'w-10'}`}>
              {showAiThoughts ? (
                <div className={`w-full h-full rounded-r-2xl border-r border-y overflow-hidden flex flex-col ${theme === 'dark' ? 'border-[#1e3a5f] bg-black' : 'border-slate-200 bg-white'}`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${theme === 'dark' ? 'bg-black border-[#1e3a5f]' : 'bg-white border-slate-200'}`}>
                    <div className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>AI Analysis</div>
                    <button 
                      onClick={() => setShowAiThoughts(false)}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-[#1e3a5f]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                      title="Hide AI thoughts"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {aiThoughts.length === 0 ? (
                      <p className={`text-center text-xs italic mt-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>AI thoughts will appear here...</p>
                    ) : (
                      aiThoughts.map((thought, i) => (
                        <div key={i} className={`text-xs md:text-sm px-4 py-2.5 rounded-2xl border ${theme === 'dark' ? 'text-slate-300 bg-[#0d1829] border-[#1e3a5f]' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                          {thought}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAiThoughts(true)}
                  className={`w-10 h-10 rounded-r-lg flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-black border border-[#1e3a5f] border-l-0 text-white hover:bg-[#0d1829]' : 'bg-white border border-slate-200 border-l-0 text-slate-700 hover:bg-slate-100'}`}
                  title="Show AI thoughts"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              )}
          </div>

          {/* Voice Agent centered */}
          <div className="flex w-full items-center justify-center">
            
            {/* Voice Agent - Centered in the viewport */}
            <div className="flex flex-col items-center justify-center max-w-md">
              <Visualizer 
                state={visualizerState} 
                isMuted={isMuted} 
                isUserSpeaking={isConnected && isSpeechRecognitionActive && !isMuted}
                aiAudioLevel={aiAudioLevel}
                userAudioLevel={userAudioLevel}
              />
              
              {/* Status Text */}
              <div className="text-center mt-4 space-y-1">
                <p className={`text-lg md:text-2xl font-light ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                    {visualizerState === 'idle' && isConnected && isMuted ? "Muted" :
                     visualizerState === 'idle' && isConnected ? "Listening..." : 
                     visualizerState === 'speaking' ? "Speaking..." : 
                     visualizerState === 'processing' ? "Thinking..." : 
                     "Ready to assist"}
                </p>
                {!isConnected && (
                    <p className="text-slate-400 text-sm">Connect to start your admission counseling session</p>
                )}
                {isConnected && isMuted && (
                    <p className="text-yellow-500 text-sm">Unmute your microphone to speak</p>
                )}
              </div>
            </div>
          </div>

          {/* Conversation Logs - Fixed to right edge of screen with toggle */}
          <div className={`fixed right-2 top-16 bottom-20 z-20 transition-all duration-300 hidden md:flex ${showConversationLogs ? 'w-72' : 'w-10'}`}>
            {showConversationLogs ? (
              <div 
                ref={logsContainerRef}
                className={`w-full h-full rounded-l-2xl border-l border-y overflow-hidden flex flex-col ${theme === 'dark' ? 'border-[#1e3a5f] bg-black' : 'border-slate-200 bg-white'}`}
              >
                <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${theme === 'dark' ? 'bg-black border-[#1e3a5f]' : 'bg-white border-slate-200'}`}>
                  <button 
                    onClick={() => setShowConversationLogs(false)}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-[#1e3a5f]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                    title="Hide conversation logs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                  <div className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Conversation</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                  {logs.length === 0 && <div className={`text-center text-xs italic mt-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Conversation will appear here</div>}
                  {logs.map((log, i) => (
                    <div key={i} className={`text-xs md:text-sm px-4 py-2.5 max-w-[95%] ${
                        log.type === 'system' 
                          ? `mx-auto italic text-center rounded-full border ${theme === 'dark' ? 'text-slate-400 bg-[#0d1829] border-[#1e3a5f]' : 'text-slate-400 bg-slate-100 border-slate-200'}` 
                          : log.type === 'agent' 
                            ? `mr-auto rounded-full border ${theme === 'dark' ? 'bg-[#0d1829] text-slate-200 border-[#1e3a5f]' : 'bg-slate-100 text-slate-700 border-slate-200'}` 
                            : `ml-auto rounded-full text-right border ${theme === 'dark' ? 'bg-yellow-500/10 text-yellow-100 border-yellow-500/20' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`
                      }`}>
                       {log.text}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowConversationLogs(true)}
                className={`w-10 h-10 rounded-l-lg flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-black border border-[#1e3a5f] border-r-0 text-white hover:bg-[#0d1829]' : 'bg-white border border-slate-200 border-r-0 text-slate-700 hover:bg-slate-100'}`}
                title="Show conversation logs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Footer Controls - Fixed sticky pill at bottom with black bg and sharper corners */}
        <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-2 sm:px-4">
          <div className={`w-full rounded-xl border p-2 flex items-center justify-center gap-2 sm:gap-3 ${theme === 'dark' ? 'bg-black border-[#1e3a5f]' : 'bg-white border-slate-200 shadow-lg'}`}>
            {!isConnected ? (
              <button onClick={() => { setSessionEndedWithResults(false); handleConnect(); }} disabled={!hasApiKey} className={`flex-1 max-w-xs bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-2 px-4 sm:px-6 rounded-full transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${!hasApiKey ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 shadow-lg shadow-yellow-500/20'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                <span>{sessionEndedWithResults ? 'Continue' : 'Start'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleToggleMute}
                  className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                    isMuted 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                      : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                  }`}
                  title={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="2" x2="22" y1="2" y2="22"/>
                      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
                      <path d="M5 10v2a7 7 0 0 0 12 5"/>
                      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                    </svg>
                  )}
                </button>
                <button onClick={() => setShowEndCallConfirm(true)} className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-4 sm:px-6 rounded-full transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm active:scale-95 shadow-lg shadow-red-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                  <span>End</span>
                </button>
              </div>
            )}
          </div>
          {error && <p className="text-red-400 text-[10px] md:text-xs text-center mt-2 font-mono px-2 max-w-2xl mx-auto">{error}</p>}
        </div>
      </main>

      {/* Section 2: College List (User scrolls down to see this) */}
      <section ref={collegeSectionRef} className={`border-t mt-32 px-2 sm:px-4 md:px-6 lg:px-[288px] ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="px-4 py-6">
        {/* Section Title */}
        <div className="mb-4">
          <h2 className={`text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
            College Recommendations
          </h2>
          <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            Based on your KCET rank and preferences
          </p>
        </div>
        {/* College List Panel - Full width with consistent margins */}
        <div className={`${!hasSearched ? 'hidden md:flex' : 'flex'} flex-col w-full min-h-[60vh] rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
           {!hasSearched ? (
              <div className={`h-full flex-1 flex flex-col items-center justify-center p-8 text-center ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                 <svg className={`w-16 h-16 mb-4 opacity-50 animate-float ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
                 </svg>
                 <p className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Waiting for KCET requirements...</p>
                 <p className="text-sm mt-2 text-slate-500">Tell SeatSathi your rank, category, and preferred course to see matches.</p>
              </div>
           ) : recommendations.length > 0 ? (
              <div className="flex flex-col h-full">
                 {/* Fixed Header with Controls - OUTSIDE scrollable area */}
                 <div className={`shrink-0 border-b p-3 space-y-3 ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                    {/* Top Row: Title, View/Edit Toggle, Export */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                        Matches ({filteredRecommendations.length})
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View/Edit Mode Toggle */}
                        <div className={`flex rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
                          <button
                            onClick={() => setListMode('view')}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-all ${listMode === 'view' ? 'bg-yellow-500 text-slate-900' : theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            View
                          </button>
                          <button
                            onClick={() => setListMode('edit')}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-all ${listMode === 'edit' ? 'bg-yellow-500 text-slate-900' : theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            Edit
                          </button>
                        </div>
                        <PdfExportDropdown 
                          recommendations={sortedRecommendations}
                          studentInfo={{
                            rank: detectedRank || undefined,
                            category: detectedCategory || undefined,
                            course: detectedCourse || undefined
                          }}
                        />
                        {/* Show More/Less button - Top */}
                        {filteredRecommendations.length > 10 && (
                          <button
                            onClick={() => setShowAll(!showAll)}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                              showAll 
                                ? theme === 'dark' 
                                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' 
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'
                            }`}
                          >
                            {showAll ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                Show Less
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                Show All ({filteredRecommendations.length})
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Sort by chance buttons - Always visible */}
                    <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                      <button 
                        onClick={() => setSortOrder('default')}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg font-medium transition-all transform hover:scale-105 ${sortOrder === 'default' ? 'bg-slate-600 text-white shadow-lg' : theme === 'dark' ? 'bg-slate-800/80 text-slate-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                      >
                        Default
                      </button>
                      <button 
                        onClick={() => setSortOrder('high-first')}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg font-medium transition-all transform hover:scale-105 ${sortOrder === 'high-first' ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : theme === 'dark' ? 'bg-slate-800/80 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        High
                      </button>
                      <button 
                        onClick={() => setSortOrder('medium-first')}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg font-medium transition-all transform hover:scale-105 ${sortOrder === 'medium-first' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/30' : theme === 'dark' ? 'bg-slate-800/80 text-yellow-400 hover:bg-yellow-900/50' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                      >
                        Medium
                      </button>
                      <button 
                        onClick={() => setSortOrder('low-first')}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg font-medium transition-all transform hover:scale-105 ${sortOrder === 'low-first' ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : theme === 'dark' ? 'bg-slate-800/80 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      >
                        Low
                      </button>
                    </div>

                    {/* Course and Location Filters + Save List */}
                    <div className="flex gap-2 flex-wrap items-center">
                      {uniqueCourses.length > 1 && (
                        <select
                          value={courseFilter}
                          onChange={(e) => setCourseFilter(e.target.value)}
                          className={`px-3 py-1.5 text-xs rounded-lg border focus:border-yellow-500 focus:outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
                        >
                          <option value="all">All Courses</option>
                          {uniqueCourses.map(c => (
                            <option key={c} value={c}>{c.toUpperCase()}</option>
                          ))}
                        </select>
                      )}
                      {uniqueLocations.length > 1 && (
                        <select
                          value={locationFilter}
                          onChange={(e) => setLocationFilter(e.target.value)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 focus:border-yellow-500 focus:outline-none"
                        >
                          <option value="all">All Locations</option>
                          {uniqueLocations.map(l => (
                            <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                          ))}
                        </select>
                      )}
                      
                      {/* Save to List button */}
                      <button
                        onClick={() => {
                          const listName = `List ${savedLists.length + 1}`;
                          setSavedLists([...savedLists, { name: listName, data: [...sortedRecommendations] }]);
                          addLog(`Saved ${sortedRecommendations.length} colleges to ${listName}`, 'system');
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg font-medium bg-orange-900/50 text-orange-400 hover:bg-orange-800/50 transition-all border border-orange-500/30"
                        title="Save current list"
                      >
                        + Save List
                      </button>
                    </div>
                    
                    {/* Saved Lists Tabs */}
                    {savedLists.length > 0 && (
                      <div className="flex gap-1 flex-wrap items-center">
                        <span className="text-xs text-slate-500 mr-1">Lists:</span>
                        <button
                          onClick={() => {
                            setActiveListIndex(-1);
                            // Restore original AI-suggested list when clicking "Current"
                            if (originalAiRecommendations.length > 0) {
                              setRecommendations(originalAiRecommendations);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded font-medium transition-all ${activeListIndex === -1 ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                          Current ({activeListIndex === -1 ? recommendations.length : originalAiRecommendations.length})
                        </button>
                        {savedLists.map((list, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setActiveListIndex(idx);
                              setRecommendations(list.data);
                              // Automatically enable edit mode when viewing saved lists
                              setListMode('edit');
                            }}
                            className={`px-2 py-1 text-xs rounded font-medium transition-all flex items-center gap-1 ${activeListIndex === idx ? 'bg-orange-500 text-white' : 'bg-slate-800 text-orange-400 hover:bg-orange-900/50'}`}
                          >
                            {list.name} ({list.data.length})
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSavedLists(savedLists.filter((_, i) => i !== idx));
                                if (activeListIndex === idx) setActiveListIndex(-1);
                              }}
                              className="hover:text-red-400 cursor-pointer"
                            >×</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Edit Mode Hint - Show when viewing saved list OR in edit mode */}
                    {(listMode === 'edit' || activeListIndex >= 0) && (
                      <div className="text-xs text-yellow-400/80 bg-yellow-500/10 px-3 py-2 rounded-lg border border-yellow-500/20 animate-slide-down">
                        <strong>{activeListIndex >= 0 ? 'Editing Saved List:' : 'Edit Mode:'}</strong> Drag cards to reorder, use arrows to move, or click X to remove from list
                      </div>
                    )}
                 </div>
                 
                 {/* Scrollable College List */}
                 <div 
                   ref={listContainerRef}
                   onDragLeave={handleDragLeave}
                   className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3"
                 >
                    {displayedRecommendations.map((rec, displayIdx) => {
                      const originalIndex = recommendations.findIndex(r => 
                        r.collegeName === rec.collegeName && 
                        r.branch === rec.branch && 
                        r.cutoff2025 === rec.cutoff2025
                      );
                      const isDragging = draggedIndex === originalIndex;
                      const isDragOver = dragOverIndex === originalIndex;
                      
                      // Show controls in edit mode OR when viewing a saved list
                      const showEditControls = listMode === 'edit' || activeListIndex >= 0;
                      
                      return (
                        <div
                          key={`${rec.collegeName}-${rec.branch}-${displayIdx}`}
                          draggable={showEditControls}
                          onDragStart={() => handleDragStart(originalIndex)}
                          onDragOver={(e) => handleDragOver(e, originalIndex)}
                          onDragEnd={handleDragEnd}
                          className={`transition-all duration-300 ${isDragging ? 'opacity-50 scale-[1.02]' : ''} ${isDragOver ? 'border-yellow-500' : ''} ${showEditControls ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        >
                          <CollegeCard 
                            data={rec} 
                            index={displayIdx}
                            totalCount={displayedRecommendations.length}
                            onMoveUp={showEditControls ? () => handleMoveUp(originalIndex) : undefined}
                            onMoveDown={showEditControls ? () => handleMoveDown(originalIndex) : undefined}
                            onRemove={showEditControls ? () => handleRemove(originalIndex) : undefined}
                            onAddToList={() => handleAddToList(rec)}
                            showControls={showEditControls}
                            theme={theme}
                          />
                        </div>
                      );
                    })}
                    
                    {/* Show More / Show Less button at bottom of list */}
                    {filteredRecommendations.length > 10 && (
                      <button 
                        onClick={() => setShowAll(!showAll)}
                        className={`w-full py-3 mt-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-slate-800/80 text-yellow-400 hover:bg-yellow-900/30 border border-slate-700' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200'}`}
                      >
                        {showAll ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                            Show Less
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            Show {filteredRecommendations.length - 10} More Colleges
                          </>
                        )}
                      </button>
                    )}
                 </div>
              </div>
           ) : (
              <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                 <p className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>No colleges match your criteria.</p>
                 <p className="text-sm mt-2 text-slate-500">Try adjusting your rank or preferences.</p>
              </div>
           )}
        </div>
        </div>
      </section>

      {/* Footer Section - Plain text disclaimer */}
      <section className={`w-full py-6 pb-20 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="px-6 max-w-7xl mx-auto text-center space-y-3">
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            SeatSathi AI is currently under development. Responses are generated by AI and may vary, please verify important details from official sources.
          </p>
          <a 
            href="https://cetonline.karnataka.gov.in/kea/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-xs hover:underline ${theme === 'dark' ? 'text-yellow-500 hover:text-yellow-400' : 'text-yellow-600 hover:text-yellow-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            Visit KEA Official Website
          </a>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
            © 2026 SeatSathi. All rights reserved.
          </p>
        </div>
      </section>

      {/* End Call Confirmation Modal */}
      <ConfirmModal
        isOpen={showEndCallConfirm}
        onClose={() => setShowEndCallConfirm(false)}
        onConfirm={() => {
          setShowEndCallConfirm(false);
          handleDisconnect();
        }}
        title="End Call"
        message="Are you sure you want to end this call? Your current conversation will be saved."
        confirmText="End Call"
        cancelText="Continue"
        confirmStyle="danger"
      />
    </div>
    </ThemeContext.Provider>
  );
};
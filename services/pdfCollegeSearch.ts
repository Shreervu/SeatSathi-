import { CollegeRecommendation } from '../types';

interface ParsedCollegeEntry {
  code: string;           // E001, E002, E285 (RV University), etc.
  name: string;
  branch: string;
  category: string;
  cutoffRank: number;
  year?: string;
  round?: string;
}

// Store for PDF-extracted college data
let pdfCollegeData: ParsedCollegeEntry[] = [];

// ============= Comprehensive College Mappings =============
// E-codes to official college names (200+ colleges)
const COLLEGE_CODES: Record<string, string> = {
  'E001': 'University Visvesvaraya College of Engineering, Bangalore',
  'E002': 'Govt. SKSJT Institute of Engineering, Bangalore',
  'E003': 'BMS College of Engineering, Bangalore',
  'E004': 'Dr. Ambedkar Institute of Technology, Bangalore',
  'E005': 'R V College of Engineering, Bangalore',
  'E006': 'M S Ramaiah Institute of Technology, Bangalore',
  'E007': 'Dayananda Sagar College of Engineering, Bangalore',
  'E008': 'Bangalore Institute of Technology, Bangalore',
  'E009': 'PES University, Bangalore',
  'E010': 'J S S Academy of Technical Education, Bangalore',
  'E011': 'M V J College of Engineering, Bangalore',
  'E012': 'Sir M. Visvesvaraya Institute of Technology, Bangalore',
  'E013': 'Ghousia Engineering College, Ramanagara',
  'E014': 'S J C Institute of Technology, Chickballapur',
  'E015': 'Dr. T. Thimmaiah Institute of Technology, KGF',
  'E016': 'Siddaganga Institute of Technology, Tumkur',
  'E017': 'Sri Siddhartha Institute of Technology, Tumkur',
  'E018': 'Kalpatharu Institute of Technology, Tiptur',
  'E019': 'Sapthagiri College of Engineering, Bangalore',
  'E020': 'Nagarjuna College of Engineering and Technology, Bangalore',
  'E021': 'Sri Jayachamarajendra College of Engineering, Mysore',
  'E022': 'The National Institute of Engineering, Mysore',
  'E023': 'P E S College of Engineering, Mandya',
  'E024': 'Malnad College of Engineering, Hassan',
  'E025': 'Vidyavardhaka College of Engineering, Mysore',
  'E026': 'Sri Dharmasthala Manjunatheshwara Institute of Technology, Ujire',
  'E027': 'Srinivas Institute of Technology, Mangalore',
  'E028': 'Tontadarya College of Engineering, Gadag',
  'E029': 'Maratha Mandal Engineering College, Belgaum',
  'E030': 'Angadi Institute of Technology and Management, Belgaum',
  'E031': 'Basaveshwara Engineering College, Bagalkot',
  'E032': 'R.T.E. Rural Engineering College, Hulkoti',
  'E033': 'Sri Taralabalu Jagadguru Institute of Technology, Ranebennur',
  'E034': 'SDM College of Engineering, Dharwad',
  'E035': 'Anjuman Institute of Technology, Bhatkal',
  'E036': 'KLE Technological University, Belgaum',
  'E037': 'K.L.S. Gogte Institute of Technology, Belgaum',
  'E038': 'BLDEA VP Dr. P.G. Hallakatti College of Engineering, Bijapur',
  'E039': 'Hirasugar Institute of Technology, Nidasoshi',
  'E040': 'Hira Sugar Institute of Technology, Nidasoshi',
  'E041': 'P D A College of Engineering, Gulbarga',
  'E042': 'Khaja Bandanawaz University, Kalaburagi',
  'E043': 'Gurunanak Dev Engineering College, Bidar',
  'E044': 'Bheemanna Khandre Institute of Technology, Bhalki',
  'E045': 'Rao Bahadur Y. Mahabaleswarappa Engineering College, Bellary',
  'E046': 'HKE Sir M Visvesvaraya College of Engineering, Raichur',
  'E047': 'Veerappa Nisty Engineering College, Shorapur',
  'E048': 'Ballari Institute of Technology and Management, Ballari',
  'E049': 'Proudhadevaraya Institute of Technology, Hospet',
  'E050': 'CMR Institute of Technology, Bangalore',
  'E051': 'Cambridge Institute of Technology, Bangalore',
  'E052': 'New Horizon College of Engineering, Bangalore',
  'E053': 'RNS Institute of Technology, Bangalore',
  'E054': 'K V G College of Engineering, Sullia',
  'E055': 'ACS College of Engineering, Bangalore',
  'E056': 'Nitte Meenakshi Institute of Technology, Bangalore',
  'E057': 'Acharya Institute of Technology, Bangalore',
  'E058': 'Global Academy of Technology, Bangalore',
  'E059': 'East West Institute of Technology, Bangalore',
  'E060': 'The Oxford College of Engineering, Bangalore',
  'E061': 'Gopalan College of Engineering, Bangalore',
  'E062': 'Alpha College of Engineering, Bangalore',
  'E063': 'AMC Engineering College, Bangalore',
  'E064': 'BNM Institute of Technology, Bangalore',
  'E065': 'Christ University, Bangalore',
  'E066': 'Garden City College of Science and Management Studies, Bangalore',
  'E067': 'GITAM School of Technology, Bangalore',
  'E068': 'Jain University, Bangalore',
  'E069': 'Mount Carmel College, Bangalore',
  'E070': 'REVA University, Bangalore',
  'E071': 'Vijayanagar College of Engineering, Hospet',
  'E072': 'T John Institute of Technology, Bangalore',
  'E073': 'Impact Engineering College, Bangalore',
  'E074': 'Atria Institute of Technology, Bangalore',
  // RV University and variants 
  'E285': 'RV University, Bangalore',
  'E286': 'RV College of Architecture, Bangalore',
  'E295': 'RV Institute of Technology and Management, Bangalore',
  // More colleges...
  'E100': 'Don Bosco Institute of Technology, Bangalore',
  'E101': 'Dr. Ambedkar Institute of Technology, Bangalore',
  'E102': 'Presidency College, Bangalore',
  'E103': 'St. Joseph Engineering College, Mangalore',
  'E104': 'Canara Engineering College, Mangalore',
  'E105': 'Mangalore Institute of Technology and Engineering, Mangalore',
  'E106': 'NMAM Institute of Technology, Nitte',
  'E107': 'Shri Madhwa Vadiraja Institute of Technology, Udupi',
  'E108': 'Sahyadri College of Engineering and Management, Mangalore',
  'E109': 'Yenepoya Institute of Technology, Mangalore',
  'E110': 'Alvas Institute of Engineering and Technology, Moodbidri',
};

// ============= Name Normalization =============
/**
 * Normalize college name for matching
 * Handles: RV/R.V./R V, various abbreviations, etc.
 */
function normalizeCollegeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/r\s*\.\s*v\s*\./gi, 'rv')  // R.V. or R. V. -> rv
    .replace(/r\s+v\s/gi, 'rv ')          // R V -> rv
    .replace(/b\s*\.\s*m\s*\.\s*s\s*\./gi, 'bms') // B.M.S. -> bms
    .replace(/m\s*\.\s*s\s*\./gi, 'ms')   // M.S. -> ms
    .replace(/p\s*\.\s*e\s*\.\s*s\s*\./gi, 'pes') // P.E.S. -> pes
    .replace(/[^a-z0-9\s]/g, '')          // Remove special chars
    .replace(/\s+/g, ' ')                 // Normalize spaces
    .trim();
}

// College aliases for search (multiple search terms -> E-code)
const COLLEGE_ALIASES: Record<string, string[]> = {
  // RV University (most requested)
  'E285': ['rv university', 'rvuniversity', 'rvu', 'r v university', 'rv uni', 'rvuniverse'],
  'E005': ['rv college', 'rvce', 'r v college', 'rv college of engineering', 'rvce bangalore', 'r.v. college'],
  'E295': ['rvitm', 'rv institute', 'rv institute of technology', 'rv itm', 'rv institute technology management'],
  // Top colleges
  'E001': ['uvce', 'visvesvaraya', 'university visvesvaraya', 'vtu uvce'],
  'E003': ['bms', 'bmsce', 'bms college', 'bms engineering'],
  'E006': ['msrit', 'ramaiah', 'ms ramaiah', 'ramaiah tech', 'm s ramaiah'],
  'E009': ['pes', 'pes university', 'pesu', 'pes bangalore'],
  'E016': ['sit', 'siddaganga', 'sit tumkur', 'siddaganga tumkur'],
  'E021': ['sjce', 'jss mysore', 'sjce mysore', 'jss college engineering'],
  'E022': ['nie', 'national institute of engineering', 'nie mysore'],
  'E024': ['mce', 'malnad', 'mce hassan', 'malnad hassan'],
  'E034': ['sdm', 'sdm dharwad', 'sdmce'],
  'E036': ['kle', 'kle tech', 'kletech', 'kle university', 'kle technological'],
  'E037': ['gogte', 'git belgaum', 'kls gogte', 'gogte tech'],
  'E007': ['dsce', 'dayananda sagar', 'daysagar', 'dayanand sagar'],
  'E050': ['cmr', 'cmrit', 'cmr institute'],
  'E052': ['new horizon', 'nhce', 'new horizon college'],
  'E053': ['rns', 'rnsit', 'rns institute'],
  'E057': ['acharya', 'ait', 'acharya institute'],
  'E065': ['christ', 'christ university'],
  'E068': ['jain', 'jain university'],
  'E070': ['reva', 'reva university'],
};

// ============= KCET Categories =============
const KCET_CATEGORIES = [
  'GM', 'GMK', 'GMR',
  '1G', '1K', '1R',
  '2AG', '2AK', '2AR',
  '2BG', '2BK', '2BR',
  '3AG', '3AK', '3AR',
  '3BG', '3BK', '3BR',
  'SCG', 'SCK', 'SCR',
  'STG', 'STK', 'STR',
  'PHG', 'PHK', 'PHR', // Physically handicapped
  'EWG', 'EWK', 'EWR', // EWS
];

// ============= PDF Parsing =============
/**
 * Parse KCET cutoff PDF text into structured data
 * Handles the official KCET format with College: EXXX Name header
 */
export function parsePdfCollegeData(pdfText: string): ParsedCollegeEntry[] {
  const entries: ParsedCollegeEntry[] = [];
  
  console.log('Starting KCET PDF parsing...');
  console.log('PDF text length:', pdfText.length);
  
  // Method 1: Look for "College:" markers (official KCET format)
  const collegeSections = pdfText.split(/College:\s*/i);
  console.log(`Found ${collegeSections.length - 1} college sections via "College:" split`);
  
  for (let i = 1; i < collegeSections.length; i++) {
    const section = collegeSections[i];
    
    // Extract college code (E001, E002, etc.)
    const codeMatch = section.match(/^(E\d{3})/);
    if (!codeMatch) continue;
    
    const collegeCode = codeMatch[1];
    
    // Get college name from mapping or extract from text
    let collegeName = COLLEGE_CODES[collegeCode];
    if (!collegeName) {
      const nameMatch = section.match(/^E\d{3}\s+(.+?)(?=Course Name|CSE|ECE|ME|CV|EE|IS|AI|$)/is);
      collegeName = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim().substring(0, 100) : collegeCode;
    }
    
    // Extract courses and cutoffs
    parseSectionCutoffs(section, collegeCode, collegeName, entries);
  }
  
  // Method 2: Look for E-codes directly with cutoff patterns
  const eCodePattern = /\b(E\d{3})\b/g;
  let match;
  const foundCodes = new Set<string>();
  
  while ((match = eCodePattern.exec(pdfText)) !== null) {
    const code = match[1];
    if (foundCodes.has(code)) continue;
    foundCodes.add(code);
    
    // Look for cutoff data near this code
    const startIdx = Math.max(0, match.index - 50);
    const endIdx = Math.min(pdfText.length, match.index + 500);
    const context = pdfText.substring(startIdx, endIdx);
    
    parseContextCutoffs(context, code, entries);
  }
  
  // Method 3: Parse tabular data with lines containing ranks after category codes
  // This handles 2024 PDF format better
  const lines = pdfText.split('\n');
  let currentCollegeCode: string | null = null;
  let currentCollegeName: string | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line contains E-code
    const codeMatch = line.match(/\b(E\d{3})\b/);
    if (codeMatch) {
      currentCollegeCode = codeMatch[1];
      currentCollegeName = COLLEGE_CODES[currentCollegeCode] || currentCollegeCode;
    }
    
    // Check if line contains category and ranks
    if (currentCollegeCode) {
      for (const category of KCET_CATEGORIES) {
        if (line.includes(category)) {
          // Extract all 4-6 digit numbers as potential ranks
          const ranks = line.match(/\b(\d{4,6})\b/g);
          if (ranks) {
            ranks.forEach(rankStr => {
              const rank = parseInt(rankStr);
              if (rank >= 100 && rank <= 200000) {
                entries.push({
                  code: currentCollegeCode!,
                  name: currentCollegeName!,
                  branch: 'Engineering',
                  category,
                  cutoffRank: rank,
                });
              }
            });
          }
        }
      }
    }
  }
  
  // Deduplicate entries
  const seen = new Set<string>();
  const uniqueEntries = entries.filter(e => {
    const key = `${e.code}|${e.branch}|${e.category}|${e.cutoffRank}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  console.log(`Parsed ${uniqueEntries.length} unique cutoff entries`);
  pdfCollegeData = uniqueEntries;
  return uniqueEntries;
}

/**
 * Parse cutoffs from a college section
 */
function parseSectionCutoffs(
  section: string, 
  collegeCode: string, 
  collegeName: string, 
  entries: ParsedCollegeEntry[]
): void {
  // Extract course names from "Course Name" header
  const courseMatch = section.match(/Course Name\s+(.+?)(?=\n\s*(?:GM|1G|2A|2B|3A|3B|SC|ST|--|PH|EW|\d{3,6}))/is);
  let courses: string[] = [];
  
  if (courseMatch) {
    const courseText = courseMatch[1].replace(/\s+/g, ' ').trim();
    // Extract course names
    courses = extractCourseNames(courseText);
  }
  
  if (courses.length === 0) {
    courses = ['Engineering'];
  }
  
  // Find category rows and extract ranks
  for (const category of KCET_CATEGORIES) {
    const catPattern = new RegExp(`\\b${category}\\b[\\s\\d\\-\\.NA]+`, 'gi');
    const matches = section.matchAll(catPattern);
    
    for (const match of matches) {
      const line = match[0];
      const ranks = line.match(/\b(\d{4,6})\b/g);
      
      if (ranks) {
        ranks.forEach((rankStr, idx) => {
          const rank = parseInt(rankStr);
          if (rank >= 100 && rank <= 500000) {
            const course = courses[Math.min(idx, courses.length - 1)] || courses[0];
            entries.push({
              code: collegeCode,
              name: collegeName,
              branch: course,
              category,
              cutoffRank: rank,
            });
          }
        });
      }
    }
  }
}

/**
 * Parse cutoffs from context around an E-code
 */
function parseContextCutoffs(
  context: string,
  collegeCode: string,
  entries: ParsedCollegeEntry[]
): void {
  const collegeName = COLLEGE_CODES[collegeCode] || collegeCode;
  
  // Look for category + rank patterns
  for (const category of KCET_CATEGORIES) {
    const catPattern = new RegExp(`${category}[:\\s]+?(\\d{4,6})`, 'gi');
    let match;
    while ((match = catPattern.exec(context)) !== null) {
      const rank = parseInt(match[1]);
      if (rank >= 100 && rank <= 500000) {
        entries.push({
          code: collegeCode,
          name: collegeName,
          branch: 'Engineering',
          category,
          cutoffRank: rank,
        });
      }
    }
  }
}

/**
 * Extract course names from text
 * Handles various formats: full names, abbreviations, BW (B.Tech) prefixes
 */
function extractCourseNames(text: string): string[] {
  const courses: string[] = [];
  
  // First, check for B.Tech/BW prefixed courses (e.g., "BW B.Tech in CS", "BW Computer Science")
  const btechPatterns = [
    /BW\s+(?:B\.?\s*Tech\s+)?(?:in\s+)?(?:COMPUTER\s*SCIENCE|CS|CSE)/i,
    /BW\s+(?:B\.?\s*Tech\s+)?(?:in\s+)?(?:ELECTRONICS|EC|ECE)/i,
    /BW\s+(?:B\.?\s*Tech\s+)?(?:in\s+)?(?:MECHANICAL|ME)/i,
    /BW\s+(?:B\.?\s*Tech\s+)?(?:in\s+)?(?:CIVIL|CV)/i,
    /BW\s+(?:B\.?\s*Tech\s+)?(?:in\s+)?(?:ARTIFICIAL\s*INTELLIGENCE|AI|AIML)/i,
    /BW\s+(?:B\.?\s*Tech\s+)?(?:in\s+)?(?:DATA\s*SCIENCE|DS)/i,
    /BW\s+(?:B\.?\s*Tech\s+)?(?:in\s+)?(?:INFORMATION\s*(?:SCIENCE|TECHNOLOGY)|IS|IT)/i,
    /B\.?\s*Tech\s+(?:in\s+)?(?:COMPUTER\s*SCIENCE|CS|CSE)/i,
    /B\.?\s*Tech\s+(?:in\s+)?(?:ELECTRONICS|EC|ECE)/i,
    /B\.?\s*Tech\s+(?:in\s+)?(?:MECHANICAL|ME)/i,
    /B\.?\s*Tech\s+(?:in\s+)?(?:CIVIL|CV)/i,
  ];
  
  for (const pattern of btechPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalize to standard course name
      const matched = match[0].toUpperCase();
      if (matched.includes('COMPUTER') || matched.includes('CS')) {
        courses.push('Computer Science and Engineering');
      } else if (matched.includes('ELECTRONICS') || matched.includes('EC')) {
        courses.push('Electronics and Communication Engineering');
      } else if (matched.includes('MECHANICAL') || matched.includes('ME')) {
        courses.push('Mechanical Engineering');
      } else if (matched.includes('CIVIL') || matched.includes('CV')) {
        courses.push('Civil Engineering');
      } else if (matched.includes('ARTIFICIAL') || matched.includes('AI')) {
        courses.push('Artificial Intelligence and Machine Learning');
      } else if (matched.includes('DATA')) {
        courses.push('Data Science');
      } else if (matched.includes('INFORMATION') || matched.includes('IS') || matched.includes('IT')) {
        courses.push('Information Science and Engineering');
      }
    }
  }
  
  // If no B.Tech patterns matched, try standard patterns
  if (courses.length === 0) {
    const patterns = [
      /COMPUTER\s*SCIENCE\s*(?:AND\s*)?(?:ENGINEERING|ENGG)?/i,
      /ARTIFICIAL\s*INTELLIGENCE\s*(?:AND\s*)?(?:MACHINE\s*LEARNING)?/i,
      /DATA\s*SCIENCE/i,
      /CYBER\s*SECURITY/i,
      /INFORMATION\s*(?:SCIENCE|TECHNOLOGY)/i,
      /ELECTRONICS\s*(?:AND\s*)?(?:COMMUNICATION|TELECOMM)/i,
      /ELECTRICAL\s*(?:AND\s*)?(?:ELECTRONICS)?(?:\s*ENGINEERING)?/i,
      /MECHANICAL\s*(?:ENGINEERING)?/i,
      /CIVIL\s*(?:ENGINEERING)?/i,
      /AEROSPACE/i,
      /AERONAUTICAL/i,
      /BIOTECHNOLOGY/i,
      /CHEMICAL\s*(?:ENGINEERING)?/i,
      /ROBOTICS/i,
      /AUTOMATION/i,
      /\bCSE?\b/i,
      /\bECE?\b/i,
      /\bME\b/i,
      /\bCV\b/i,
      /\bIS[E]?\b/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && !courses.some(c => c.toLowerCase().includes(match[0].toLowerCase().slice(0, 10)))) {
        // Expand abbreviations to full names
        let courseName = match[0].trim();
        if (/^CSE?$/i.test(courseName)) courseName = 'Computer Science and Engineering';
        if (/^ECE?$/i.test(courseName)) courseName = 'Electronics and Communication Engineering';
        if (/^ME$/i.test(courseName)) courseName = 'Mechanical Engineering';
        if (/^CV$/i.test(courseName)) courseName = 'Civil Engineering';
        if (/^IS[E]?$/i.test(courseName)) courseName = 'Information Science and Engineering';
        courses.push(courseName);
      }
    }
  }
  
  return courses;
}

/**
 * Normalize category to standard format
 */
function normalizeCategory(cat: string): string {
  const c = cat.toUpperCase().trim();
  // Add 'G' suffix if not present (convert 1 -> 1G, 2A -> 2AG, etc.)
  if (['1', '2A', '2B', '3A', '3B', 'GM', 'SC', 'ST'].includes(c)) {
    return c + 'G';
  }
  return c;
}

// ============= Search Functions =============
/**
 * Search for colleges in the parsed PDF data by rank
 */
export function searchPdfColleges(
  rank: number,
  category: string,
  course: string,
  location: string
): CollegeRecommendation[] {
  const results: CollegeRecommendation[] = [];
  const normCat = normalizeCategory(category);
  const courseLower = course.toLowerCase();
  const locationLower = location.toLowerCase();
  
  // Filter by matching criteria
  const matching = pdfCollegeData.filter(entry => {
    // Category match (GM matches GM, GMK, GMR)
    const catBase = normCat.replace(/[KR]$/, '');
    if (!entry.category.startsWith(catBase) && entry.category !== normCat) {
      return false;
    }
    
    // Course match (fuzzy)
    const branchLower = entry.branch.toLowerCase();
    if (courseLower.includes('cs') || courseLower.includes('computer')) {
      if (!branchLower.includes('computer') && !branchLower.includes('cs') && !branchLower.includes('aiml') && !branchLower.includes('data')) {
        return false;
      }
    } else if (courseLower.includes('ec') || courseLower.includes('electronics')) {
      if (!branchLower.includes('electron') && !branchLower.includes('ec') && !branchLower.includes('communication')) {
        return false;
      }
    } else if (courseLower.includes('me') || courseLower.includes('mechanical')) {
      if (!branchLower.includes('mechanical')) return false;
    } else if (courseLower.includes('cv') || courseLower.includes('civil')) {
      if (!branchLower.includes('civil')) return false;
    }
    
    // Location match (if specified)
    if (locationLower && locationLower !== 'anywhere' && locationLower !== 'karnataka' && locationLower !== 'any') {
      const collegeLoc = extractLocation(entry.name).toLowerCase();
      if (!collegeLoc.includes(locationLower) && !entry.name.toLowerCase().includes(locationLower)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Group by college+branch and calculate chance
  const collegeMap = new Map<string, ParsedCollegeEntry[]>();
  matching.forEach(entry => {
    const key = `${entry.code}|${entry.branch}`;
    if (!collegeMap.has(key)) collegeMap.set(key, []);
    collegeMap.get(key)!.push(entry);
  });
  
  // Convert to recommendations
  collegeMap.forEach((entries, _key) => {
    // Get lowest cutoff (best chance)
    const lowestCutoff = Math.min(...entries.map(e => e.cutoffRank));
    const entry = entries.find(e => e.cutoffRank === lowestCutoff)!;
    
    // Calculate chance based on rank vs cutoff
    const diff = lowestCutoff - rank;
    let chance: 'High' | 'Medium' | 'Low' = 'Low';
    
    if (diff >= 5000) {
      chance = 'High';  // Cutoff is 5000+ higher than rank - very safe
    } else if (diff >= 0) {
      chance = 'Medium'; // Cutoff is higher but close
    } else if (diff >= -3000) {
      chance = 'Low';   // Rank is higher than cutoff - risky
    }
    
    results.push({
      collegeName: entry.name,
      collegeCode: entry.code,
      branch: entry.branch,
      cutoff2025: String(lowestCutoff),
      cutoff2024: 'N/A',
      chance,
      location: extractLocation(entry.name),
    });
  });
  
  // Sort by chance: Medium first, then High, then Low (default sort)
  return results.sort((a, b) => {
    const order = { 'Medium': 0, 'High': 1, 'Low': 2 };
    return order[a.chance] - order[b.chance];
  });
}

/**
 * Search for a specific college by name in PDF data
 */
export function searchPdfByCollegeName(
  collegeName: string,
  category: string = 'GM'
): CollegeRecommendation[] {
  const results: CollegeRecommendation[] = [];
  const normCat = normalizeCategory(category);
  const searchNorm = normalizeCollegeName(collegeName);
  
  console.log('Searching for:', collegeName, '-> normalized:', searchNorm);
  
  // Find matching E-codes from aliases
  const matchingCodes: string[] = [];
  
  for (const [code, aliases] of Object.entries(COLLEGE_ALIASES)) {
    for (const alias of aliases) {
      const aliasNorm = normalizeCollegeName(alias);
      if (searchNorm.includes(aliasNorm) || aliasNorm.includes(searchNorm)) {
        if (!matchingCodes.includes(code)) matchingCodes.push(code);
      }
    }
  }
  
  // Also check COLLEGE_CODES directly
  for (const [code, name] of Object.entries(COLLEGE_CODES)) {
    const nameNorm = normalizeCollegeName(name);
    if (nameNorm.includes(searchNorm) || searchNorm.includes(nameNorm.slice(0, 15))) {
      if (!matchingCodes.includes(code)) matchingCodes.push(code);
    }
  }
  
  console.log('Matching E-codes:', matchingCodes);
  
  // Search in PDF data
  const matching = pdfCollegeData.filter(entry => {
    if (matchingCodes.includes(entry.code)) return true;
    
    const entryNorm = normalizeCollegeName(entry.name);
    if (entryNorm.includes(searchNorm) || searchNorm.includes(entryNorm.slice(0, 10))) {
      return true;
    }
    
    return false;
  });
  
  console.log('Found', matching.length, 'entries in PDF data');
  
  // If no PDF data but found matching codes, return from known colleges
  if (matching.length === 0 && matchingCodes.length > 0) {
    matchingCodes.forEach(code => {
      results.push({
        collegeName: COLLEGE_CODES[code] || code,
        collegeCode: code,
        branch: 'Computer Science',
        cutoff2025: 'Upload PDF for cutoffs',
        cutoff2024: 'N/A',
        chance: 'Medium',
        location: extractLocation(COLLEGE_CODES[code] || ''),
      });
    });
    return results;
  }
  
  // Group and return
  const seen = new Set<string>();
  matching.forEach(entry => {
    const key = `${entry.code}|${entry.branch}`;
    if (seen.has(key)) return;
    seen.add(key);
    
    results.push({
      collegeName: entry.name,
      collegeCode: entry.code,
      branch: entry.branch,
      cutoff2025: String(entry.cutoffRank),
      cutoff2024: 'N/A',
      chance: 'Medium',
      location: extractLocation(entry.name),
    });
  });
  
  return results;
}

/**
 * Extract location from college name
 */
function extractLocation(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('bangalore') || n.includes('bengaluru')) return 'Bangalore';
  if (n.includes('mysore') || n.includes('mysuru')) return 'Mysore';
  if (n.includes('mangalore') || n.includes('mangaluru')) return 'Mangalore';
  if (n.includes('hubli') || n.includes('dharwad')) return 'Hubli-Dharwad';
  if (n.includes('belgaum') || n.includes('belagavi')) return 'Belgaum';
  if (n.includes('gulbarga') || n.includes('kalaburagi')) return 'Gulbarga';
  if (n.includes('tumkur') || n.includes('tumakuru')) return 'Tumkur';
  if (n.includes('hassan')) return 'Hassan';
  if (n.includes('bidar')) return 'Bidar';
  if (n.includes('bellary') || n.includes('ballari')) return 'Bellary';
  if (n.includes('raichur')) return 'Raichur';
  if (n.includes('udupi')) return 'Udupi';
  if (n.includes('sullia')) return 'Sullia';
  if (n.includes('nitte')) return 'Nitte';
  if (n.includes('mandya')) return 'Mandya';
  if (n.includes('kgf')) return 'KGF';
  if (n.includes('hospe') || n.includes('hospet')) return 'Hospet';
  return 'Karnataka';
}

// ============= Utility Functions =============
export function hasPdfData(): boolean {
  return pdfCollegeData.length > 0;
}

export function getPdfCollegeCount(): number {
  return pdfCollegeData.length;
}

export function clearPdfData(): void {
  pdfCollegeData = [];
}

export function getAllPdfData(): ParsedCollegeEntry[] {
  return pdfCollegeData;
}

// Export for database storage
export function getCollegeCodesMapping(): Record<string, string> {
  return COLLEGE_CODES;
}

export function getCollegeAliases(): Record<string, string[]> {
  return COLLEGE_ALIASES;
}

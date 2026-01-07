
import { CollegeRecommendation, KcetData } from "../types";
import { KCET_DATA } from "../collegeData";

// --- Tool Implementations ---

const normalizeLocation = (loc: string): string => loc.toLowerCase().trim();
const normalizeCategory = (cat: string): string => {
  let c = cat.toUpperCase().trim();
  // Default to General if suffix is missing for common categories
  if (['1', '2A', '2B', '3A', '3B', 'GM', 'SC', 'ST'].includes(c)) {
      return c + 'G'; // e.g., 2A -> 2AG
  }
  return c;
};

// Remove special characters, spaces, dots for fuzzy matching
const normalizeForSearch = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

// Helper to determine if a branch matches the user's course request
const isBranchMatch = (branchName: string, courseInput: string): boolean => {
  const bLower = branchName.toLowerCase();
  const cLower = courseInput.toLowerCase().replace(/[^a-z0-9]/g, '');

  // CS / Computer Science matchers
  // Added "bw b tech" and generic inclusions to catch variations like "BW B Tech in CS"
  if (['cs', 'cse', 'computer', 'computerscience'].includes(cLower)) {
    return (
      bLower.startsWith('cs ') || 
      bLower.includes('computer') || 
      bLower.includes('computing') || 
      bLower.includes('artificial') || 
      bLower.includes('data') || 
      bLower.includes('cyber') ||
      bLower.includes('information science') ||
      bLower.startsWith('is ') || 
      bLower.startsWith('it ') ||
      (bLower.includes('cs') && bLower.includes('tech')) // Matches "BW B Tech in CS"
    );
  }

  // IS / Information Science
  if (['is', 'ise', 'it', 'information', 'informationscience'].includes(cLower)) {
    return bLower.startsWith('is ') || bLower.startsWith('it ') || bLower.includes('information');
  }

  // EC / Electronics
  if (['ec', 'ece', 'electronics'].includes(cLower)) {
    return (
      bLower.startsWith('ec ') || 
      bLower.startsWith('ee ') || 
      bLower.includes('electronics') || 
      bLower.includes('communication') ||
      bLower.includes('telecommunication')
    );
  }

  // Mech
  if (['me', 'mech', 'mechanical'].includes(cLower)) {
    return bLower.startsWith('me ') || bLower.includes('mechanical') || bLower.includes('automobile') || bLower.includes('robotics');
  }

  // Civil
  if (['cv', 'civil', 'ce'].includes(cLower)) {
    return bLower.startsWith('cv ') || bLower.startsWith('ce ') || bLower.includes('civil') || bLower.includes('construction');
  }

  // Default fuzzy match
  return bLower.includes(cLower) || bLower.includes(courseInput.toLowerCase());
};

// Helper to get range string (e.g., "12000 - 15400") from R1, R2, R3
const getCutoffRange = (branchData: any, year: string, category: string): { range: string, sortValue: number } => {
  if (!branchData || !branchData[year]) return { range: "N/A", sortValue: 999999 };
  
  const cutoffs: number[] = [];
  const rounds = ['R1', 'R2', 'R3'];
  
  rounds.forEach(r => {
    if (branchData[year][r] && branchData[year][r][category]) {
      cutoffs.push(branchData[year][r][category]);
    }
  });

  if (cutoffs.length === 0) return { range: "N/A", sortValue: 999999 };

  const min = Math.min(...cutoffs);
  const max = Math.max(...cutoffs);

  // Return best rank for sorting logic
  const sortValue = min; 

  if (min === max) return { range: `${min}`, sortValue };
  return { range: `${min} - ${max}`, sortValue };
};

export const findMatchingColleges = (
  rank: number,
  category: string,
  course: string,
  location: string
): CollegeRecommendation[] => {
  const normLoc = normalizeLocation(location);
  const normCat = normalizeCategory(category);
  
  const recommendations: CollegeRecommendation[] = [];
  const data = KCET_DATA as KcetData;

  Object.values(data.colleges).forEach((college) => {
    // Location Filter
    if (normLoc && normLoc !== 'karnataka' && normLoc !== 'anywhere') {
        if (!college.name.toLowerCase().includes(normLoc)) return;
    }

    Object.entries(college.branches).forEach(([branchName, branchData]) => {
        if (!isBranchMatch(branchName, course)) return;

        const data2025 = getCutoffRange(branchData, '2025', normCat);
        const data2024 = getCutoffRange(branchData, '2024', normCat);

        // We need at least one cutoff to recommend
        if (data2025.sortValue === 999999 && data2024.sortValue === 999999) return;

        const refCutoff = data2025.sortValue !== 999999 ? data2025.sortValue : data2024.sortValue;
        const margin = refCutoff - rank;
        
        let chance: 'High' | 'Medium' | 'Low' = 'Low';
        if (margin >= 2000) chance = 'High';       
        else if (margin >= 0) chance = 'Medium';   
        else chance = 'Low';                       

        recommendations.push({
            collegeName: college.name,
            branch: branchName,
            cutoff2025: data2025.range,
            cutoff2024: data2024.range,
            chance,
            location: college.name.includes("Bangalore") ? "Bangalore" : "Karnataka"
        });
    });
  });

  // Sort by priority range (+/- 2000) then by closeness to rank
  // Note: Since we are using ranges now, the sorting logic uses the 'min' value of the range found
  return recommendations.sort((a, b) => {
     // Helper to parse min value from string "1000 - 2000" or "1000"
     const getMin = (rangeStr: string) => {
        if(rangeStr === "N/A") return 999999;
        const parts = rangeStr.split(' - ');
        return parseInt(parts[0]);
     };

     const valA = getMin(a.cutoff2025) !== 999999 ? getMin(a.cutoff2025) : getMin(a.cutoff2024);
     const valB = getMin(b.cutoff2025) !== 999999 ? getMin(b.cutoff2025) : getMin(b.cutoff2024);
     
     const diffA = valA - rank;
     const diffB = valB - rank;
     
     const priorityRange = 2000;
     const isPriorityA = Math.abs(diffA) <= priorityRange;
     const isPriorityB = Math.abs(diffB) <= priorityRange;

     if (isPriorityA && !isPriorityB) return -1;
     if (!isPriorityA && isPriorityB) return 1;

     return Math.abs(diffA) - Math.abs(diffB);
  });
};

export const getSpecificCollegeCutoff = (collegeName: string, category: string, course: string): any => {
    const searchName = normalizeForSearch(collegeName);
    const normCat = normalizeCategory(category);
    
    const data = KCET_DATA as KcetData;
    const college = Object.values(data.colleges).find(c => normalizeForSearch(c.name).includes(searchName));
    
    if (!college) return { error: `College '${collegeName}' not found.` };

    const matchingBranches = Object.entries(college.branches).filter(([bName]) => 
        isBranchMatch(bName, course)
    );

    if (matchingBranches.length === 0) return { error: `No data for ${course} in ${college.name}` };

    const results = matchingBranches.map(([bName, bData]) => {
        return {
            branch: bName,
            cutoff2025: getCutoffRange(bData, '2025', normCat).range,
            cutoff2024: getCutoffRange(bData, '2024', normCat).range
        };
    });

    return {
        collegeName: college.name,
        category: normCat,
        data: results
    };
}

export const toolsDeclaration: any[] = [
  {
    functionDeclarations: [
      {
        name: "extract_pdf_data",
        description: "Checks if a PDF is loaded.",
        parameters: {
          type: "OBJECT",
          properties: {
            fileName: { type: "STRING", description: "The name of the file." }
          },
          required: ["fileName"]
        }
      },
      {
        name: "find_matching_colleges",
        description: "Finds colleges based on rank, category, course (e.g., 'CS', 'EC'), and location.",
        parameters: {
          type: "OBJECT",
          properties: {
            rank: { type: "NUMBER", description: "Student's rank" },
            category: { type: "STRING", description: "Student's category (e.g., GM, 2AG, 3BG)" },
            course: { type: "STRING", description: "Preferred branch code or name (e.g. 'CS' for Computer Science, 'EC' for Electronics)" },
            location: { type: "STRING", description: "Preferred location (e.g., Bangalore)" }
          },
          required: ["rank", "category", "course", "location"]
        }
      },
      {
        name: "get_specific_college_cutoff",
        description: "Gets the cutoff for a specific college for 2024 and 2025.",
        parameters: {
          type: "OBJECT",
          properties: {
            collegeName: { type: "STRING", description: "Name of the college (e.g., 'RV College', 'BMS')" },
            category: { type: "STRING", description: "Student category" },
            course: { type: "STRING", description: "Course branch" }
          },
          required: ["collegeName", "category", "course"]
        }
      }
    ]
  }
];

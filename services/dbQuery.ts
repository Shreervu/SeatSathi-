import { db, normalizeCategory, mapCourseToCategory, CutoffRecord } from './database';
import { CollegeRecommendation } from '../types';

export interface QueryResult {
  recommendations: CollegeRecommendation[];
  queryTimeMs: number;
  totalRecordsScanned: number;
}

export async function findMatchingCollegesFast(
  rank: number,
  category: string,
  course: string,
  location: string
): Promise<QueryResult> {
  const startTime = performance.now();
  
  const normCat = normalizeCategory(category);
  const courseCategories = mapCourseToCategory(course);
  const normLoc = location.toLowerCase().trim();
  
  // Build query based on filters
  let query = db.cutoffs.where('branchCategory').anyOf(courseCategories);
  
  // Location filter (if not "anywhere" or "karnataka")
  const filterByLocation = normLoc && normLoc !== 'karnataka' && normLoc !== 'anywhere';
  
  // Get matching cutoffs from database
  let cutoffs: CutoffRecord[];
  
  if (filterByLocation) {
    // Use compound index for location + category
    // Check if stored location matches or contains the search term
    cutoffs = await db.cutoffs
      .where('branchCategory')
      .anyOf(courseCategories)
      .and(record => record.location === normLoc || record.location.includes(normLoc) || normLoc.includes(record.location))
      .and(record => record.category === normCat)
      .toArray();
  } else {
    // Just filter by course and category
    cutoffs = await db.cutoffs
      .where('branchCategory')
      .anyOf(courseCategories)
      .and(record => record.category === normCat)
      .toArray();
  }
  
  const totalRecordsScanned = cutoffs.length;
  
  // Group cutoffs by college+branch to get best cutoff per college-branch pair
  const collegeMap = new Map<string, {
    collegeName: string;
    branchName: string;
    branchNormalized: string;
    isPure: boolean;
    location: string;
    cutoffs2024: number[];
    cutoffs2025: number[];
  }>();
  
  cutoffs.forEach(record => {
    const key = `${record.collegeName}|${record.branchNormalized}`;
    
    if (!collegeMap.has(key)) {
      collegeMap.set(key, {
        collegeName: record.collegeName,
        branchName: record.branchName,
        branchNormalized: record.branchNormalized,
        isPure: record.isPure,
        location: record.location,
        cutoffs2024: [],
        cutoffs2025: []
      });
    }
    
    const entry = collegeMap.get(key)!;
    if (record.year === '2024') {
      entry.cutoffs2024.push(record.cutoffRank);
    } else if (record.year === '2025') {
      entry.cutoffs2025.push(record.cutoffRank);
    }
  });
  
  // Convert to recommendations
  const recommendations: CollegeRecommendation[] = [];
  
  collegeMap.forEach((data, key) => {
    // Calculate cutoff ranges
    const getCutoffRange = (cutoffs: number[]): { range: string; sortValue: number } => {
      if (cutoffs.length === 0) return { range: 'N/A', sortValue: 999999 };
      const min = Math.min(...cutoffs);
      const max = Math.max(...cutoffs);
      return {
        range: min === max ? `${min}` : `${min} - ${max}`,
        sortValue: min
      };
    };
    
    const cutoff2024 = getCutoffRange(data.cutoffs2024);
    const cutoff2025 = getCutoffRange(data.cutoffs2025);
    
    // Need at least one cutoff
    if (cutoff2024.sortValue === 999999 && cutoff2025.sortValue === 999999) return;
    
    // Calculate chance
    const refCutoff = cutoff2025.sortValue !== 999999 ? cutoff2025.sortValue : cutoff2024.sortValue;
    const diff = refCutoff - rank;
    
    let chance: 'High' | 'Medium' | 'Low' = 'Low';
    if (diff >= 1000) {
      chance = 'High';
    } else if (diff >= -1000 && diff < 1000) {
      chance = 'Medium';
    }
    
    // Derive location display
    const locationDisplay = data.location === 'bangalore' ? 'Bangalore' : 
                           data.location.charAt(0).toUpperCase() + data.location.slice(1);
    
    recommendations.push({
      collegeName: data.collegeName,
      branch: data.branchName,
      cutoff2025: cutoff2025.range,
      cutoff2024: cutoff2024.range,
      chance,
      location: locationDisplay,
      isPure: data.isPure
    });
  });
  
  // Sort: Pure branches first, then by chance
  recommendations.sort((a, b) => {
    // Priority 1: Pure branches first
    const aIsPure = (a as any).isPure ? 1 : 0;
    const bIsPure = (b as any).isPure ? 1 : 0;
    if (aIsPure !== bIsPure) return bIsPure - aIsPure;
    
    // Priority 2: Higher chance first
    const chanceOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const chanceDiff = chanceOrder[a.chance] - chanceOrder[b.chance];
    if (chanceDiff !== 0) return chanceDiff;
    
    // Priority 3: Alphabetical by college name
    return a.collegeName.localeCompare(b.collegeName);
  });
  
  const endTime = performance.now();
  
  return {
    recommendations,
    queryTimeMs: Math.round((endTime - startTime) * 100) / 100,
    totalRecordsScanned
  };
}

/**
 * Get specific college cutoff using fast indexed query
 */
export async function getSpecificCollegeCutoffFast(
  collegeName: string,
  category: string,
  course: string
): Promise<any> {
  const startTime = performance.now();
  
  const normCat = normalizeCategory(category);
  const courseCategories = mapCourseToCategory(course);
  const searchName = collegeName.toLowerCase();
  
  // Find college by name (partial match)
  const cutoffs = await db.cutoffs
    .where('branchCategory')
    .anyOf(courseCategories)
    .and(record => record.collegeName.toLowerCase().includes(searchName))
    .and(record => record.category === normCat)
    .toArray();
  
  if (cutoffs.length === 0) {
    return { error: `No data found for ${collegeName} in ${course}` };
  }
  
  // Group by branch
  const branchMap = new Map<string, { branch: string; cutoffs2024: number[]; cutoffs2025: number[] }>();
  
  cutoffs.forEach(record => {
    if (!branchMap.has(record.branchName)) {
      branchMap.set(record.branchName, { branch: record.branchName, cutoffs2024: [], cutoffs2025: [] });
    }
    const entry = branchMap.get(record.branchName)!;
    if (record.year === '2024') entry.cutoffs2024.push(record.cutoffRank);
    if (record.year === '2025') entry.cutoffs2025.push(record.cutoffRank);
  });
  
  const results = Array.from(branchMap.values()).map(data => {
    const getRange = (arr: number[]) => {
      if (arr.length === 0) return 'N/A';
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      return min === max ? `${min}` : `${min} - ${max}`;
    };
    
    return {
      branch: data.branch,
      cutoff2025: getRange(data.cutoffs2025),
      cutoff2024: getRange(data.cutoffs2024)
    };
  });
  
  const endTime = performance.now();
  
  return {
    collegeName: cutoffs[0]?.collegeName || collegeName,
    category: normCat,
    data: results,
    queryTimeMs: Math.round((endTime - startTime) * 100) / 100
  };
}

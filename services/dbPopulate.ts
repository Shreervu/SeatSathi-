import { db, CollegeRecord, BranchRecord, CutoffRecord, extractLocation, getLocationKeywords, normalizeBranchName } from './database';
import { KcetData } from '../types';

async function loadKCETData() {
  const { loadKCETData: lazyLoad } = await import('../KCETcutoffdata/collegeDataLazy');
  return lazyLoad();
}

export async function populateDatabase(): Promise<{ success: boolean; stats: { colleges: number; branches: number; cutoffs: number }; timeMs: number }> {
  const startTime = performance.now();
  
  try {
    // Clear existing data
    await db.colleges.clear();
    await db.branches.clear();
    await db.cutoffs.clear();
    
    // Lazily load college data
    const KCET_DATA = await loadKCETData();
    const data = KCET_DATA as KcetData;
    
    const collegeRecords: CollegeRecord[] = [];
    const branchRecords: BranchRecord[] = [];
    const cutoffRecords: CutoffRecord[] = [];
    
    // Process each college
    Object.entries(data.colleges).forEach(([code, college]) => {
      const location = extractLocation(college.name);
      const locationKeywords = getLocationKeywords(college.name);
      
      // Add college record
      collegeRecords.push({
        code,
        name: college.name,
        location,
        locationKeywords
      });
      
      // Process each branch
      Object.entries(college.branches).forEach(([branchName, branchData]) => {
        const { normalized, category, isPure } = normalizeBranchName(branchName);
        
        // Add branch record
        branchRecords.push({
          collegeCode: code,
          collegeName: college.name,
          branchName,
          branchNormalized: normalized,
          branchCategory: category,
          isPure,
          location
        });
        
        // Process each year
        Object.entries(branchData).forEach(([year, yearData]) => {
          // Process each round
          Object.entries(yearData).forEach(([round, roundData]) => {
            if (!roundData) return;
            
            // Process each category cutoff
            Object.entries(roundData).forEach(([cat, cutoffRank]) => {
              if (typeof cutoffRank !== 'number') return;
              
              cutoffRecords.push({
                collegeCode: code,
                collegeName: college.name,
                branchName,
                branchNormalized: normalized,
                branchCategory: category,
                isPure,
                location,
                year,
                round,
                category: cat,
                cutoffRank
              });
            });
          });
        });
      });
    });
    
    // Bulk insert all records (much faster than individual inserts)
    await db.transaction('rw', [db.colleges, db.branches, db.cutoffs], async () => {
      await db.colleges.bulkAdd(collegeRecords);
      await db.branches.bulkAdd(branchRecords);
      await db.cutoffs.bulkAdd(cutoffRecords);
    });
    
    const endTime = performance.now();
    
    return {
      success: true,
      stats: {
        colleges: collegeRecords.length,
        branches: branchRecords.length,
        cutoffs: cutoffRecords.length
      },
      timeMs: Math.round(endTime - startTime)
    };
    
  } catch (error) {
    console.error('Database population error:', error);
    return {
      success: false,
      stats: { colleges: 0, branches: 0, cutoffs: 0 },
      timeMs: 0
    };
  }
}

// Data version - increment this when KCET_DATA changes significantly
// This forces a database repopulation on the client side
const DATA_VERSION = 3; // Incremented again to force repopulate E285 2025 data
const VERSION_KEY = 'kcet_data_version';

/**
 * Check if database needs population and populate if needed
 */
export async function ensureDatabaseReady(): Promise<boolean> {
  try {
    const cutoffCount = await db.cutoffs.count();
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const needsUpdate = !storedVersion || parseInt(storedVersion) < DATA_VERSION;
    
    if (cutoffCount === 0 || needsUpdate) {
      console.log(needsUpdate ? 'Data version changed, repopulating database...' : 'Database empty, populating...');
      const result = await populateDatabase();
      console.log(`Database populated in ${result.timeMs}ms:`, result.stats);
      if (result.success) {
        localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
      }
      return result.success;
    }
    
    console.log(`Database ready with ${cutoffCount} cutoff records (version ${storedVersion})`);
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

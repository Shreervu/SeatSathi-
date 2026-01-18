/**
 * Lazy-loaded College Data
 * This module loads college data on-demand to improve initial page load performance.
 * Instead of loading all 116 college files at startup (causing 75s LCP),
 * data is loaded asynchronously when needed.
 */

import { KCETData, College, Colleges } from './types';
import { metadata } from './metadata';

// Cache for loaded college data
let cachedColleges: Colleges | null = null;
let loadingPromise: Promise<Colleges> | null = null;

function mergeColleges(...parts: Record<string, College>[]): Colleges {
  const result: Colleges = {};
  for (const part of parts) {
    for (const [code, college] of Object.entries(part)) {
      if (result[code]) {
        result[code].branches = { ...result[code].branches, ...college.branches };
      } else {
        result[code] = { ...college };
      }
    }
  }
  return result;
}

/**
 * Lazily loads all college data using dynamic imports.
 * Returns cached data if already loaded.
 */
export async function loadCollegeData(): Promise<Colleges> {
  // Return cached data if available
  if (cachedColleges) {
    return cachedColleges;
  }
  
  // Return existing loading promise if already in progress
  if (loadingPromise) {
    return loadingPromise;
  }
  
  // Start loading all college files in parallel using dynamic imports
  loadingPromise = (async () => {
    const collegeModules = await Promise.all([
      import('./colleges1').then(m => m.colleges1),
      import('./colleges2').then(m => m.colleges2),
      import('./colleges3').then(m => m.colleges3),
      import('./colleges4').then(m => m.colleges4),
      import('./colleges5').then(m => m.colleges5),
      import('./colleges6').then(m => m.colleges6),
      import('./colleges7').then(m => m.colleges7),
      import('./colleges8').then(m => m.colleges8),
      import('./colleges9').then(m => m.colleges9),
      import('./colleges10').then(m => m.colleges10),
      import('./colleges11').then(m => m.colleges11),
      import('./colleges12').then(m => m.colleges12),
      import('./colleges13').then(m => m.colleges13),
      import('./colleges14').then(m => m.colleges14),
      import('./colleges15').then(m => m.colleges15),
      import('./colleges16').then(m => m.colleges16),
      import('./colleges17').then(m => m.colleges17),
      import('./colleges18').then(m => m.colleges18),
      import('./colleges19').then(m => m.colleges19),
      import('./colleges20').then(m => m.colleges20),
      import('./colleges21').then(m => m.colleges21),
      import('./colleges22').then(m => m.colleges22),
      import('./colleges23').then(m => m.colleges23),
      import('./colleges24').then(m => m.colleges24),
      import('./colleges25').then(m => m.colleges25),
      import('./colleges26').then(m => m.colleges26),
      import('./colleges27').then(m => m.colleges27),
      import('./colleges28').then(m => m.colleges28),
      import('./colleges29').then(m => m.colleges29),
      import('./colleges30').then(m => m.colleges30),
      import('./colleges31').then(m => m.colleges31),
      import('./colleges32').then(m => m.colleges32),
      import('./colleges33').then(m => m.colleges33),
      import('./colleges34').then(m => m.colleges34),
      import('./colleges35').then(m => m.colleges35),
      import('./colleges36').then(m => m.colleges36),
      import('./colleges37').then(m => m.colleges37),
      import('./colleges38').then(m => m.colleges38),
      import('./colleges39').then(m => m.colleges39),
      import('./colleges40').then(m => m.colleges40),
      import('./colleges41').then(m => m.colleges41),
      import('./colleges42').then(m => m.colleges42),
      import('./colleges43').then(m => m.colleges43),
      import('./colleges44').then(m => m.colleges44),
      import('./colleges45').then(m => m.colleges45),
      import('./colleges46').then(m => m.colleges46),
      import('./colleges47').then(m => m.colleges47),
      import('./colleges48').then(m => m.colleges48),
      import('./colleges49').then(m => m.colleges49),
      import('./colleges50').then(m => m.colleges50),
      import('./colleges51').then(m => m.colleges51),
      import('./colleges52').then(m => m.colleges52),
      import('./colleges53').then(m => m.colleges53),
      import('./colleges54').then(m => m.colleges54),
      import('./colleges55').then(m => m.colleges55),
      import('./colleges56').then(m => m.colleges56),
      import('./colleges57').then(m => m.colleges57),
      import('./colleges58').then(m => m.colleges58),
      import('./colleges59').then(m => m.colleges59),
      import('./colleges60').then(m => m.colleges60),
      import('./colleges61').then(m => m.colleges61),
      import('./colleges62').then(m => m.colleges62),
      import('./colleges63').then(m => m.colleges63),
      import('./colleges64').then(m => m.colleges64),
      import('./colleges65').then(m => m.colleges65),
      import('./colleges66').then(m => m.colleges66),
      import('./colleges67').then(m => m.colleges67),
      import('./colleges68').then(m => m.colleges68),
      import('./colleges69').then(m => m.colleges69),
      import('./colleges70').then(m => m.colleges70),
      import('./colleges71').then(m => m.colleges71),
      import('./colleges72').then(m => m.colleges72),
      import('./colleges73').then(m => m.colleges73),
      import('./colleges74').then(m => m.colleges74),
      import('./colleges75').then(m => m.colleges75),
      import('./colleges76').then(m => m.colleges76),
      import('./colleges77').then(m => m.colleges77),
      import('./colleges78').then(m => m.colleges78),
      import('./colleges79').then(m => m.colleges79),
      import('./colleges80').then(m => m.colleges80),
      import('./colleges81').then(m => m.colleges81),
      import('./colleges82').then(m => m.colleges82),
      import('./colleges83').then(m => m.colleges83),
      import('./colleges84').then(m => m.colleges84),
      import('./colleges85').then(m => m.colleges85),
      import('./colleges86').then(m => m.colleges86),
      import('./colleges87').then(m => m.colleges87),
      import('./colleges88').then(m => m.colleges88),
      import('./colleges89').then(m => m.colleges89),
      import('./colleges90').then(m => m.colleges90),
      import('./colleges91').then(m => m.colleges91),
      import('./colleges92').then(m => m.colleges92),
      import('./colleges93').then(m => m.colleges93),
      import('./colleges94').then(m => m.colleges94),
      import('./colleges95').then(m => m.colleges95),
      import('./colleges96').then(m => m.colleges96),
      import('./colleges97').then(m => m.colleges97),
      import('./colleges98').then(m => m.colleges98),
      import('./colleges99').then(m => m.colleges99),
      import('./colleges100').then(m => m.colleges100),
      import('./colleges101').then(m => m.colleges101),
      import('./colleges102').then(m => m.colleges102),
      import('./colleges103').then(m => m.colleges103),
      import('./colleges104').then(m => m.colleges104),
      import('./colleges105').then(m => m.colleges105),
      import('./colleges106').then(m => m.colleges106),
      import('./colleges107').then(m => m.colleges107),
      import('./colleges108').then(m => m.colleges108),
      import('./colleges109').then(m => m.colleges109),
      import('./colleges110').then(m => m.colleges110),
      import('./colleges111').then(m => m.colleges111),
      import('./colleges112').then(m => m.colleges112),
      import('./colleges113').then(m => m.colleges113),
      import('./colleges114').then(m => m.colleges114),
      import('./colleges115').then(m => m.colleges115),
      import('./colleges116').then(m => m.colleges116),
    ]);
    
    cachedColleges = mergeColleges(...collegeModules);
    return cachedColleges;
  })();
  
  return loadingPromise;
}

/**
 * Lazily loads the full KCET_DATA object.
 */
export async function loadKCETData(): Promise<KCETData> {
  const colleges = await loadCollegeData();
  return {
    metadata: metadata as unknown as KCETData['metadata'],
    colleges,
  };
}

/**
 * Check if college data has been loaded.
 */
export function isCollegeDataLoaded(): boolean {
  return cachedColleges !== null;
}

/**
 * Get cached college data (returns null if not loaded yet).
 */
export function getCachedCollegeData(): Colleges | null {
  return cachedColleges;
}

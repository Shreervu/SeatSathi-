// KCET Data Types
export interface Cutoffs {
  [category: string]: number;
}

export interface RoundData {
  R1?: Cutoffs;
  R2?: Cutoffs;
  R3?: Cutoffs;
}

export interface YearData {
  [year: string]: RoundData;
}

export interface Branch {
  [branchName: string]: YearData;
}

export interface College {
  code: string;
  name: string;
  branches: Branch;
}

export interface Colleges {
  [code: string]: College;
}

export interface Metadata {
  extracted_at: string;
  total_entries: number;
  years: number[];
  rounds: number[];
  categories: string[];
  files_processed: {
    file: string;
    year: number;
    round: number;
    count: number;
    format: string;
  }[];
}

export interface KCETData {
  metadata: Metadata;
  colleges: Colleges;
}

export const KCET_CATEGORIES = [
  '1G', '1K', '1R', '2AG', '2AK', '2AR', '2BG', '2BK', '2BR',
  '3AG', '3AK', '3AR', '3BG', '3BK', '3BR', 'GM', 'GMK', 'GMP', 'GMR',
  'NRI', 'OPN', 'OTH', 'SCG', 'SCK', 'SCR', 'STG', 'STK', 'STR'
] as const;

export type CategoryCode = typeof KCET_CATEGORIES[number];

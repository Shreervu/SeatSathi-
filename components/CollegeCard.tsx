
import React from 'react';
import { CollegeRecommendation } from '../types';

interface CollegeCardProps {
  data: CollegeRecommendation;
  index: number;
}

const CollegeCard: React.FC<CollegeCardProps> = ({ data, index }) => {
  const getChanceColor = (chance: string) => {
    switch (chance) {
      case 'High': return 'border-green-500/50 bg-green-900/20';
      case 'Medium': return 'border-yellow-500/50 bg-yellow-900/20';
      case 'Low': return 'border-red-500/50 bg-red-900/20';
      default: return 'border-slate-700 bg-slate-800';
    }
  };

  const getChanceText = (chance: string) => {
     switch(chance) {
         case 'High': return 'text-green-400';
         case 'Medium': return 'text-yellow-400';
         case 'Low': return 'text-red-400';
         default: return 'text-slate-400';
     }
  };

  return (
    <div className={`p-4 rounded-xl border mb-3 backdrop-blur-sm transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${getChanceColor(data.chance)}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-base text-slate-100 leading-tight">{index + 1}. {data.collegeName}</h3>
          <div className="text-xs text-slate-300 mt-1 font-medium bg-black/20 inline-block px-2 py-0.5 rounded">
            {data.branch}
          </div>
        </div>
        <div className="text-right min-w-fit">
          <div className={`font-bold text-lg ${getChanceText(data.chance)}`}>{data.chance}</div>
        </div>
      </div>
      
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-700/50 pt-2">
         <div className="bg-slate-900/40 p-2 rounded">
            <span className="text-slate-400 block mb-0.5">2025 Range</span>
            <span className="font-mono text-white text-sm font-semibold">{data.cutoff2025 && data.cutoff2025 !== 'N/A' ? data.cutoff2025 : 'N/A'}</span>
         </div>
         <div className="bg-slate-900/40 p-2 rounded">
            <span className="text-slate-400 block mb-0.5">2024 Range</span>
            <span className="font-mono text-slate-300 text-sm">{data.cutoff2024 && data.cutoff2024 !== 'N/A' ? data.cutoff2024 : 'N/A'}</span>
         </div>
      </div>
    </div>
  );
};

export default CollegeCard;

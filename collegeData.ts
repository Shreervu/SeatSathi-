
import { KCETData, College, Colleges } from './types';
import { metadata } from './metadata';
import { colleges1 } from "./colleges1";
import { colleges2 } from "./colleges2";
import { colleges3 } from "./colleges3";
import { colleges4 } from "./colleges4";
import { colleges5 } from "./colleges5";
import { colleges6 } from "./colleges6";
import { colleges7 } from "./colleges7";
import { colleges8 } from "./colleges8";
import { colleges9 } from "./colleges9";
import { colleges10 } from "./colleges10";
import { colleges11 } from "./colleges11";
import { colleges12 } from "./colleges12";
import { colleges13 } from "./colleges13";
import { colleges14 } from "./colleges14";
import { colleges15 } from "./colleges15";
import { colleges16 } from "./colleges16";
import { colleges17 } from "./colleges17";
import { colleges18 } from "./colleges18";
import { colleges19 } from "./colleges19";
import { colleges20 } from "./colleges20";
import { colleges21 } from "./colleges21";
import { colleges22 } from "./colleges22";
import { colleges23 } from "./colleges23";
import { colleges24 } from "./colleges24";
import { colleges25 } from "./colleges25";
import { colleges26 } from "./colleges26";
import { colleges27 } from "./colleges27";
import { colleges28 } from "./colleges28";
import { colleges29 } from "./colleges29";
import { colleges30 } from "./colleges30";
import { colleges31 } from "./colleges31";
import { colleges32 } from "./colleges32";
import { colleges33 } from "./colleges33";
import { colleges34 } from "./colleges34";
import { colleges35 } from "./colleges35";
import { colleges36 } from "./colleges36";
import { colleges37 } from "./colleges37";
import { colleges38 } from "./colleges38";
import { colleges39 } from "./colleges39";
import { colleges40 } from "./colleges40";
import { colleges41 } from "./colleges41";
import { colleges42 } from "./colleges42";
import { colleges43 } from "./colleges43";
import { colleges44 } from "./colleges44";
import { colleges45 } from "./colleges45";
import { colleges46 } from "./colleges46";
import { colleges47 } from "./colleges47";
import { colleges48 } from "./colleges48";
import { colleges49 } from "./colleges49";
import { colleges50 } from "./colleges50";
import { colleges51 } from "./colleges51";
import { colleges52 } from "./colleges52";
import { colleges53 } from "./colleges53";
import { colleges54 } from "./colleges54";
import { colleges55 } from "./colleges55";
import { colleges56 } from "./colleges56";
import { colleges57 } from "./colleges57";
import { colleges58 } from "./colleges58";
import { colleges59 } from "./colleges59";
import { colleges60 } from "./colleges60";
import { colleges61 } from "./colleges61";
import { colleges62 } from "./colleges62";
import { colleges63 } from "./colleges63";
import { colleges64 } from "./colleges64";
import { colleges65 } from "./colleges65";
import { colleges66 } from "./colleges66";
import { colleges67 } from "./colleges67";
import { colleges68 } from "./colleges68";
import { colleges69 } from "./colleges69";
import { colleges70 } from "./colleges70";
import { colleges71 } from "./colleges71";
import { colleges72 } from "./colleges72";
import { colleges73 } from "./colleges73";
import { colleges74 } from "./colleges74";
import { colleges75 } from "./colleges75";
import { colleges76 } from "./colleges76";
import { colleges77 } from "./colleges77";
import { colleges78 } from "./colleges78";
import { colleges79 } from "./colleges79";
import { colleges80 } from "./colleges80";
import { colleges81 } from "./colleges81";
import { colleges82 } from "./colleges82";
import { colleges83 } from "./colleges83";
import { colleges84 } from "./colleges84";
import { colleges85 } from "./colleges85";
import { colleges86 } from "./colleges86";
import { colleges87 } from "./colleges87";
import { colleges88 } from "./colleges88";
import { colleges89 } from "./colleges89";
import { colleges90 } from "./colleges90";
import { colleges91 } from "./colleges91";
import { colleges92 } from "./colleges92";
import { colleges93 } from "./colleges93";
import { colleges94 } from "./colleges94";
import { colleges95 } from "./colleges95";
import { colleges96 } from "./colleges96";
import { colleges97 } from "./colleges97";
import { colleges98 } from "./colleges98";
import { colleges99 } from "./colleges99";
import { colleges100 } from "./colleges100";
import { colleges101 } from "./colleges101";
import { colleges102 } from "./colleges102";
import { colleges103 } from "./colleges103";
import { colleges104 } from "./colleges104";
import { colleges105 } from "./colleges105";
import { colleges106 } from "./colleges106";
import { colleges107 } from "./colleges107";
import { colleges108 } from "./colleges108";
import { colleges109 } from "./colleges109";
import { colleges110 } from "./colleges110";
import { colleges111 } from "./colleges111";
import { colleges112 } from "./colleges112";
import { colleges113 } from "./colleges113";
import { colleges114 } from "./colleges114";
import { colleges115 } from "./colleges115";
import { colleges116 } from "./colleges116";

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

export const colleges: Colleges = mergeColleges(
  colleges1, colleges2, colleges3, colleges4, colleges5, colleges6, colleges7, colleges8, colleges9, colleges10,
  colleges11, colleges12, colleges13, colleges14, colleges15, colleges16, colleges17, colleges18, colleges19, colleges20,
  colleges21, colleges22, colleges23, colleges24, colleges25, colleges26, colleges27, colleges28, colleges29, colleges30,
  colleges31, colleges32, colleges33, colleges34, colleges35, colleges36, colleges37, colleges38, colleges39, colleges40,
  colleges41, colleges42, colleges43, colleges44, colleges45, colleges46, colleges47, colleges48, colleges49, colleges50,
  colleges51, colleges52, colleges53, colleges54, colleges55, colleges56, colleges57, colleges58, colleges59, colleges60,
  colleges61, colleges62, colleges63, colleges64, colleges65, colleges66, colleges67, colleges68, colleges69, colleges70,
  colleges71, colleges72, colleges73, colleges74, colleges75, colleges76, colleges77, colleges78, colleges79, colleges80,
  colleges81, colleges82, colleges83, colleges84, colleges85, colleges86, colleges87, colleges88, colleges89, colleges90,
  colleges91, colleges92, colleges93, colleges94, colleges95, colleges96, colleges97, colleges98, colleges99, colleges100,
  colleges101, colleges102, colleges103, colleges104, colleges105, colleges106, colleges107, colleges108, colleges109, colleges110,
  colleges111, colleges112, colleges113, colleges114, colleges115, colleges116
);

export const KCET_DATA: KCETData = {
  metadata,
  colleges,
};

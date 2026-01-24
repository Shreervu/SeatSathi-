import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CollegeRecommendation } from '../types';

export type ExportCount = 10 | 50 | 100 | 'all' | number;

interface ExportOptions {
  count: ExportCount;
  title?: string;
  studentInfo?: {
    rank?: number;
    category?: string;
    course?: string;
    location?: string;
  };
}

export const exportToPDF = (
  recommendations: CollegeRecommendation[],
  options: ExportOptions
): void => {
  const { count, title = 'SeatSathi - College Recommendations', studentInfo } = options;
  
  // Determine how many colleges to export
  const exportCount = count === 'all' ? recommendations.length : Math.min(count, recommendations.length);
  const collegestoExport = recommendations.slice(0, exportCount);
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Header
  doc.setFillColor(11, 17, 32); // Dark blue background
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('SeatSathi', margin, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Admission Counselor for KCET', margin, 28);
  
  // Date
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, pageWidth - margin - 50, 28);
  
  let yPos = 45;
  
  // Student Info Box
  if (studentInfo && (studentInfo.rank || studentInfo.category || studentInfo.course || studentInfo.location)) {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Search Criteria:', margin + 5, yPos + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const infoItems = [];
    if (studentInfo.rank) infoItems.push(`Rank: ${studentInfo.rank}`);
    if (studentInfo.category) infoItems.push(`Category: ${studentInfo.category}`);
    if (studentInfo.course) infoItems.push(`Course: ${studentInfo.course}`);
    if (studentInfo.location) infoItems.push(`Location: ${studentInfo.location}`);
    
    doc.text(infoItems.join('  |  '), margin + 5, yPos + 18);
    
    yPos += 32;
  }
  
  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`College Recommendations (${collegestoExport.length} of ${recommendations.length})`, margin, yPos);
  
  yPos += 8;
  
  // Prepare table data
  const tableHeaders = [
    { header: '#', dataKey: 'index' },
    { header: 'College Name', dataKey: 'college' },
    { header: 'Branch', dataKey: 'branch' },
    { header: '2025 Cutoff', dataKey: 'cutoff2025' },
    { header: '2024 Cutoff', dataKey: 'cutoff2024' },
    { header: 'Chance', dataKey: 'chance' }
  ];
  
  const tableData = collegestoExport.map((rec, idx) => ({
    index: (idx + 1).toString(),
    college: rec.collegeName.length > 45 ? rec.collegeName.substring(0, 42) + '...' : rec.collegeName,
    branch: rec.branch.length > 25 ? rec.branch.substring(0, 22) + '...' : rec.branch,
    cutoff2025: rec.cutoff2025,
    cutoff2024: rec.cutoff2024,
    chance: rec.chance
  }));
  
  // Generate table with autotable
  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders.map(h => h.header)],
    body: tableData.map(row => [
      row.index,
      row.college,
      row.branch,
      row.cutoff2025,
      row.cutoff2024,
      row.chance
    ]),
    headStyles: {
      fillColor: [234, 179, 8], // Yellow
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' }
    },
    didParseCell: function(data: any) {
      // Color-code chance column
      if (data.column.index === 5 && data.section === 'body') {
        const chance = data.cell.raw as string;
        if (chance === 'High') {
          data.cell.styles.textColor = [22, 163, 74]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (chance === 'Medium') {
          data.cell.styles.textColor = [202, 138, 4]; // Yellow/Orange
          data.cell.styles.fontStyle = 'bold';
        } else if (chance === 'Low') {
          data.cell.styles.textColor = [220, 38, 38]; // Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: margin, right: margin },
    theme: 'grid'
  });
  
  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | SeatSathi - AI Admission Counselor | Disclaimer: Verify cutoffs from official KEA sources`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Generate filename
  const timestamp = new Date().toISOString().slice(0, 10);
  const courseStr = studentInfo?.course || 'all';
  const filename = `SeatSathi_Colleges_${courseStr}_${timestamp}.pdf`;
  
  // Save PDF
  doc.save(filename);
};

// Quick export functions
export const exportTop10 = (recommendations: CollegeRecommendation[], studentInfo?: any) => {
  exportToPDF(recommendations, { count: 10, studentInfo });
};

export const exportTop50 = (recommendations: CollegeRecommendation[], studentInfo?: any) => {
  exportToPDF(recommendations, { count: 50, studentInfo });
};

export const exportTop100 = (recommendations: CollegeRecommendation[], studentInfo?: any) => {
  exportToPDF(recommendations, { count: 100, studentInfo });
};

export const exportAll = (recommendations: CollegeRecommendation[], studentInfo?: any) => {
  exportToPDF(recommendations, { count: 'all', studentInfo });
};

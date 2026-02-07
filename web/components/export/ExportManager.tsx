"use client";

import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, FileImage, FileText, X, Loader2 } from "lucide-react";
import ExportTemplate from "./ExportTemplate";
import { useTranslations } from 'next-intl';
import { BirthData, ChartResponse, CycleResponse } from "@/lib/api";

interface ExportManagerProps {
    isOpen: boolean;
    onClose: () => void;
    currentTopic?: string; // If set, only export this topic (Analysis Page)
    currentContent?: string; // Current content to export
}

export default function ExportManager({ isOpen, onClose, currentTopic, currentContent }: ExportManagerProps) {
    const t = useTranslations('Common');

    // State
    const [birthData, setBirthData] = useState<BirthData | null>(null);
    const [chartData, setChartData] = useState<ChartResponse | null>(null);
    const [cycleData, setCycleData] = useState<CycleResponse | null>(null);

    const [exportName, setExportName] = useState(t('exportNamePlaceholder'));
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState("");

    // Load data from localStorage on open
    useState(() => {
        if (typeof window !== 'undefined') {
            const storedBirth = localStorage.getItem("birth_data");
            const storedChart = localStorage.getItem("chart_data");
            const storedCycle = localStorage.getItem("cycle_data");

            if (storedBirth) setBirthData(JSON.parse(storedBirth));
            if (storedChart) setChartData(JSON.parse(storedChart));
            if (storedCycle) setCycleData(JSON.parse(storedCycle));

            // Set default name if available
            const savedName = localStorage.getItem("current_profile_name");
            if (savedName) setExportName(savedName);
        }
    });

    // Ref for the template (hidden off-screen)
    const templateRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !birthData) return null;

    // Helper: Generate Image Blob from DOM
    const generateImageBlob = async (element: HTMLElement): Promise<Blob | null> => {
        const canvas = await html2canvas(element, {
            scale: 2, // Retina quality
            useCORS: true,
            backgroundColor: "#F8F8F0", // Ensure bg color
            logging: false,
        });
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    };

    const handleDownloadImage = async () => {
        if (!templateRef.current) return;
        setIsGenerating(true);
        setProgress(t('exportingImage'));

        try {
            const canvas = await html2canvas(templateRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#F8F8F0",
            });

            const link = document.createElement('a');
            link.download = `${exportName}-${currentTopic || 'Chart'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error(err);
            alert(t('exportFailed'));
        } finally {
            setIsGenerating(false);
            setProgress("");
        }
    };

    const handleDownloadPDF = async () => {
        if (!templateRef.current) return;
        setIsGenerating(true);
        setProgress(t('exportingPDF'));

        try {
            const canvas = await html2canvas(templateRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#F8F8F0",
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height] // Match canvas dimensions
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${exportName}.pdf`);

        } catch (err) {
            console.error(err);
            alert(t('exportFailed'));
        } finally {
            setIsGenerating(false);
            setProgress("");
        }
    };

    // Determine what to render in template
    const isChartExport = !currentTopic && chartData;
    const isAnalysisExport = currentTopic && currentContent;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-[#1A1A1A]/10 flex items-center justify-between bg-[#FAFAF5]">
                    <h3 className="font-song font-bold text-lg text-[#1A1A1A]">{t('exportResult')}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-[#1A1A1A]/60" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto">

                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[#1A1A1A]/40 uppercase tracking-widest block">
                            {t('exportName')}
                        </label>
                        <input
                            type="text"
                            value={exportName}
                            onChange={(e) => setExportName(e.target.value)}
                            placeholder={t('exportNamePlaceholder')}
                            className="zen-input w-full"
                        />
                    </div>

                    {/* Preview Info */}
                    <div className="p-4 bg-[#F8F8F0] rounded-xl border border-[#B8860B]/10 flex items-center gap-4">
                        <div className="w-12 h-16 bg-white border border-[#1A1A1A]/5 shadow-sm flex items-center justify-center">
                            <span className="text-[10px] text-[#1A1A1A]/20 font-serif">预览</span>
                        </div>
                        <div>
                            <p className="font-bold text-[#1A1A1A] text-sm mb-1">{exportName}</p>
                            <p className="text-xs text-[#1A1A1A]/60">
                                {isChartExport ? t('baziChart') : `${currentTopic} ${t('analysisReport')}`}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleDownloadImage}
                            disabled={isGenerating}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-[#1A1A1A]/10 hover:border-[#B8860B]/30 hover:bg-[#B8860B]/5 transition-all group"
                        >
                            <div className="p-3 bg-[#1A1A1A]/5 rounded-full group-hover:bg-[#B8860B]/10 transition-colors">
                                <FileImage className="w-6 h-6 text-[#1A1A1A]/60 group-hover:text-[#B8860B]" />
                            </div>
                            <span className="text-sm font-medium text-[#1A1A1A]/80">{t('saveImage')}</span>
                        </button>

                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGenerating}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-[#1A1A1A]/10 hover:border-[#B8860B]/30 hover:bg-[#B8860B]/5 transition-all group"
                        >
                            <div className="p-3 bg-[#1A1A1A]/5 rounded-full group-hover:bg-[#B8860B]/10 transition-colors">
                                <FileText className="w-6 h-6 text-[#1A1A1A]/60 group-hover:text-[#B8860B]" />
                            </div>
                            <span className="text-sm font-medium text-[#1A1A1A]/80">{t('savePDF')}</span>
                        </button>
                    </div>
                </div>

                {/* Footer Status */}
                {isGenerating && (
                    <div className="p-3 bg-[#B8860B]/10 text-[#B8860B] text-xs flex items-center justify-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{progress}...</span>
                    </div>
                )}
            </div>

            {/* === Hidden Template for Rendering === */}
            {/* Positioned off-screen but rendered within DOM for html2canvas */}
            <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden" style={{ width: '800px' }}>
                <ExportTemplate
                    ref={templateRef}
                    userName={exportName}
                    birthData={birthData}
                    type={isChartExport ? 'chart' : 'analysis'}
                    content={isChartExport ? chartData! : currentContent}
                    cycleData={cycleData}
                    title={currentTopic}
                />
            </div>
        </div>
    );
}

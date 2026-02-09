"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FileImage, FileText, X, Loader2 } from "lucide-react";
import ExportTemplate from "./ExportTemplate";
import { useTranslations } from 'next-intl';
import { useUserProfile, AnalysisRecord, CompatibilityRecord, OracleRecord } from "@/lib/context";
import { ChartResponse, CycleResponse } from "@/lib/api";

interface ExportManagerProps {
    isOpen: boolean;
    onClose: () => void;
    currentTopic?: string; // If set, only export this topic (Analysis Page)
    currentContent?: string; // Current content to export
    exportMode?: "all" | "oracle";
    oracleRecordsOverride?: OracleRecord[];
}

export default function ExportManager({ isOpen, onClose, currentTopic, currentContent, exportMode = "all", oracleRecordsOverride }: ExportManagerProps) {
    const t = useTranslations('Common');
    const { birthData, chartData, cycleData, currentProfile, refreshProfiles } = useUserProfile();

    // State
    const [exportName, setExportName] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [lastAction, setLastAction] = useState<"image" | "pdf" | null>(null);

    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setExportName(currentProfile?.profileName || "");
        setError(null);
        setLastAction(null);
    }, [isOpen, currentProfile?.profileName]);

    useEffect(() => {
        if (!isOpen) return;
        refreshProfiles().catch(() => { });
    }, [isOpen, refreshProfiles]);

    const analysisRecords = currentProfile?.analysisRecords || [];
    const compatibilityRecords = currentProfile?.compatibilityRecords || [];
    const oracleRecords = currentProfile?.oracleRecords || [];
    const isSingleAnalysisExport = !!currentTopic && typeof currentContent === "string" && currentContent.trim().length > 0;

    const buildAnalysisMarkdown = (record: AnalysisRecord) => {
        const parts = [];
        if (record.createdAt) {
            parts.push(`**生成时间**：${record.createdAt}`);
            parts.push("");
        }
        if (record.customQuestion) {
            parts.push(`**问题**：${record.customQuestion}`);
            parts.push("");
        }
        parts.push(record.content || "");
        return parts.join("\n");
    };

    const formatBirth = (data?: { birth_year?: number; month?: number; day?: number; hour?: number; minute?: number; gender?: string }) => {
        if (!data) return "";
        const minute = typeof data.minute === "number" ? String(data.minute).padStart(2, "0") : "00";
        return `${data.birth_year}年${data.month}月${data.day}日 ${data.hour}时${minute}分 · ${data.gender}`;
    };

    const buildCompatibilityMarkdown = (record: CompatibilityRecord) => {
        const isEn = record.language === "en";
        const lines = [
            isEn ? `**Relation**: ${record.relationType}` : `**关系类型**：${record.relationType}`,
            isEn ? `**Score**: ${record.baseScore}` : `**匹配评分**：${record.baseScore}`,
            "",
            isEn ? "**Person A**" : "**对象 A**",
            `- ${record.userASummary}`,
            `- ${formatBirth(record.userAData)}`,
            isEn ? "**Person B**" : "**对象 B**",
            `- ${record.userBSummary}`,
            `- ${formatBirth(record.userBData)}`,
            "",
            isEn ? "**Key Points**" : "**要点**",
            ...(record.details || []).map((item) => `- ${item}`),
        ];
        if (record.analysisMarkdown) {
            lines.push("", isEn ? "**AI Interpretation**" : "**AI 解读**", record.analysisMarkdown);
        } else if (record.analysisError) {
            lines.push("", isEn ? "**AI Interpretation**" : "**AI 解读**", record.analysisError);
        }
        return lines.join("\n");
    };

    const buildOracleMarkdown = (record: OracleRecord) => {
        const isEn = record.language === "en";
        const result = record.result;
        const lines = [
            record.createdAt ? (isEn ? `**Generated At**: ${record.createdAt}` : `**生成时间**：${record.createdAt}`) : "",
            isEn ? `**Question**: ${record.question}` : `**问题**：${record.question}`,
            "",
            isEn ? "**Original Hexagram**" : "**本卦**",
            `- ${result.original_hex} (${result.original_short})`,
            isEn ? "**Meaning**" : "**卦意**",
            result.original_meaning || "",
        ];
        if (result.future_hex) {
            lines.push("", isEn ? "**Future Hexagram**" : "**变卦**", `- ${result.future_hex} (${result.future_short})`);
        }
        if (result.changing_lines && result.changing_lines.length > 0) {
            lines.push("", isEn ? "**Changing Lines**" : "**动爻**", `- ${result.changing_lines.join(", ")}`);
        }
        if (result.details && result.details.length > 0) {
            lines.push("", isEn ? "**Details**" : "**细节**", ...result.details.map((item) => `- ${item}`));
        }
        return lines.join("\n");
    };

    const pages = useMemo(() => {
        if (!birthData) return [];
        const items: {
            id: string;
            type: "chart" | "analysis" | "oracle";
            title?: string;
            content: string | ChartResponse;
            cycleData?: CycleResponse | null;
        }[] = [];

        if (exportMode === "oracle") {
            const sourceRecords = oracleRecordsOverride && oracleRecordsOverride.length > 0
                ? oracleRecordsOverride
                : [...oracleRecords]
                    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                    .slice(0, 1);
            sourceRecords.forEach((record, index) => {
                items.push({
                    id: `oracle-${index}`,
                    type: "oracle",
                    title: record.language === "en" ? "Oracle" : "卜卦",
                    content: buildOracleMarkdown(record),
                });
            });
            return items;
        }

        if (isSingleAnalysisExport) {
            items.push({
                id: "analysis-single",
                type: "analysis",
                title: currentTopic,
                content: currentContent as string,
            });
            return items;
        }

        if (chartData) {
            items.push({
                id: "chart",
                type: "chart",
                title: "八字排盘",
                content: chartData,
                cycleData,
            });
        }

        [...analysisRecords].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")).forEach((record, index) => {
            if (!record.content) return;
            items.push({
                id: `analysis-${index}-${record.key}`,
                type: "analysis",
                title: record.topic,
                content: buildAnalysisMarkdown(record),
            });
        });

        [...compatibilityRecords].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")).forEach((record, index) => {
            items.push({
                id: `compatibility-${index}-${record.key}`,
                type: "analysis",
                title: record.language === "en" ? "Relationship" : "合盘分析",
                content: buildCompatibilityMarkdown(record),
            });
        });

        [...oracleRecords].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")).forEach((record, index) => {
            items.push({
                id: `oracle-${index}`,
                type: "oracle",
                title: record.language === "en" ? "Oracle" : "卜卦",
                content: buildOracleMarkdown(record),
            });
        });

        return items;
    }, [birthData, chartData, cycleData, isSingleAnalysisExport, currentTopic, currentContent, analysisRecords, compatibilityRecords, oracleRecords, exportMode, oracleRecordsOverride]);

    useEffect(() => {
        if (!isOpen) return;
        pageRefs.current = [];
    }, [isOpen, pages.length]);

    if (!isOpen) return null;

    const canExport = pages.length > 0;
    const safeName = exportName.trim() || "Export";
    const topicLabel = exportMode === "oracle" ? "Oracle-Records" : (currentTopic || "All-Records");
    const previewLabel = isSingleAnalysisExport
        ? `${currentTopic} ${t('analysisReport')}`
        : exportMode === "oracle"
            ? t('exportOracleRecords', { count: pages.length })
            : t('exportAllRecords', { count: pages.length });

    const waitForLayout = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const waitForFonts = async () => {
        if (document?.fonts?.ready) {
            try {
                await document.fonts.ready;
            } catch { }
        }
    };

    const waitForImages = async (root: HTMLElement) => {
        const images = Array.from(root.querySelectorAll("img"));
        await Promise.all(
            images.map(
                (img) =>
                    img.complete
                        ? Promise.resolve()
                        : new Promise<void>((resolve) => {
                            img.onload = () => resolve();
                            img.onerror = () => resolve();
                        })
            )
        );
    };

    const fitExportPages = async () => {
        await waitForLayout();
        await waitForFonts();
        for (const page of pageRefs.current) {
            if (!page) continue;
            await waitForImages(page);
        }
        await waitForLayout();
        pageRefs.current.forEach((page) => {
            if (!page) return;
            const frame = page.querySelector(".export-frame") as HTMLElement | null;
            const content = page.querySelector(".export-content") as HTMLElement | null;
            if (!frame || !content) return;
            content.style.transform = "scale(1)";
            content.style.transformOrigin = "top left";
            content.style.width = "100%";
            content.style.boxSizing = "border-box";
            const frameStyles = window.getComputedStyle(frame);
            const paddingX = parseFloat(frameStyles.paddingLeft || "0") + parseFloat(frameStyles.paddingRight || "0");
            const paddingY = parseFloat(frameStyles.paddingTop || "0") + parseFloat(frameStyles.paddingBottom || "0");
            const availableWidth = frame.clientWidth - paddingX;
            const availableHeight = frame.clientHeight - paddingY;
            const contentWidth = content.scrollWidth;
            const contentHeight = content.scrollHeight;
            const scale = Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight);
            if (scale < 1) {
                content.style.transform = `scale(${Math.max(0.55, scale)})`;
            }
        });
        await waitForLayout();
    };

    const renderCanvases = async () => {
        await fitExportPages();
        const canvases: HTMLCanvasElement[] = [];
        for (const page of pageRefs.current) {
            if (!page) continue;
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#F8F8F0",
            });
            canvases.push(canvas);
        }
        return canvases;
    };

    const sanitizeFilePart = (value: string) =>
        value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 40);

    const handleDownloadImage = async () => {
        if (!canExport) return;
        setIsGenerating(true);
        setProgress(t('exportingImage'));
        setError(null);
        setLastAction("image");

        try {
            const canvases = await renderCanvases();
            const hasMultiple = canvases.length > 1;
            canvases.forEach((canvas, index) => {
                const page = pages[index];
                const suffix = hasMultiple ? `-${String(index + 1).padStart(2, "0")}` : "";
                const titlePart = page?.title ? `-${sanitizeFilePart(page.title)}` : "";
                const link = document.createElement('a');
                link.download = `${safeName}${suffix}${titlePart}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        } catch (err) {
            console.error(err);
            setError(t('exportFailed'));
        } finally {
            setIsGenerating(false);
            setProgress("");
        }
    };

    const handleDownloadPDF = async () => {
        if (!canExport) return;
        setIsGenerating(true);
        setProgress(t('exportingPDF'));
        setError(null);
        setLastAction("pdf");

        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4',
            });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const canvases = await renderCanvases();

            canvases.forEach((canvas, index) => {
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth;
                let imgHeight = (canvas.height * imgWidth) / canvas.width;
                let drawWidth = imgWidth;
                let drawHeight = imgHeight;
                if (imgHeight > pageHeight) {
                    const scale = pageHeight / imgHeight;
                    drawWidth = imgWidth * scale;
                    drawHeight = imgHeight * scale;
                }
                const x = (pageWidth - drawWidth) / 2;
                const y = (pageHeight - drawHeight) / 2;
                if (index > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', x, y, drawWidth, drawHeight);
            });

            pdf.save(`${safeName}-${topicLabel}.pdf`);

        } catch (err) {
            console.error(err);
            setError(t('exportFailed'));
        } finally {
            setIsGenerating(false);
            setProgress("");
        }
    };

    const handleRetry = async () => {
        if (lastAction === "image") {
            await handleDownloadImage();
        } else if (lastAction === "pdf") {
            await handleDownloadPDF();
        }
    };

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
                    {!canExport && (
                        <div className="p-4 rounded-xl bg-[#F8F8F0] border border-[#B8860B]/15 text-xs text-[#1A1A1A]/60 tracking-widest">
                            {t('exportUnavailable')}
                        </div>
                    )}

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
                            <p className="font-bold text-[#1A1A1A] text-sm mb-1">{exportName || t('exportNamePlaceholder')}</p>
                            <p className="text-xs text-[#1A1A1A]/60">
                                {previewLabel}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleDownloadImage}
                            disabled={isGenerating || !canExport}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-[#1A1A1A]/10 hover:border-[#B8860B]/30 hover:bg-[#B8860B]/5 transition-all group"
                        >
                            <div className="p-3 bg-[#1A1A1A]/5 rounded-full group-hover:bg-[#B8860B]/10 transition-colors">
                                <FileImage className="w-6 h-6 text-[#1A1A1A]/60 group-hover:text-[#B8860B]" />
                            </div>
                            <span className="text-sm font-medium text-[#1A1A1A]/80">{t('saveImage')}</span>
                        </button>

                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGenerating || !canExport}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-[#1A1A1A]/10 hover:border-[#B8860B]/30 hover:bg-[#B8860B]/5 transition-all group"
                        >
                            <div className="p-3 bg-[#1A1A1A]/5 rounded-full group-hover:bg-[#B8860B]/10 transition-colors">
                                <FileText className="w-6 h-6 text-[#1A1A1A]/60 group-hover:text-[#B8860B]" />
                            </div>
                            <span className="text-sm font-medium text-[#1A1A1A]/80">{t('savePDF')}</span>
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700/80 text-xs tracking-widest flex items-center justify-between gap-4">
                            <span>{error}</span>
                            {lastAction && (
                                <button
                                    onClick={handleRetry}
                                    className="px-3 py-1 rounded-full border border-red-200 text-red-700/80 hover:bg-red-100 transition-colors"
                                >
                                    {t('retry')}
                                </button>
                            )}
                        </div>
                    )}
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
            <div className="absolute top-0 left-[-9999px] -z-50 pointer-events-none overflow-hidden" style={{ width: '800px' }}>
                {canExport && birthData && pages.map((page, index) => (
                    <ExportTemplate
                        key={page.id}
                        ref={(el) => { pageRefs.current[index] = el; }}
                        userName={exportName || currentProfile?.profileName || "User"}
                        birthData={birthData}
                        type={page.type}
                        content={page.type === "chart" ? (page.content as ChartResponse) : (page.content as string)}
                        cycleData={page.cycleData}
                        title={page.title}
                    />
                ))}
            </div>
        </div>
    );
}

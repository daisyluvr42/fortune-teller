"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Circle, Hexagon, HelpCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CoinTossScene from "@/components/CoinTossScene";
import { useTranslations } from 'next-intl';

// Loading Component
function LoadingSpinner() {
    return (
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-[#B8860B]/20 rounded-full animate-ping"></div>
            <div className="absolute inset-0 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

export default function OraclePage() {
    const t = useTranslations('Oracle');
    const commonT = useTranslations('Common');
    const [question, setQuestion] = useState("");
    const [stage, setStage] = useState<'intro' | 'casting' | 'result'>('intro');
    const [castingIndex, setCastingIndex] = useState(0); // 0-5 for 6 lines
    const [castingLines, setCastingLines] = useState<number[]>([]); // 6,7,8,9
    const [coinState, setCoinState] = useState<[boolean, boolean, boolean] | null>(null); // Heads/Tails state
    const [isAnimating, setIsAnimating] = useState(false);
    const [oracleData, setOracleData] = useState<any>(null);
    const [analysis, setAnalysis] = useState("");
    const [shaking, setShaking] = useState(false);
    const [shakeEnabled, setShakeEnabled] = useState(false);
    const [shakeNotice, setShakeNotice] = useState<string | null>(null);

    // Shake detection mechanism
    useEffect(() => {
        let lastX = 0, lastY = 0, lastZ = 0;
        let lastTime = 0;
        const SHAKE_THRESHOLD = 15;

        const handleMotion = (e: DeviceMotionEvent) => {
            if (!shakeEnabled || isAnimating || stage !== 'casting') return;

            const now = Date.now();
            if ((now - lastTime) > 100) {
                const { x, y, z } = e.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
                const speed = Math.abs((x || 0) + (y || 0) + (z || 0) - lastX - lastY - lastZ) / (now - lastTime) * 10000;

                if (speed > SHAKE_THRESHOLD) {
                    advanceCasting();
                }

                lastTime = now;
                lastX = x || 0;
                lastY = y || 0;
                lastZ = z || 0;
            }
        };

        if (shakeEnabled && typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
            window.addEventListener('devicemotion', handleMotion);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('devicemotion', handleMotion);
            }
        };
    }, [shakeEnabled, isAnimating, stage]);

    const requestShakePermission = async () => {
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceMotionEvent as any).requestPermission();
                if (response === 'granted') {
                    setShakeEnabled(true);
                } else {
                    setShakeNotice("Permission denied for shake");
                }
            } catch (e) {
                setShakeNotice("Error requesting shake permission");
            }
        } else {
            // Non-iOS 13+ devices
            setShakeEnabled(true);
        }
    };

    const toggleShake = () => {
        if (!shakeEnabled) {
            requestShakePermission();
        } else {
            setShakeEnabled(false);
        }
    };

    const advanceCasting = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setShaking(true);

        // Simulate 3 coins: true=Heads(3), false=Tails(2)
        // Generally: Heads=3 (Yang face), Tails=2 (Yin face)
        // Sum: 6(Old Yin), 7(Young Yang), 8(Young Yin), 9(Old Yang)
        setTimeout(() => {
            setShaking(false);
            const c1 = Math.random() > 0.5;
            const c2 = Math.random() > 0.5;
            const c3 = Math.random() > 0.5;
            setCoinState([c1, c2, c3]);

            const val1 = c1 ? 3 : 2;
            const val2 = c2 ? 3 : 2;
            const val3 = c3 ? 3 : 2;
            const sum = val1 + val2 + val3;

            // Wait for coin animation to settle
            setTimeout(() => {
                const newLines = [...castingLines, sum];
                setCastingLines(newLines);
                setCastingIndex(prev => prev + 1);
                setIsAnimating(false);

                if (newLines.length === 6) {
                    finishCasting(newLines);
                }
            }, 1500);
        }, 1000);
    };

    const finishCasting = async (lines: number[]) => {
        setStage('result');
        try {
            const res = await fetch("/api/oracle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    lines: lines // Bottom to top
                }),
            });
            const data = await res.json();
            setOracleData(data);
            setAnalysis(data.analysis_text || ""); // If stream is not used yet

            // If API returns stream, handle it here similar to analysis page
            if (data.analysis_text) {
                // assume pre-filled
            }

        } catch (e) {
            console.error(e);
        }
    };

    return (
        <main className="min-h-screen bg-[#F8F8F0]">
            <Header />
            <div className="page-shell">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <div className="text-center space-y-4 mb-16 animate-fade-in">
                        <Hexagon className="w-8 h-8 mx-auto text-[#B8860B]" strokeWidth={1} />
                        <h1 className="text-3xl font-light tracking-[0.5em] text-[#1A1A1A]">
                            {t('title')}
                        </h1>
                        <p className="text-[#1A1A1A]/40 tracking-widest text-sm">
                            {t('subtitle')}
                        </p>
                    </div>

                    {/* Stage: Intro */}
                    {stage === 'intro' && (
                        <div className="max-w-md mx-auto space-y-8 animate-fade-in">
                            <div className="zen-card p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs tracking-[0.2em] text-[#1A1A1A]/40 uppercase">
                                        {t('questionPlaceholder')}
                                    </label>
                                    <textarea
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder={t('questionPlaceholder')}
                                        className="w-full bg-transparent border-b border-[#1A1A1A]/10 py-4 text-[#1A1A1A] placeholder:text-[#1A1A1A]/20 focus:outline-none focus:border-[#B8860B] transition-colors resize-none h-32 leading-relaxed"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        if (!question.trim()) return;
                                        setStage('casting');
                                    }}
                                    disabled={!question.trim()}
                                    className="zen-button w-full"
                                >
                                    {t('startToss')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stage: Casting */}
                    {stage === 'casting' && (
                        <div className="flex flex-col items-center space-y-12 animate-fade-in relative min-h-[500px]">
                            {/* Visual Lines Progress */}
                            <div className="flex flex-col-reverse gap-4 p-8 border border-[#1A1A1A]/5 rounded-2xl bg-white/50 backdrop-blur-sm w-48">
                                {Array.from({ length: 6 }).map((_, i) => {
                                    const val = castingLines[i];
                                    return (
                                        <div key={i} className={`h-4 w-full flex items-center justify-center transition-all duration-500 ${val ? 'opacity-100' : 'opacity-10'}`}>
                                            {val === 6 && <div className="w-full flex gap-4"><div className="h-2 flex-1 bg-[#1A1A1A]" /><div className="h-2 w-2 border border-[#1A1A1A] rounded-full" /><div className="h-2 flex-1 bg-[#1A1A1A]" /></div>}
                                            {val === 7 && <div className="h-2 w-full bg-[#1A1A1A]" />}
                                            {val === 8 && <div className="w-full flex gap-4"><div className="h-2 flex-1 bg-[#1A1A1A]" /><div className="h-2 flex-1 bg-[#1A1A1A]" /></div>}
                                            {val === 9 && <div className="h-2 w-full bg-[#1A1A1A] relative"><div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 border border-white bg-[#1A1A1A] rounded-full" /></div></div>}
                                            {!val && <div className="h-0.5 w-full bg-[#1A1A1A]/20" />}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* 3D Scene */}
                            <div className="w-full h-64 relative">
                                <CoinTossScene
                                    isTossing={shaking}
                                    result={coinState}
                                />
                            </div>

                            <div className="space-y-4 text-center z-10">
                                <button
                                    onClick={toggleShake}
                                    className="zen-button-ghost text-[10px] tracking-[0.2em]"
                                >
                                    {shakeEnabled ? t('questionPlaceholder') : t('shakeToToss')}
                                </button>
                                <button
                                    onClick={advanceCasting}
                                    className="zen-button-ghost text-[10px] tracking-[0.2em]"
                                    disabled={castingIndex >= 6 || isAnimating}
                                >
                                    {isAnimating ? t('tossing') : (castingIndex === 0 ? t('startToss') : t('nextToss'))}
                                </button>
                            </div>
                            <div className="absolute top-36 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-[#1A1A1A]/50">
                                {t('shakeHint')}
                            </div>
                            {shakeNotice && (
                                <div className="absolute top-44 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-red-800/70">
                                    {shakeNotice}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stage: Result */}
                    {stage === 'result' && oracleData && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Hexagram Card */}
                                <div className="zen-card flex flex-col items-center justify-center p-8 space-y-6">
                                    <div
                                        className="w-32 h-40 bg-[#1A1A1A]/5 p-4 rounded-lg flex items-center justify-center"
                                        dangerouslySetInnerHTML={{ __html: oracleData.svg }}
                                    />
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-medium text-[#1A1A1A] tracking-wider">
                                            {oracleData.original_hex}
                                        </h3>
                                        <p className="text-[#B8860B] text-sm tracking-widest font-light">
                                            {oracleData.original_meaning}
                                        </p>
                                    </div>
                                </div>

                                {/* Summary Card */}
                                <div className="zen-card p-8 space-y-6">
                                    <div className="flex items-center gap-2 text-[#1A1A1A]/40 mb-2">
                                        <HelpCircle className="w-4 h-4" />
                                        <span className="text-xs tracking-widest">{t('hexagramMeaning')}</span>
                                    </div>
                                    <div className="space-y-4">
                                        {oracleData.details.slice(-3).map((detail: string, idx: number) => (
                                            <p key={idx} className="text-sm font-light text-[#1A1A1A]/80 leading-relaxed tracking-wide">
                                                {detail}
                                            </p>
                                        ))}
                                        {oracleData.future_hex && (
                                            <div className="pt-4 border-t border-[#1A1A1A]/10">
                                                <p className="text-xs text-[#1A1A1A]/40 tracking-widest uppercase">{t('trend')}</p>
                                                <p className="text-sm mt-1">{oracleData.future_hex} ({oracleData.future_short})</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* AI Deep Analysis */}
                            {analysis ? (
                                <div className="zen-card p-8 md:p-12 space-y-8">
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#1A1A1A]/10 to-transparent"></div>
                                        <span className="text-sm tracking-[0.3em] font-light text-[#1A1A1A]/40">{t('masterInterpretation')}</span>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#1A1A1A]/10 to-transparent"></div>
                                    </div>
                                    <div className="prose prose-stone max-w-none prose-p:font-light prose-p:tracking-wide prose-p:leading-relaxed prose-headings:font-normal prose-headings:tracking-widest">
                                        <ReactMarkdown
                                            components={{
                                                h1: ({ node, ...props }) => <h3 className="text-xl font-medium mt-6 mb-4 text-[#B8860B]" {...props} />,
                                                h2: ({ node, ...props }) => <h4 className="text-lg font-medium mt-5 mb-3 text-[#1A1A1A]" {...props} />,
                                                h3: ({ node, ...props }) => <h5 className="text-base font-medium mt-4 mb-2 text-[#1A1A1A]" {...props} />,
                                                strong: ({ node, ...props }) => <span className="font-medium text-[#B8860B]" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-4 text-[#1A1A1A]/80 leading-loose" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="text-[#1A1A1A]/80" {...props} />,
                                            }}
                                        >
                                            {analysis}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-center p-12">
                                    <LoadingSpinner />
                                </div>
                            )}

                            <div className="text-center">
                                <button
                                    onClick={() => {
                                        setStage('idle');
                                        setOracleData(null);
                                        setAnalysis('');
                                        setCastingIndex(0);
                                        setCastingLines([]);
                                        setCoinState(null);
                                    }}
                                    className="zen-button-ghost text-xs tracking-[0.2em]"
                                >
                                    {t('again')}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}

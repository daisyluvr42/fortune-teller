"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BirthDataForm from "@/components/BirthDataForm";
import BaziChart from "@/components/BaziChart";
import LoadingSpinner from "@/components/LoadingSpinner";
import { calculateBazi, getCycles, BirthData, ChartResponse, CycleResponse } from "@/lib/api";
import { useUserProfile } from "@/lib/context";
import { AlertCircle, RotateCcw, Sparkles, Target, Users, Save } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const {
    birthData: savedBirthData,
    chartData: savedChartData,
    cycleData: savedCycleData,
    isSaved,
    setBirthData,
    setChartData,
    setCycleData,
    saveProfile,
    clearProfile,
    hasProfile,
    profiles
  } = useUserProfile();

  const [chartData, setLocalChartData] = useState<ChartResponse | null>(savedChartData);
  const [cycleData, setLocalCycleData] = useState<CycleResponse | null>(savedCycleData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wantSave, setWantSave] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [pendingSave, setPendingSave] = useState<{
    birthData: BirthData;
    chartData: ChartResponse;
    cycleData: CycleResponse;
  } | null>(null);

  const getNextProfileName = () => {
    const used = new Set<number>();
    profiles.forEach((p) => {
      const m = /^档案(\d{3})/.exec(p.profileName);
      if (m) used.add(parseInt(m[1], 10));
    });
    let i = 1;
    while (used.has(i)) i += 1;
    return `档案${String(i).padStart(3, "0")}`;
  };

  useEffect(() => {
    setLocalChartData(savedChartData);
    setLocalCycleData(savedCycleData);
  }, [savedChartData, savedCycleData]);

  const handleSubmit = async (data: BirthData) => {
    setIsLoading(true);
    setError(null);
    setLocalChartData(null);
    setLocalCycleData(null);

    try {
      const [baziResult, cycleResult] = await Promise.all([
        calculateBazi(data),
        getCycles(data)
      ]);

      // 存入本地状态
      setLocalChartData(baziResult);
      setLocalCycleData(cycleResult);

      // 存入全局 Context
      setBirthData(data);
      setChartData(baziResult);
      setCycleData(cycleResult);

      // 如果勾选了保存档案
      if (wantSave) {
        const defaultName = getNextProfileName();
        setProfileName(defaultName);
        setPendingSave({ birthData: data, chartData: baziResult, cycleData: cycleResult });
        setShowNameModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLocalChartData(null);
    setLocalCycleData(null);
    setError(null);
    clearProfile();
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleConfirmSave = async () => {
    if (!pendingSave) return;
    const name = profileName.trim() || getNextProfileName();
    await saveProfile(name, pendingSave);
    setShowNameModal(false);
    setPendingSave(null);
  };

  const handleCancelSave = () => {
    setShowNameModal(false);
    setPendingSave(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F0]">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12">
        {showNameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="bg-white rounded-xl shadow-lg border border-[#1A1A1A]/10 w-[90%] max-w-sm p-6">
              <h3 className="text-sm tracking-widest text-[#1A1A1A] mb-3">保存档案</h3>
              <p className="text-xs text-[#1A1A1A]/60 mb-4">
                请输入档案名称（默认建议已填写）
              </p>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="zen-input w-full text-center"
                placeholder="档案名称"
                autoFocus
              />
              <div className="flex items-center justify-end gap-3 mt-5">
                <button onClick={handleCancelSave} className="zen-button-ghost text-xs tracking-widest">
                  取消
                </button>
                <button onClick={handleConfirmSave} className="zen-button text-xs tracking-widest">
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
        {!chartData && !isLoading && (
          <div className="max-w-xl mx-auto space-y-6">
            <BirthDataForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              initialData={savedBirthData || undefined}
            />

            {/* 保存档案选项 */}
            <label className="flex items-center justify-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={wantSave}
                onChange={(e) => setWantSave(e.target.checked)}
                className="w-4 h-4 rounded border-[#1A1A1A]/20 text-[#B8860B] focus:ring-[#B8860B]/20"
              />
              <span className="text-sm text-[#1A1A1A]/50 group-hover:text-[#1A1A1A]/70 transition-colors flex items-center gap-2">
                <Save className="w-3.5 h-3.5" />
                保存档案（下次自动加载）
              </span>
            </label>

            {/* 已保存档案提示 */}
            {isSaved && savedBirthData && (
              <div className="text-center py-4 border-t border-[#1A1A1A]/5">
                <p className="text-xs text-[#B8860B]/60 tracking-widest">
                  ✓ 已恢复您的档案
                </p>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner />
            <p className="mt-4 text-xs text-[#1A1A1A]/40 tracking-[0.4em] italic animate-pulse">
              正在演化命盘...
            </p>
          </div>
        )}

        {error && (
          <div className="zen-card animate-fade-in max-w-xl mx-auto">
            <div className="flex flex-col items-center text-center py-8">
              <AlertCircle className="w-8 h-8 text-[#1A1A1A] mb-4" strokeWidth={1} />
              <p className="text-[#1A1A1A] font-medium mb-2">排盘失败</p>
              <p className="text-sm text-[#666666] mb-6">{error}</p>
              <button onClick={handleReset} className="zen-button-ghost">
                <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                重新输入
              </button>
            </div>
          </div>
        )}

        {chartData && (
          <div className="space-y-12">
            <BaziChart data={chartData} cycleData={cycleData} />

            {/* 功能入口按钮组 */}
            <div className="zen-card p-6">
              <p className="text-xs text-center text-[#1A1A1A]/40 tracking-widest uppercase mb-6">
                继续探索
              </p>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleNavigate('/analysis')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#1A1A1A]/5 hover:border-[#B8860B]/30 hover:bg-[#B8860B]/5 transition-all group"
                >
                  <Target className="w-5 h-5 text-[#1A1A1A]/40 group-hover:text-[#B8860B] transition-colors" />
                  <span className="text-xs tracking-widest text-[#1A1A1A]/60 group-hover:text-[#1A1A1A] transition-colors">深度分析</span>
                </button>
                <button
                  onClick={() => handleNavigate('/compatibility')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#1A1A1A]/5 hover:border-[#B8860B]/30 hover:bg-[#B8860B]/5 transition-all group"
                >
                  <Users className="w-5 h-5 text-[#1A1A1A]/40 group-hover:text-[#B8860B] transition-colors" />
                  <span className="text-xs tracking-widest text-[#1A1A1A]/60 group-hover:text-[#1A1A1A] transition-colors">双人合盘</span>
                </button>
                <button
                  onClick={() => handleNavigate('/oracle')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#1A1A1A]/5 hover:border-[#B8860B]/30 hover:bg-[#B8860B]/5 transition-all group"
                >
                  <Sparkles className="w-5 h-5 text-[#1A1A1A]/40 group-hover:text-[#B8860B] transition-colors" />
                  <span className="text-xs tracking-widest text-[#1A1A1A]/60 group-hover:text-[#1A1A1A] transition-colors">每日一卦</span>
                </button>
              </div>
            </div>

            <div className="text-center">
              <button onClick={handleReset} className="zen-button-ghost">
                <RotateCcw className="w-4 h-4 text-[#1A1A1A]" strokeWidth={1.5} />
                <span>重新排盘</span>
              </button>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}

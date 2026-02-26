"use client";

import { FormEvent, useMemo, useState } from "react";
import Header from "@/components/Header";
import { buildDaLiuRenChart } from "@/lib/liuren";
import { Branch, DaLiuRenChart, DaLiuRenInput } from "@/lib/liuren/types";
import { getCreditStatus, getLiurenInterpretation } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useUserProfile } from "@/lib/context";
import { useUserStatus } from "@/lib/UserStatusContext";
import { useLocale, useTranslations } from "next-intl";

const PLATE_LAYOUT: Array<Branch | null> = [
  "巳", "午", "未", "申",
  "辰", null, null, "酉",
  "卯", null, null, "戌",
  "寅", "丑", "子", "亥",
];

const DEFAULT_LOCATION = {
  longitude: 116.4,
  latitude: 39.9,
  timezoneOffset: 8,
};

const GEOLOCATION_CACHED_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 1800,
  maximumAge: 600000,
};
const GEOLOCATION_PRECISE_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};
const GEOLOCATION_COARSE_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12000,
  maximumAge: 120000,
};

type CastMode = "realtime" | "advanced";

type CastMeta = {
  question: string;
  mode: CastMode;
  input: DaLiuRenInput;
  locationSummary: string;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

function toDateTimeInput(date: Date): DaLiuRenInput["datetime"] {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTimeValue(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatDateTimeValue(datetime: DaLiuRenInput["datetime"]): string {
  return `${datetime.year}-${pad2(datetime.month)}-${pad2(datetime.day)} ${pad2(datetime.hour)}:${pad2(datetime.minute)}`;
}

function parseDateValue(value: string): { year: number; month: number; day: number } | null {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseTimeValue(value: string): { hour: number; minute: number } | null {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function formatTimezoneOffset(value: number | undefined): string {
  const target = Number.isFinite(value) ? Number(value) : DEFAULT_LOCATION.timezoneOffset;
  return `${target >= 0 ? "+" : ""}${target}`;
}

type GeolocationError = Error & { code?: number };

type IpGeolocationResponse = {
  success?: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country?: string;
};

function getCurrentPosition(options: PositionOptions): Promise<{ longitude: number; latitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("geolocation_unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          longitude: Number(position.coords.longitude.toFixed(4)),
          latitude: Number(position.coords.latitude.toFixed(4)),
        });
      },
      (error) => {
        const wrappedError = new Error("geolocation_failed") as GeolocationError;
        wrappedError.code = error.code;
        reject(wrappedError);
      },
      options,
    );
  });
}

async function getPositionFromIp(): Promise<{ longitude: number; latitude: number; label: string }> {
  const response = await fetch("https://ipwho.is/", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("ip_location_request_failed");
  }
  const data = (await response.json()) as IpGeolocationResponse;
  if (!data.success || !Number.isFinite(data.longitude) || !Number.isFinite(data.latitude)) {
    throw new Error("ip_location_invalid_payload");
  }
  const parts = [data.city, data.region, data.country].filter((part) => typeof part === "string" && part.trim().length > 0);
  return {
    longitude: Number(data.longitude),
    latitude: Number(data.latitude),
    label: parts.join(" "),
  };
}

async function getCurrentPositionWithRetry(): Promise<{ longitude: number; latitude: number }> {
  const attempts = [
    GEOLOCATION_CACHED_OPTIONS,
    GEOLOCATION_PRECISE_OPTIONS,
    GEOLOCATION_COARSE_OPTIONS,
  ];

  let lastError: GeolocationError | null = null;
  for (const options of attempts) {
    try {
      return await getCurrentPosition(options);
    } catch (err) {
      const geoError = err as GeolocationError;
      lastError = geoError;
      // 用户主动拒绝权限时不再重试，避免无意义重复弹窗。
      if (geoError.code === 1) {
        throw geoError;
      }
    }
  }

  throw lastError ?? new Error("geolocation_failed");
}

export default function LiurenPage() {
  const locale = useLocale() as "zh" | "en";
  const t = useTranslations("Liuren");
  const { isAuthenticated, session } = useAuth();
  const { birthData } = useUserProfile();
  const { credits, updateCredit } = useUserStatus();
  const [question, setQuestion] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualDate, setManualDate] = useState(() => formatDateValue(new Date()));
  const [manualTime, setManualTime] = useState(() => formatTimeValue(new Date()));
  const [manualLongitude, setManualLongitude] = useState(DEFAULT_LOCATION.longitude);
  const [manualLatitude, setManualLatitude] = useState(DEFAULT_LOCATION.latitude);
  const [manualTimezoneOffset, setManualTimezoneOffset] = useState(DEFAULT_LOCATION.timezoneOffset);
  const [chart, setChart] = useState<DaLiuRenChart | null>(null);
  const [castMeta, setCastMeta] = useState<CastMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [benming, setBenming] = useState<string | null>(null);
  const [xingnian, setXingnian] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);

  const activeRelation = useMemo(() => {
    if (!chart || !activeBranch) {
      return null;
    }
    return chart.relationMap[activeBranch];
  }, [chart, activeBranch]);

  const creditInfo = credits.liuren ? {
    remaining: credits.liuren.remaining,
    cycle_limit: credits.liuren.cycle_limit,
    cycle_used: credits.liuren.cycle_used,
  } : null;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError(t("errors.questionRequired"));
      return;
    }

    setIsCasting(true);
    try {
      let nextInput: DaLiuRenInput;
      let locationSummary: string;
      let mode: CastMode = "realtime";

      if (showAdvanced) {
        const parsedDate = parseDateValue(manualDate);
        const parsedTime = parseTimeValue(manualTime);
        if (!parsedDate || !parsedTime) {
          setError(t("errors.manualDateTime"));
          return;
        }
        if (
          !Number.isFinite(manualLongitude)
          || !Number.isFinite(manualLatitude)
          || !Number.isFinite(manualTimezoneOffset)
        ) {
          setError(t("errors.compute"));
          return;
        }

        mode = "advanced";
        nextInput = {
          datetime: {
            year: parsedDate.year,
            month: parsedDate.month,
            day: parsedDate.day,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
          },
          longitude: manualLongitude,
          latitude: manualLatitude,
          timezoneOffset: manualTimezoneOffset,
        };
        locationSummary = `${t("locationManual")} (${manualLongitude.toFixed(2)}, ${manualLatitude.toFixed(2)})`;
      } else {
        const clickTime = new Date();
        const timezoneOffset = Number((-clickTime.getTimezoneOffset() / 60).toFixed(2));
        let longitude = DEFAULT_LOCATION.longitude;
        let latitude = DEFAULT_LOCATION.latitude;
        let locationPrefix = t("locationFallback");

        try {
          const currentPosition = await getCurrentPositionWithRetry();
          longitude = currentPosition.longitude;
          latitude = currentPosition.latitude;
          locationPrefix = t("locationDetected");
        } catch (geoErr) {
          const geoCode = (geoErr as GeolocationError).code;
          const reason = geoCode === 1
            ? t("locationReasonPermissionDenied")
            : geoCode === 2
              ? t("locationReasonUnavailable")
              : geoCode === 3
                ? t("locationReasonTimeout")
                : t("locationReasonUnknown");
          try {
            const ipPosition = await getPositionFromIp();
            longitude = ipPosition.longitude;
            latitude = ipPosition.latitude;
            locationPrefix = ipPosition.label
              ? `${t("locationIpFallback")}（${reason}，${ipPosition.label}）`
              : `${t("locationIpFallback")}（${reason}）`;
          } catch (ipErr) {
            locationPrefix = `${t("locationFallback")}（${reason}）`;
            console.warn("[liuren] ip geolocation failed", { error: ipErr });
          }
          console.warn("[liuren] geolocation failed", { code: geoCode, error: geoErr });
        }

        nextInput = {
          datetime: toDateTimeInput(clickTime),
          longitude,
          latitude,
          timezoneOffset,
        };
        locationSummary = `${locationPrefix} (${longitude.toFixed(2)}, ${latitude.toFixed(2)})`;
      }

      const next = buildDaLiuRenChart(nextInput);
      setChart(next);
      setCastMeta({
        question: trimmedQuestion,
        mode,
        input: nextInput,
        locationSummary,
      });
      setShowDetails(false);
      setActiveBranch(null);

      setAnalysisResult(null);
      setAnalysisError(null);
      setBenming(null);
      setXingnian(null);
      if (isAuthenticated && session?.access_token) {
        const profilePayload =
          birthData && Number.isFinite(birthData.birth_year)
            ? {
              birth_year: birthData.birth_year,
              gender: birthData.gender === "女" ? "female" as const : "male" as const,
            }
            : {};
        setIsAnalyzing(true);
        try {
          const interpretation = await getLiurenInterpretation({
            user_intent: trimmedQuestion,
            four_lessons_data: next.siKe,
            three_transmissions_data: next.sanChuan,
            shensha_data: next.shenSha,
            ...profilePayload,
            language: locale,
          }, session.access_token);
          setAnalysisResult(interpretation.markdown_content);
          setBenming(interpretation.benming ?? null);
          setXingnian(interpretation.xingnian ?? null);
          getCreditStatus("liuren", session.access_token).then((status) => {
            updateCredit("liuren", status);
          });
        } catch (analysisErr: unknown) {
          const message = analysisErr instanceof Error ? analysisErr.message : t("errors.interpret");
          const isQuotaErr =
            message.includes("额度不足")
            || message.includes("次数已用完")
            || message.includes("quota used up");
          if (isQuotaErr && session?.access_token) {
            getCreditStatus("liuren", session.access_token).then((status) => {
              updateCredit("liuren", status);
            });
          }
          setAnalysisError(isQuotaErr ? t("quotaUsed") : message);
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        setIsAnalyzing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.compute"));
    } finally {
      setIsCasting(false);
    }
  };

  const relationClass = (branch: Branch): string => {
    if (!activeBranch || !activeRelation) {
      return "border-[#1A1A1A]/15 bg-white text-[#1A1A1A]";
    }
    if (branch === activeBranch) {
      return "border-[#B8860B] bg-[#B8860B]/12 text-[#1A1A1A] shadow-sm";
    }
    if (activeRelation.刑 === branch) {
      return "border-[#8B1E1E]/40 bg-[#8B1E1E]/8 text-[#7A1414]";
    }
    if (activeRelation.冲 === branch) {
      return "border-[#1E4E8B]/40 bg-[#1E4E8B]/8 text-[#163E70]";
    }
    if (activeRelation.破 === branch) {
      return "border-[#8B5E1E]/40 bg-[#8B5E1E]/8 text-[#6D4917]";
    }
    if (activeRelation.害 === branch) {
      return "border-[#1E7A5C]/40 bg-[#1E7A5C]/8 text-[#175E47]";
    }
    return "border-[#1A1A1A]/15 bg-white text-[#1A1A1A]/70";
  };

  const BranchBadge = ({ branch, small = false }: { branch: Branch; small?: boolean }) => (
    <button
      type="button"
      onClick={() => setActiveBranch((prev) => (prev === branch ? null : branch))}
      className={`
        border rounded-md transition-colors
        ${small ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}
        ${relationClass(branch)}
      `}
      title={t("clickHint")}
    >
      {branch}
    </button>
  );

  const getCell = (earth: Branch) => chart?.tianDiPan.cells.find((c) => c.earthBranch === earth);

  return (
    <main className="min-h-screen bg-[#F8F8F0]">
      <Header />
      <div className="page-shell space-y-8">
        <section className="zen-card w-full max-w-3xl mx-auto p-6 sm:p-8 space-y-5">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-light tracking-[0.3em] text-[#1A1A1A]">{t("title")}</h2>
            <p className="text-[#1A1A1A]/60 font-light tracking-widest text-sm">{t("questionSubtitle")}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="space-y-2 block">
              <span className="text-[11px] text-[#1A1A1A]/55 tracking-[0.15em]">{t("questionTitle")}</span>
              <textarea
                rows={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("questionPlaceholder")}
                className="zen-input w-full resize-y min-h-[110px] leading-relaxed"
              />
            </label>

            <div className="flex items-center justify-between border border-[#1A1A1A]/10 rounded-lg px-3 py-2 bg-white/70">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="text-xs tracking-widest text-[#1A1A1A]/65 hover:text-[#1A1A1A]"
              >
                {t("advanced")}
              </button>
              <span className="text-[10px] tracking-widest text-[#1A1A1A]/45">
                {showAdvanced ? t("modeManual") : t("modeRealtime")}
              </span>
            </div>

            {showAdvanced && (
              <div className="rounded-lg border border-[#1A1A1A]/10 bg-white/80 p-4 space-y-4">
                <p className="text-[11px] text-[#1A1A1A]/55 tracking-wider">{t("advancedHint")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[10px] text-[#1A1A1A]/45 tracking-widest uppercase">{t("manualDate")}</span>
                    <input
                      type="date"
                      className="zen-input w-full text-center"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-[#1A1A1A]/45 tracking-widest uppercase">{t("manualTime")}</span>
                    <input
                      type="time"
                      className="zen-input w-full text-center"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-[#1A1A1A]/45 tracking-widest uppercase">{t("longitude")}</span>
                    <input
                      type="number"
                      step="0.01"
                      className="zen-input w-full text-center"
                      value={manualLongitude}
                      onChange={(e) => setManualLongitude(Number(e.target.value))}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-[#1A1A1A]/45 tracking-widest uppercase">{t("latitude")}</span>
                    <input
                      type="number"
                      step="0.01"
                      className="zen-input w-full text-center"
                      value={manualLatitude}
                      onChange={(e) => setManualLatitude(Number(e.target.value))}
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] text-[#1A1A1A]/45 tracking-widest uppercase">{t("timezone")}</span>
                    <input
                      type="number"
                      step="0.5"
                      className="zen-input w-full text-center"
                      value={manualTimezoneOffset}
                      onChange={(e) => setManualTimezoneOffset(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>
            )}

            <button type="submit" className="zen-button w-full disabled:opacity-60" disabled={isCasting}>
              {isCasting ? t("casting") : t("cast")}
            </button>
          </form>
          {isAuthenticated && creditInfo && (
            <p className="text-xs text-[#1A1A1A]/50 tracking-widest">
              {t("giftQuota")}：
              <span className="text-[#B8860B] font-medium ml-1">
                {(creditInfo.cycle_limit ?? 1) - (creditInfo.cycle_used ?? 0)}/{creditInfo.cycle_limit ?? 1}
              </span>
            </p>
          )}
          {error && <p className="text-sm text-red-700/80">{error}</p>}
        </section>

        {chart && castMeta && (
          <>
            <section className="zen-card p-6 space-y-4">
              <h3 className="text-lg font-light tracking-[0.2em] text-[#1A1A1A]">{t("summaryTitle")}</h3>
              <div className="space-y-2 text-sm text-[#1A1A1A]/80">
                <p>
                  <span className="text-[#1A1A1A]/55">{t("questionTitle")}：</span>
                  {castMeta.question}
                </p>
                <p>
                  <span className="text-[#1A1A1A]/55">{t("castTime")}：</span>
                  {formatDateTimeValue(castMeta.input.datetime)}
                </p>
                <p>
                  <span className="text-[#1A1A1A]/55">{t("location")}：</span>
                  {castMeta.locationSummary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="px-3 py-1.5 text-xs tracking-widest rounded border border-[#1A1A1A]/15 bg-white/85 text-[#1A1A1A]/70"
              >
                {showDetails ? t("hideDetails") : t("showDetails")}
              </button>
            </section>

            {benming && xingnian && (
              <section className="zen-card p-4 sm:p-5">
                <div className="flex items-center gap-6 text-sm text-[#1A1A1A]/85">
                  <p>
                    <span className="text-[#1A1A1A]/55">{t("benming")}：</span>
                    <span className="text-base">{benming}</span>
                  </p>
                  <p>
                    <span className="text-[#1A1A1A]/55">{t("xingnian")}：</span>
                    <span className="text-base">{xingnian}</span>
                  </p>
                </div>
              </section>
            )}

            {showDetails && (
              <>
                <section className="zen-card p-6 space-y-3">
                  <h3 className="text-lg font-light tracking-[0.2em] text-[#1A1A1A]">{t("questionResultTitle")}</h3>
                  <p className="text-sm text-[#1A1A1A]/85 leading-relaxed">{castMeta.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#1A1A1A]/70">
                    <p>{t("castTime")}: {formatDateTimeValue(castMeta.input.datetime)}</p>
                    <p>{t("usedInput")}: {castMeta.mode === "advanced" ? t("modeManual") : t("modeRealtime")}</p>
                    <p>{t("location")}: {castMeta.locationSummary}</p>
                    <p>{t("timezone")}: UTC{formatTimezoneOffset(castMeta.input.timezoneOffset)}</p>
                  </div>
                </section>

                <section className="zen-card p-6 space-y-4">
                  <h3 className="text-lg font-light tracking-[0.2em] text-[#1A1A1A]">{t("sanChuan")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: "initial", label: t("initial"), value: chart.sanChuan.initial },
                      { key: "middle", label: t("middle"), value: chart.sanChuan.middle },
                      { key: "final", label: t("final"), value: chart.sanChuan.final },
                    ].map((item) => (
                      <div key={item.key} className="border border-[#1A1A1A]/10 rounded-lg p-4 bg-white/90 space-y-2">
                        <p className="text-xs tracking-widest text-[#1A1A1A]/45 uppercase">{item.label}</p>
                        <div className="flex items-center gap-2">
                          <BranchBadge branch={item.value} />
                          <span className="text-xs text-[#1A1A1A]/55">{chart.tianDiPan.cells.find((c) => c.tianBranch === item.value)?.tianGuan}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-[#1A1A1A]/75">
                    <span className="font-medium">{t("method")}: </span>
                    {chart.sanChuan.method} · {chart.sanChuan.subType}
                  </div>
                </section>

                <section className="zen-card p-6 space-y-4">
                  <h3 className="text-lg font-light tracking-[0.2em] text-[#1A1A1A]">{t("siKe")}</h3>
                  <div className="space-y-2">
                    {chart.siKe.items.map((item) => (
                      <div key={item.name} className="grid grid-cols-12 items-center gap-2 border border-[#1A1A1A]/8 rounded-md p-3 bg-white/90">
                        <div className="col-span-2 text-xs tracking-widest text-[#1A1A1A]/55">{item.name}</div>
                        <div className="col-span-3 flex items-center gap-1.5">
                          <BranchBadge branch={item.upper} small />
                          <span className="text-xs text-[#1A1A1A]/50">{item.tianGuan}</span>
                        </div>
                        <div className="col-span-3 text-xs text-[#1A1A1A]/75">{String(item.lower)}</div>
                        <div className="col-span-4 text-xs text-[#1A1A1A]/65">{item.relation}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="zen-card p-6 space-y-4">
                  <h3 className="text-lg font-light tracking-[0.2em] text-[#1A1A1A]">{t("tianDiPan")}</h3>
                  <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
                    {PLATE_LAYOUT.map((branch, idx) => {
                      if (!branch) {
                        return <div key={`empty-${idx}`} className="h-20 rounded-md bg-transparent" />;
                      }
                      const cell = getCell(branch);
                      return (
                        <div key={branch} className="h-20 rounded-md border border-[#1A1A1A]/10 bg-white/90 px-2 py-1.5 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <BranchBadge branch={branch} small />
                            <span className="text-[10px] text-[#1A1A1A]/45">{t("earth")}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            {cell ? <BranchBadge branch={cell.tianBranch} small /> : <span className="text-xs text-[#1A1A1A]/40">-</span>}
                            <span className="text-[10px] text-[#1A1A1A]/45">{cell?.tianGuan}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#1A1A1A]/55 text-center tracking-wider">
                    {t("guiRen")}：{chart.tianDiPan.guiRenType} · {chart.tianDiPan.guiRenBranch} · {chart.tianDiPan.guiRenDirection}
                  </p>
                </section>

                <section className="zen-card p-6 space-y-4">
                  <h3 className="text-lg font-light tracking-[0.2em] text-[#1A1A1A]">{t("timing")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#1A1A1A]/75">
                    <p>{t("trueSolar")}: {`${chart.timing.trueSolar.trueSolarTime.year}-${chart.timing.trueSolar.trueSolarTime.month}-${chart.timing.trueSolar.trueSolarTime.day} ${String(chart.timing.trueSolar.trueSolarTime.hour).padStart(2, "0")}:${String(chart.timing.trueSolar.trueSolarTime.minute).padStart(2, "0")}`}</p>
                    <p>{t("correction")}: {chart.timing.trueSolar.totalCorrectionMinutes.toFixed(2)} min</p>
                    <p>{t("sunrise")}: {chart.timing.daylight.sunriseText}</p>
                    <p>{t("sunset")}: {chart.timing.daylight.sunsetText}</p>
                    <p>{t("zhongqi")}: {chart.yueJiang.zhongQi} ({chart.yueJiang.zhongQiTime})</p>
                    <p>{t("yuejiang")}: {chart.yueJiang.branch} · {chart.yueJiang.name}</p>
                  </div>
                </section>

                <section className="zen-card p-6 space-y-4">
                  <h3 className="text-lg font-light tracking-[0.2em] text-[#1A1A1A]">{t("shenSha")}</h3>
                  <div className="space-y-2">
                    {chart.shenSha.map((item) => (
                      <div key={item.name} className="border border-[#1A1A1A]/8 rounded-md p-3 bg-white/90">
                        <p className="text-sm text-[#1A1A1A]">{item.name}</p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {item.branches.map((branch) => (
                            <BranchBadge key={`${item.name}-${branch}`} branch={branch} small />
                          ))}
                        </div>
                        <p className="text-xs text-[#1A1A1A]/55 mt-2">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <section className="zen-card p-6 space-y-3">
              <h3 className="text-lg font-light tracking-[0.2em] text-[#1A1A1A]">{t("interpretation")}</h3>
              {isAnalyzing && (
                <p className="text-sm text-[#1A1A1A]/60">{t("interpreting")}</p>
              )}
              {!isAnalyzing && analysisError && (
                <p className="text-sm text-red-700/80">{analysisError}</p>
              )}
              {!isAnalyzing && !analysisError && analysisResult && (
                <div className="text-sm text-[#1A1A1A]/85 leading-relaxed whitespace-pre-line">
                  {analysisResult}
                </div>
              )}
              {!isAnalyzing && !analysisError && !analysisResult && !isAuthenticated && (
                <p className="text-sm text-[#1A1A1A]/60">{t("loginRequired")}</p>
              )}
              {!isAnalyzing && !analysisError && !analysisResult && isAuthenticated && (
                <p className="text-sm text-[#1A1A1A]/60">{t("interpretationEmpty")}</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

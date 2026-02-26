export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];
export type YinYang = "阳" | "阴";

export interface DateTimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface DaLiuRenInput {
  datetime: DateTimeInput;
  longitude: number;
  latitude: number;
  timezoneOffset?: number;
}

export interface DateTimeParts extends DateTimeInput {
  second: number;
}

export interface TrueSolarTimeResult {
  standardTime: DateTimeParts;
  trueSolarTime: DateTimeParts;
  equationOfTimeMinutes: number;
  longitudeCorrectionMinutes: number;
  totalCorrectionMinutes: number;
  dayOffset: number;
}

export interface SunBoundaryResult {
  sunriseMinutes: number | null;
  sunsetMinutes: number | null;
  sunriseText: string;
  sunsetText: string;
  isDaytime: boolean;
}

export interface YueJiangInfo {
  zhongQi: string;
  zhongQiTime: string;
  branch: Branch;
  name: string;
}

export interface TianDiPanCell {
  index: number;
  earthBranch: Branch;
  tianBranch: Branch;
  tianGuan: string;
}

export interface TianDiPan {
  earthPlate: Branch[];
  tianPlate: Branch[];
  tianGuanPlate: string[];
  cells: TianDiPanCell[];
  guiRenType: "昼贵" | "夜贵";
  guiRenBranch: Branch;
  guiRenDirection: "顺" | "逆";
}

export type KeRelation = "下贼上" | "上克下" | "下生上" | "上生下" | "比和";

export interface SiKeItem {
  name: "一课" | "二课" | "三课" | "四课";
  upper: Branch;
  lower: Branch | Stem;
  tianGuan: string;
  relation: KeRelation;
}

export interface SiKeResult {
  items: SiKeItem[];
  dayJiGong: Branch;
}

export type SanChuanMethod =
  | "贼克法"
  | "比用法"
  | "涉害法"
  | "遥克法"
  | "昂星法"
  | "别责法"
  | "八专法"
  | "伏吟法"
  | "反吟法";

export interface SanChuanTrace {
  step: SanChuanMethod;
  hit: boolean;
  reason: string;
}

export interface SanChuanResult {
  method: SanChuanMethod;
  subType: string;
  initial: Branch;
  middle: Branch;
  final: Branch;
  trace: SanChuanTrace[];
}

export interface ShenShaItem {
  name: string;
  branches: Branch[];
  note: string;
}

export interface RelationMapItem {
  刑: Branch;
  冲: Branch;
  破: Branch;
  害: Branch;
}

export interface DaLiuRenChart {
  input: DaLiuRenInput;
  timing: {
    trueSolar: TrueSolarTimeResult;
    daylight: SunBoundaryResult;
  };
  pillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
    dayStem: Stem;
    dayBranch: Branch;
    hourBranch: Branch;
  };
  yueJiang: YueJiangInfo;
  tianDiPan: TianDiPan;
  siKe: SiKeResult;
  sanChuan: SanChuanResult;
  shenSha: ShenShaItem[];
  relationMap: Record<Branch, RelationMapItem>;
}

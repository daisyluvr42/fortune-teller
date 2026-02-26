import {
  BRANCH_ELEMENT,
  CONTROL_MAP,
  GENERATE_MAP,
  JIA_ZI_60,
  LIU_CHONG,
  LIU_HAI,
  LIU_PO,
  STEM_ELEMENT,
  XING,
} from "./constants";
import { BRANCHES, Branch, DateTimeInput, DateTimeParts, Stem, YinYang } from "./types";

export function normalizeBranch(value: string): Branch {
  if ((BRANCHES as readonly string[]).includes(value)) {
    return value as Branch;
  }
  throw new Error(`非法地支: ${value}`);
}

export function stemYinYang(stem: Stem): YinYang {
  const yang = new Set<Stem>(["甲", "丙", "戊", "庚", "壬"]);
  return yang.has(stem) ? "阳" : "阴";
}

export function branchYinYang(branch: Branch): YinYang {
  const yang = new Set<Branch>(["子", "寅", "辰", "午", "申", "戌"]);
  return yang.has(branch) ? "阳" : "阴";
}

export function getElementOf(value: Branch | Stem): "木" | "火" | "土" | "金" | "水" {
  if ((BRANCHES as readonly string[]).includes(value)) {
    return BRANCH_ELEMENT[value as Branch];
  }
  return STEM_ELEMENT[value as Stem];
}

export function controls(a: Branch | Stem, b: Branch | Stem): boolean {
  return CONTROL_MAP[getElementOf(a)] === getElementOf(b);
}

export function generates(a: Branch | Stem, b: Branch | Stem): boolean {
  return GENERATE_MAP[getElementOf(a)] === getElementOf(b);
}

export function getRelationMap(branch: Branch): { 刑: Branch; 冲: Branch; 破: Branch; 害: Branch } {
  return {
    刑: XING[branch],
    冲: LIU_CHONG[branch],
    破: LIU_PO[branch],
    害: LIU_HAI[branch],
  };
}

export function shiftBranch(branch: Branch, step: number): Branch {
  const idx = BRANCHES.indexOf(branch);
  const target = ((idx + step) % 12 + 12) % 12;
  return BRANCHES[target];
}

export function toUtcDate(input: DateTimeInput, timezoneOffset: number): Date {
  return new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour - timezoneOffset, input.minute, 0));
}

export function fromUtcDate(utcDate: Date, timezoneOffset: number): DateTimeParts {
  const shifted = new Date(utcDate.getTime() + timezoneOffset * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

export function addMinutes(input: DateTimeInput, timezoneOffset: number, minutes: number): { parts: DateTimeParts; dayOffset: number } {
  const utc = toUtcDate(input, timezoneOffset);
  const shifted = new Date(utc.getTime() + minutes * 60 * 1000);
  const parts = fromUtcDate(shifted, timezoneOffset);
  const baseDay = Date.UTC(input.year, input.month - 1, input.day);
  const nextDay = Date.UTC(parts.year, parts.month - 1, parts.day);
  const dayOffset = Math.round((nextDay - baseDay) / (24 * 60 * 60 * 1000));
  return { parts, dayOffset };
}

export function minutesOfDay(input: DateTimeInput | DateTimeParts): number {
  return input.hour * 60 + input.minute;
}

export function formatHm(totalMinutes: number | null): string {
  if (totalMinutes === null) {
    return "--:--";
  }
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const mm = Math.floor(normalized % 60)
    .toString()
    .padStart(2, "0");
  return `${hh}:${mm}`;
}

export function dayOfYear(input: DateTimeInput): number {
  const current = Date.UTC(input.year, input.month - 1, input.day);
  const jan1 = Date.UTC(input.year, 0, 1);
  return Math.floor((current - jan1) / (24 * 3600 * 1000)) + 1;
}

export function getXunKong(dayGanZhi: string): [Branch, Branch] {
  const idx = JIA_ZI_60.indexOf(dayGanZhi as (typeof JIA_ZI_60)[number]);
  if (idx < 0) {
    return ["戌", "亥"];
  }
  const xun = Math.floor(idx / 10);
  const table: Array<[Branch, Branch]> = [
    ["戌", "亥"],
    ["申", "酉"],
    ["午", "未"],
    ["辰", "巳"],
    ["寅", "卯"],
    ["子", "丑"],
  ];
  return table[xun] ?? ["戌", "亥"];
}

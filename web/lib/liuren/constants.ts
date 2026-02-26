import { Branch, Stem } from "./types";

export const ZHONG_QI_TO_YUE_JIANG: Record<string, Branch> = {
  大寒: "子",
  雨水: "亥",
  春分: "戌",
  谷雨: "酉",
  小满: "申",
  夏至: "未",
  大暑: "午",
  处暑: "巳",
  秋分: "辰",
  霜降: "卯",
  小雪: "寅",
  冬至: "丑",
};

export const YUE_JIANG_NAME: Record<Branch, string> = {
  子: "神后",
  丑: "大吉",
  寅: "功曹",
  卯: "太冲",
  辰: "天罡",
  巳: "太乙",
  午: "胜光",
  未: "小吉",
  申: "传送",
  酉: "从魁",
  戌: "河魁",
  亥: "登明",
};

export const JI_GONG: Record<Stem, Branch> = {
  甲: "寅",
  乙: "辰",
  丙: "巳",
  丁: "未",
  戊: "巳",
  己: "未",
  庚: "申",
  辛: "戌",
  壬: "亥",
  癸: "丑",
};

export const STEM_ELEMENT: Record<Stem, "木" | "火" | "土" | "金" | "水"> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

export const BRANCH_ELEMENT: Record<Branch, "木" | "火" | "土" | "金" | "水"> = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水",
};

export const CONTROL_MAP: Record<"木" | "火" | "土" | "金" | "水", "木" | "火" | "土" | "金" | "水"> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火",
};

export const GENERATE_MAP: Record<"木" | "火" | "土" | "金" | "水", "木" | "火" | "土" | "金" | "水"> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

export const YANG_GUI: Record<Stem, Branch> = {
  甲: "丑",
  戊: "丑",
  庚: "丑",
  乙: "子",
  己: "子",
  丙: "亥",
  丁: "亥",
  壬: "巳",
  癸: "巳",
  辛: "午",
};

export const YIN_GUI: Record<Stem, Branch> = {
  甲: "未",
  戊: "未",
  庚: "未",
  乙: "申",
  己: "申",
  丙: "酉",
  丁: "酉",
  壬: "卯",
  癸: "卯",
  辛: "寅",
};

export const TIAN_GUAN_SEQ = [
  "贵人",
  "腾蛇",
  "朱雀",
  "六合",
  "勾陈",
  "青龙",
  "天空",
  "白虎",
  "太常",
  "玄武",
  "太阴",
  "天后",
] as const;

export const SHUN_GUI_POS = new Set<Branch>(["亥", "子", "丑", "寅", "卯", "辰"]);

export const LIU_CHONG: Record<Branch, Branch> = {
  子: "午",
  丑: "未",
  寅: "申",
  卯: "酉",
  辰: "戌",
  巳: "亥",
  午: "子",
  未: "丑",
  申: "寅",
  酉: "卯",
  戌: "辰",
  亥: "巳",
};

export const LIU_PO: Record<Branch, Branch> = {
  子: "酉",
  丑: "辰",
  寅: "亥",
  卯: "午",
  辰: "丑",
  巳: "申",
  午: "卯",
  未: "戌",
  申: "巳",
  酉: "子",
  戌: "未",
  亥: "寅",
};

export const LIU_HAI: Record<Branch, Branch> = {
  子: "未",
  丑: "午",
  寅: "巳",
  卯: "辰",
  辰: "卯",
  巳: "寅",
  午: "丑",
  未: "子",
  申: "亥",
  酉: "戌",
  戌: "酉",
  亥: "申",
};

export const XING: Record<Branch, Branch> = {
  子: "卯",
  丑: "戌",
  寅: "巳",
  卯: "子",
  辰: "辰",
  巳: "申",
  午: "午",
  未: "丑",
  申: "寅",
  酉: "酉",
  戌: "未",
  亥: "亥",
};

export const SAN_HE_YIMA: Array<{ group: Branch[]; yima: Branch }> = [
  { group: ["申", "子", "辰"], yima: "寅" },
  { group: ["寅", "午", "戌"], yima: "申" },
  { group: ["亥", "卯", "未"], yima: "巳" },
  { group: ["巳", "酉", "丑"], yima: "亥" },
];

export const YUE_DE_STEM_BY_MONTH_BRANCH_GROUP: Array<{ group: Branch[]; stem: Stem }> = [
  { group: ["寅", "午", "戌"], stem: "丙" },
  { group: ["申", "子", "辰"], stem: "壬" },
  { group: ["亥", "卯", "未"], stem: "甲" },
  { group: ["巳", "酉", "丑"], stem: "庚" },
];

export const TIAN_GAN_WU_HE: Record<Stem, Stem> = {
  甲: "己",
  乙: "庚",
  丙: "辛",
  丁: "壬",
  戊: "癸",
  己: "甲",
  庚: "乙",
  辛: "丙",
  壬: "丁",
  癸: "戊",
};

export const MENG_BRANCHES = new Set<Branch>(["寅", "巳", "申", "亥"]);

export const JIA_ZI_60 = [
  "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉",
  "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未",
  "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
  "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯",
  "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
  "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥",
] as const;

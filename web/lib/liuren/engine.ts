import {
  JI_GONG,
  LIU_CHONG,
  SAN_HE_YIMA,
  SHUN_GUI_POS,
  TIAN_GUAN_SEQ,
  YANG_GUI,
  YIN_GUI,
  YUE_DE_STEM_BY_MONTH_BRANCH_GROUP,
} from "./constants";
import { resolvePillars, resolveYueJiangByZhongQi } from "./calendar";
import { computeSunBoundary, convertTrueSolarTime } from "./astronomy";
import {
  Branch,
  BRANCHES,
  DaLiuRenChart,
  DaLiuRenInput,
  KeRelation,
  RelationMapItem,
  ShenShaItem,
  SiKeItem,
  Stem,
  TianDiPan,
} from "./types";
import { resolveSanChuanByNineMethods } from "./nine-methods";
import { controls, generates, getRelationMap, getXunKong, normalizeBranch } from "./utils";

function asStem(value: string): Stem {
  const stems = new Set(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
  if (!stems.has(value)) {
    throw new Error(`非法天干: ${value}`);
  }
  return value as Stem;
}

function asBranch(value: string): Branch {
  return normalizeBranch(value);
}

function buildTianDiPan(
  yueJiang: Branch,
  hourBranch: Branch,
  dayStem: Stem,
  isDaytime: boolean,
): {
  pan: TianDiPan;
  getShangShen: (branch: Branch) => Branch;
  getXiaShen: (branch: Branch) => Branch;
  getTianGuan: (branch: Branch) => string;
  isFuyin: boolean;
  isFanyin: boolean;
} {
  const earthPlate = [...BRANCHES] as Branch[];
  const tianPlate: Branch[] = new Array(12).fill("子") as Branch[];
  const tianGuanPlate: string[] = new Array(12).fill("");

  const hourIdx = BRANCHES.indexOf(hourBranch);
  const yueIdx = BRANCHES.indexOf(yueJiang);

  for (let i = 0; i < 12; i += 1) {
    const earthIndex = (hourIdx + i) % 12;
    const tianIndex = (yueIdx + i) % 12;
    tianPlate[earthIndex] = BRANCHES[tianIndex];
  }

  const guiBranch = isDaytime ? YANG_GUI[dayStem] : YIN_GUI[dayStem];
  const guiIndex = tianPlate.findIndex((b) => b === guiBranch);
  const guiEarth = earthPlate[guiIndex] ?? "子";
  const direction = SHUN_GUI_POS.has(guiEarth) ? "顺" : "逆";

  for (let i = 0; i < 12; i += 1) {
    let pos = guiIndex;
    pos = direction === "顺" ? pos + i : pos - i;
    pos = ((pos % 12) + 12) % 12;
    tianGuanPlate[pos] = TIAN_GUAN_SEQ[i];
  }

  const getShangShen = (branch: Branch): Branch => {
    const idx = earthPlate.findIndex((b) => b === branch);
    return tianPlate[idx < 0 ? 0 : idx];
  };

  const getXiaShen = (branch: Branch): Branch => {
    const idx = tianPlate.findIndex((b) => b === branch);
    return earthPlate[idx < 0 ? 0 : idx];
  };

  const getTianGuan = (branch: Branch): string => {
    const idx = tianPlate.findIndex((b) => b === branch);
    return tianGuanPlate[idx < 0 ? 0 : idx] ?? "";
  };

  const isFuyin = tianPlate.every((b, i) => b === earthPlate[i]);
  const isFanyin = tianPlate.every((b, i) => b === LIU_CHONG[earthPlate[i]]);

  const pan: TianDiPan = {
    earthPlate,
    tianPlate,
    tianGuanPlate,
    cells: earthPlate.map((earthBranch, index) => ({
      index,
      earthBranch,
      tianBranch: tianPlate[index],
      tianGuan: tianGuanPlate[index] ?? "",
    })),
    guiRenType: isDaytime ? "昼贵" : "夜贵",
    guiRenBranch: guiBranch,
    guiRenDirection: direction,
  };

  return {
    pan,
    getShangShen,
    getXiaShen,
    getTianGuan,
    isFuyin,
    isFanyin,
  };
}

function getKeRelation(upper: Branch, lower: Branch | Stem): KeRelation {
  if (controls(lower, upper)) return "下贼上";
  if (controls(upper, lower)) return "上克下";
  if (generates(lower, upper)) return "下生上";
  if (generates(upper, lower)) return "上生下";
  return "比和";
}

function buildSiKe(
  dayStem: Stem,
  dayBranch: Branch,
  getShangShen: (branch: Branch) => Branch,
  getTianGuan: (branch: Branch) => string,
): { items: SiKeItem[]; dayJiGong: Branch } {
  const dayJiGong = JI_GONG[dayStem];

  const oneUpper = getShangShen(dayJiGong);
  const twoUpper = getShangShen(oneUpper);
  const threeUpper = getShangShen(dayBranch);
  const fourUpper = getShangShen(threeUpper);

  const items: SiKeItem[] = [
    {
      name: "一课",
      upper: oneUpper,
      lower: dayStem,
      tianGuan: getTianGuan(oneUpper),
      relation: getKeRelation(oneUpper, dayStem),
    },
    {
      name: "二课",
      upper: twoUpper,
      lower: oneUpper,
      tianGuan: getTianGuan(twoUpper),
      relation: getKeRelation(twoUpper, oneUpper),
    },
    {
      name: "三课",
      upper: threeUpper,
      lower: dayBranch,
      tianGuan: getTianGuan(threeUpper),
      relation: getKeRelation(threeUpper, dayBranch),
    },
    {
      name: "四课",
      upper: fourUpper,
      lower: threeUpper,
      tianGuan: getTianGuan(fourUpper),
      relation: getKeRelation(fourUpper, threeUpper),
    },
  ];

  return { items, dayJiGong };
}

function computeShenSha(
  dayBranch: Branch,
  dayPillar: string,
  monthBranch: Branch,
  sanChuan: [Branch, Branch, Branch],
): ShenShaItem[] {
  const result: ShenShaItem[] = [];

  const yiMa = SAN_HE_YIMA.find((item) => item.group.includes(dayBranch))?.yima;
  if (yiMa) {
    result.push({
      name: "驿马",
      branches: [yiMa],
      note: "以日支三合局取驿马",
    });
  }

  const kongWang = getXunKong(dayPillar);
  result.push({
    name: "空亡",
    branches: [kongWang[0], kongWang[1]],
    note: `按日柱旬空推得 ${kongWang[0]}${kongWang[1]}`,
  });

  const yueDeStem = YUE_DE_STEM_BY_MONTH_BRANCH_GROUP.find((item) => item.group.includes(monthBranch))?.stem;
  if (yueDeStem) {
    result.push({
      name: "德神",
      branches: [JI_GONG[yueDeStem]],
      note: `月德取${yueDeStem}，寄宫${JI_GONG[yueDeStem]}`,
    });
  }

  const [a, b, c] = sanChuan;
  const pairs: Array<[Branch, Branch]> = [
    [a, b],
    [b, c],
    [a, c],
  ];
  const xingHaiSet = new Set<Branch>();

  for (const [x, y] of pairs) {
    const relation = getRelationMap(x);
    if (relation.刑 === y || relation.害 === y) {
      xingHaiSet.add(x);
      xingHaiSet.add(y);
    }
    const reverse = getRelationMap(y);
    if (reverse.刑 === x || reverse.害 === x) {
      xingHaiSet.add(x);
      xingHaiSet.add(y);
    }
  }

  if (xingHaiSet.size > 0) {
    result.push({
      name: "刑害",
      branches: [...xingHaiSet],
      note: "三传内部出现刑或害",
    });
  }

  return result;
}

export function buildDaLiuRenChart(input: DaLiuRenInput): DaLiuRenChart {
  const trueSolar = convertTrueSolarTime(input);
  const daylight = computeSunBoundary(input, trueSolar);

  const pillars = resolvePillars(trueSolar.trueSolarTime);
  const dayStem = asStem(pillars.dayStem);
  const dayBranch = asBranch(pillars.dayBranch);
  const hourBranch = asBranch(pillars.hourBranch);
  const monthBranch = asBranch(pillars.monthBranch);

  const yueJiang = resolveYueJiangByZhongQi(trueSolar.trueSolarTime);
  const panContext = buildTianDiPan(yueJiang.branch, hourBranch, dayStem, daylight.isDaytime);

  const siKe = buildSiKe(dayStem, dayBranch, panContext.getShangShen, panContext.getTianGuan);

  const sanChuan = resolveSanChuanByNineMethods({
    dayStem,
    dayBranch,
    siKe: siKe.items,
    isFuyin: panContext.isFuyin,
    isFanyin: panContext.isFanyin,
    getShangShen: panContext.getShangShen,
    getXiaShen: panContext.getXiaShen,
    dayJiGong: siKe.dayJiGong,
  });

  const shenSha = computeShenSha(dayBranch, pillars.day, monthBranch, [sanChuan.initial, sanChuan.middle, sanChuan.final]);

  const relationMap = BRANCHES.reduce((acc, branch) => {
    acc[branch] = getRelationMap(branch);
    return acc;
  }, {} as Record<Branch, RelationMapItem>);

  return {
    input,
    timing: {
      trueSolar,
      daylight,
    },
    pillars: {
      year: pillars.year,
      month: pillars.month,
      day: pillars.day,
      hour: pillars.hour,
      dayStem,
      dayBranch,
      hourBranch,
    },
    yueJiang,
    tianDiPan: panContext.pan,
    siKe,
    sanChuan,
    shenSha,
    relationMap,
  };
}

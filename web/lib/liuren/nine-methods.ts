import {
  JI_GONG,
  LIU_CHONG,
  MENG_BRANCHES,
  SAN_HE_YIMA,
  TIAN_GAN_WU_HE,
  XING,
} from "./constants";
import {
  Branch,
  KeRelation,
  SanChuanMethod,
  SanChuanResult,
  SanChuanTrace,
  SiKeItem,
  Stem,
  YinYang,
} from "./types";
import { branchYinYang, controls, getRelationMap, stemYinYang } from "./utils";

interface Candidate {
  upper: Branch;
  lessonIndex: number;
  relation: KeRelation;
}

interface NineMethodContext {
  dayStem: Stem;
  dayBranch: Branch;
  siKe: SiKeItem[];
  isFuyin: boolean;
  isFanyin: boolean;
  getShangShen: (branch: Branch) => Branch;
  getXiaShen: (branch: Branch) => Branch;
  dayJiGong: Branch;
}

function makeResult(
  method: SanChuanMethod,
  subType: string,
  initial: Branch,
  getShangShen: (branch: Branch) => Branch,
  trace: SanChuanTrace[],
  fixedMiddle?: Branch,
  fixedFinal?: Branch,
): SanChuanResult {
  const middle = fixedMiddle ?? getShangShen(initial);
  const final = fixedFinal ?? getShangShen(middle);
  return {
    method,
    subType,
    initial,
    middle,
    final,
    trace,
  };
}

function byYinYang(candidates: Candidate[], dayStem: Stem): Candidate[] {
  const dayYinYang: YinYang = stemYinYang(dayStem);
  return candidates.filter((c) => branchYinYang(c.upper) === dayYinYang);
}

function pickSheHaiCandidate(candidates: Candidate[], ctx: NineMethodContext): { picked: Candidate; note: string } | null {
  if (candidates.length === 0) {
    return null;
  }

  const lowerBranches = ctx.siKe
    .map((k) => k.lower)
    .filter((x): x is Branch => x.length === 1 && x !== "甲" && x !== "乙" && x !== "丙" && x !== "丁" && x !== "戊" && x !== "己" && x !== "庚" && x !== "辛" && x !== "壬" && x !== "癸");

  const scored = candidates.map((candidate) => {
    const relation = getRelationMap(candidate.upper);
    let score = 0;

    for (const lower of lowerBranches) {
      if (relation.害 === lower) score += 2;
      if (relation.刑 === lower) score += 2;
      if (relation.冲 === lower) score += 1;
      if (relation.破 === lower) score += 1;
      if (controls(lower, candidate.upper)) score += 2;
      if (controls(candidate.upper, lower)) score += 1;
    }

    const landing = ctx.getXiaShen(candidate.upper);
    if (MENG_BRANCHES.has(landing)) {
      score += 1;
    }

    return {
      ...candidate,
      score,
      landing,
    };
  });

  const maxScore = Math.max(...scored.map((x) => x.score));
  let top = scored.filter((x) => x.score === maxScore);

  if (top.length === 1) {
    return { picked: top[0], note: `涉害深浅取高分(${maxScore})` };
  }

  const meng = top.filter((x) => MENG_BRANCHES.has(x.landing));
  if (meng.length === 1) {
    return { picked: meng[0], note: "见孟取传" };
  }
  if (meng.length > 1) {
    top = meng;
  }

  // 缀段：取课位靠前者
  const sorted = [...top].sort((a, b) => a.lessonIndex - b.lessonIndex);
  return { picked: sorted[0], note: "缀段取先见课" };
}

function tryZeiKe(ctx: NineMethodContext): { result: SanChuanResult | null; pendingCandidates: Candidate[]; reason: string } {
  const downRob = ctx.siKe
    .map((item, idx) => ({ item, idx }))
    .filter((x) => x.item.relation === "下贼上")
    .map((x) => ({ upper: x.item.upper, lessonIndex: x.idx, relation: x.item.relation }));

  if (downRob.length === 1) {
    return {
      result: makeResult("贼克法", "重审", downRob[0].upper, ctx.getShangShen, []),
      pendingCandidates: [],
      reason: "仅一课下贼上，取重审课",
    };
  }

  if (downRob.length > 1) {
    return {
      result: null,
      pendingCandidates: downRob,
      reason: `有${downRob.length}课下贼上，转入比用/涉害`,
    };
  }

  const upControl = ctx.siKe
    .map((item, idx) => ({ item, idx }))
    .filter((x) => x.item.relation === "上克下")
    .map((x) => ({ upper: x.item.upper, lessonIndex: x.idx, relation: x.item.relation }));

  if (upControl.length === 1) {
    return {
      result: makeResult("贼克法", "元首", upControl[0].upper, ctx.getShangShen, []),
      pendingCandidates: [],
      reason: "仅一课上克下，取元首课",
    };
  }

  if (upControl.length > 1) {
    return {
      result: null,
      pendingCandidates: upControl,
      reason: `有${upControl.length}课上克下，转入比用/涉害`,
    };
  }

  return {
    result: null,
    pendingCandidates: [],
    reason: "无贼无克",
  };
}

function tryBiYong(candidates: Candidate[], ctx: NineMethodContext): { result: SanChuanResult | null; remain: Candidate[]; reason: string } {
  if (candidates.length <= 1) {
    return { result: null, remain: candidates, reason: "候选不足，不触发比用" };
  }

  const sameYinYang = byYinYang(candidates, ctx.dayStem);
  if (sameYinYang.length === 1) {
    return {
      result: makeResult("比用法", "知一", sameYinYang[0].upper, ctx.getShangShen, []),
      remain: [],
      reason: "同阴阳唯一候选，取比用",
    };
  }

  if (sameYinYang.length > 1) {
    return {
      result: null,
      remain: sameYinYang,
      reason: `同阴阳候选${sameYinYang.length}个，转涉害`,
    };
  }

  return {
    result: null,
    remain: candidates,
    reason: "无同阴阳候选，转涉害",
  };
}

function trySheHai(candidates: Candidate[], ctx: NineMethodContext): { result: SanChuanResult | null; reason: string } {
  if (candidates.length <= 1) {
    return { result: null, reason: "涉害候选不足" };
  }

  const picked = pickSheHaiCandidate(candidates, ctx);
  if (!picked) {
    return { result: null, reason: "涉害评分失败" };
  }

  return {
    result: makeResult("涉害法", picked.note, picked.picked.upper, ctx.getShangShen, []),
    reason: `涉害命中：${picked.note}`,
  };
}

function tryYaoKe(ctx: NineMethodContext): { result: SanChuanResult | null; reason: string } {
  const upperControlsDay = ctx.siKe
    .map((item, idx) => ({ item, idx }))
    .filter((x) => controls(x.item.upper, ctx.dayStem))
    .map((x) => ({ upper: x.item.upper, lessonIndex: x.idx, relation: x.item.relation }));

  if (upperControlsDay.length > 0) {
    const same = byYinYang(upperControlsDay, ctx.dayStem);
    const picked = same[0] ?? upperControlsDay[0];
    return {
      result: makeResult("遥克法", "蒿矢", picked.upper, ctx.getShangShen, []),
      reason: "上神遥克日干",
    };
  }

  const dayControlsUpper = ctx.siKe
    .map((item, idx) => ({ item, idx }))
    .filter((x) => controls(ctx.dayStem, x.item.upper))
    .map((x) => ({ upper: x.item.upper, lessonIndex: x.idx, relation: x.item.relation }));

  if (dayControlsUpper.length > 0) {
    const same = byYinYang(dayControlsUpper, ctx.dayStem);
    const picked = same[0] ?? dayControlsUpper[0];
    return {
      result: makeResult("遥克法", "弹射", picked.upper, ctx.getShangShen, []),
      reason: "日干遥克上神",
    };
  }

  return { result: null, reason: "无遥克" };
}

function tryAngXing(ctx: NineMethodContext): { result: SanChuanResult | null; reason: string } {
  const uppers = ctx.siKe.map((k) => k.upper);
  const lowers = ctx.siKe.map((k) => k.lower);
  const hasControl = ctx.siKe.some((k) => k.relation === "下贼上" || k.relation === "上克下");

  if (hasControl || new Set(uppers).size < 4 || new Set(lowers).size < 4) {
    return { result: null, reason: "不满足昂星（四课不全或仍有克）" };
  }

  if (stemYinYang(ctx.dayStem) === "阳") {
    const initial = ctx.getShangShen("酉");
    const middle = ctx.getShangShen(ctx.dayBranch);
    const final = ctx.siKe[0].upper;
    return {
      result: {
        method: "昂星法",
        subType: "虎视",
        initial,
        middle,
        final,
        trace: [],
      },
      reason: "阳日昂星：酉上发用",
    };
  }

  const initial = ctx.getXiaShen("酉");
  const middle = ctx.getShangShen(ctx.dayJiGong);
  const final = ctx.siKe[2].upper;
  return {
    result: {
      method: "昂星法",
      subType: "掩目",
      initial,
      middle,
      final,
      trace: [],
    },
    reason: "阴日昂星：酉下发用",
  };
}

function tryBieZe(ctx: NineMethodContext): { result: SanChuanResult | null; reason: string } {
  const uppers = ctx.siKe.map((k) => k.upper);
  if (new Set(uppers).size !== 3) {
    return { result: null, reason: "不满足别责（需四课不备三上神）" };
  }

  if (stemYinYang(ctx.dayStem) === "阳") {
    const partner = TIAN_GAN_WU_HE[ctx.dayStem];
    const partnerJi = JI_GONG[partner];
    const initial = ctx.getShangShen(partnerJi);
    const middle = ctx.getShangShen(ctx.dayJiGong);
    return {
      result: {
        method: "别责法",
        subType: "别责",
        initial,
        middle,
        final: middle,
        trace: [],
      },
      reason: "阳日别责：取日干合神上神",
    };
  }

  const initial = ctx.getShangShen(LIU_CHONG[ctx.dayBranch]);
  const middle = ctx.getShangShen(ctx.dayJiGong);
  return {
    result: {
      method: "别责法",
      subType: "别责",
      initial,
      middle,
      final: middle,
      trace: [],
    },
    reason: "阴日别责：取日支冲神上神",
  };
}

function tryBaZhuan(ctx: NineMethodContext): { result: SanChuanResult | null; reason: string } {
  const uppers = ctx.siKe.map((k) => k.upper);
  const uniqueCount = new Set(uppers).size;
  if (uniqueCount > 2) {
    return { result: null, reason: "不满足八专（上神未归并）" };
  }

  const initial = stemYinYang(ctx.dayStem) === "阳" ? ctx.dayBranch : ctx.dayJiGong;
  const middle = ctx.getShangShen(ctx.dayBranch);
  return {
    result: {
      method: "八专法",
      subType: "八专",
      initial,
      middle,
      final: middle,
      trace: [],
    },
    reason: "八专课：二上神归并",
  };
}

function tryFuYin(ctx: NineMethodContext): { result: SanChuanResult | null; reason: string } {
  if (!ctx.isFuyin) {
    return { result: null, reason: "非伏吟盘" };
  }

  const initial = ctx.siKe[0].upper;
  let middle = XING[initial];
  let final = XING[middle];
  let subType = "自任";

  if (middle === initial) {
    middle = ctx.dayBranch;
    final = XING[ctx.dayBranch];
    subType = "杜传";
  }

  return {
    result: {
      method: "伏吟法",
      subType,
      initial,
      middle,
      final,
      trace: [],
    },
    reason: "伏吟盘触发伏吟法",
  };
}

function tryFanYin(ctx: NineMethodContext): { result: SanChuanResult | null; reason: string } {
  if (!ctx.isFanyin) {
    return { result: null, reason: "非反吟盘" };
  }

  const yima = SAN_HE_YIMA.find((item) => item.group.includes(ctx.dayBranch))?.yima ?? "寅";
  const initial = yima;
  const middle = ctx.getShangShen(ctx.dayBranch);
  const final = ctx.getShangShen(ctx.dayJiGong);

  return {
    result: {
      method: "反吟法",
      subType: "反吟",
      initial,
      middle,
      final,
      trace: [],
    },
    reason: "反吟盘触发反吟法",
  };
}

function applyTrace(result: SanChuanResult, trace: SanChuanTrace[]): SanChuanResult {
  return {
    ...result,
    trace,
  };
}

export function resolveSanChuanByNineMethods(ctx: NineMethodContext): SanChuanResult {
  const trace: SanChuanTrace[] = [];

  const zeike = tryZeiKe(ctx);
  if (zeike.result) {
    trace.push({ step: "贼克法", hit: true, reason: zeike.reason });
    return applyTrace(zeike.result, trace);
  }
  trace.push({ step: "贼克法", hit: false, reason: zeike.reason });

  let pending = zeike.pendingCandidates;
  const biyong = tryBiYong(pending, ctx);
  if (biyong.result) {
    trace.push({ step: "比用法", hit: true, reason: biyong.reason });
    return applyTrace(biyong.result, trace);
  }
  trace.push({ step: "比用法", hit: false, reason: biyong.reason });
  pending = biyong.remain;

  const shehai = trySheHai(pending, ctx);
  if (shehai.result) {
    trace.push({ step: "涉害法", hit: true, reason: shehai.reason });
    return applyTrace(shehai.result, trace);
  }
  trace.push({ step: "涉害法", hit: false, reason: shehai.reason });

  const yaoke = tryYaoKe(ctx);
  if (yaoke.result) {
    trace.push({ step: "遥克法", hit: true, reason: yaoke.reason });
    return applyTrace(yaoke.result, trace);
  }
  trace.push({ step: "遥克法", hit: false, reason: yaoke.reason });

  const angxing = tryAngXing(ctx);
  if (angxing.result) {
    trace.push({ step: "昂星法", hit: true, reason: angxing.reason });
    return applyTrace(angxing.result, trace);
  }
  trace.push({ step: "昂星法", hit: false, reason: angxing.reason });

  const bieze = tryBieZe(ctx);
  if (bieze.result) {
    trace.push({ step: "别责法", hit: true, reason: bieze.reason });
    return applyTrace(bieze.result, trace);
  }
  trace.push({ step: "别责法", hit: false, reason: bieze.reason });

  const bazhuan = tryBaZhuan(ctx);
  if (bazhuan.result) {
    trace.push({ step: "八专法", hit: true, reason: bazhuan.reason });
    return applyTrace(bazhuan.result, trace);
  }
  trace.push({ step: "八专法", hit: false, reason: bazhuan.reason });

  const fuyin = tryFuYin(ctx);
  if (fuyin.result) {
    trace.push({ step: "伏吟法", hit: true, reason: fuyin.reason });
    return applyTrace(fuyin.result, trace);
  }
  trace.push({ step: "伏吟法", hit: false, reason: fuyin.reason });

  const fanyin = tryFanYin(ctx);
  if (fanyin.result) {
    trace.push({ step: "反吟法", hit: true, reason: fanyin.reason });
    return applyTrace(fanyin.result, trace);
  }
  trace.push({ step: "反吟法", hit: false, reason: fanyin.reason });

  // 兜底：仍按三传链路给出结果，避免复杂课报错
  const fallbackInitial = ctx.siKe[0].upper;
  return {
    method: "贼克法",
    subType: "兜底传链",
    initial: fallbackInitial,
    middle: ctx.getShangShen(fallbackInitial),
    final: ctx.getShangShen(ctx.getShangShen(fallbackInitial)),
    trace,
  };
}

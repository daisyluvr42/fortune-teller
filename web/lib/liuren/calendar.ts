import { Solar } from "lunar-javascript";
import { YUE_JIANG_NAME, ZHONG_QI_TO_YUE_JIANG } from "./constants";
import { DateTimeParts, YueJiangInfo } from "./types";

interface SolarLike {
  getYear(): number;
  getMonth(): number;
  getDay(): number;
  getHour(): number;
  getMinute(): number;
  getSecond?: () => number;
}

function solarToTimestamp(solar: SolarLike): number {
  return Date.UTC(
    Number(solar.getYear()),
    Number(solar.getMonth()) - 1,
    Number(solar.getDay()),
    Number(solar.getHour()),
    Number(solar.getMinute()),
    Number(solar.getSecond?.() ?? 0),
  );
}

function formatSolar(solar: SolarLike): string {
  const pad = (v: number) => `${v}`.padStart(2, "0");
  return `${solar.getYear()}-${pad(solar.getMonth())}-${pad(solar.getDay())} ${pad(solar.getHour())}:${pad(solar.getMinute())}:${pad(solar.getSecond?.() ?? 0)}`;
}

export function resolveYueJiangByZhongQi(parts: DateTimeParts): YueJiangInfo {
  const solar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
  const lunar = solar.getLunar();
  const table = lunar.getJieQiTable() as Record<string, SolarLike>;
  const targetTs = solarToTimestamp(solar);

  const records = Object.entries(table)
    .filter(([name]) => Object.prototype.hasOwnProperty.call(ZHONG_QI_TO_YUE_JIANG, name))
    .map(([name, jqSolar]) => ({
      name,
      solar: jqSolar,
      ts: solarToTimestamp(jqSolar),
    }))
    .sort((a, b) => a.ts - b.ts);

  if (records.length === 0) {
    return {
      zhongQi: "大寒",
      zhongQiTime: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:00`,
      branch: "子",
      name: YUE_JIANG_NAME["子"],
    };
  }

  let selected = records[0];
  for (const item of records) {
    if (item.ts <= targetTs) {
      selected = item;
    }
  }

  const branch = ZHONG_QI_TO_YUE_JIANG[selected.name] ?? "子";

  return {
    zhongQi: selected.name,
    zhongQiTime: formatSolar(selected.solar),
    branch,
    name: YUE_JIANG_NAME[branch],
  };
}

export function resolvePillars(parts: DateTimeParts): {
  year: string;
  month: string;
  day: string;
  hour: string;
  dayStem: string;
  dayBranch: string;
  hourBranch: string;
  monthBranch: string;
} {
  const solar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  return {
    year: eightChar.getYear(),
    month: eightChar.getMonth(),
    day: eightChar.getDay(),
    hour: eightChar.getTime(),
    dayStem: eightChar.getDayGan(),
    dayBranch: eightChar.getDayZhi(),
    hourBranch: eightChar.getTimeZhi(),
    monthBranch: eightChar.getMonthZhi(),
  };
}

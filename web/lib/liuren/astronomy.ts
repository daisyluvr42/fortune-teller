import { DaLiuRenInput, SunBoundaryResult, TrueSolarTimeResult } from "./types";
import { addMinutes, dayOfYear, formatHm, minutesOfDay } from "./utils";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normalizeMinute(min: number): number {
  return ((min % 1440) + 1440) % 1440;
}

function equationOfTimeMinutes(dayNo: number, hour: number, minute: number): number {
  const fractionalHour = hour + minute / 60;
  const gamma = (2 * Math.PI / 365) * (dayNo - 1 + (fractionalHour - 12) / 24);
  return 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
}

function solarDeclination(dayNo: number): number {
  const gamma = (2 * Math.PI / 365) * (dayNo - 1 + (12 - 12) / 24);
  return 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
}

export function convertTrueSolarTime(input: DaLiuRenInput): TrueSolarTimeResult {
  const timezoneOffset = input.timezoneOffset ?? 8;
  const dayNo = dayOfYear(input.datetime);
  const eqMinutes = equationOfTimeMinutes(dayNo, input.datetime.hour, input.datetime.minute);
  const standardMeridian = timezoneOffset * 15;
  const longitudeCorrection = 4 * (input.longitude - standardMeridian);
  const totalCorrection = eqMinutes + longitudeCorrection;

  const shifted = addMinutes(input.datetime, timezoneOffset, totalCorrection);

  return {
    standardTime: { ...input.datetime, second: 0 },
    trueSolarTime: shifted.parts,
    equationOfTimeMinutes: eqMinutes,
    longitudeCorrectionMinutes: longitudeCorrection,
    totalCorrectionMinutes: totalCorrection,
    dayOffset: shifted.dayOffset,
  };
}

export function computeSunBoundary(input: DaLiuRenInput, trueSolar: TrueSolarTimeResult): SunBoundaryResult {
  const timezoneOffset = input.timezoneOffset ?? 8;
  const dayNo = dayOfYear(input.datetime);
  const latRad = degToRad(input.latitude);
  const decl = solarDeclination(dayNo);
  const eqTime = equationOfTimeMinutes(dayNo, 12, 0);

  const cosH = (Math.cos(degToRad(90.833)) / (Math.cos(latRad) * Math.cos(decl))) - Math.tan(latRad) * Math.tan(decl);

  let sunrise: number | null = null;
  let sunset: number | null = null;

  if (cosH >= -1 && cosH <= 1) {
    const hourAngle = radToDeg(Math.acos(cosH));
    const solarNoon = 720 - 4 * input.longitude - eqTime + timezoneOffset * 60;
    sunrise = solarNoon - hourAngle * 4;
    sunset = solarNoon + hourAngle * 4;
  }

  const currentMinutes = minutesOfDay(input.datetime);
  let isDaytime = false;

  if (sunrise !== null && sunset !== null) {
    const sr = normalizeMinute(sunrise);
    const ss = normalizeMinute(sunset);
    const cm = normalizeMinute(currentMinutes);
    if (sr < ss) {
      isDaytime = cm >= sr && cm < ss;
    } else {
      isDaytime = cm >= sr || cm < ss;
    }
  } else {
    // 极昼/极夜兜底：使用真太阳时判断
    isDaytime = trueSolar.trueSolarTime.hour >= 6 && trueSolar.trueSolarTime.hour < 18;
  }

  return {
    sunriseMinutes: sunrise,
    sunsetMinutes: sunset,
    sunriseText: formatHm(sunrise),
    sunsetText: formatHm(sunset),
    isDaytime,
  };
}

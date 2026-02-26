from lunar_python import Solar

# Test early Zi Shi (Day 15, 00:30)
solar_early = Solar.fromYmdHms(2026, 2, 15, 0, 30, 0)
lunar_early = solar_early.getLunar()
bazi_early = lunar_early.getEightChar()
print("Early Zi (00:30):", bazi_early.getYear(), bazi_early.getMonth(), bazi_early.getDay(), bazi_early.getTime())

# Test late Zi Shi (Day 15, 23:30)
solar_late = Solar.fromYmdHms(2026, 2, 15, 23, 30, 0)
lunar_late = solar_late.getLunar()
bazi_late = lunar_late.getEightChar()
print("Late Zi (23:30) Default:", bazi_late.getYear(), bazi_late.getMonth(), bazi_late.getDay(), bazi_late.getTime())

# Test Sects for Late Zi
bazi_late.setSect(1)
print("Late Zi (23:30) Sect 1:", bazi_late.getYear(), bazi_late.getMonth(), bazi_late.getDay(), bazi_late.getTime())

bazi_late.setSect(2)
print("Late Zi (23:30) Sect 2:", bazi_late.getYear(), bazi_late.getMonth(), bazi_late.getDay(), bazi_late.getTime())

# Test next day early Zi Shi (Day 16, 00:30)
solar_next = Solar.fromYmdHms(2026, 2, 16, 0, 30, 0)
lunar_next = solar_next.getLunar()
bazi_next = lunar_next.getEightChar()
print("Next Early Zi (16th 00:30):", bazi_next.getYear(), bazi_next.getMonth(), bazi_next.getDay(), bazi_next.getTime())

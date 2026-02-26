import sys
import os

# Add backend to path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
sys.path.append(backend_dir)

from logic import calculate_bazi

# Test early Zi Shi (Day 15, 00:30)
# Expectation: 丙午 庚寅 庚申 丙子
bazi_str, time_info, pattern_info = calculate_bazi(2026, 2, 15, 0, 30, 120.0)
print("Early Zi (2026-02-15 00:30):", bazi_str)

# Test late Zi Shi (Day 15, 23:30)
# Expectation: 丙午 庚寅 辛酉 戊子 (Since day advances to 辛酉, Zi hour must be 戊子 according to five rats rule)
bazi_str, time_info, pattern_info = calculate_bazi(2026, 2, 15, 23, 30, 120.0)
print("Late Zi (2026-02-15 23:30):", bazi_str)

# Test next day early Zi Shi (Day 16, 00:30)
# Expectation: 丙午 庚寅 辛酉 戊子
bazi_str, time_info, pattern_info = calculate_bazi(2026, 2, 16, 0, 30, 120.0)
print("Next Early Zi (2026-02-16 00:30):", bazi_str)

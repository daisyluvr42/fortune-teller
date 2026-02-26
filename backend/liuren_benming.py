"""Utilities for optional Benming/Xingnian calculation in Da Liu Ren flow."""

from typing import Literal, TypedDict


EARTHLY_BRANCHES = ("子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥")
SEXAGENARY_BASE_YEAR = 4  # 公元 4 年为甲子年，对应地支索引 0(子)


class BenmingXingnianResult(TypedDict):
    benming: str
    xingnian: str
    nominal_age: int


def calculate_benming_xingnian(
    birth_year: int,
    gender: Literal["male", "female"],
    current_year: int,
) -> BenmingXingnianResult:
    """
    Calculate Benming(本命) and Xingnian(行年) by nominal age(虚岁).

    Rules:
    - Nominal age: current_year - birth_year + 1
    - Benming: 地支(出生年)
    - Xingnian:
      - male: age 1 starts from 寅, move forward one branch per age
      - female: age 1 starts from 申, move backward one branch per age
    """
    nominal_age = current_year - birth_year + 1
    if nominal_age < 1:
        raise ValueError("Nominal age must be >= 1")

    benming_index = (birth_year - SEXAGENARY_BASE_YEAR) % len(EARTHLY_BRANCHES)
    benming_branch = EARTHLY_BRANCHES[benming_index]

    step = nominal_age - 1
    if gender == "male":
        start_index = EARTHLY_BRANCHES.index("寅")
        xingnian_index = (start_index + step) % len(EARTHLY_BRANCHES)
    else:
        start_index = EARTHLY_BRANCHES.index("申")
        xingnian_index = (start_index - step) % len(EARTHLY_BRANCHES)

    return {
        "benming": benming_branch,
        "xingnian": EARTHLY_BRANCHES[xingnian_index],
        "nominal_age": nominal_age,
    }


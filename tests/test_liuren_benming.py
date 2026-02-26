import os
import sys

import pytest


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from liuren_benming import calculate_benming_xingnian


def test_calculate_benming_xingnian_male():
    result = calculate_benming_xingnian(birth_year=1990, gender="male", current_year=2026)
    assert result["nominal_age"] == 37
    assert result["benming"] == "午"
    assert result["xingnian"] == "寅"


def test_calculate_benming_xingnian_female_age_one():
    result = calculate_benming_xingnian(birth_year=2026, gender="female", current_year=2026)
    assert result["nominal_age"] == 1
    assert result["benming"] == "午"
    assert result["xingnian"] == "申"


def test_calculate_benming_xingnian_invalid_nominal_age():
    with pytest.raises(ValueError):
        calculate_benming_xingnian(birth_year=2027, gender="male", current_year=2026)

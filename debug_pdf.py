
import re
from text_utils import clean_text_for_pdf

def test_cleaning():
    print("--- Test 1: Standard Output ---")
    raw_1 = """## 1. 你的能量诊断书
    
你现在的元神状态，就像是..."""
    
    cleaned_1 = clean_text_for_pdf(raw_1)
    print(f"DEBUG 1:\n{repr(cleaned_1)}")
    
    print("\n--- Test 2: Single Newline ---")
    raw_2 = """## 1. 你的能量诊断书
你现在的元神状态..."""
    cleaned_2 = clean_text_for_pdf(raw_2)
    print(f"DEBUG 2:\n{repr(cleaned_2)}")

    print("\n--- Test 3: Indented Header ---")
    raw_3 = """  ## 1. 你的能量诊断书
你现在的元神状态..."""
    cleaned_3 = clean_text_for_pdf(raw_3)
    print(f"DEBUG 3:\n{repr(cleaned_3)}")

    # Check matches explicitly
    regex = re.compile(r'^#{1,6}\s*(.+?)$', re.MULTILINE)
    print("\n--- Regex matches on Test 3 ---")
    print(regex.findall(raw_3))

if __name__ == "__main__":
    test_cleaning()

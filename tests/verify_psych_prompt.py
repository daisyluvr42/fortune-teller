import sys
import os

# Add project root to path to import logic
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from logic import SYSTEM_INSTRUCTION, ANALYSIS_PROMPTS

def verify_prompts():
    print("=== Verifying SYSTEM_INSTRUCTION ===")
    
    # Check for Psychological Strategies section
    if "Psychological Strategies (心理学策略嵌入)" in SYSTEM_INSTRUCTION:
        print("✅ Psychological Strategies section found.")
    else:
        print("❌ Psychological Strategies section MISSING.")

    # Check for Anti-Meta rules
    if "绝对禁语 (The \"No-Meta\" Rule)" in SYSTEM_INSTRUCTION:
        print("✅ Anti-Meta rules found.")
    else:
        print("❌ Anti-Meta rules MISSING.")

    if "反强行Recall (Anti-Recall)" in SYSTEM_INSTRUCTION:
        print("✅ Anti-Recall rules found.")
    else:
        print("❌ Anti-Recall rules MISSING.")


    # Strategies expected in SYSTEM_INSTRUCTION
    strategies_instruction = [
        "巴纳姆双面陈述 (Barnum)", 
        "分龄冷读术 (Age-Adaptive Cold Reading)", 
        "负面切入 (Negative Entry)"
    ]
    for strategy in strategies_instruction:
        if strategy in SYSTEM_INSTRUCTION:
            print(f"✅ Strategy found in SYSTEM_INSTRUCTION: {strategy}")
        else:
            print(f"❌ Strategy MISSING in SYSTEM_INSTRUCTION: {strategy}")

    # Strategies expected in SYSTEM_LOGIC_INSTRUCTIONS
    from logic import SYSTEM_LOGIC_INSTRUCTIONS
    strategies_logic = [
        "Advanced Narrative Instructions",
        "正面引导：内化叙事 (Internalization)",
        "负面边界：严禁复述 (Anti-Repetition Boundaries)"
    ]
    for strategy in strategies_logic:
        if strategy in SYSTEM_LOGIC_INSTRUCTIONS:
            print(f"✅ Strategy found in SYSTEM_LOGIC_INSTRUCTIONS: {strategy}")
        else:
            print(f"❌ Strategy MISSING in SYSTEM_LOGIC_INSTRUCTIONS: {strategy}")

    print("\n=== Verifying ANALYSIS_PROMPTS ===")
    
    # Check specific analysis prompts for embedded instructions
    prompts_to_check = {
        "整体命格": ["Barnum Effect", "Negative Entry"],
        "事业运势": ["Cold Reading", "Negative Entry"],
        "财运分析": ["Negative Entry", "吸金体质"],
        "感情运势": ["Barnum Effect", "亲密关系的悖论"],
        "健康建议": ["Cold Reading", "调候预警"],
        "开运建议": ["Negative Entry", "能量诊断书"]
    }

    for topic, keywords in prompts_to_check.items():
        content = ANALYSIS_PROMPTS.get(topic, "")
        print(f"\nChecking [{topic}]...")
        for keyword in keywords:
            if keyword in content:
                print(f"  ✅ Found keyword: {keyword}")
            else:
                print(f"  ❌ MISSING keyword: {keyword}")

    print("\n=== Verifying XML Structure in SYSTEM_LOGIC_INSTRUCTIONS ===")
    from logic import SYSTEM_LOGIC_INSTRUCTIONS
    if "<System_Logic>" in SYSTEM_LOGIC_INSTRUCTIONS and "</System_Logic>" in SYSTEM_LOGIC_INSTRUCTIONS:
        print("✅ <System_Logic> tags found.")
    else:
        print("❌ <System_Logic> tags MISSING.")

    if "<Internal_Memory>" in SYSTEM_LOGIC_INSTRUCTIONS: # Checking if logic instructions mention where to put memory (optional, but good sanity check if we had instructions about it)
         pass # Actually, the logic instructions don't contain the memory tags, the get_fortune_analysis function assembles them.
         # So we can't easily verify the dynamic assembly without mocking.
         # For now, we verify the static parts.

if __name__ == "__main__":
    verify_prompts()

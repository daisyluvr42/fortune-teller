
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../fortune_teller_agent')))

from fortune_teller_agent.logic import build_thousand_faces_prompt

def test_prompt_content():
    # Mock data
    prompt = build_thousand_faces_prompt(
        bazi_context="Mock Context",
        age=30,
        gender="Female"
    )
    
    print("Checking for Tone Guidelines...")
    assert "Direct & Sharp" in prompt
    assert "Metaphorical" in prompt
    assert "No Repetition" in prompt
    assert "Your chart shows a direct clash" in prompt
    
    print("SUCCESS: Tone Guidelines found in prompt.")
    print("-" * 20)
    print(prompt[:500] + "...") # Print first 500 chars to peek

if __name__ == "__main__":
    test_prompt_content()

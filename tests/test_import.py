
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../fortune_teller_agent')))

try:
    from fortune_teller_agent import logic
    print("Import successful")
    print("get_bazi_json_analysis exists:", hasattr(logic, 'get_bazi_json_analysis'))
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Other Error: {e}")

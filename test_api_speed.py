
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# Load environment
PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

# Configuration
API_KEY = "AIzaSyAk-Ho0O4Jwyy3p8tvRMc2A0NvgerXhwW0"
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
MODEL = "gemini-2.0-flash-exp"  # Using Flash as requested

if not API_KEY or API_KEY == "replace_me":
    print("❌ ERROR: DEFAULT_API_KEY not found in .env")
    exit(1)

print(f"🚀 Testing API Speed...")
print(f"📍 Base URL: {BASE_URL}")
print(f"🤖 Model:   {MODEL}")

client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Please write a short poem about the speed of light. Limit to 4 lines."}
]

print("\n--- Request Sent ---\n")

start_time = time.monotonic()
first_token_time = None
content = ""

try:
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        stream=True
    )
    
    for chunk in response:
        if chunk.choices[0].delta.content:
            if first_token_time is None:
                first_token_time = time.monotonic()
                tttf = (first_token_time - start_time) * 1000
                print(f"⚡️ First Token Received: {tttf:.2f} ms")
            
            content += chunk.choices[0].delta.content
            print(chunk.choices[0].delta.content, end="", flush=True)

    end_time = time.monotonic()
    total_time = (end_time - start_time) * 1000
    
    print("\n\n--- Stats ---")
    print(f"⏱️  Time to First Token (TTTF): {tttf:.2f} ms")
    if first_token_time:
        gen_time = (end_time - first_token_time) * 1000
        print(f"📝 Generation Time:          {gen_time:.2f} ms")
    print(f"🏁 Total Latency:            {total_time:.2f} ms")

except Exception as e:
    print(f"\n❌ Error: {e}")

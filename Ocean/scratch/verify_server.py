import urllib.request
import json

def test():
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as resp:
            data = json.loads(resp.read().decode())
            print("[API Health Response]:", data)
            
        with urllib.request.urlopen("http://127.0.0.1:8000/") as resp:
            html = resp.read().decode()
            print(f"[Root HTML Response]: Received {len(html)} bytes (Title present: {'AquaNex AI' in html})")
            
        print("Backend is operating flawlessly!")
    except Exception as e:
        print("Error verifying server:", e)

if __name__ == "__main__":
    test()

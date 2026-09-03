import http.client
import json
import os
import webbrowser
import urllib.request
import time

# Get prompt from user
prompt = input("Enter your Ghibli prompt (e.g. 'a peaceful village at sunset'): ").strip()

if not prompt:
    print("Prompt cannot be empty. Exiting.")
    exit()

print("\n Generating your Ghibli image, please wait...\n")

rapidapi_key = os.getenv("RAPIDAPI_KEY")
if not rapidapi_key:
    print("RAPIDAPI_KEY is not configured. Exiting.")
    exit()

conn = http.client.HTTPSConnection("ai-text-to-image-generator-flux-free-api.p.rapidapi.com")

payload = json.dumps({
    "prompt": prompt,
    "size": "1-1",
    "refImage": "https://pub-static.aiease.ai/ai-storage/2025/09/02/dd9808737f694e25bb3f380508ad262f.jpeg",
    "refWeight": 1
})

headers = {
    'x-rapidapi-key': rapidapi_key,
    'x-rapidapi-host': "ai-text-to-image-generator-flux-free-api.p.rapidapi.com",
    'Content-Type': "application/json"
}

conn.request("POST", "/aaaaaaaaaaaaaaaaaiimagegenerator/ghibli/generateghibhliimage.php", payload, headers)

res = conn.getresponse()
raw_data = res.read()

# Check if response is empty
if not raw_data:
    print(" ERROR: API returned empty response. Try again in a few seconds.")
    exit()

result = json.loads(raw_data.decode("utf-8"))

# Navigate correct JSON path
try:
    images = result["result"]["data"]["results"]

    for img in images:
        url = img["origin"]
        index = img["index"]
        print(f" Image {index} URL: {url}")

        # Open in browser
        webbrowser.open(url)

        # Download to folder
        filename = f"ghibli_image_{index}.webp"
        urllib.request.urlretrieve(url, filename)
        print(f" Downloaded: {filename}")

    print("\n Done! Your Ghibli image is opening in the browser.")

except KeyError as e:
    print(f"\n Error: Missing key {e} in response.")
    print("Full Response:", json.dumps(result, indent=2))

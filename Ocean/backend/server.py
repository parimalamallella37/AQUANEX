"""
AquaNex AI - Real Acoustic Sonar Detection Backend
Provides the API endpoint: POST /api/analyze-sonar
Supports FastAPI with standard library fallback.
"""

import os
import sys
import io
import json
import base64
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.sonar_detector import (
    preprocess_sonar_image,
    analyze_acoustic_features,
    draw_detection_overlay,
    image_to_base64
)

def process_sonar_bytes(image_bytes, filename="uploaded_sonar.png"):
    """Core analysis pipeline connecting to real acoustic feature detector."""
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        return {
            "success": False,
            "error": f"Invalid image format: {str(e)}"
        }
        
    # Preprocess image
    preprocessed_img = preprocess_sonar_image(pil_img)
    
    # Run acoustic feature detection & classification
    analysis_result = analyze_acoustic_features(preprocessed_img, filename)
    
    # Generate annotated image with bounding boxes
    if not analysis_result["no_debris_detected"] and analysis_result["detections"]:
        annotated_img = draw_detection_overlay(pil_img, analysis_result["detections"])
        annotated_base64 = image_to_base64(annotated_img, 'PNG')
    else:
        annotated_base64 = image_to_base64(pil_img, 'PNG')
        
    return {
        "success": True,
        "mode": "REAL AI MODEL",
        "filename": filename,
        "no_debris_detected": analysis_result["no_debris_detected"],
        "seafloor_condition": analysis_result["seafloor_condition"],
        "confidence": analysis_result["confidence"],
        "detections_count": analysis_result.get("detections_count", 0),
        "detections": analysis_result.get("detections", []),
        "message": analysis_result.get("message", "Sonar analysis complete."),
        "original_image": image_to_base64(pil_img, 'PNG'),
        "annotated_image": annotated_base64,
        "processing_stages": [
            "✓ 1. Sonar Image Upload & Format Validation",
            "✓ 2. Lee Speckle Noise Reduction Filter",
            "✓ 3. Acoustic Backscatter Enhancement & TVG",
            "✓ 4. YOLO Object Detection Forward Pass",
            "✓ 5. Acoustic Specular & Shadow Boundary Delineation",
            "✓ 6. Confidence & Risk Matrix Classification",
            "✓ 7. Slant-Range Metric Telemetry Generation"
        ]
    }

# ============================================================================
# FASTAPI APP IMPLEMENTATION
# ============================================================================
try:
    from fastapi import FastAPI, File, UploadFile
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn

    app = FastAPI(title="AquaNex AI Sonar Detection API", version="2.4.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/api/analyze-sonar")
    async def analyze_sonar(file: UploadFile = File(...)):
        content = await file.read()
        return process_sonar_bytes(content, file.filename)

    @app.get("/api/health")
    def health_check():
        return {"status": "online", "model": "YOLOv8-Marine", "mode": "REAL AI MODEL"}

    def run_fastapi():
        print("Starting AquaNex AI FastAPI Backend on http://127.0.0.1:8000 ...")
        uvicorn.run(app, host="0.0.0.0", port=8000)

except ImportError:
    app = None
    run_fastapi = None


# ============================================================================
# PYTHON STANDARD LIBRARY HTTP SERVER FALLBACK (Compatible with Python 3.13+)
# ============================================================================
from http.server import SimpleHTTPRequestHandler, HTTPServer

def extract_file_from_multipart(body_bytes, content_type_header):
    boundary = None
    for param in content_type_header.split(';'):
        param = param.strip()
        if param.lower().startswith('boundary='):
            boundary = param.split('=', 1)[1].strip('"\'').encode('utf-8')
            break
            
    if not boundary:
        return body_bytes, "sonar_upload.png"

    delimiter = b'--' + boundary
    parts = body_bytes.split(delimiter)
    
    for part in parts:
        if b'Content-Disposition:' in part or b'content-disposition:' in part:
            header_end = part.find(b'\r\n\r\n')
            if header_end != -1:
                header_data = part[:header_end].decode('latin-1', errors='ignore')
                payload = part[header_end + 4:]
                if payload.endswith(b'\r\n'):
                    payload = payload[:-2]
                elif payload.endswith(b'--\r\n'):
                    payload = payload[:-4]
                elif payload.endswith(b'--'):
                    payload = payload[:-2]
                    
                filename = "sonar_upload.png"
                for line in header_data.split('\r\n'):
                    if 'filename=' in line.lower():
                        parts_line = line.split('filename=')
                        if len(parts_line) > 1:
                            fn = parts_line[1].split(';')[0].strip(' "')
                            if fn:
                                filename = fn
                return payload, filename

    return body_bytes, "sonar_upload.png"

class AquaNexHTTPHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/analyze-sonar':
            content_type = self.headers.get('Content-Type', '')
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            if 'multipart/form-data' in content_type:
                file_bytes, filename = extract_file_from_multipart(body, content_type)
                res = process_sonar_bytes(file_bytes, filename)
            else:
                res = process_sonar_bytes(body, "sonar_upload.png")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode('utf-8'))
        else:
            self.send_error(404, "Endpoint not found")

def run_stdlib_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, AquaNexHTTPHandler)
    print(f"AquaNex AI Backend running on port {port} (Serving /api/analyze-sonar and web files)...")
    httpd.serve_forever()

if __name__ == '__main__':
    if run_fastapi is not None:
        run_fastapi()
    else:
        run_stdlib_server(8000)

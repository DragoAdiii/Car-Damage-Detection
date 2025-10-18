import io
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS 
from ultralytics import YOLO
from PIL import Image

# --- CONFIGURATION ---
app = Flask(__name__)
CORS(app) 
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 

# --- MODEL PATH AND SETUP ---
MODEL_NAME = 'yolo11n_best.pt' 
MODEL_PATH = r'D:\VS code\Python\DL\Car Damage detection\Model_Trained\yolo11n_best.pt'
CLASS_LABELS = ['MINOR', 'MODERATE', 'SEVERE']

# Load the trained model globally when the app starts
model = None
try:
    model = YOLO(MODEL_PATH, task='detect') 
    print(f"YOLO Model ({MODEL_NAME}) loaded successfully for API use.")
except Exception as e:
    print(f"CRITICAL ERROR: Failed to load model from path: {MODEL_PATH}")
    print(f"Error details: {e}")
    model = None

# Helper function to safely resize images
def safe_resize(img: Image.Image, max_size: int = 1024) -> Image.Image:
    """Resizes an image if its longest side exceeds max_size, maintaining aspect ratio."""
    width, height = img.size
    
    if max(width, height) > max_size:
        # Calculate the new size to maintain the aspect ratio
        if width > height:
            new_width = max_size
            new_height = int(height * (max_size / width))
        else:
            new_height = max_size
            new_width = int(width * (max_size / height))
            
        # Resize the image using high-quality anti-aliasing filter
        return img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    return img
    
@app.route('/api/predict_damage', methods=['POST'])
def predict_damage():
    """
    Receives an image file upload and returns the highest confidence damage prediction.
    Includes memory protection via image pre-scaling.
    """
    
    if model is None:
        return jsonify({"error": "Model initialization failed on server. Check model path."}), 500
        
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']

    try:
        # 1. Read image safely
        img = Image.open(io.BytesIO(file.read())).convert('RGB')
        
        # 2. NEW: Resize image to prevent memory crash during YOLO inference
        img_resized = safe_resize(img, max_size=1280)
        
        # 3. Run prediction on the resized image
        results = model.predict(
            source=img_resized,
            save=False, 
            conf=0.25, # Confidence threshold kept low for MINOR/MODERATE
            verbose=False 
        )
        
        # 4. Process results
        if results and results[0].boxes and len(results[0].boxes) > 0:
            boxes = results[0].boxes.cpu().numpy()
            
            highest_conf_index = np.argmax(boxes.conf)
            class_id = int(boxes.cls[highest_conf_index])
            confidence_score = float(boxes.conf[highest_conf_index])
            box_normalized = boxes.xywhn[highest_conf_index].tolist()
            
            damage_label = CLASS_LABELS[class_id]
            
            return jsonify({
                "status": "DAMAGE DETECTED",
                "label": damage_label,
                "confidence": confidence_score,
                "box_normalized": box_normalized,
                "message": f"Detected {damage_label} damage with {confidence_score:.2f} confidence. Image resized for stability."
            })
        else:
            return jsonify({
                "status": "NO DAMAGE",
                "label": "NO DAMAGE",
                "confidence": 1.0, 
                "box_normalized": [], 
                "message": "The vehicle appears fine; no claim necessary."
            })

    except Exception as e:
        print(f"--- Prediction Runtime Error ---")
        print(f"Image processing or prediction failed: {e}")
        print(f"----------------------------------")
        return jsonify({"error": f"Internal prediction error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

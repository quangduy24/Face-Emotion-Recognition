from flask import Flask, render_template, Response, request, jsonify
import cv2
import numpy as np
from tensorflow.keras.models import load_model
import os
import base64
from PIL import Image
import io

app = Flask(__name__)

# Load the pre-trained model
model_path = os.path.join('models', 'emotion_model4.h5')
model = load_model(model_path)

# Emotion labels
emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

# Emotion colors (for frontend use)
emotion_colors = {
    'Angry': '#E53935',     # Red
    'Disgust': '#8BC34A',   # Green
    'Fear': '#9C27B0',      # Purple
    'Happy': '#FFC107',     # Yellow
    'Sad': '#3F51B5',       # Indigo
    'Surprise': '#FF9800',  # Orange
    'Neutral': '#607D8B'    # Blue Grey
}

# Face detection classifier
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def detect_emotion(frame):
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    results = []
    
    for (x, y, w, h) in faces:
        # Extract face ROI
        roi_gray = gray[y:y+h, x:x+w]
        
        # Resize to 48x48 (model input size)
        roi_gray = cv2.resize(roi_gray, (48, 48))
        
        # Normalize and reshape for model
        roi = roi_gray.astype('float') / 255.0
        roi = np.expand_dims(roi, axis=0)
        roi = np.expand_dims(roi, axis=-1)
        
        # Predict emotion
        prediction = model.predict(roi)[0]
        emotion_idx = np.argmax(prediction)
        emotion = emotion_labels[emotion_idx]
        confidence = float(prediction[emotion_idx])
        
        # Store results
        results.append({
            'emotion': emotion,
            'confidence': confidence,
            'box': [int(x), int(y), int(w), int(h)],
            'color': emotion_colors[emotion]
        })
        
    return results

@app.route('/')
def index():
    return render_template('index.html', emotion_colors=emotion_colors)

@app.route('/process_image', methods=['POST'])
def process_image():
    try:
        # Get image data from request
        image_data = request.json.get('image')
        
        # Convert base64 to image
        image_data = image_data.split(',')[1]
        image = Image.open(io.BytesIO(base64.b64decode(image_data)))
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Detect emotions
        results = detect_emotion(frame)
        
        return jsonify({
            'success': True,
            'results': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    app.run(debug=True)
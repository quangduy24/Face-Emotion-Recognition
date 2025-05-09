import cv2
import numpy as np
from tensorflow.keras.models import load_model
import os

class EmotionDetector:
    def __init__(self, model_path):
        # Load the pre-trained model
        self.model = load_model(model_path)
        
        # Emotion labels
        self.emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
        
        # Face detection classifier
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    def detect_emotions(self, frame):
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
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
            prediction = self.model.predict(roi)[0]
            emotion_idx = np.argmax(prediction)
            emotion = self.emotion_labels[emotion_idx]
            confidence = float(prediction[emotion_idx])
            
            # Store results
            results.append({
                'emotion': emotion,
                'confidence': confidence * 100,  # Convert to percentage
                'box': [int(x), int(y), int(w), int(h)]
            })
            
        return results

if __name__ == "__main__":
    # Test the detector
    model_path = os.path.join('models', 'emotion_model4.h5')
    detector = EmotionDetector(model_path)
    
    # Test with an image
    img = cv2.imread('test_image.jpg')
    results = detector.detect_emotions(img)
    print(results)
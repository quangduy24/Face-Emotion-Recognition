document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const uploadedImage = document.getElementById('uploaded-image');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const captureBtn = document.getElementById('capture-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const cameraModeBtn = document.getElementById('camera-mode');
    const uploadModeBtn = document.getElementById('upload-mode');
    const primaryEmotion = document.getElementById('primary-emotion');
    
    // Canvas context
    const ctx = canvas.getContext('2d');
    
    // Chart for emotion visualization
    let emotionChart;
    
    // Stream and processing variables
    let stream = null;
    let isProcessing = false;
    let processingInterval = null;
    
    // Current mode (camera or upload)
    let currentMode = 'camera';
    
    // Initialize emotion chart
    initEmotionChart();
    
    // Event Listeners
    startBtn.addEventListener('click', startProcessing);
    stopBtn.addEventListener('click', stopProcessing);
    captureBtn.addEventListener('click', captureFrame);
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    cameraModeBtn.addEventListener('click', switchToCamera);
    uploadModeBtn.addEventListener('click', switchToUpload);
    
    // Initialize camera mode by default
    switchToCamera();
    
    // Functions
    function initEmotionChart() {
        const ctx = document.getElementById('emotion-chart').getContext('2d');
        emotionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'],
                datasets: [{
                    label: 'Emotion Confidence',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#E53935', // Angry
                        '#8BC34A', // Disgust
                        '#9C27B0', // Fear
                        '#FFC107', // Happy
                        '#3F51B5', // Sad
                        '#FF9800', // Surprise
                        '#607D8B'  // Neutral
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    function switchToCamera() {
        currentMode = 'camera';
        cameraModeBtn.classList.add('active');
        uploadModeBtn.classList.remove('active');
        
        video.style.display = 'block';
        uploadedImage.style.display = 'none';
        
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';
        captureBtn.style.display = 'inline-block';
        uploadBtn.style.display = 'none';
        
        // Initialize camera
        initCamera();
    }
    
    function switchToUpload() {
        currentMode = 'upload';
        cameraModeBtn.classList.remove('active');
        uploadModeBtn.classList.add('active');
        
        // Stop any ongoing processing
        stopProcessing();
        
        video.style.display = 'none';
        uploadedImage.style.display = 'block';
        
        startBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        captureBtn.style.display = 'none';
        uploadBtn.style.display = 'inline-block';
        
        // Stop camera if it's running
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }
    
    async function initCamera() {
        try {
            // Stop any existing stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            // Get new stream
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            
            // Set video source
            video.srcObject = stream;
            
            // Set canvas size to match video
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Error accessing camera. Please check your camera permissions.');
        }
    }
    
    function startProcessing() {
        if (isProcessing || !stream) return;
        
        isProcessing = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // Process frames at regular intervals
        processingInterval = setInterval(processCurrentFrame, 1000); // Process every second
    }
    
    function stopProcessing() {
        if (!isProcessing) return;
        
        isProcessing = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        clearInterval(processingInterval);
    }
    
    function captureFrame() {
        if (!stream) return;
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Process the captured frame
        processFrame(canvas);
    }
    
    function processCurrentFrame() {
        if (!stream) return;
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Process the frame
        processFrame(canvas);
    }
    
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadedImage.src = e.target.result;
            
            uploadedImage.onload = function() {
                // Set canvas size to match image
                canvas.width = uploadedImage.naturalWidth;
                canvas.height = uploadedImage.naturalHeight;
                
                // Draw image to canvas
                ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
                
                // Process the image
                processFrame(canvas);
            };
        };
        
        reader.readAsDataURL(file);
    }
    
    function processFrame(canvas) {
        // Get image data from canvas
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Send to backend for processing
        fetch('/process_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: imageData
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Draw bounding boxes and update results
                drawResults(data.results);
                updateEmotionResults(data.results);
            } else {
                console.error('Error processing image:', data.error);
            }
        })
        .catch(error => {
            console.error('Error sending image for processing:', error);
        });
    }
    
    function drawResults(results) {
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw the image/video frame
        if (currentMode === 'camera') {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
        }
        
        // Draw bounding boxes and labels
        results.forEach(result => {
            const [x, y, w, h] = result.box;
            const emotion = result.emotion;
            const confidence = result.confidence;
            const color = result.color;
            
            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            
            // Draw background for text
            ctx.fillStyle = color;
            ctx.fillRect(x, y - 25, w, 25);
            
            // Draw text
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(`${emotion} (${(confidence * 100).toFixed(1)}%)`, x + 5, y - 5);
        });
    }
    
    function updateEmotionResults(results) {
        if (results.length === 0) {
            resetEmotionResults();
            return;
        }
        
        // Get the first face result (can be extended for multiple faces)
        const result = results[0];
        
        // Create a map to store confidence for each emotion
        const emotionConfidences = {
            'Angry': 0,
            'Disgust': 0,
            'Fear': 0,
            'Happy': 0,
            'Sad': 0,
            'Surprise': 0,
            'Neutral': 0
        };
        
        // Set the detected emotion's confidence
        emotionConfidences[result.emotion] = result.confidence * 100;
        
        // Update chart
        emotionChart.data.datasets[0].data = [
            emotionConfidences['Angry'],
            emotionConfidences['Disgust'],
            emotionConfidences['Fear'],
            emotionConfidences['Happy'],
            emotionConfidences['Sad'],
            emotionConfidences['Surprise'],
            emotionConfidences['Neutral']
        ];
        emotionChart.update();
        
        // Update bars
        for (const emotion in emotionConfidences) {
            const barId = `${emotion.toLowerCase()}-bar`;
            const percentageId = `${emotion.toLowerCase()}-percentage`;
            
            const bar = document.getElementById(barId);
            const percentage = document.getElementById(percentageId);
            
            if (bar && percentage) {
                const value = emotionConfidences[emotion];
                bar.style.width = `${value}%`;
                percentage.textContent = `${value.toFixed(1)}%`;
            }
        }
        
        // Update primary emotion
        primaryEmotion.textContent = result.emotion;
        primaryEmotion.style.color = result.color;
    }
    
    function resetEmotionResults() {
        // Reset chart
        emotionChart.data.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
        emotionChart.update();
        
        // Reset bars
        const emotions = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'];
        emotions.forEach(emotion => {
            const barId = `${emotion.toLowerCase()}-bar`;
            const percentageId = `${emotion.toLowerCase()}-percentage`;
            
            const bar = document.getElementById(barId);
            const percentage = document.getElementById(percentageId);
            
            if (bar && percentage) {
                bar.style.width = '0%';
                percentage.textContent = '0%';
            }
        });
        
        // Reset primary emotion
        primaryEmotion.textContent = 'None';
        primaryEmotion.style.color = '';
    }
});
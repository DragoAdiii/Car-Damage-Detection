// src/App.jsx
import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Make sure this is linked to your index.css imports

function App() {
  // State to manage file selection and prediction output
  const [selectedFile, setSelectedFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setPrediction(null); // Clear previous prediction
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select an image file first.");
      return;
    }

    setLoading(true);
    setErrorMessage('');
    const formData = new FormData();
    // The 'file' key must match the request.files['file'] key in app.py
    formData.append('file', selectedFile);

    try {
      // CRITICAL: We call /api/predict_damage, which is proxied to Flask (localhost:5000)
      const response = await axios.post('/api/predict_damage', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update state with prediction data
      setPrediction(response.data);

    } catch (error) {
      console.error("API Error:", error);
      setErrorMessage("Error connecting to Python API. Is Flask server running?");
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to determine text color based on damage level
  const getColor = (label) => {
    switch (label) {
      case 'MINOR': return 'text-yellow-500';
      case 'MODERATE': return 'text-orange-500';
      case 'SEVERE': return 'text-red-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-4 rounded-lg">
      
      <div className="bg-white shadow-xl rounded-lg p-8 w-full h-full max-w-lg border border-gray-200 ">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Deep Learning <br />
          Car Damage Analysis
        </h1>
        
        {/* File Input & Button */}
        <div className="flex flex-col space-y-4">
          
          <input 
            type="file" 
            onChange={handleFileChange} 
            accept="image/jpeg, image/png"
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          <button 
            onClick={handleUpload} 
            disabled={loading || !selectedFile}
            className={`w-full py-3 rounded-lg text-white font-semibold transition-colors duration-200 ${
              loading || !selectedFile
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'RUNNING YOLOv8 MODEL...' : 'START DAMAGE PREDICTION'}
          </button>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <p className="text-red-500 mt-4 text-center font-medium">{errorMessage}</p>
        )}

        {/* Prediction Results Display */}
        {prediction && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Analysis Result:</h3>
            
            <p className="text-sm text-gray-500 mb-2">Image: {selectedFile.name}</p>
            
            <div className={`text-4xl font-extrabold ${getColor(prediction.label)}`}>
              {prediction.label}
            </div>
            
            <p className="text-lg mt-2">
              Confidence: <span className="font-bold">{(prediction.confidence * 100).toFixed(2)}%</span>
            </p>

            <p className="mt-4 text-gray-600">
              {prediction.label === 'NO DAMAGE' 
                ? 'The vehicle appears fine; no claim necessary.' 
                : 'Alert! This case requires immediate review by an adjuster.'}
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-6">Model: YOLOv8n (Custom Trained)</p>
    </div>
  );
}

export default App;
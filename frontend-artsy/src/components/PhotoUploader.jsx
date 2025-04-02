import React, { useState, useRef, useEffect } from "react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import Dropzone from "react-dropzone";
import { FaUpload, FaSave, FaUndo, FaRedo } from "react-icons/fa";
import "../App.css";

const PhotoUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [blurIntensity, setBlurIntensity] = useState(1);
  const [noiseIntensity, setNoiseIntensity] = useState(25);
  const [pixelIntensity, setPixelIntensity] = useState(1);
  const [activeFilter, setActiveFilter] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef(null);

  const handleFileDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setProcessedImage(null);

    // Reset history when loading a new file
    setHistory([]);
    setHistoryIndex(-1);
    setActiveFilter(null);
  };

  const addToHistory = (imageData) => {
    // Remove any "future" history if we're not at the most recent state
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setProcessedImage(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setProcessedImage(history[historyIndex + 1]);
    }
  };

  const handleUpload = async (filterName) => {
    if (!selectedFile) {
      alert("Please select an image first");
      return;
    }
    setActiveFilter(filterName);

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("buttonText", filterName);
    console.log("selectedFile type:", typeof selectedFile, selectedFile);


    if (filterName === "Blur") {
      formData.append("blurIntensity", blurIntensity);
    }
    if (filterName === "Noise") {
      formData.append("noiseIntensity", noiseIntensity);
    }
    if (filterName === "Pixalate") {
      formData.append("pixelIntensity", pixelIntensity);
    }

    try {
      const response = await fetch("http://localhost:5001/process-image", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setProcessedImage(result.processed_image_path);
        addToHistory(result.processed_image_path);
      } else {
        console.error("Failed to process image");
      }
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  const handleBlurIntensityChange = (event) => {
    setBlurIntensity(parseInt(event.target.value));
  };

  const handleNoiseIntensityChange = (event) => {
    setNoiseIntensity(parseInt(event.target.value));
  };

  const handlePixelIntensityChange = (event) => {
    setPixelIntensity(parseInt(event.target.value));
  };

  const getImageDataUrl = (pixelData) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = pixelData[0].length;
    canvas.height = pixelData.length;

    for (let y = 0; y < pixelData.length; y++) {
      for (let x = 0; x < pixelData[y].length; x++) {
        const [r, g, b] = pixelData[y][x];
        ctx.fillStyle = `rgba(${r},${g},${b},255)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    return canvas.toDataURL("image/png");
  };

  const resizeImage = (image) => {
    return new Promise((resolve) => {
      const maxSize = 500;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const img = new Image();
      img.src = URL.createObjectURL(image);

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (maxSize / width) * height;
            width = maxSize;
          } else {
            width = (maxSize / height) * width;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
            (blob) => {
              resolve(new File([blob], "resized_image", { type: "image/png" }));
            },
            "image/png",
            1
        );
      };
    });
  };

  const drawImageOnCanvas = async () => {
    if (canvasRef.current && selectedFile) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (processedImage && typeof processedImage === 'string' && processedImage.startsWith('https://')) {
        // processedImage is an S3 URL
        const processedImg = new Image();
        processedImg.crossOrigin = "anonymous"; // Important for CORS
        processedImg.src = processedImage;

        processedImg.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const centerX = canvas.width / 2 - processedImg.width / 2;
          const centerY = canvas.height / 2 - processedImg.height / 2;
          ctx.drawImage(processedImg, centerX, centerY);
        };

        processedImg.onerror = (error) => {
          console.error("Error loading processed image from S3:", error);
          // Handle the error (e.g., display a fallback image)
        };
      } else {
        // processedImage is likely pixel data (from your getImageDataUrl)
        // or selectedFile needs to be processed
        if (processedImage) {
          const processedImg = new Image();
          processedImg.src = getImageDataUrl(processedImage);

          processedImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2 - processedImg.width / 2;
            const centerY = canvas.height / 2 - processedImg.height / 2;
            ctx.drawImage(processedImg, centerX, centerY);
          };
        } else {
          const resizedImage = await resizeImage(selectedFile);
          const img = new Image();
          img.src = URL.createObjectURL(resizedImage);

          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2 - img.width / 2;
            const centerY = canvas.height / 2 - img.height / 2;
            ctx.drawImage(img, centerX, centerY);
          };
        }
      }
    }
  };

  const handleSaveImage = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'photon-edited-image.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  useEffect(() => {
    drawImageOnCanvas();
  }, [selectedFile, processedImage]);

  return (
      <div className="photo-editor">
        {/* Header */}
        <header className="editor-header">
          <div className="logo">Photon</div>
          <div className="header-actions">
            <Button variant="outline-primary" className="header-btn">
              <FaUpload /> Open
            </Button>
            <Button variant="outline-success" className="header-btn" onClick={handleSaveImage} disabled={!selectedFile}>
              <FaSave /> Save
            </Button>
            <Button variant="outline-secondary" className="header-btn" onClick={handleUndo} disabled={historyIndex <= 0}>
              <FaUndo />
            </Button>
            <Button variant="outline-secondary" className="header-btn" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
              <FaRedo />
            </Button>
          </div>
        </header>

        <div className="editor-main">
          {/* Left Sidebar - Tools */}
          <div className="sidebar tools-sidebar">
            <div className="sidebar-section">
              <h4>Tools</h4>
              <div className="tool-buttons">
                <button className="tool-btn" title="Select">
                  <span className="tool-icon">◻</span>
                </button>
                <button className="tool-btn" title="Move">
                  <span className="tool-icon">✥</span>
                </button>
                <button className="tool-btn" title="Crop">
                  <span className="tool-icon">⊡</span>
                </button>
                <button className="tool-btn" title="Brush">
                  <span className="tool-icon">⊛</span>
                </button>
                <button className="tool-btn" title="Eraser">
                  <span className="tool-icon">⌫</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="canvas-container">
            {!selectedFile ? (
                <Dropzone onDrop={handleFileDrop}>
                  {({ getRootProps, getInputProps }) => (
                      <div {...getRootProps()} className="dropzone">
                        <input {...getInputProps()} />
                        <div className="dropzone-content">
                          <FaUpload size={40} />
                          <p>Drag & drop a photo here, or click to select one</p>
                        </div>
                      </div>
                  )}
                </Dropzone>
            ) : (
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="editor-canvas"
                />
            )}
          </div>

          {/* Right Sidebar - Filters & Adjustments */}
          <div className="sidebar filters-sidebar">
            <div className="sidebar-section">
              <h4>Filters</h4>
              <div className="filter-group">
                <h5>Color</h5>
                <button
                    className={`filter-btn ${activeFilter === "Grayscale" ? "active" : ""}`}
                    onClick={() => handleUpload("Grayscale")}
                >
                  Grayscale
                </button>
              </div>

              <div className="filter-group">
                <h5>Distance Metric</h5>
                <button
                    className={`filter-btn ${activeFilter === "Euclidean" ? "active" : ""}`}
                    onClick={() => handleUpload("Euclidean")}
                >
                  Euclidean
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Minkowski" ? "active" : ""}`}
                    onClick={() => handleUpload("Minkowski")}
                >
                  Minkowski
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Manhattan" ? "active" : ""}`}
                    onClick={() => handleUpload("Manhattan")}
                >
                  Manhattan
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Chebyshev" ? "active" : ""}`}
                    onClick={() => handleUpload("Chebyshev")}
                >
                  Chebyshev
                </button>
              </div>

              <div className="filter-group">
                <h5>Halftone</h5>
                <button
                    className={`filter-btn ${activeFilter === "Halftone Add" ? "active" : ""}`}
                    onClick={() => handleUpload("Halftone Add")}
                >
                  Halftone Add
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Halftone Sub" ? "active" : ""}`}
                    onClick={() => handleUpload("Halftone Sub")}
                >
                  Halftone Sub
                </button>
              </div>

              <div className="filter-group">
                <h5>Special Effects</h5>
                <button
                    className={`filter-btn ${activeFilter === "Diagonal Tracing" ? "active" : ""}`}
                    onClick={() => handleUpload("Diagonal Tracing")}
                >
                  Diagonal Tracing
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Circle Scatter" ? "active" : ""}`}
                    onClick={() => handleUpload("Circle Scatter")}
                >
                  Circle Scatter
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Square Scatter" ? "active" : ""}`}
                    onClick={() => handleUpload("Square Scatter")}
                >
                  Square Scatter
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Strings" ? "active" : ""}`}
                    onClick={() => handleUpload("Strings")}
                >
                  Strings
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Segment" ? "active" : ""}`}
                    onClick={() => handleUpload("Segment")}
                >
                  Segment
                </button>
                <button
                    className={`filter-btn ${activeFilter === "RemoveBG" ? "active" : ""}`}
                    onClick={() => handleUpload("RemoveBG")}
                >
                  Remove Background
                </button>
              </div>
            </div>

            <div className="sidebar-section">
              <h4>Adjustments</h4>

              <div className="adjustment-control">
                <div className="adjustment-header">
                  <label htmlFor="blur-slider">Blur</label>
                  <button
                      className={`mini-btn ${activeFilter === "Blur" ? "active" : ""}`}
                      onClick={() => handleUpload("Blur")}
                  >
                    Apply
                  </button>
                </div>
                <input
                    id="blur-slider"
                    type="range"
                    min="1"
                    max="10"
                    value={blurIntensity}
                    onChange={handleBlurIntensityChange}
                    className="slider"
                />
                <span className="slider-value">{blurIntensity}</span>
              </div>

              <div className="adjustment-control">
                <div className="adjustment-header">
                  <label htmlFor="noise-slider">Noise</label>
                  <button
                      className={`mini-btn ${activeFilter === "Noise" ? "active" : ""}`}
                      onClick={() => handleUpload("Noise")}
                  >
                    Apply
                  </button>
                </div>
                <input
                    id="noise-slider"
                    type="range"
                    min="1"
                    max="400"
                    value={noiseIntensity}
                    onChange={handleNoiseIntensityChange}
                    className="slider"
                />
                <span className="slider-value">{noiseIntensity}</span>
              </div>

              <div className="adjustment-control">
                <div className="adjustment-header">
                  <label htmlFor="pixel-slider">Pixelate</label>
                  <button
                      className={`mini-btn ${activeFilter === "Pixalate" ? "active" : ""}`}
                      onClick={() => handleUpload("Pixalate")}
                  >
                    Apply
                  </button>
                </div>
                <input
                    id="pixel-slider"
                    type="range"
                    min="1"
                    max="50"
                    value={pixelIntensity}
                    onChange={handlePixelIntensityChange}
                    className="slider"
                />
                <span className="slider-value">{pixelIntensity}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default PhotoUploader;

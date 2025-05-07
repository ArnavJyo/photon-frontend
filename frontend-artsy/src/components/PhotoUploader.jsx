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
  const fileInputRef = useRef(null);

  const [selection, setSelection] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (processedImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = processedImage;
    }
  }, [processedImage]);

  // Helper function to convert canvas content to a File object
  const canvasToFile = (canvas, filename = 'canvas-image.png') => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob], filename, { type: 'image/png' }));
      }, 'image/png');
    });
  };

  const handleFileDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setProcessedImage(null);

    // Reset history when loading a new file
    setHistory([]);
    setHistoryIndex(-1);
    setActiveFilter(null);

    // Load the image into canvas
    if (file) {
      loadImageToCanvas(file);
    }
  };

  // Add to history using existing implementation
  const addToHistory = (imageData) => {
    // Remove any "future" history if we're not at the most recent state
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle undo - fixed implementation
  const handleUndo = async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousImageData = history[newIndex];
      setProcessedImage(previousImageData);

      // Update the canvas and create a new File from the canvas state
      if (canvasRef.current && previousImageData) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          // Update selectedFile to match canvas state
          const newFile = await canvasToFile(canvas);
          setSelectedFile(newFile);
        };
        img.src = previousImageData;
      }
    }
  };

  // Handle redo - fixed implementation
  const handleRedo = async () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextImageData = history[newIndex];
      setProcessedImage(nextImageData);

      // Also update canvas with the history state
      if (canvasRef.current && nextImageData) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          // Update selectedFile to match canvas state
          const newFile = await canvasToFile(canvas);
          setSelectedFile(newFile);
        };
        img.src = nextImageData;
      }
    }
  };

  // Handle open button click
  const handleOpenClick = () => {
    fileInputRef.current.click();
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // Use the existing handleFileDrop implementation
      handleFileDrop([e.target.files[0]]);
    }
  };

  // Load image to canvas and save to history
  const loadImageToCanvas = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set maximum dimensions for display
        const maxWidth = 800;
        const maxHeight = 600;

        // Calculate scaling ratio to maintain aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        if (height > maxHeight) {
          const ratio = maxHeight / height;
          height = maxHeight;
          width = width * ratio;
        }

        // Adjust canvas size to these constrained dimensions
        canvas.width = width;
        canvas.height = height;

        // Clear canvas and draw image with scaling
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL and save initial state to history
        const imageData = canvas.toDataURL('image/png');
        setProcessedImage(imageData);
        addToHistory(imageData);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Modified upload handler that always uses the current canvas state
  const handleUpload = async (filterName) => {
    if (!canvasRef.current) {
      alert("No image loaded");
      return;
    }

    setActiveFilter(filterName);

    // Always get the current canvas state as a File
    const canvas = canvasRef.current;
    const currentImageFile = await canvasToFile(canvas);

    const formData = new FormData();
    formData.append("image", currentImageFile);
    formData.append("buttonText", filterName);

    if (selection) {
      const selected = {
        x: selection.startX,
        y: selection.startY,
        width: selection.width,
        height: selection.height
      };
      formData.append("selection", JSON.stringify(selected));
    }

    // Add filter parameters as needed
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

  useEffect(() => {
    const drawSelectionBox = () => {
      if (!canvasRef.current || !selection) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(selection.startX, selection.startY, selection.width, selection.height);
    };

    drawSelectionBox();
  }, [selection]);

  const handleSaveImage = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'photon-edited-image.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };
  return (
      <div className="photo-editor">
        <input
            type="file"
            ref={fileInputRef}
            style={{display: 'none'}}
            accept="image/*"
            onChange={handleFileInputChange}
        />
        {/* Header */}
        <header className="editor-header">
          <div className="logo">Photon</div>
          <div className="header-actions">
            <Button variant="outline-primary" className="header-btn" onClick={handleOpenClick}>
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
                  {({getRootProps, getInputProps}) => (
                      <div {...getRootProps()} className="dropzone">
                        <input {...getInputProps()} />
                        <div className="dropzone-content">
                          <FaUpload size={40}/>
                          <p>Drag & drop a photo here, or click to select one</p>
                        </div>
                      </div>
                  )}
                </Dropzone>
            ) : (
                <canvas
                    ref={canvasRef}
                    width={1000}
                    height={1000}
                    // onMouseDown={handleMouseDown}
                    // onMouseMove={handleMouseMove}
                    // onMouseUp={handleMouseUp}
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
                    className={`filter-btn ${activeFilter === "ASCII" ? "active" : ""}`}
                    onClick={() => handleUpload("ASCII")}
                >
                  Ascii
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Voronoi" ? "active" : ""}`}
                    onClick={() => handleUpload("Voronoi")}
                >
                  Voronoi
                </button>
                <button
                    className={`filter-btn ${activeFilter === "Fractal Effect" ? "active" : ""}`}
                    onClick={() => handleUpload("Fractal Effect")}
                >
                  Fractal Effect
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

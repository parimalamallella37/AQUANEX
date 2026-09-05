/**
 * AquaNex AI - Side-Scan Sonar Procedural Canvas & Interactive HUD Engine
 * 
 * Generates authentic acoustic waterfall imagery featuring:
 * - Copper/amber/cyan backscatter gradients matching EdgeTech / Klein Marine sonar displays
 * - Water column nadir zone (acoustic dead zone)
 * - Seabed sand ripples, geological rock formations, and acoustic speckle noise
 * - Specular acoustic highlights and corresponding acoustic shadows cast by debris
 * - High-tech interactive YOLO bounding boxes and U-Net pixel segmentation masks
 */

const SonarCanvasEngine = (function() {
  let canvas = null;
  let ctx = null;
  let currentScenario = null;
  let activeDetectionId = null;
  let onTargetSelectCallback = null;

  // Viewport transforms
  let scale = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Layer Toggles
  const layers = {
    rawAcoustic: true,
    yoloBoxes: true,
    unetMask: true,
    acousticShadows: true,
    rangeGrid: true,
    colorScheme: 'copper' // 'copper' | 'cyan' | 'grayscale'
  };

  // Noise generator cache for authentic acoustic backscatter
  let noiseCanvas = null;

  function initNoiseCache(width, height) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = width;
    noiseCanvas.height = height;
    const nCtx = noiseCanvas.getContext('2d');
    const imgData = nCtx.createImageData(width, height);
    const buffer = new Uint32Array(imgData.data.buffer);
    const len = buffer.length;

    for (let i = 0; i < len; i++) {
      // Rayleight-distributed acoustic speckle noise approximation
      const r1 = Math.random();
      const r2 = Math.random();
      const val = Math.floor(Math.sqrt(-2.0 * Math.log(r1 || 0.001)) * Math.cos(2.0 * Math.PI * r2) * 22 + 110);
      const clamped = Math.max(0, Math.min(255, val));
      buffer[i] = (255 << 24) | (clamped << 16) | (clamped << 8) | clamped;
    }
    nCtx.putImageData(imgData, 0, 0);
  }

  function init(canvasElement, onTargetSelect) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    onTargetSelectCallback = onTargetSelect;

    resizeCanvas();
    window.addEventListener('resize', () => {
      resizeCanvas();
      render();
    });

    initNoiseCache(canvas.width, canvas.height);
    setupEventListeners();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width || 800;
    canvas.height = rect.height || 520;
  }

  function setupEventListeners() {
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - panX) / scale;
      const clickY = (e.clientY - rect.top - panY) / scale;

      // Check if clicked inside any YOLO box
      if (currentScenario && currentScenario.detections && layers.yoloBoxes) {
        let clickedTarget = null;
        for (const det of currentScenario.detections) {
          const b = det.box;
          if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
            clickedTarget = det;
            break;
          }
        }

        if (clickedTarget) {
          selectTarget(clickedTarget.id);
          return;
        }
      }

      // If not clicking a box, initiate pan
      isDragging = true;
      dragStartX = e.clientX - panX;
      dragStartY = e.clientY - panY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - dragStartX;
      panY = e.clientY - dragStartY;
      render();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(0.7, scale * zoomFactor), 3.5);

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      panX = mouseX - (mouseX - panX) * (newScale / scale);
      panY = mouseY - (mouseY - panY) * (newScale / scale);
      scale = newScale;

      render();
    }, { passive: false });
  }

  function loadScenario(scenario) {
    currentScenario = scenario;
    activeDetectionId = (scenario.detections && scenario.detections[0]) ? scenario.detections[0].id : null;
    scale = 1.0;
    panX = 0;
    panY = 0;
    render();
    if (activeDetectionId && onTargetSelectCallback) {
      const activeDet = scenario.detections.find(d => d.id === activeDetectionId);
      onTargetSelectCallback(activeDet, scenario);
    }
  }

  function selectTarget(id) {
    activeDetectionId = id;
    render();
    if (currentScenario && onTargetSelectCallback) {
      const target = currentScenario.detections.find(d => d.id === id);
      if (target) {
        onTargetSelectCallback(target, currentScenario);
      }
    }
  }

  function toggleLayer(layerName, value) {
    if (layers.hasOwnProperty(layerName)) {
      layers[layerName] = value;
      render();
    }
  }

  function setColorScheme(scheme) {
    layers.colorScheme = scheme;
    render();
  }

  function resetView() {
    scale = 1.0;
    panX = 0;
    panY = 0;
    render();
  }

  /**
   * Main Render Pipeline
   */
  function render() {
    if (!ctx || !canvas) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Pan & Zoom
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw Acoustic Seabed & Sonar Waterfall
    drawAcousticSeabed(w, h);

    // 2. Draw Debris Acoustic Returns & Shadows
    if (currentScenario && currentScenario.detections) {
      drawDebrisAcoustics(currentScenario.detections);
    }

    // 3. Draw Water Column Nadir Zone (Center Towfish Track)
    drawNadirWaterColumn(w, h);

    // 4. Draw U-Net Pixel Segmentation Overlay
    if (layers.unetMask && currentScenario && currentScenario.detections) {
      drawUNetSegmentation(currentScenario.detections);
    }

    // 5. Draw YOLO Bounding Boxes
    if (layers.yoloBoxes && currentScenario && currentScenario.detections) {
      drawYOLOBoxes(currentScenario.detections);
    }

    // 6. Draw Metric Slant-Range Lines & Coordinate Grids
    if (layers.rangeGrid) {
      drawRangeGrid(w, h);
    }

    ctx.restore();
  }

  /**
   * Renders procedural high-frequency acoustic backscatter with sand ripples
   */
  function drawAcousticSeabed(w, h) {
    // Base palette determination
    let bgBase, rippleColor, speckleAlpha;
    if (layers.colorScheme === 'copper') {
      bgBase = '#1c1308';
      rippleColor = 'rgba(180, 115, 45, 0.18)';
      speckleAlpha = 0.22;
    } else if (layers.colorScheme === 'cyan') {
      bgBase = '#041525';
      rippleColor = 'rgba(0, 194, 209, 0.16)';
      speckleAlpha = 0.20;
    } else {
      bgBase = '#111111';
      rippleColor = 'rgba(200, 200, 200, 0.14)';
      speckleAlpha = 0.25;
    }

    ctx.fillStyle = bgBase;
    ctx.fillRect(0, 0, w, h);

    // Draw Sand Ripples (Periodic acoustic dunes caused by currents)
    ctx.fillStyle = rippleColor;
    const rippleSpacing = 16;
    for (let y = 0; y < h; y += rippleSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 30) {
        const wave = Math.sin((x * 0.02) + (y * 0.05)) * 4 + Math.sin(x * 0.08) * 2;
        ctx.lineTo(x, y + wave);
      }
      ctx.lineTo(w, y + 4);
      ctx.lineTo(0, y + 4);
      ctx.fill();
    }

    // Blend in Rayleigh speckle noise
    if (noiseCanvas) {
      ctx.save();
      ctx.globalAlpha = speckleAlpha;
      ctx.drawImage(noiseCanvas, 0, 0, w, h);
      ctx.restore();
    }

    // Natural Geological Rocks & Seabed Texture
    drawNaturalGeology(w, h);
  }

  /**
   * Natural rocks/features that the AI successfully identifies as NOT debris
   */
  function drawNaturalGeology(w, h) {
    ctx.save();
    // Rock cluster left channel
    ctx.fillStyle = layers.colorScheme === 'copper' ? 'rgba(220, 140, 60, 0.4)' : 'rgba(0, 220, 240, 0.35)';
    ctx.beginPath();
    ctx.ellipse(80, 240, 14, 22, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Natural acoustic shadow behind rock (black, casts away from center nadir)
    ctx.fillStyle = '#010307';
    ctx.beginPath();
    ctx.ellipse(50, 246, 24, 16, Math.PI / 3, 0, Math.PI * 2);
    ctx.fill();

    // Natural reef outcrop right channel
    ctx.fillStyle = layers.colorScheme === 'copper' ? 'rgba(210, 130, 50, 0.35)' : 'rgba(0, 190, 210, 0.3)';
    ctx.beginPath();
    ctx.ellipse(720, 380, 18, 12, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#010307';
    ctx.beginPath();
    ctx.ellipse(750, 385, 28, 10, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Center nadir zone: water column reflection where towfish altitude has no seabed return
   */
  function drawNadirWaterColumn(w, h) {
    const nadirWidth = 24;
    const centerX = w / 2;

    // Dark water column
    ctx.fillStyle = '#02060c';
    ctx.fillRect(centerX - nadirWidth / 2, 0, nadirWidth, h);

    // Altitude boundary lines (first seabed return)
    ctx.strokeStyle = 'rgba(0, 194, 209, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(centerX - nadirWidth / 2, 0);
    ctx.lineTo(centerX - nadirWidth / 2, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + nadirWidth / 2, 0);
    ctx.lineTo(centerX + nadirWidth / 2, h);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * Realistic Acoustic Backscatter & Acoustic Shadows for Debris Targets
   */
  function drawDebrisAcoustics(detections) {
    ctx.save();

    for (const det of detections) {
      const b = det.box;

      // 1. Acoustic Shadow (darkest zone, cast outwards away from towfish center)
      if (layers.acousticShadows) {
        const isPortSide = b.x < (canvas.width / 2);
        ctx.fillStyle = 'rgba(1, 4, 8, 0.96)';

        ctx.beginPath();
        if (isPortSide) {
          // Shadow casts to the left
          ctx.moveTo(b.x + 20, b.y);
          ctx.lineTo(b.x - 70, b.y + 10);
          ctx.lineTo(b.x - 80, b.y + b.h + 10);
          ctx.lineTo(b.x + 10, b.y + b.h);
        } else {
          // Shadow casts to the right
          ctx.moveTo(b.x + b.w - 20, b.y);
          ctx.lineTo(b.x + b.w + 75, b.y + 10);
          ctx.lineTo(b.x + b.w + 85, b.y + b.h + 10);
          ctx.lineTo(b.x + b.w - 10, b.y + b.h);
        }
        ctx.closePath();
        ctx.fill();
      }

      // 2. Specular Acoustic Highlight (Hard return from metallic/dense debris structure)
      if (det.type.includes('Net') || det.type.includes('Rigging')) {
        // Ghost Net: tangled filament acoustic signature with high-frequency mesh returns
        ctx.strokeStyle = layers.colorScheme === 'copper' ? '#ffd88a' : '#57f2ff';
        ctx.lineWidth = 1.8;

        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.arc(b.x + 30 + (i * 18), b.y + 35 + Math.sin(i * 1.2) * 20, 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Webbing grid lines
        ctx.lineWidth = 1;
        ctx.strokeStyle = layers.colorScheme === 'copper' ? 'rgba(255, 200, 110, 0.45)' : 'rgba(22, 224, 189, 0.45)';
        for (let j = 0; j < 6; j++) {
          ctx.beginPath();
          ctx.moveTo(b.x + 20, b.y + 20 + j * 22);
          ctx.bezierCurveTo(
            b.x + b.w * 0.4, b.y + 10 + j * 24,
            b.x + b.w * 0.7, b.y + 30 + j * 20,
            b.x + b.w - 15, b.y + 25 + j * 24
          );
          ctx.stroke();
        }
      } else if (det.type.includes('Pipe')) {
        // Straight acoustic specular reflection band
        const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, layers.colorScheme === 'copper' ? '#ffaa44' : '#00C2D1');
        grad.addColorStop(1, '#ffffff');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(b.x + 10, b.y + b.h / 2);
        ctx.lineTo(b.x + b.w - 10, b.y + b.h / 2);
        ctx.stroke();
      } else if (det.type.includes('Tire')) {
        // Toroidal acoustic returns
        ctx.strokeStyle = layers.colorScheme === 'copper' ? '#ffe099' : '#00C2D1';
        ctx.lineWidth = 3;
        for (let t = 0; t < 3; t++) {
          ctx.beginPath();
          ctx.ellipse(b.x + 40 + t * 45, b.y + 50 + (t % 2) * 30, 22, 14, Math.PI / 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // Generic / Anomaly specular cluster
        ctx.fillStyle = layers.colorScheme === 'copper' ? 'rgba(255, 230, 160, 0.6)' : 'rgba(0, 240, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 3, b.h / 4, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Draws U-Net Pixel-Level Segmentation Mask
   */
  function drawUNetSegmentation(detections) {
    ctx.save();

    for (const det of detections) {
      if (!det.maskPolygon || det.maskPolygon.length === 0) continue;

      const isSelected = (det.id === activeDetectionId);

      // Translucent pixel mask fill
      ctx.beginPath();
      ctx.moveTo(det.maskPolygon[0][0], det.maskPolygon[0][1]);
      for (let i = 1; i < det.maskPolygon.length; i++) {
        ctx.lineTo(det.maskPolygon[i][0], det.maskPolygon[i][1]);
      }
      ctx.closePath();

      // Mask Color gradient
      if (det.risk === 'HIGH') {
        ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.3)';
        ctx.strokeStyle = '#EF4444';
      } else {
        ctx.fillStyle = isSelected ? 'rgba(0, 194, 209, 0.45)' : 'rgba(0, 194, 209, 0.28)';
        ctx.strokeStyle = '#00C2D1';
      }

      ctx.fill();
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // High-precision pixel boundary hatching
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      const b = det.box;
      for (let px = b.x; px < b.x + b.w; px += 12) {
        ctx.beginPath();
        ctx.moveTo(px, b.y);
        ctx.lineTo(px + 8, b.y + b.h);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Draws YOLO Bounding Boxes with futuristic corner brackets & badges
   */
  function drawYOLOBoxes(detections) {
    ctx.save();

    for (const det of detections) {
      const b = det.box;
      const isSelected = (det.id === activeDetectionId);
      const isHighRisk = (det.risk === 'HIGH');

      const primaryColor = isHighRisk ? '#EF4444' : '#00C2D1';
      const glowColor = isHighRisk ? 'rgba(239, 68, 68, 0.7)' : 'rgba(0, 194, 209, 0.7)';

      // Outer bounding box
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isSelected ? 16 : 8;

      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0; // Reset blur for crisp text

      // High-Tech Corner HUD Brackets
      const cLen = 10;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(b.x - 2, b.y + cLen);
      ctx.lineTo(b.x - 2, b.y - 2);
      ctx.lineTo(b.x + cLen, b.y - 2);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(b.x + b.w - cLen, b.y - 2);
      ctx.lineTo(b.x + b.w + 2, b.y - 2);
      ctx.lineTo(b.x + b.w + 2, b.y + cLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(b.x - 2, b.y + b.h - cLen);
      ctx.lineTo(b.x - 2, b.y + b.h + 2);
      ctx.lineTo(b.x + cLen, b.y + b.h + 2);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(b.x + b.w - cLen, b.y + b.h + 2);
      ctx.lineTo(b.x + b.w + 2, b.y + b.h + 2);
      ctx.lineTo(b.x + b.w + 2, b.y + b.h - cLen);
      ctx.stroke();

      // Detection Tag Header
      const labelText = `${det.type.toUpperCase()}  ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(labelText).width;

      // Tag Background
      ctx.fillStyle = 'rgba(6, 26, 45, 0.95)';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.fillRect(b.x, b.y - 24, textWidth + 16, 20);
      ctx.strokeRect(b.x, b.y - 24, textWidth + 16, 20);

      // Tag Text
      ctx.fillStyle = primaryColor;
      ctx.fillText(labelText, b.x + 8, b.y - 10);

      // Faster R-CNN verification stamp indicator
      if (det.fasterRcnnVerified) {
        const verifyText = 'VERIFIED';
        ctx.fillStyle = '#10B981';
        ctx.font = '700 9px "Orbitron", sans-serif';
        ctx.fillText(verifyText, b.x + textWidth + 24, b.y - 10);
      }
    }

    ctx.restore();
  }

  /**
   * Draws slant-range lines and acoustic metric scale
   */
  function drawRangeGrid(w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 194, 209, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);

    const centerX = w / 2;
    const intervals = [50, 100, 150, 200, 250, 300, 350];

    for (const d of intervals) {
      // Port side distance
      if (centerX - d > 0) {
        ctx.beginPath();
        ctx.moveTo(centerX - d, 0);
        ctx.lineTo(centerX - d, h);
        ctx.stroke();

        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(0, 194, 209, 0.4)';
        ctx.fillText(`${(d * 0.25).toFixed(0)}m PORT`, centerX - d + 4, 18);
      }

      // Starboard side distance
      if (centerX + d < w) {
        ctx.beginPath();
        ctx.moveTo(centerX + d, 0);
        ctx.lineTo(centerX + d, h);
        ctx.stroke();

        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(0, 194, 209, 0.4)';
        ctx.fillText(`${(d * 0.25).toFixed(0)}m STBD`, centerX + d + 4, 18);
      }
    }

    ctx.restore();
  }

  return {
    init: init,
    loadScenario: loadScenario,
    selectTarget: selectTarget,
    toggleLayer: toggleLayer,
    setColorScheme: setColorScheme,
    resetView: resetView,
    render: render
  };
})();

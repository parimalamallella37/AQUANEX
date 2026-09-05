/**
 * AquaNex AI - YOLO vs U-Net Interactive Split Comparison Engine
 * 
 * Interactive Before / After Split Slider showing:
 *   Before (Left):  YOLO Object Detection (WHAT & WHERE - Bounding Box)
 *   After  (Right): U-Net Pixel Segmentation (EXACT PIXELS & BOUNDARIES)
 */

const CompareSlider = (function() {
  let container = null;
  let sliderHandle = null;
  let leftWrapper = null;
  let rightWrapper = null;
  let canvasLeft = null;
  let canvasRight = null;
  let ctxLeft = null;
  let ctxRight = null;

  let isDragging = false;
  let sliderPos = 50; // percentage

  function init(containerElement) {
    container = containerElement;
    sliderHandle = container.querySelector('.comparison-slider-handle');
    leftWrapper = container.querySelector('.comparison-left');
    rightWrapper = container.querySelector('.comparison-right');

    canvasLeft = container.querySelector('#compareCanvasLeft');
    canvasRight = container.querySelector('#compareCanvasRight');

    if (canvasLeft) ctxLeft = canvasLeft.getContext('2d');
    if (canvasRight) ctxRight = canvasRight.getContext('2d');

    resizeCanvases();
    window.addEventListener('resize', () => {
      resizeCanvases();
      drawComparisonScenes();
    });

    setupSliderEvents();
    drawComparisonScenes();
  }

  function resizeCanvases() {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 500;

    if (canvasLeft) {
      canvasLeft.width = w;
      canvasLeft.height = h;
    }
    if (canvasRight) {
      canvasRight.width = w;
      canvasRight.height = h;
    }
    updateSliderPosition(sliderPos);
  }

  function setupSliderEvents() {
    const onStart = (e) => {
      isDragging = true;
      updatePositionFromEvent(e);
    };

    const onMove = (e) => {
      if (!isDragging) return;
      updatePositionFromEvent(e);
    };

    const onEnd = () => {
      isDragging = false;
    };

    if (sliderHandle) {
      sliderHandle.addEventListener('mousedown', onStart);
      sliderHandle.addEventListener('touchstart', onStart, { passive: true });
    }

    container.addEventListener('mousedown', onStart);
    container.addEventListener('touchstart', onStart, { passive: true });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });

    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
  }

  function updatePositionFromEvent(e) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let newPos = ((clientX - rect.left) / rect.width) * 100;
    newPos = Math.max(5, Math.min(95, newPos));
    updateSliderPosition(newPos);
  }

  function updateSliderPosition(pos) {
    sliderPos = pos;
    if (sliderHandle) {
      sliderHandle.style.left = `${pos}%`;
    }
    if (leftWrapper) {
      leftWrapper.style.clipPath = `polygon(0 0, ${pos}% 0, ${pos}% 100%, 0 100%)`;
    }
    if (rightWrapper) {
      rightWrapper.style.clipPath = `polygon(${pos}% 0, 100% 0, 100% 100%, ${pos}% 100%)`;
    }
  }

  /**
   * Render side-by-side scenes
   */
  function drawComparisonScenes() {
    if (!ctxLeft || !ctxRight || !canvasLeft || !canvasRight) return;

    const w = canvasLeft.width;
    const h = canvasLeft.height;

    // Draw base acoustic sonar seabed on both
    drawAcousticBase(ctxLeft, w, h);
    drawAcousticBase(ctxRight, w, h);

    // LEFT: Original Sonar + YOLO Detection (Bounding Box)
    drawYOLOComparison(ctxLeft, w, h);

    // RIGHT: U-Net Precise Pixel Segmentation Mask
    drawUNetComparison(ctxRight, w, h);
  }

  function drawAcousticBase(ctx, w, h) {
    // Sonar copper backscatter
    ctx.fillStyle = '#181109';
    ctx.fillRect(0, 0, w, h);

    // Sand ripples
    ctx.fillStyle = 'rgba(195, 125, 55, 0.16)';
    for (let y = 0; y < h; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 30) {
        ctx.lineTo(x, y + Math.sin(x * 0.03 + y * 0.05) * 5);
      }
      ctx.lineTo(w, y + 4);
      ctx.lineTo(0, y + 4);
      ctx.fill();
    }

    // Towfish Nadir center
    const cx = w / 2;
    ctx.fillStyle = '#02050a';
    ctx.fillRect(cx - 10, 0, 20, h);

    // Draw Debris Acoustic Returns (Ghost Net Target)
    const bx = 160;
    const by = 120;
    const bw = 240;
    const bh = 200;

    // Acoustic Shadow
    ctx.fillStyle = '#020306';
    ctx.beginPath();
    ctx.moveTo(bx + 20, by);
    ctx.lineTo(bx - 90, by + 15);
    ctx.lineTo(bx - 100, by + bh + 10);
    ctx.lineTo(bx + 10, by + bh);
    ctx.closePath();
    ctx.fill();

    // High frequency return
    ctx.strokeStyle = '#ffd88a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(bx + 30 + (i * 20), by + 40 + Math.sin(i * 1.3) * 22, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Fiber mesh
    ctx.strokeStyle = 'rgba(255, 205, 120, 0.4)';
    ctx.lineWidth = 1.2;
    for (let j = 0; j < 6; j++) {
      ctx.beginPath();
      ctx.moveTo(bx + 15, by + 25 + j * 24);
      ctx.bezierCurveTo(bx + bw * 0.4, by + 15 + j * 26, bx + bw * 0.7, by + 35 + j * 22, bx + bw - 15, by + 30 + j * 26);
      ctx.stroke();
    }
  }

  function drawYOLOComparison(ctx, w, h) {
    const bx = 160;
    const by = 120;
    const bw = 240;
    const bh = 200;

    // YOLO Bounding Box with Cyan Glow
    ctx.save();
    ctx.strokeStyle = '#00C2D1';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0, 194, 209, 0.9)';
    ctx.shadowBlur = 14;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.shadowBlur = 0;

    // Corner HUD Reticles
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    const c = 12;
    // TL
    ctx.beginPath(); ctx.moveTo(bx - 2, by + c); ctx.lineTo(bx - 2, by - 2); ctx.lineTo(bx + c, by - 2); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(bx + bw - c, by - 2); ctx.lineTo(bx + bw + 2, by - 2); ctx.lineTo(bx + bw + 2, by + c); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(bx - 2, by + bh - c); ctx.lineTo(bx - 2, by + bh + 2); ctx.lineTo(bx + c, by + bh + 2); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(bx + bw - c, by + bh + 2); ctx.lineTo(bx + bw + 2, by + bh + 2); ctx.lineTo(bx + bw + 2, by + bh - c); ctx.stroke();

    // YOLO Tag
    const tagText = 'YOLO: GHOST NET (96.4%)';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    const tagWidth = ctx.measureText(tagText).width;

    ctx.fillStyle = 'rgba(6, 26, 45, 0.95)';
    ctx.strokeStyle = '#00C2D1';
    ctx.lineWidth = 1.5;
    ctx.fillRect(bx, by - 28, tagWidth + 20, 24);
    ctx.strokeRect(bx, by - 28, tagWidth + 20, 24);

    ctx.fillStyle = '#00C2D1';
    ctx.fillText(tagText, bx + 10, by - 12);

    ctx.restore();
  }

  function drawUNetComparison(ctx, w, h) {
    const polygon = [
      [175, 145], [215, 130], [270, 135], [345, 155], [390, 205],
      [380, 260], [335, 295], [250, 310], [195, 285], [170, 210]
    ];

    ctx.save();

    // Translucent Pixel Mask
    ctx.beginPath();
    ctx.moveTo(polygon[0][0], polygon[0][1]);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i][0], polygon[i][1]);
    }
    ctx.closePath();

    ctx.fillStyle = 'rgba(22, 224, 189, 0.45)';
    ctx.fill();

    ctx.strokeStyle = '#16E0BD';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(22, 224, 189, 0.9)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Detailed pixel hatching showing exact segmented volume
    ctx.strokeStyle = 'rgba(245, 250, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let px = 160; px < 400; px += 10) {
      ctx.beginPath();
      ctx.moveTo(px, 120);
      ctx.lineTo(px + 8, 320);
      ctx.stroke();
    }

    // U-Net Tag
    const tagText = 'U-NET MASK: 1,842 PIXELS (IoU: 0.874)';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    const tagWidth = ctx.measureText(tagText).width;

    ctx.fillStyle = 'rgba(6, 26, 45, 0.95)';
    ctx.strokeStyle = '#16E0BD';
    ctx.lineWidth = 1.5;
    ctx.fillRect(160, 92, tagWidth + 20, 24);
    ctx.strokeRect(160, 92, tagWidth + 20, 24);

    ctx.fillStyle = '#16E0BD';
    ctx.fillText(tagText, 170, 108);

    ctx.restore();
  }

  return {
    init: init,
    refresh: function() {
      resizeCanvases();
      drawComparisonScenes();
    }
  };
})();

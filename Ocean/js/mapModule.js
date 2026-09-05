/**
 * AquaNex AI - Interactive Ocean Geospatial Mapping Module
 * 
 * Provides dark ocean bathymetric mapping powered by Leaflet:
 * - Color-coded glowing radar pulse markers (Red/Orange/Green)
 * - Telemetry popups with GPS coordinates, depth, confidence, and action triggers
 * - AUV sonar swath survey tracks
 * - Heatmap / density rings
 */

const OceanMapModule = (function() {
  let map = null;
  let markersLayer = null;
  let tracksLayer = null;
  let heatmapLayer = null;
  let onInspectTargetCallback = null;

  // Survey route coordinates (AUV Transect Swaths)
  const AUV_SURVEY_TRACK = [
    [15.4500, 80.1100],
    [15.5500, 80.1800],
    [15.6234, 80.2312], // Ghost Net target
    [15.6288, 80.2395],
    [15.7891, 80.3412],
    [15.9200, 80.8000],
    [16.1042, 81.4519], // Pipeline target
    [16.3312, 81.8901]
  ];

  function init(mapContainerId, onInspectTarget) {
    if (map) return; // already initialized
    onInspectTargetCallback = onInspectTarget;

    const mapElement = document.getElementById(mapContainerId);
    if (!mapElement) return;

    // Initialize Leaflet centered in the marine surveillance zone (Bay of Bengal / Coast)
    map = L.map(mapContainerId, {
      center: [15.85, 80.80],
      zoom: 8,
      zoomControl: true,
      attributionControl: false // Strictly no third-party branding
    });

    // Dark nautical tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    tracksLayer = L.layerGroup().addTo(map);
    heatmapLayer = L.layerGroup().addTo(map);

    // Draw AUV Survey Path
    drawAUVSurveyTracks();

    // Draw Detection Markers from API
    loadMapMarkers();
  }

  function drawAUVSurveyTracks() {
    tracksLayer.clearLayers();

    // AUV Sonar Swath corridor (cyan glow)
    const polyline = L.polyline(AUV_SURVEY_TRACK, {
      color: '#00C2D1',
      weight: 3,
      opacity: 0.85,
      dashArray: '8, 8',
      lineCap: 'round'
    });
    tracksLayer.addLayer(polyline);

    // Sonar Acoustic Swath Footprint (Coverage polygon buffer)
    const swathPolygon = L.polygon([
      [15.4400, 80.0950],
      [15.5400, 80.1650],
      [15.6150, 80.2150],
      [15.7800, 80.3250],
      [16.0950, 81.4350],
      [16.3200, 81.8750],
      [16.3420, 81.9050],
      [16.1130, 81.4680],
      [15.7980, 80.3570],
      [15.6320, 80.2470],
      [15.5600, 80.1950],
      [15.4600, 80.1250]
    ], {
      color: '#16E0BD',
      fillColor: '#00C2D1',
      fillOpacity: 0.12,
      weight: 1
    });
    tracksLayer.addLayer(swathPolygon);
  }

  function createPulsingIcon(risk) {
    let colorClass = 'pulse-cyan';
    let dotColor = '#00C2D1';

    if (risk === 'High') {
      colorClass = 'pulse-red';
      dotColor = '#EF4444';
    } else if (risk === 'Medium') {
      colorClass = 'pulse-orange';
      dotColor = '#F59E0B';
    } else {
      colorClass = 'pulse-green';
      dotColor = '#10B981';
    }

    return L.divIcon({
      className: 'custom-sonar-marker',
      html: `
        <div style="position:relative; width: 24px; height: 24px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width: 22px; height: 22px; border-radius: 50%; background: ${dotColor}; opacity: 0.3;" class="${colorClass}"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background: ${dotColor}; border: 2px solid #FFFFFF; box-shadow: 0 0 10px ${dotColor};"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  function loadMapMarkers(filterPriority = 'all') {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    const detections = SonarAPI.getDetections();

    detections.forEach(det => {
      if (filterPriority !== 'all' && det.risk.toLowerCase() !== filterPriority.toLowerCase()) {
        return;
      }

      const icon = createPulsingIcon(det.risk);
      const marker = L.marker([det.lat, det.lng], { icon: icon });

      const badgeClass = det.risk === 'High' ? 'badge-risk-high' : (det.risk === 'Medium' ? 'badge-risk-med' : 'badge-risk-low');

      const popupContent = `
        <div style="padding: 4px; min-width: 220px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; color: #00C2D1;">${det.type}</span>
            <span class="${badgeClass}">${det.risk}</span>
          </div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94A9C0; line-height: 1.6;">
            <div><strong>ID:</strong> ${det.id}</div>
            <div><strong>Confidence:</strong> ${(det.confidence * 100).toFixed(1)}%</div>
            <div><strong>GPS:</strong> ${det.lat.toFixed(4)}° N, ${det.lng.toFixed(4)}° E</div>
            <div><strong>Depth:</strong> ${det.depth}</div>
            <div><strong>Size:</strong> ${det.size}</div>
            <div><strong>Status:</strong> ${det.status}</div>
          </div>
          <div style="margin-top: 10px; border-top: 1px solid rgba(0, 194, 209, 0.2); padding-top: 8px;">
            <button onclick="window.AquaNexApp.inspectDetection('${det.id}')" class="btn-cyan" style="width: 100%; font-size: 11px; padding: 5px 8px;">
              <i class="fas fa-crosshairs"></i> Inspect Sonar Data
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });
  }

  function focusCoordinates(lat, lng, zoomLevel = 11) {
    if (!map) return;
    map.setView([lat, lng], zoomLevel, {
      animate: true,
      duration: 1.2
    });
  }

  function toggleTracks(show) {
    if (!map || !tracksLayer) return;
    if (show) {
      map.addLayer(tracksLayer);
    } else {
      map.removeLayer(tracksLayer);
    }
  }

  function toggleHeatmap(show) {
    if (!map || !heatmapLayer) return;
    heatmapLayer.clearLayers();
    if (show) {
      // Draw simulated debris risk density circles
      const detections = SonarAPI.getDetections();
      detections.forEach(d => {
        const radius = d.risk === 'High' ? 14000 : 8000;
        const color = d.risk === 'High' ? '#EF4444' : '#F59E0B';
        const circle = L.circle([d.lat, d.lng], {
          radius: radius,
          color: color,
          fillColor: color,
          fillOpacity: 0.18,
          weight: 1
        });
        heatmapLayer.addLayer(circle);
      });
      map.addLayer(heatmapLayer);
    } else {
      map.removeLayer(heatmapLayer);
    }
  }

  function invalidateSize() {
    if (map) {
      setTimeout(() => map.invalidateSize(), 200);
    }
  }

  return {
    init: init,
    focusCoordinates: focusCoordinates,
    loadMapMarkers: loadMapMarkers,
    toggleTracks: toggleTracks,
    toggleHeatmap: toggleHeatmap,
    invalidateSize: invalidateSize
  };
})();

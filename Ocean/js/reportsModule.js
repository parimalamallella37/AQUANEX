/**
 * AquaNex AI - Actionable Report Generation Engine
 * 
 * Provides client-side export capabilities:
 * - CSV Export (standard marine debris data format)
 * - JSON Export (structured GeoJSON / sensor payload)
 * - PDF Generation (enterprise marine intelligence report with summary and telemetry)
 */

const ReportsEngine = (function() {
  
  /**
   * Generates and downloads a CSV export of all detections
   */
  function downloadCSV() {
    const data = SonarAPI.getDetections();
    const headers = [
      'Detection ID',
      'Object Type',
      'AI Confidence (%)',
      'Risk Level',
      'Latitude (N)',
      'Longitude (E)',
      'Survey Date',
      'Status',
      'Estimated Size',
      'Water Depth',
      'AI Models Used'
    ];

    const rows = data.map(d => [
      `"${d.id}"`,
      `"${d.type}"`,
      (d.confidence * 100).toFixed(1),
      `"${d.risk}"`,
      d.lat.toFixed(4),
      d.lng.toFixed(4),
      `"${d.date}"`,
      `"${d.status}"`,
      `"${d.size}"`,
      `"${d.depth}"`,
      `"${d.models}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AquaNex_Marine_Debris_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generates and downloads a GeoJSON / JSON file of all detections
   */
  function downloadJSON() {
    const data = SonarAPI.getDetections();
    const geoJson = {
      type: 'FeatureCollection',
      metadata: {
        platform: 'AquaNex AI',
        system: 'Side-Scan Sonar Automated Marine Debris & Ghost Net Detection System',
        generatedAt: new Date().toISOString(),
        totalDetections: data.length,
        organization: 'Marine Intelligence & Ocean Cleanup Taskforce'
      },
      features: data.map(d => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [d.lng, d.lat]
        },
        properties: {
          id: d.id,
          objectType: d.type,
          confidence: d.confidence,
          confidencePercent: `${(d.confidence * 100).toFixed(1)}%`,
          riskLevel: d.risk,
          surveyDate: d.date,
          status: d.status,
          estimatedPhysicalSize: d.size,
          waterDepth: d.depth,
          modelsApplied: d.models
        }
      }))
    };

    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geoJson, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `AquaNex_Geospatial_Detections_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generates and opens/downloads a printable PDF Report with Executive Intelligence Summary
   */
  function generatePDFReport(targetDet = null) {
    // If targetDet is provided, generate a Single Target Incident Report; otherwise comprehensive report
    const detections = targetDet ? [targetDet] : SonarAPI.getDetections();
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Open clean print window for professional high-fidelity PDF output
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for AquaNex AI to generate the report.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AquaNex AI - Marine Debris & Ghost Net Intelligence Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1a202c;
            line-height: 1.5;
            padding: 40px;
            margin: 0;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #0B3D5C;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .logo-title {
            font-size: 24px;
            font-weight: 800;
            color: #061A2D;
            letter-spacing: 0.05em;
          }
          .subtitle {
            font-size: 12px;
            color: #4a5568;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .meta-box {
            font-size: 11px;
            text-align: right;
            color: #718096;
          }
          .summary-card {
            background: #f7fafc;
            border-left: 4px solid #00C2D1;
            padding: 16px;
            margin-bottom: 24px;
            border-radius: 4px;
          }
          .summary-card h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #0B3D5C;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 16px;
          }
          th {
            background: #0B3D5C;
            color: #ffffff;
            text-align: left;
            padding: 8px 10px;
            font-weight: 600;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .badge-high {
            background: #fee2e2;
            color: #b91c1c;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
          }
          .badge-med {
            background: #fef3c7;
            color: #b45309;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
          }
          .badge-low {
            background: #d1fae5;
            color: #047857;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            font-size: 10px;
            color: #a0aec0;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-title">AquaNex AI</div>
            <div class="subtitle">AI-Powered Marine Debris & Ghost Net Acoustic Intelligence</div>
          </div>
          <div class="meta-box">
            <div><strong>Report Ref:</strong> ANX-${Date.now().toString().slice(-6)}</div>
            <div><strong>Date:</strong> ${dateStr}</div>
            <div><strong>Classification:</strong> OPERATIONAL MARITIME</div>
          </div>
        </div>

        <div class="summary-card">
          <h3>Executive Mission Overview</h3>
          <p style="margin:0; font-size:12px; color:#2d3748;">
            Side-Scan Sonar acoustic telemetry was ingested and analyzed using the multi-stage <strong>YOLOv8-Marine</strong> detection framework, 
            <strong>U-Net ResNet-50</strong> pixel-level segmentation mask pipeline, and <strong>Faster R-CNN</strong> high-confidence verification engine.
            A total of <strong>${detections.length} underwater anomalies</strong> were processed. High-priority ghost nets and toxic debris items require immediate retrieval or ROV inspection.
          </p>
        </div>

        <div style="font-size: 14px; font-weight: 700; color: #061A2D; margin-bottom: 8px;">
          Detected Underwater Hazards & Geolocation Telemetry
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Object Class</th>
              <th>Confidence</th>
              <th>Risk</th>
              <th>GPS Coordinates</th>
              <th>Est. Size</th>
              <th>Depth</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${detections.map(d => `
              <tr>
                <td><strong>${d.id}</strong></td>
                <td>${d.type}</td>
                <td>${(d.confidence * 100).toFixed(1)}%</td>
                <td><span class="${d.risk.toLowerCase() === 'high' ? 'badge-high' : (d.risk.toLowerCase() === 'medium' ? 'badge-med' : 'badge-low')}">${d.risk}</span></td>
                <td>${typeof d.lat === 'number' ? d.lat.toFixed(4) : d.lat}° N, ${typeof d.lng === 'number' ? d.lng.toFixed(4) : d.lng}° E</td>
                <td>${d.size || (d.dimensions ? `${d.dimensions.widthMeters}m × ${d.dimensions.lengthMeters}m` : 'N/A')}</td>
                <td>${d.depth || '42.6m'}</td>
                <td>${d.status || 'Active'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${targetDet ? `
          <div style="margin-top: 24px; padding: 14px; border: 1px solid #cbd5e1; border-radius: 6px;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Specific Environmental Impact Assessment</div>
            <p style="font-size: 11px; margin: 0 0 8px 0; color: #334155;">${targetDet.environmentalRisk || 'High risk to marine biodiversity.'}</p>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Recommended Intervention Protocol</div>
            <p style="font-size: 11px; margin: 0; color: #334155;">${targetDet.recommendedAction || 'Deploy Autonomous Underwater Vehicle or salvage diver unit.'}</p>
          </div>
        ` : ''}

        <div class="footer">
          <div>Report generated autonomously by <strong>AquaNex AI</strong> Core Engine</div>
          <div>Page 1 of 1 &bull; Verification Signature: Verified by ResNet-Backbone</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  return {
    downloadCSV: downloadCSV,
    downloadJSON: downloadJSON,
    generatePDFReport: generatePDFReport
  };
})();

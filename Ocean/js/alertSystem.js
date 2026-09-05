/**
 * AquaNex AI - High Priority Alert & Cleanup Dispatch System
 * 
 * Manages critical alerts for high-risk marine hazards (Ghost nets, chemical containers, toxic tires)
 * Provides interactive dispatch actions: View Location, Assign Cleanup Team, Mark as Resolved
 */

const AlertSystem = (function() {
  let activeAlert = {
    id: 'DET-001',
    type: 'Ghost Net',
    confidence: 0.964,
    risk: 'HIGH',
    lat: 15.6234,
    lng: 80.2312,
    depth: '42.6m',
    dimensions: '8.4m × 15.2m',
    environmentalRisk: 'High — Immediate entanglement hazard to marine megafauna (olive ridley turtles, pelagic dolphins) and bottom trawler snagging.',
    recommendedAction: 'Send an inspection team or Autonomous Underwater Vehicle (AUV) for verification and mechanical extraction.'
  };

  let onAlertActionCallback = null;

  function init(onAlertAction) {
    onAlertActionCallback = onAlertAction;
    renderAlertBanner();
  }

  function getActiveAlert() {
    return activeAlert;
  }

  function setAlert(alertData) {
    activeAlert = { ...activeAlert, ...alertData };
    renderAlertBanner();
  }

  function renderAlertBanner() {
    const banner = document.getElementById('highPriorityAlertBanner');
    if (!banner) return;

    if (!activeAlert) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="glass-panel glow-border-red" style="padding: 1rem 1.4rem; border-left: 5px solid #EF4444; background: rgba(26, 8, 14, 0.85); backdrop-filter: blur(12px);">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center pulse-red" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #EF4444; flex-shrink: 0;">
              <i class="fas fa-exclamation-triangle text-red-400 text-xl"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-hud text-red-400 text-xs tracking-wider uppercase font-bold">🚨 Critical Hazard Advisory</span>
                <span class="badge-risk-high text-xs">${activeAlert.type.toUpperCase()}</span>
                <span class="badge-model text-xs font-mono">${(activeAlert.confidence * 100).toFixed(1)}% AI CONF</span>
              </div>
              <div class="text-sm text-slate-200 mt-1">
                <strong>Location:</strong> <span class="font-mono text-cyan-400">${activeAlert.lat.toFixed(4)}° N, ${activeAlert.lng.toFixed(4)}° E</span> &bull; 
                <strong>Dimensions:</strong> <span class="font-mono">${activeAlert.dimensions}</span> &bull; 
                <strong>Depth:</strong> <span class="font-mono">${activeAlert.depth}</span>
              </div>
              <div class="text-xs text-slate-400 mt-0.5">
                ${activeAlert.recommendedAction}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap md:flex-nowrap w-full md:w-auto">
            <button onclick="AlertSystem.viewAlertLocation()" class="btn-outline-cyan text-xs py-2 px-3 flex-1 md:flex-initial">
              <i class="fas fa-map-marker-alt"></i> View Location
            </button>
            <button onclick="AlertSystem.openDispatchModal()" class="btn-danger text-xs py-2 px-3 flex-1 md:flex-initial">
              <i class="fas fa-ship"></i> Assign Cleanup Team
            </button>
            <button onclick="AlertSystem.resolveAlert()" class="btn-cyan text-xs py-2 px-3 flex-1 md:flex-initial" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #fff;">
              <i class="fas fa-check-circle"></i> Mark as Resolved
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function viewAlertLocation() {
    if (onAlertActionCallback) {
      onAlertActionCallback('view-location', activeAlert);
    }
  }

  function openDispatchModal() {
    const modal = document.getElementById('dispatchTeamModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeDispatchModal() {
    const modal = document.getElementById('dispatchTeamModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function confirmDispatch(vesselName) {
    closeDispatchModal();
    SonarAPI.updateDetectionStatus(activeAlert.id, 'Assigned: ' + vesselName);
    showToastNotification(`Cleanup unit [${vesselName}] deployed to coordinates ${activeAlert.lat.toFixed(4)}° N, ${activeAlert.lng.toFixed(4)}° E`, 'success');
    if (onAlertActionCallback) {
      onAlertActionCallback('dispatched', activeAlert);
    }
  }

  function resolveAlert() {
    SonarAPI.updateDetectionStatus(activeAlert.id, 'Resolved');
    showToastNotification(`Alert ${activeAlert.id} marked as resolved. Seabed record logged.`, 'success');
    activeAlert = null;
    renderAlertBanner();
    if (onAlertActionCallback) {
      onAlertActionCallback('resolved', null);
    }
  }

  function showToastNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'glass-panel fixed bottom-6 right-6 z-50 p-4 border flex items-center gap-3 shadow-2xl transition-all duration-300 transform translate-y-0';
    
    if (type === 'success') {
      toast.style.borderColor = '#10B981';
      toast.innerHTML = `<i class="fas fa-check-circle text-emerald-400 text-lg"></i><span class="text-sm font-medium text-slate-100">${message}</span>`;
    } else {
      toast.style.borderColor = '#00C2D1';
      toast.innerHTML = `<i class="fas fa-info-circle text-cyan-400 text-lg"></i><span class="text-sm font-medium text-slate-100">${message}</span>`;
    }

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 4000);
  }

  return {
    init: init,
    getActiveAlert: getActiveAlert,
    setAlert: setAlert,
    viewAlertLocation: viewAlertLocation,
    openDispatchModal: openDispatchModal,
    closeDispatchModal: closeDispatchModal,
    confirmDispatch: confirmDispatch,
    resolveAlert: resolveAlert,
    showToastNotification: showToastNotification
  };
})();

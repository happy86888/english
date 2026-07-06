/* ============================================================
   access.js · Brian v4 無通行碼 / 無使用限制版
   ------------------------------------------------------------
   保留 Access 介面，避免舊程式呼叫 tryUse/getInfo 時報錯。
   ============================================================ */

window.Access = (function() {
  function getDeviceId() {
    let id = localStorage.getItem('dawn_device_id');
    if (!id) {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('dawn_device_id', id);
    }
    return id;
  }

  function tryUse() {
    if (window.updateAccessStatus) window.updateAccessStatus();
    return true;
  }

  function getInfo() {
    return {
      deviceId: getDeviceId(),
      trialDaysLeft: 0,
      isInTrial: false,
      isInWhitelist: true,
      isUnlimited: true,
      todayUsed: 0,
      dailyLimit: 0,
      statusText: '',
      lineId: ''
    };
  }

  function showPaywall() {
    if (window.toast) toast('目前未啟用通行碼或使用限制');
  }

  getDeviceId();
  return { tryUse, getInfo, showPaywall };
})();

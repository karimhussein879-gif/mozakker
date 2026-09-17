/* ============================================================
   Mozakker - المميزات الإضافية
   الإصدار: 5.0 (متوافق مع index.html v2.0)
   ============================================================ */

(function() {
  'use strict';

  // ==================== 1. أصوات التنبيهات ====================
  let audioCtx2 = null;
  function initAudio2() {
    if (!audioCtx2) {
      try {
        audioCtx2 = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) {}
    }
  }

  window.playSound = function(type = 'beep') {
    initAudio2();
    if (!audioCtx2) return;
    try {
      const now = audioCtx2.currentTime;
      const osc = audioCtx2.createOscillator();
      const gain = audioCtx2.createGain();
      osc.connect(gain);
      gain.connect(audioCtx2.destination);

      const sounds = {
        beep:    { freq: 880,  dur: 0.15, type: 'sine' },
        success: { freq: 1046, dur: 0.2,  type: 'sine' },
        error:   { freq: 220,  dur: 0.2,  type: 'sawtooth' },
        alert:   { freq: 660,  dur: 0.4,  type: 'square' },
        click:   { freq: 400,  dur: 0.05, type: 'square' },
      };
      const s = sounds[type] || sounds.beep;

      osc.type = s.type;
      osc.frequency.setValueAtTime(s.freq, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + s.dur);
      osc.start(now);
      osc.stop(now + s.dur);
    } catch(e) {}
  };

  function playAlert() {
    playSound('alert');
    setTimeout(() => playSound('alert'), 500);
    setTimeout(() => playSound('alert'), 1000);
  }

  // ==================== 2. اهتزاز ====================
  function vibrate(pattern = [200, 100, 200]) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch(e) {}
    }
  }

  // ==================== 3. إشعارات ====================
  function requestNotifPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body,
          icon: 'icon-192.png',
          badge: 'icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'mozakker-' + Date.now()
        });
      } catch(e) {}
    }
  }

  // ==================== 4. المزامنة ====================
  window.syncExport = function() {
    try {
      const data = {
        notes: JSON.parse(localStorage.getItem('moz_notes') || '[]'),
        events: JSON.parse(localStorage.getItem('moz_events') || '[]'),
        reminders: JSON.parse(localStorage.getItem('moz_reminders') || '[]'),
        settings: JSON.parse(localStorage.getItem('moz_settings') || '{}'),
        exported: new Date().toISOString(),
        version: 3
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mozakker-sync-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
      URL.revokeObjectURL(url);
      playSound('success');
      alert('✅ تم تصدير البيانات!');
    } catch(e) { alert('خطأ في التصدير'); }
  };

  window.syncImport = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.notes) localStorage.setItem('moz_notes', JSON.stringify(data.notes));
          if (data.events) localStorage.setItem('moz_events', JSON.stringify(data.events));
          if (data.reminders) localStorage.setItem('moz_reminders', JSON.stringify(data.reminders));
          if (data.settings) localStorage.setItem('moz_settings', JSON.stringify(data.settings));
          playSound('success');
          alert('✅ تم استيراد البيانات!');
          location.reload();
        } catch(err) {
          playSound('error');
          alert('❌ الملف تالف');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ==================== 5. التذكيرات الذكية ====================
  function checkSmartReminders() {
    try {
      const notes = JSON.parse(localStorage.getItem('moz_notes') || '[]');
      const now = Date.now();
      const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
      const oldNotes = notes.filter(n =>
        n.importance === 'high' &&
        !n.pinned &&
        (n.updated || n.created) < threeDaysAgo
      );
      if (oldNotes.length > 0) {
        const randomNote = oldNotes[Math.floor(Math.random() * oldNotes.length)];
        sendNotification('⏰ تذكير: ملاحظة مهمة', 'لسه ما خلصتش: "' + randomNote.title + '"');
      }
    } catch(e) {}
  }

  // ==================== مراقبة الوقت ====================
  setInterval(() => {
    try {
      const now = new Date();
      const nowTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      const today = now.toISOString().split('T')[0];

      const reminders = JSON.parse(localStorage.getItem('moz_reminders') || '[]');
      reminders.forEach(r => {
        if (!r.enabled) return;
        if (r.time !== nowTime) return;
        const key = 'smart_reminder_' + r.id + '_' + today;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        playAlert();
        vibrate([300, 150, 300, 150, 300]);
        sendNotification('⏰ حان وقت التنبيه', r.title);
      });

      const events = JSON.parse(localStorage.getItem('moz_events') || '[]');
      events.forEach(e => {
        if (!e.remind || !e.time) return;
        if (e.date !== today) return;
        const [h, m] = e.time.split(':').map(Number);
        const evDate = new Date();
        evDate.setHours(h, m, 0, 0);
        const diff = (evDate - now) / 60000;
        const key = 'smart_event_' + e.id + '_' + today;
        if (diff > 0 && diff <= e.remind && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          playAlert();
          vibrate([300, 150, 300]);
          sendNotification('🔔 موعدك قريب', e.title);
        }
      });
    } catch(e) {}
  }, 30000);

  setInterval(checkSmartReminders, 60 * 60 * 1000);

  // ==================== إضافة زر المزامنة ====================
  window.addEventListener('load', () => {
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(requestNotifPermission, 3000);
      }

      const header = document.querySelector('.header');
      if (header && !document.getElementById('syncBtn')) {
        const btn = document.createElement('button');
        btn.id = 'syncBtn';
        btn.className = 'icon-btn';
        btn.title = 'مزامنة';
        btn.innerHTML = '<span style="font-size:18px">🔄</span>';
        btn.onclick = () => {
          const choice = confirm('OK للتصدير (نسخة احتياطية)\nCancel للاستيراد (استرجاع)');
          if (choice) syncExport();
          else syncImport();
        };
        header.appendChild(btn);
      }

      console.log('%c🚀 Mozakker Features Loaded!', 'color:#10b981;font-weight:bold;font-size:14px');
      console.log('✅ 5 مميزات شغالة (متوافق مع v2.0)');
    }, 1000);
  });

})();

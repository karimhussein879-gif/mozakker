/* ============================================================
   Mozakker - المميزات الإضافية الكاملة
   الإصدار: 3.0
   ============================================================ */

(function() {
  'use strict';

  // ==================== escapeHtml احتياطي ====================
  if (typeof window.escapeHtml === 'undefined') {
    window.escapeHtml = function(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    };
  }

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

  // ==================== 4. To-Do Renderer ====================
  window.renderNotePreview = function(note) {
    if (!note || !note.body) return '';

    const lines = note.body.split('\n');
    const hasTodos = lines.some(line => {
      const t = line.trim();
      return t.startsWith('- [ ]') || t.startsWith('- [x]') || t.startsWith('- [X]');
    });

    if (!hasTodos) {
      return escapeHtml(note.body.slice(0, 150));
    }

    let html = '';
    let shown = 0;

    lines.forEach((line, idx) => {
      if (shown >= 8) return;
      const trimmed = line.trim();
      const isUnchecked = trimmed.startsWith('- [ ]');
      const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');

      if (isUnchecked || isChecked) {
        const text = trimmed.replace(/^- \[[ xX]\]\s*/, '');
        const checked = isChecked;

        html += '<div onclick="event.stopPropagation();window.toggleTodo(\'' + note.id + '\',' + idx + ')" '
          + 'style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:13px;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.15s" '
          + 'onmouseover="this.style.background=\'var(--surface-2)\'" '
          + 'onmouseout="this.style.background=\'transparent\'">'
          + '<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;border:2px solid '
          + (checked ? 'var(--success)' : 'var(--border)') + ';background:'
          + (checked ? 'var(--success)' : 'transparent')
          + ';color:#fff;font-size:10px;flex-shrink:0;transition:all 0.15s">'
          + (checked ? '✓' : '') + '</span>'
          + '<span style="'
          + (checked ? 'text-decoration:line-through;opacity:0.6;' : '')
          + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
          + escapeHtml(text) + '</span>'
          + '</div>';
        shown++;
      } else if (trimmed) {
        html += '<div style="font-size:12px;color:var(--text-muted);margin:2px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
          + escapeHtml(line) + '</div>';
      }
    });

    if (lines.length > 8) {
      html += '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">...</div>';
    }

    return html;
  };

  // ==================== 5. To-Do Toggle ====================
  window.toggleTodo = function(noteId, lineIndex) {
    try {
      const notes = JSON.parse(localStorage.getItem('moz_notes') || '[]');
      const note = notes.find(n => n.id === noteId);
      if (!note || !note.body) return;

      const lines = note.body.split('\n');
      const line = lines[lineIndex];
      if (line === undefined) return;

      const trimmed = line.trim();

      if (trimmed.startsWith('- [ ]')) {
        lines[lineIndex] = line.replace('- [ ]', '- [x]');
      } else if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
        lines[lineIndex] = line.replace(/- \[[xX]\]/, '- [ ]');
      } else {
        return;
      }

      note.body = lines.join('\n');
      note.updated = Date.now();
      localStorage.setItem('moz_notes', JSON.stringify(notes));

      playSound('click');

      if (typeof render === 'function') render();
    } catch(e) {
      console.error('خطأ في toggleTodo:', e);
    }
  };

  // ==================== 6. تصدير PDF ====================
  window.exportNoteAsPDF = function(noteId) {
    try {
      const notes = JSON.parse(localStorage.getItem('moz_notes') || '[]');
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const html = '<!DOCTYPE html>'
        + '<html dir="rtl" lang="ar">'
        + '<head><meta charset="UTF-8"><title>' + (note.title || 'ملاحظة') + '</title>'
        + '<style>'
        + 'body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.8; color: #333; }'
        + 'h1 { color: #4a6cf7; border-bottom: 3px solid #4a6cf7; padding-bottom: 10px; }'
        + '.meta { color: #888; font-size: 12px; margin-bottom: 20px; }'
        + '.body { white-space: pre-wrap; font-size: 15px; }'
        + '.tag { background: #eee; padding: 3px 10px; border-radius: 12px; margin: 3px; display: inline-block; font-size: 12px; }'
        + '</style></head><body>'
        + '<h1>' + (note.title || '(بدون عنوان)') + '</h1>'
        + '<div class="meta">'
        + (note.importance === 'high' ? '🔴 عالية الأهمية' : note.importance === 'medium' ? '🟠 متوسطة' : '🟢 منخفضة')
        + ' • ' + new Date(note.updated || Date.now()).toLocaleDateString('ar-EG')
        + '</div>'
        + '<div class="body">' + (note.body || '').replace(/</g, '&lt;') + '</div>'
        + (note.tags && note.tags.length ? '<div>' + note.tags.map(t => '<span class="tag">#' + t + '</span>').join('') + '</div>' : '')
        + '<hr style="margin-top:40px;border:none;border-top:1px solid #ddd">'
        + '<p style="text-align:center;color:#aaa;font-size:12px">من تطبيق مُذكّر</p>'
        + '</body></html>';

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 500);
      playSound('success');
    } catch(e) { alert('خطأ في التصدير'); }
  };

  // ==================== 7. مشاركة ====================
  window.shareNote = function(noteId) {
    try {
      const notes = JSON.parse(localStorage.getItem('moz_notes') || '[]');
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      const text = '📝 ' + (note.title || '') + '\n\n' + (note.body || '');

      if (navigator.share) {
        navigator.share({
          title: note.title || 'ملاحظة',
          text: text
        }).then(() => playSound('success')).catch(() => {});
      } else {
        navigator.clipboard.writeText(text).then(() => {
          playSound('success');
          alert('✅ تم نسخ الملاحظة!');
        });
      }
    } catch(e) {}
  };

  // ==================== 8. المزامنة ====================
  window.syncExport = function() {
    try {
      const data = {
        notes: JSON.parse(localStorage.getItem('moz_notes') || '[]'),
        events: JSON.parse(localStorage.getItem('moz_events') || '[]'),
        reminders: JSON.parse(localStorage.getItem('moz_reminders') || '[]'),
        settings: JSON.parse(localStorage.getItem('moz_settings') || '{}'),
        exported: new Date().toISOString(),
        version: 2
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

  // ==================== 9. وضع القراءة ====================
  window.toggleReadingMode = function() {
    const isReading = document.body.classList.toggle('reading-mode');
    localStorage.setItem('moz_reading_mode', isReading ? '1' : '0');
    playSound('click');
    return isReading;
  };

  const readingCSS = document.createElement('style');
  readingCSS.textContent = `
    body.reading-mode {
      background: #f4ecd8 !important;
      color: #4a3f2e !important;
      font-size: 18px !important;
    }
    body.reading-mode .note-card,
    body.reading-mode .event-item,
    body.reading-mode .reminder-item {
      background: #faf5e6 !important;
      color: #4a3f2e !important;
    }
    body.reading-mode .header {
      background: #ede4cc !important;
    }
  `;
  document.head.appendChild(readingCSS);

  // ==================== 10. التذكيرات الذكية ====================
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

  // ==================== إضافة أزرار ====================
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (localStorage.getItem('moz_reading_mode') === '1') {
        document.body.classList.add('reading-mode');
      }

      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(requestNotifPermission, 3000);
      }

      const header = document.querySelector('.header');
      if (header && !document.getElementById('readingModeBtn')) {
        const btn = document.createElement('button');
        btn.id = 'readingModeBtn';
        btn.className = 'icon-btn';
        btn.title = 'وضع القراءة';
        btn.innerHTML = '<span style="font-size:18px">📖</span>';
        btn.onclick = () => {
          const active = toggleReadingMode();
          btn.style.background = active ? 'var(--primary)' : '';
          btn.style.color = active ? '#fff' : '';
        };
        if (localStorage.getItem('moz_reading_mode') === '1') {
          btn.style.background = 'var(--primary)';
          btn.style.color = '#fff';
        }
        header.appendChild(btn);
      }

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
      console.log('✅ 10 مميزات شغالة + To-Do تفاعلي');
    }, 1000);
  });

})();

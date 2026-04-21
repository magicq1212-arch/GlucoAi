'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ── Chart.js glow plugin ──────────────────────────────
  Chart.register({
    id: 'glow',
    beforeDatasetDraw({ ctx }) {
      ctx.save();
      ctx.shadowColor = 'rgba(99,102,241,0.6)';
      ctx.shadowBlur = 16;
    },
    afterDatasetDraw({ ctx }) {
      ctx.restore();
    }
  });

  // ── Helpers ───────────────────────────────────────────
  function getStatus(level) {
    if (level < 70)   return { label: 'Low',    cls: 'low' };
    if (level <= 180) return { label: 'Normal', cls: 'normal' };
    return              { label: 'High',   cls: 'high' };
  }

  function formatDate(str) {
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ── Navigation ────────────────────────────────────────
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.section;
      document.getElementById(id).classList.add('active');
      if (id === 'dashboard') loadDashboard();
      if (id === 'tracker')   loadReadings();
    });
  });

  // ── Chart ─────────────────────────────────────────────
  let chartInst = null;

  function buildChart(readings) {
    const canvas = document.getElementById('glucoseChart');
    const empty  = document.getElementById('chartEmpty');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!readings || readings.length === 0) {
      empty.style.display = 'flex';
      if (chartInst) { chartInst.destroy(); chartInst = null; }
      return;
    }
    empty.style.display = 'none';

    const labels = readings.map(r => formatDate(r.date));
    const data   = readings.map(r => r.level);

    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    grad.addColorStop(0,   'rgba(99,102,241,0.28)');
    grad.addColorStop(0.6, 'rgba(34,211,238,0.08)');
    grad.addColorStop(1,   'rgba(34,211,238,0)');

    const pts = data.map(v => {
      if (v < 70)   return '#f97316';
      if (v <= 180) return '#10b981';
      return '#f43f5e';
    });

    if (chartInst) chartInst.destroy();

    chartInst = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Glucose (mg/dL)',
          data,
          fill: true,
          backgroundColor: grad,
          borderColor: 'rgba(99,102,241,0.9)',
          borderWidth: 3,
          tension: 0.45,
          pointBackgroundColor: pts,
          pointBorderColor: '#060b18',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 9,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 16, bottom: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0d1322',
            titleColor: '#8b9ab5',
            bodyColor: '#f0f4ff',
            borderColor: 'rgba(99,102,241,0.4)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: ctx => ` ${ctx.raw} mg/dL — ${getStatus(ctx.raw).label}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#8b9ab5', font: { family: 'DM Mono', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#8b9ab5', font: { family: 'DM Mono', size: 11 } },
            suggestedMin: Math.min(...data) - 20,
            suggestedMax: Math.max(...data) + 20,
          }
        }
      }
    });
  }

  // ── Dashboard ─────────────────────────────────────────
  async function loadDashboard() {
    try {
      const res  = await fetch('/get-readings');
      const data = await res.json();
      const rds  = data.readings || [];

      document.getElementById('stat-count').textContent = rds.length;

      if (!rds.length) {
        document.getElementById('stat-latest').textContent = '—';
        document.getElementById('stat-avg').textContent    = '—';
        buildChart([]);
        return;
      }

      const latest = rds[rds.length - 1];
      const avg    = (rds.reduce((s, r) => s + r.level, 0) / rds.length).toFixed(1);
      const ls     = getStatus(latest.level);
      const as_    = getStatus(parseFloat(avg));

      document.getElementById('stat-latest').textContent = latest.level;
      document.getElementById('stat-avg').textContent    = avg;

      const elL = document.getElementById('status-latest');
      const elA = document.getElementById('status-avg');
      elL.textContent = ls.label;
      elL.className   = `tile-status st-${ls.cls}`;
      elA.textContent = as_.label;
      elA.className   = `tile-status st-${as_.cls}`;

      buildChart(rds);
    } catch (e) { console.error('Dashboard:', e); }
  }

  // ── Tracker / Form ────────────────────────────────────
  const inputDate  = document.getElementById('inputDate');
  const inputLevel = document.getElementById('inputLevel');
  const btnAdd     = document.getElementById('btnAdd');
  const formMsg    = document.getElementById('formMsg');

  if (inputDate) inputDate.value = new Date().toISOString().split('T')[0];

  function showMsg(text, type) {
    if (!formMsg) return;
    formMsg.textContent = text;
    formMsg.className   = `form-feedback ${type}`;
    setTimeout(() => { formMsg.textContent = ''; formMsg.className = 'form-feedback'; }, 3000);
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', async () => {
      const date  = inputDate.value;
      const level = parseFloat(inputLevel.value);
      if (!date || isNaN(level) || level < 20 || level > 600) {
        showMsg('Enter valid data (20–600 mg/dL)', 'err'); return;
      }
      try {
        const res  = await fetch('/add-reading', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, level })
        });
        const data = await res.json();
        if (res.ok) {
          showMsg('Reading saved!', 'ok');
          inputLevel.value = '';
          loadDashboard();
          loadReadings();
        } else { showMsg(data.error || 'Error saving', 'err'); }
      } catch { showMsg('Network error', 'err'); }
    });
  }

  async function loadReadings() {
    try {
      const res  = await fetch('/get-readings');
      const data = await res.json();
      const rds  = (data.readings || []).slice().reverse();

      const list  = document.getElementById('readingsList');
      const count = document.getElementById('readingsCount');
      if (count) count.textContent = `${data.readings.length} entries`;
      if (!list) return;

      if (!rds.length) {
        list.innerHTML = `
          <div class="readings-empty-state">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.25">
              <rect x="6" y="4" width="28" height="33" rx="4" stroke="#94a3b8" stroke-width="2"/>
              <path d="M12 14h16M12 20h16M12 26h10" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p>No readings logged yet</p>
          </div>`;
        return;
      }

      list.innerHTML = rds.map(r => {
        const s = getStatus(r.level);
        return `
          <div class="reading-row">
            <span class="reading-date">${formatDate(r.date)}</span>
            <span class="reading-val ${s.cls}">${r.level} mg/dL</span>
            <span class="reading-chip ${s.cls}">${s.label}</span>
          </div>`;
      }).join('');
    } catch (e) { console.error(e); }
  }

  // ── Chat ──────────────────────────────────────────────
  const chatInput  = document.getElementById('chatInput');
  const chatSend   = document.getElementById('chatSend');
  const chatMsgs   = document.getElementById('chatMessages');

  function addMsg(text, role) {
    if (!chatMsgs) return;
    const isBot = role === 'bot';
    const div   = document.createElement('div');
    div.className = `msg ${isBot ? 'bot' : 'user'}`;
    div.innerHTML = `
      <div class="msg-avatar ${isBot ? 'bot-avatar' : 'user-avatar'}">
        ${isBot
          ? `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9 Q6 4 9 9 Q12 14 15 9" stroke="url(#ma)" stroke-width="2" fill="none" stroke-linecap="round"/><defs><linearGradient id="ma" x1="0" y1="0" x2="18" y2="0"><stop stop-color="#22d3ee"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs></svg>`
          : 'You'}
      </div>
      <div class="msg-body">
        <div class="bubble">${text}</div>
        <div class="msg-time">${timeNow()}</div>
      </div>`;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  function addTyping() {
    const div = document.createElement('div');
    div.className = 'msg bot typing-indicator';
    div.innerHTML = `
      <div class="msg-avatar bot-avatar">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9 Q6 4 9 9 Q12 14 15 9" stroke="url(#mb)" stroke-width="2" fill="none" stroke-linecap="round"/><defs><linearGradient id="mb" x1="0" y1="0" x2="18" y2="0"><stop stop-color="#22d3ee"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs></svg>
      </div>
      <div class="msg-body">
        <div class="bubble typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
      </div>`;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return div;
  }

  async function sendMessage(msg) {
    const text = (msg || chatInput?.value || '').trim();
    if (!text) return;
    addMsg(text, 'user');
    if (chatInput) chatInput.value = '';
    if (chatSend) chatSend.disabled = true;

    const typing = addTyping();
    try {
      const res  = await fetch('/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      typing.remove();
      addMsg(data.response || 'No response', 'bot');
    } catch {
      typing.remove();
      addMsg('Connection error. Please try again.', 'bot');
    } finally {
      if (chatSend) chatSend.disabled = false;
    }
  }

  if (chatSend) chatSend.addEventListener('click', () => sendMessage());
  if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  // Quick buttons
  document.querySelectorAll('.qbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelector('[data-section="chat"]')?.classList.add('active');
      document.getElementById('chat')?.classList.add('active');
      sendMessage(btn.dataset.q);
    });
  });

  window.sendMessage = sendMessage;

  // ── Init ──────────────────────────────────────────────
  loadDashboard();
  loadReadings();
});

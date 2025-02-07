const API = 'http://localhost:8000';
let overviewChart = null, pageviewsChart = null;
let currentRange = '7d';
let currentGranularity = 'day';
let eventsPage = 1;
let allEvents = [];
let isDark = false;

// ---- THEME ----
function toggleTheme() {
  isDark = !isDark;
  document.getElementById('htmlRoot').classList.toggle('dark', isDark);
  // Rebuild charts with new theme
  if (pageviewsChart) { pageviewsChart.destroy(); pageviewsChart = null; }
  if (overviewChart) { overviewChart.destroy(); overviewChart = null; }
  if (document.getElementById('section-overview').classList.contains('active')) loadOverview();
  if (document.getElementById('section-pageviews').classList.contains('active')) loadPageviews();
}

// ---- SIDEBAR + SECTION ----
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('mobileOverlay').classList.toggle('hidden');
}

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.if-nav').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  const titles = { overview: 'Overview', pageviews: 'Pageviews', funnels: 'Funnels', retention: 'Retention', events: 'Events', insights: 'AI Insights' };
  document.getElementById('sectionTitle').textContent = titles[name] || name;
  const loaders = { overview: loadOverview, pageviews: loadPageviews, retention: loadRetention, events: loadEvents };
  if (loaders[name]) loaders[name]();
}

// ---- DATE RANGE ----
function setRange(range) {
  currentRange = range;
  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('range-' + range).classList.add('active');
  loadOverview();
}

function getRangeDates(range) {
  const end = new Date(); const start = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90 };
  start.setDate(start.getDate() - (days[range] || 7));
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

// ---- HEALTH ----
async function checkHealth() {
  try {
    const r = await fetch(`${API}/health`);
    const dot = document.getElementById('healthDot');
    const label = document.getElementById('healthLabel');
    if (r.ok) { dot.style.background = '#10b981'; label.textContent = 'API connected'; }
    else throw new Error();
  } catch { document.getElementById('healthDot').style.background = '#ef4444'; document.getElementById('healthLabel').textContent = 'API offline'; }
}

// ---- OVERVIEW ----
async function loadOverview() {
  try {
    const r = await fetch(`${API}/api/v1/analytics/overview?range=${currentRange}`);
    if (!r.ok) throw new Error();
    const data = await r.json();
    animateCounter('kpi-events', data.total_events || data.events || 15420);
    animateCounter('kpi-users', data.unique_users || data.users || 3241);
    animateCounter('kpi-sessions', data.sessions || 8912);
    document.getElementById('kpi-duration').textContent = formatDuration(data.avg_session_duration || 245);
    document.getElementById('kpi-events-change').innerHTML = trendBadge(data.events_change || 12.5);
    document.getElementById('kpi-users-change').innerHTML = trendBadge(data.users_change || -3.2);
    document.getElementById('kpi-sessions-change').innerHTML = trendBadge(data.sessions_change || 8.1);
  } catch {
    animateCounter('kpi-events', 15420);
    animateCounter('kpi-users', 3241);
    animateCounter('kpi-sessions', 8912);
    document.getElementById('kpi-duration').textContent = '4m 05s';
    document.getElementById('kpi-events-change').innerHTML = trendBadge(12.5);
    document.getElementById('kpi-users-change').innerHTML = trendBadge(-3.2);
    document.getElementById('kpi-sessions-change').innerHTML = trendBadge(8.1);
  }
  loadOverviewChart();
  loadTopEvents();
}

async function loadOverviewChart() {
  const { start, end } = getRangeDates(currentRange);
  let labels = [], values = [];
  try {
    const r = await fetch(`${API}/api/v1/analytics/pageviews?granularity=day&start_date=${start}&end_date=${end}`);
    if (!r.ok) throw new Error();
    const data = await r.json();
    labels = data.map(d => d.date || d.label);
    values = data.map(d => d.count || d.value);
  } catch {
    const days = currentRange === '7d' ? 7 : currentRange === '30d' ? 30 : 90;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      values.push(Math.floor(300 + Math.random() * 400 + Math.sin(i / 3) * 100));
    }
  }

  const ctx = document.getElementById('overviewChart').getContext('2d');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  if (overviewChart) overviewChart.destroy();
  overviewChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Pageviews', data: values, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor, maxTicksLimit: 8, font: { size: 10 } }, grid: { color: gridColor } }, y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } } } }
  });
}

async function loadTopEvents() {
  const container = document.getElementById('topEvents');
  let events = [];
  try {
    const r = await fetch(`${API}/api/v1/analytics/events?limit=5`);
    if (!r.ok) throw new Error();
    const data = await r.json();
    events = Array.isArray(data) ? data : data.events || [];
  } catch {
    events = [
      { event: 'page_view', count: 8420 },
      { event: 'click', count: 3210 },
      { event: 'signup', count: 892 },
      { event: 'purchase', count: 341 },
      { event: 'logout', count: 298 },
    ];
  }

  const maxCount = Math.max(...events.map(e => e.count || 0), 1);
  container.innerHTML = '';
  events.slice(0, 5).forEach(ev => {
    const pct = ((ev.count || 0) / maxCount) * 100;
    const item = document.createElement('div');
    item.className = 'flex items-center gap-3 text-sm py-1';
    item.innerHTML = `
      <span class="text-xs font-mono truncate w-28 flex-shrink-0" style="color:var(--foreground)">${ev.event || ev.name}</span>
      <div class="flex-1 h-2 rounded-full overflow-hidden" style="background:var(--border)">
        <div class="h-full rounded-full transition-all" style="width:${pct}%;background:linear-gradient(90deg,#6366f1,#8b5cf6)"></div>
      </div>
      <span class="text-xs w-12 text-right flex-shrink-0" style="color:var(--muted)">${formatNum(ev.count || 0)}</span>
    `;
    container.appendChild(item);
  });
}

// ---- PAGEVIEWS ----
function setGranularity(gran) {
  currentGranularity = gran;
  document.querySelectorAll('[id^="gran-"]').forEach(b => b.classList.remove('active'));
  document.getElementById('gran-' + gran).classList.add('active');
  loadPageviews();
}

async function loadPageviews() {
  const { start, end } = getRangeDates(currentRange);
  let labels = [], values = [], anomalies = [];
  try {
    const r = await fetch(`${API}/api/v1/analytics/pageviews?granularity=${currentGranularity}&start_date=${start}&end_date=${end}`);
    if (!r.ok) throw new Error();
    const data = await r.json();
    labels = data.map(d => d.date || d.label);
    values = data.map(d => d.count || d.value || 0);
    anomalies = data.map(d => d.anomaly ? d.count : null);
  } catch {
    const days = currentRange === '7d' ? 7 : currentRange === '30d' ? 30 : 90;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const v = Math.floor(300 + Math.random() * 500 + Math.sin(i / 5) * 150);
      values.push(v);
      anomalies.push(Math.random() > 0.9 ? v : null);
    }
  }

  const total = values.reduce((a, b) => a + b, 0);
  const avg = Math.floor(total / values.length) || 0;
  const peak = Math.max(...values);
  document.getElementById('pvTotal').textContent = formatNum(total);
  document.getElementById('pvAvg').textContent = formatNum(avg) + '/day';
  document.getElementById('pvPeak').textContent = formatNum(peak);

  const ctx = document.getElementById('pageviewsChart').getContext('2d');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  if (pageviewsChart) pageviewsChart.destroy();
  pageviewsChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Pageviews', data: values, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5 },
      { label: 'Anomalies', data: anomalies, borderColor: '#ef4444', backgroundColor: '#ef4444', borderWidth: 0, pointRadius: 6, pointStyle: 'triangle', showLine: false }
    ]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor, font: { size: 11 } } } }, scales: { x: { ticks: { color: textColor, maxTicksLimit: 10, font: { size: 10 } }, grid: { color: gridColor } }, y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } } } }
  });
}

// ---- FUNNELS ----
function addFunnelStep() {
  const container = document.getElementById('funnelSteps');
  const n = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'flex gap-2';
  div.innerHTML = `<input type="text" placeholder="Step ${n}: event_name" class="if-input flex-1 rounded-lg px-3 py-2 text-sm" /><button onclick="removeFunnelStep(this)" class="text-muted hover:text-red-400 px-2"><i class="fas fa-times text-xs"></i></button>`;
  container.appendChild(div);
}

function removeFunnelStep(btn) {
  btn.closest('.flex').remove();
}

function loadFunnelTemplate(type) {
  const templates = {
    signup: ['page_view', 'signup_click', 'form_start', 'form_submit', 'signup_complete'],
    purchase: ['product_view', 'add_to_cart', 'checkout_start', 'payment_enter', 'purchase_complete'],
    onboarding: ['signup', 'profile_complete', 'first_action', 'invite_sent', 'day7_active']
  };
  const steps = templates[type] || [];
  const container = document.getElementById('funnelSteps');
  container.innerHTML = '';
  steps.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `<input type="text" value="${s}" class="if-input flex-1 rounded-lg px-3 py-2 text-sm" /><button onclick="removeFunnelStep(this)" class="text-muted hover:text-red-400 px-2"><i class="fas fa-times text-xs"></i></button>`;
    container.appendChild(div);
  });
}

async function analyzeFunnel() {
  const inputs = document.querySelectorAll('#funnelSteps input');
  const steps = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
  if (steps.length < 2) return showToast('Add at least 2 steps', 'error');

  const container = document.getElementById('funnelChart');
  container.innerHTML = '<div class="if-card rounded-xl p-4 text-sm text-muted animate-pulse">Analyzing funnel…</div>';

  let data = [];
  try {
    const r = await fetch(`${API}/api/v1/analytics/funnel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps })
    });
    if (!r.ok) throw new Error();
    data = await r.json();
    data = Array.isArray(data) ? data : data.steps || [];
  } catch {
    const total = 1000 + Math.floor(Math.random() * 500);
    data = steps.map((s, i) => ({
      step: s,
      users: Math.floor(total * Math.pow(0.65, i)),
      conversion_rate: i === 0 ? 100 : Math.round(65 - Math.random() * 15)
    }));
  }

  container.innerHTML = '';
  const maxUsers = data[0]?.users || 1;
  data.forEach((step, i) => {
    const pct = (step.users / maxUsers) * 100;
    const drop = i > 0 ? 100 - (step.users / data[i-1].users * 100) : 0;
    const div = document.createElement('div');
    div.className = 'funnel-step mb-2';
    div.innerHTML = `
      <div class="flex items-center justify-between text-sm mb-1" style="color:var(--muted)">
        <span>${i + 1}. ${step.step}</span>
        <span style="color:var(--foreground)">${formatNum(step.users)} users (${step.conversion_rate || Math.round(pct)}%)</span>
      </div>
      <div class="funnel-bar" style="width:${pct}%;min-width:80px">
        <span>${formatNum(step.users)}</span>
      </div>
      ${i > 0 ? `<div class="funnel-dropoff">▼ ${drop.toFixed(1)}% drop-off</div>` : ''}
    `;
    container.appendChild(div);
  });
}

// ---- RETENTION ----
async function loadRetention() {
  const container = document.getElementById('retentionTable');
  let matrix = [];
  try {
    const r = await fetch(`${API}/api/v1/analytics/retention`);
    if (!r.ok) throw new Error();
    const data = await r.json();
    matrix = data.matrix || data.cohorts || generateMockRetention();
  } catch { matrix = generateMockRetention(); }

  renderRetentionTable(container, matrix);
}

function generateMockRetention() {
  const cohorts = [];
  for (let w = 0; w < 8; w++) {
    const d = new Date(); d.setDate(d.getDate() - w * 7);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weeks = [];
    for (let i = 0; i <= 7 - w; i++) {
      weeks.push(i === 0 ? 100 : Math.max(0, 100 - i * 12 + (Math.random() - 0.5) * 8));
    }
    cohorts.push({ cohort: label, weeks });
  }
  return cohorts;
}

function renderRetentionTable(container, matrix) {
  const maxWeeks = Math.max(...matrix.map(c => c.weeks?.length || 0));
  const headers = ['Cohort', ...Array.from({ length: maxWeeks }, (_, i) => `Week ${i}`)];

  let html = `<table class="retention-table w-full"><thead><tr>`;
  headers.forEach(h => html += `<th class="px-2 py-1 whitespace-nowrap">${h}</th>`);
  html += '</tr></thead><tbody>';

  // Compute averages
  const colTotals = Array(maxWeeks).fill(0);
  const colCounts = Array(maxWeeks).fill(0);

  matrix.forEach(row => {
    html += '<tr>';
    html += `<th class="px-2 py-1 text-left whitespace-nowrap text-xs font-medium" style="color:var(--muted)">${row.cohort}</th>`;
    (row.weeks || []).forEach((pct, i) => {
      const v = typeof pct === 'number' ? pct : parseFloat(pct) || 0;
      colTotals[i] += v; colCounts[i]++;
      const color = getHeatColor(v);
      html += `<td class="retention-cell" style="background:${color};color:${v > 50 ? 'white' : 'var(--muted)'}" title="${v.toFixed(1)}%">${v.toFixed(0)}%</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;

  // Averages
  const d1 = colCounts[1] > 0 ? (colTotals[1] / colCounts[1]).toFixed(1) : '—';
  const d7 = colCounts[1] > 0 ? (colTotals[Math.min(1, colCounts.length-1)] / colCounts[Math.min(1, colCounts.length-1)]).toFixed(1) : '—';
  const d30 = colCounts[4] > 0 ? (colTotals[4] / colCounts[4]).toFixed(1) : '—';
  document.getElementById('d1Retention').textContent = d1 + '%';
  document.getElementById('d7Retention').textContent = d7 + '%';
  document.getElementById('d30Retention').textContent = d30 + '%';
}

function getHeatColor(pct) {
  const v = Math.min(100, Math.max(0, pct)) / 100;
  if (isDark) {
    const r = Math.round(30 + v * 37);
    const g = Math.round(20 + v * 25);
    const b = Math.round(100 + v * 170);
    return `rgb(${r},${g},${b})`;
  }
  const r = Math.round(224 - v * 100);
  const g = Math.round(231 - v * 120);
  const b = Math.round(255 - v * 50);
  return `rgb(${r},${g},${b})`;
}

// ---- EVENTS ----
async function loadEvents() {
  const eventType = document.getElementById('eventTypeFilter')?.value || '';
  const url = `${API}/api/v1/analytics/events?limit=50&page=${eventsPage}${eventType ? '&event_type=' + eventType : ''}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const data = await r.json();
    allEvents = Array.isArray(data) ? data : data.events || data.items || [];
    document.getElementById('eventTotal').textContent = data.total || allEvents.length;
  } catch {
    allEvents = generateMockEvents();
    document.getElementById('eventTotal').textContent = allEvents.length;
  }
  renderEvents(allEvents);
}

function generateMockEvents() {
  const types = ['page_view', 'click', 'signup', 'purchase', 'scroll', 'hover'];
  return Array.from({ length: 25 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 120000).toISOString(),
    event: types[Math.floor(Math.random() * types.length)],
    user_id: 'user_' + Math.floor(Math.random() * 100),
    properties: { page: '/home', button: 'cta-primary', source: 'organic' }
  }));
}

function filterEvents() {
  const q = document.getElementById('eventSearch').value.toLowerCase();
  renderEvents(allEvents.filter(e => (e.event || '').toLowerCase().includes(q) || (e.user_id || '').toLowerCase().includes(q)));
}

function renderEvents(events) {
  const tbody = document.getElementById('eventsTable');
  tbody.innerHTML = '';
  events.forEach(ev => {
    const tr = document.createElement('tr');
    tr.onclick = () => showEventDetail(ev);
    tr.innerHTML = `
      <td class="px-4 py-3 text-xs font-mono">${new Date(ev.timestamp).toLocaleString()}</td>
      <td class="px-4 py-3"><span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:rgba(99,102,241,0.12);color:#6366f1">${ev.event}</span></td>
      <td class="px-4 py-3 text-xs hidden md:table-cell" style="color:var(--muted)">${ev.user_id || '—'}</td>
      <td class="px-4 py-3 text-xs hidden lg:table-cell font-mono truncate max-w-xs" style="color:var(--muted)">${JSON.stringify(ev.properties || {}).substring(0, 60)}…</td>
    `;
    tbody.appendChild(tr);
  });
  if (events.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-muted italic text-sm">No events found</td></tr>';
}

function showEventDetail(ev) {
  const panel = document.getElementById('eventDetail');
  panel.classList.remove('hidden');
  panel.style.display = 'flex';
  document.getElementById('eventDetailContent').innerHTML = `
    <div class="mb-3"><div class="text-xs text-muted mb-1">EVENT</div><span class="text-sm font-semibold" style="color:var(--primary)">${ev.event}</span></div>
    <div class="mb-3"><div class="text-xs text-muted mb-1">TIMESTAMP</div><span class="text-sm font-mono">${new Date(ev.timestamp).toLocaleString()}</span></div>
    <div class="mb-3"><div class="text-xs text-muted mb-1">USER ID</div><span class="text-sm font-mono">${ev.user_id || '—'}</span></div>
    <div><div class="text-xs text-muted mb-1">PROPERTIES</div><pre class="text-xs font-mono p-3 rounded-lg overflow-auto" style="background:var(--bg);color:var(--foreground)">${JSON.stringify(ev.properties || {}, null, 2)}</pre></div>
  `;
}

function closeEventDetail() {
  document.getElementById('eventDetail').style.display = 'none';
  document.getElementById('eventDetail').classList.add('hidden');
}

function prevPage() {
  if (eventsPage > 1) { eventsPage--; loadEvents(); }
  document.getElementById('currentPage').textContent = eventsPage;
  document.getElementById('prevBtn').disabled = eventsPage === 1;
}
function nextPage() {
  eventsPage++;
  loadEvents();
  document.getElementById('currentPage').textContent = eventsPage;
  document.getElementById('prevBtn').disabled = false;
}

// ---- AI INSIGHTS ----
async function generateInsights() {
  const timeframe = document.getElementById('insightTimeframe')?.value || currentRange;
  const btn = document.getElementById('insightBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Generating…'; }

  const container = document.getElementById('insightCards');
  const preview = document.getElementById('insightPreview');
  container.innerHTML = '';

  try {
    const r = await fetch(`${API}/api/v1/ai/insights`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeframe })
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const insights = Array.isArray(data) ? data : data.insights || [];
    if (preview) preview.textContent = '';
    insights.forEach(ins => renderInsightCard(container, ins));
  } catch {
    const mockInsights = [
      { emoji: '📈', title: 'Signup Conversion Up', description: 'Signup conversion rate increased 18% this week, driven by the new onboarding flow.', action: 'A/B test more CTA variants' },
      { emoji: '⚠️', title: 'High Drop-off on Step 3', description: 'Users drop off heavily at the checkout shipping step. Consider adding progress indicators.', action: 'Simplify checkout form' },
      { emoji: '🔥', title: 'Mobile Traffic Surge', description: 'Mobile sessions increased 34% — ensure responsive optimization is in place.', action: 'Audit mobile performance' },
    ];
    mockInsights.forEach(ins => renderInsightCard(container, ins));
    if (preview) preview.textContent = '';
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-brain mr-1"></i>Generate'; }
  }
}

function renderInsightCard(container, ins) {
  const card = document.createElement('div');
  card.className = 'insight-card';
  card.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="text-2xl flex-shrink-0">${ins.emoji || '💡'}</span>
      <div class="flex-1">
        <div class="font-semibold text-sm mb-1" style="color:var(--foreground)">${ins.title}</div>
        <div class="text-xs mb-2" style="color:var(--muted)">${ins.description || ''}</div>
        ${ins.action ? `<div class="text-xs px-2 py-1 rounded inline-flex items-center gap-1" style="background:rgba(99,102,241,0.1);color:var(--primary)"><i class="fas fa-arrow-right text-xs"></i>${ins.action}</div>` : ''}
      </div>
    </div>
  `;
  container.appendChild(card);
}

async function getRecommendations() {
  const goal = document.getElementById('recGoal').value.trim();
  if (!goal) return showToast('Enter a goal first', 'error');
  const container = document.getElementById('recCards');
  container.innerHTML = '<div class="if-card rounded-xl p-4 text-sm text-muted animate-pulse">Getting recommendations…</div>';
  try {
    const r = await fetch(`${API}/api/v1/ai/recommendations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal })
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const recs = Array.isArray(data) ? data : data.recommendations || [];
    container.innerHTML = '';
    recs.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'if-card rounded-xl p-4';
      card.innerHTML = `<div class="text-sm font-semibold mb-1" style="color:var(--primary)">${rec.title || rec.recommendation}</div><div class="text-xs" style="color:var(--muted)">${rec.description || ''}</div>`;
      container.appendChild(card);
    });
  } catch {
    container.innerHTML = `<div class="if-card rounded-xl p-4 text-sm" style="color:var(--muted)">Try: Analyze your top acquisition channels, improve mobile UX, or add social proof elements to signup pages.</div>`;
  }
}

// ---- HELPERS ----
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m ${s.toString().padStart(2,'0')}s`;
}

function trendBadge(pct) {
  const up = pct >= 0;
  const color = up ? '#10b981' : '#ef4444';
  const icon = up ? 'arrow-trend-up' : 'arrow-trend-down';
  return `<span style="color:${color};font-size:0.72rem"><i class="fas fa-${icon} mr-1"></i>${up ? '+' : ''}${pct.toFixed(1)}%</span>`;
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.floor(target / 40));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = formatNum(current);
    if (current >= target) clearInterval(interval);
  }, 25);
}

// ---- TOAST ----
function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas fa-${type === 'error' ? 'circle-xmark' : 'circle-info'} mr-2"></i>${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ---- LIVE COUNTER ----
setInterval(() => {
  const badge = document.getElementById('liveCountBadge');
  if (badge) badge.style.opacity = badge.style.opacity === '0' ? '1' : '0';
}, 1000);
setInterval(loadEvents, 10000);

// ---- INIT ----
checkHealth();
loadOverview();

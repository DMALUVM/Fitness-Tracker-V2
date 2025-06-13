const defaultGoals = { pushups: 200, pullups: 20, squats: 200 };
let goals = { ...defaultGoals };
let activityData = JSON.parse(localStorage.getItem('activityData') || '{}');

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

// === Initialization ===
window.addEventListener('DOMContentLoaded', () => {
  const savedGoals = JSON.parse(localStorage.getItem('goals'));
  if (savedGoals) {
    goals = savedGoals;
    ['pushups', 'pullups', 'squats'].forEach(k => {
      document.getElementById(`goal${capitalize(k)}`).value = goals[k];
    });
  }
  updateProgressBars();
  renderCalendar();
  updateSummary();
});

// === Goal Save (Debounced) ===
let debounceTimer;
document.querySelectorAll('.goals-section input').forEach(input => {
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveGoals, 300);
  });
});

function saveGoals() {
  goals.pushups = parseInt(document.getElementById('goalPushups').value) || 0;
  goals.pullups = parseInt(document.getElementById('goalPullups').value) || 0;
  goals.squats = parseInt(document.getElementById('goalSquats').value) || 0;
  localStorage.setItem('goals', JSON.stringify(goals));
  updateProgressBars();
  renderCalendar();
  updateSummary();
}

// === Activity Entry ===
document.getElementById('saveEntry').addEventListener('click', () => {
  const entry = {
    pushups: +document.getElementById('pushups').value || 0,
    pullups: +document.getElementById('pullups').value || 0,
    squats: +document.getElementById('squats').value || 0,
    deadHang: document.getElementById('deadHang').value || ""
  };

  const prev = activityData[todayStr] || { pushups: 0, pullups: 0, squats: 0, deadHang: "" };
  const updated = {
    pushups: prev.pushups + entry.pushups,
    pullups: prev.pullups + entry.pullups,
    squats: prev.squats + entry.squats,
    deadHang: entry.deadHang || prev.deadHang
  };

  activityData[todayStr] = updated;
  localStorage.setItem('activityData', JSON.stringify(activityData));
  updateProgressBars();
  renderCalendar();
  updateSummary();
  sendToGoogleSheets(todayStr, updated);

  ['pushups', 'pullups', 'squats', 'deadHang'].forEach(id => {
    document.getElementById(id).value = '';
  });
});

// === Google Sheets Sync ===
function sendToGoogleSheets(date, entry) {
  fetch("https://script.google.com/macros/s/AKfycby6_cBMbcJ4fsBvAfwOJe0gfzhNZWCE7onx5iuAMoUnFFlD2WHRVoMKDWciO4LpAva7/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, ...entry })
  })
  .then(res => res.text())
  .then(msg => console.log("✅ Synced to Sheets:", msg))
  .catch(err => console.error("❌ Sheets Sync Failed:", err));
}

// === Progress Bars ===
function updateProgressBars() {
  const data = activityData[todayStr] || { pushups: 0, pullups: 0, squats: 0 };
  updateBarWithTotal('progressPushups', data.pushups, goals.pushups);
  updateBarWithTotal('progressPullups', data.pullups, goals.pullups);
  updateBarWithTotal('progressSquats', data.squats, goals.squats);
}

function updateBarWithTotal(id, value, goal) {
  const percent = Math.min((value / goal) * 100, 100);
  const barContainer = document.getElementById(id);
  const bar = barContainer.firstElementChild;
  bar.style.width = percent + "%";
  bar.style.backgroundColor = percent >= 100 ? "green" : (percent >= 50 ? "orange" : "red");

  let label = barContainer.querySelector('.bar-total-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'bar-total-label';
    barContainer.appendChild(label);
  }
  label.textContent = `${value}/${goal}`;
}

// === Calendar ===
function renderCalendar() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const monthName = now.toLocaleString('default', { month: 'long' });

  document.getElementById('calendarMonthYear').textContent = `${monthName} ${year}`;

  let date = new Date(first);
  date.setDate(date.getDate() - date.getDay());

  while (date <= last || date.getDay() !== 0) {
    const dateStr = date.toISOString().split('T')[0];
    const dayBox = document.createElement('div');
    dayBox.className = 'calendar-day';
    dayBox.tabIndex = 0;
    dayBox.innerHTML = `<div class="date-label">${date.getDate()}</div>`;

    if (dateStr === todayStr) {
      dayBox.style.border = '2px solid #007bff';
    }

    if (activityData[dateStr]) {
      const a = activityData[dateStr];
      const icons = ['pushups', 'pullups', 'squats'].map(k =>
        a[k] >= goals[k] ? '✅' : (a[k] > 0 ? '⚠️' : '❌')
      ).map(e => `<span>${e}</span>`).join('');
      dayBox.innerHTML += `<div class="emoji-indicators">${icons}</div>`;
      if (a.deadHang) dayBox.innerHTML += `<div>⏱ ${a.deadHang}</div>`;
    }

    dayBox.addEventListener('click', () => openEditModal(dateStr));
    calendar.appendChild(dayBox);
    date.setDate(date.getDate() + 1);
  }
}

// === Summary ===
function updateSummary() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const totals = {
    week: { pushups: 0, pullups: 0, squats: 0 },
    month: { pushups: 0, pullups: 0, squats: 0 },
    year: { pushups: 0, pullups: 0, squats: 0 },
    allTime: { pushups: 0, pullups: 0, squats: 0 }
  };

  for (const [dateStr, data] of Object.entries(activityData)) {
    const date = new Date(dateStr);
    if (date >= startOfWeek) addToTotals(totals.week, data);
    if (date >= startOfMonth) addToTotals(totals.month, data);
    if (date >= startOfYear) addToTotals(totals.year, data);
    addToTotals(totals.allTime, data);
  }

  const summary = document.getElementById('summary');
  summary.innerHTML = `
    <strong>Week:</strong> Pushups: ${totals.week.pushups}, Pullups: ${totals.week.pullups}, Squats: ${totals.week.squats}<br>
    <strong>Month:</strong> Pushups: ${totals.month.pushups}, Pullups: ${totals.month.pullups}, Squats: ${totals.month.squats}<br>
    <strong>Year:</strong> Pushups: ${totals.year.pushups}, Pullups: ${totals.year.pullups}, Squats: ${totals.year.squats}<br>
    <strong>All Time:</strong> Pushups: ${totals.allTime.pushups}, Pullups: ${totals.allTime.pullups}, Squats: ${totals.allTime.squats}
  `;
}

function addToTotals(t, d) {
  t.pushups += d.pushups || 0;
  t.pullups += d.pullups || 0;
  t.squats += d.squats || 0;
}

// === Modal ===
function openEditModal(dateStr) {
  const d = activityData[dateStr] || { pushups: 0, pullups: 0, squats: 0, deadHang: "" };
  document.getElementById('editDateLabel').textContent = dateStr;
  document.getElementById('editPushups').value = d.pushups;
  document.getElementById('editPullups').value = d.pullups;
  document.getElementById('editSquats').value = d.squats;
  document.getElementById('editDeadHang').value = d.deadHang;
  document.getElementById('editModal').dataset.date = dateStr;
  document.getElementById('editModal').classList.remove('hidden');
}

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('editModal').classList.add('hidden');
});

document.getElementById('saveEdit').addEventListener('click', () => {
  const dateStr = document.getElementById('editModal').dataset.date;
  activityData[dateStr] = {
    pushups: +document.getElementById('editPushups').value || 0,
    pullups: +document.getElementById('editPullups').value || 0,
    squats: +document.getElementById('editSquats').value || 0,
    deadHang: document.getElementById('editDeadHang').value || ''
  };
  localStorage.setItem('activityData', JSON.stringify(activityData));
  renderCalendar();
  updateSummary();
  if (dateStr === todayStr) updateProgressBars();
  sendToGoogleSheets(dateStr, activityData[dateStr]);
  document.getElementById('editModal').classList.add('hidden');
});

// === Helpers ===
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


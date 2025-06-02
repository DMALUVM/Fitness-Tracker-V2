// script.js – Fitness Tracker App

const defaultGoals = {
  pushups: 200,
  pullups: 20,
  squats: 200
};

let goals = { ...defaultGoals };
let activityData = JSON.parse(localStorage.getItem('activityData') || '{}');
const todayStr = new Date().toISOString().split('T')[0];

function saveGoals() {
  goals.pushups = parseInt(document.getElementById('goalPushups').value) || 0;
  goals.pullups = parseInt(document.getElementById('goalPullups').value) || 0;
  goals.squats = parseInt(document.getElementById('goalSquats').value) || 0;
  localStorage.setItem('goals', JSON.stringify(goals));
  updateProgressBars();
  renderCalendar();
  updateSummary();
}

function saveTodayEntry() {
  const newEntry = {
    pushups: parseInt(document.getElementById('pushups').value) || 0,
    pullups: parseInt(document.getElementById('pullups').value) || 0,
    squats: parseInt(document.getElementById('squats').value) || 0,
    deadHang: document.getElementById('deadHang').value || ""
  };

  const existing = activityData[todayStr] || { pushups: 0, pullups: 0, squats: 0, deadHang: "" };
  const updatedEntry = {
    pushups: existing.pushups + newEntry.pushups,
    pullups: existing.pullups + newEntry.pullups,
    squats: existing.squats + newEntry.squats,
    deadHang: newEntry.deadHang || existing.deadHang
  };

  activityData[todayStr] = updatedEntry;
  localStorage.setItem('activityData', JSON.stringify(activityData));
  updateProgressBars();
  renderCalendar();
  updateSummary();
  syncToGoogleSheets(todayStr, updatedEntry);

  document.getElementById('pushups').value = '';
  document.getElementById('pullups').value = '';
  document.getElementById('squats').value = '';
  document.getElementById('deadHang').value = '';
}

function syncToGoogleSheets(date, entry) {
  const status = document.getElementById('syncStatus');
  status.textContent = 'Saving...';
  status.className = 'sync-status loading';

  fetch("https://script.google.com/macros/s/AKfycbwiDko2B2b71RrXlbeQ1ahH6iHnw_mZidT4H6eIbzaVME6UxQ3hpv4xbmxOIgsoODN7/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: date,
      pushups: entry.pushups,
      pullups: entry.pullups,
      squats: entry.squats,
      deadHang: entry.deadHang
    })
  })
  .then(res => res.text())
  .then(msg => {
    status.textContent = 'Saved ✅';
    status.className = 'sync-status success';
    setTimeout(() => status.textContent = '', 3000);
    console.log("✅ Google Sheets Backup:", msg);
  })
  .catch(err => {
    status.textContent = 'Error ❌';
    status.className = 'sync-status error';
    console.error("❌ Google Sheets Backup Failed:", err);
  });
}

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

  if (!barContainer.dataset.label) {
    const label = document.createElement('span');
    label.className = 'bar-total-label';
    label.style.marginLeft = '10px';
    label.style.fontWeight = 'bold';
    barContainer.appendChild(label);
    barContainer.dataset.label = 'true';
  }
  barContainer.querySelector('.bar-total-label').textContent = `${value}/${goal}`;
}

document.getElementById('saveEntry').addEventListener('click', saveTodayEntry);
document.querySelectorAll('.goals-section input').forEach(input => {
  input.addEventListener('change', saveGoals);
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('editModal').classList.add('hidden');
});
document.getElementById('saveEdit').addEventListener('click', saveEditEntry);

function saveEditEntry() {
  const dateStr = document.getElementById('editModal').dataset.date;
  const entry = {
    pushups: parseInt(document.getElementById('editPushups').value) || 0,
    pullups: parseInt(document.getElementById('editPullups').value) || 0,
    squats: parseInt(document.getElementById('editSquats').value) || 0,
    deadHang: document.getElementById('editDeadHang').value || ''
  };
  activityData[dateStr] = entry;
  localStorage.setItem('activityData', JSON.stringify(activityData));
  renderCalendar();
  updateSummary();
  if (dateStr === todayStr) updateProgressBars();
  syncToGoogleSheets(dateStr, entry);
  document.getElementById('editModal').classList.add('hidden');
}

function renderCalendar() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let date = new Date(firstDay);
  date.setDate(date.getDate() - firstDay.getDay());

  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
  document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;

  while (date <= lastDay || date.getDay() !== 0) {
    const dayBox = document.createElement('div');
    dayBox.className = 'calendar-day';
    const dateStr = date.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      dayBox.style.border = '2px solid #007bff';
    }

    dayBox.innerHTML = `<div class="date-label">${date.getDate()}</div>`;

    if (activityData[dateStr]) {
      const d = activityData[dateStr];
      const indicators = [
        d.pushups >= goals.pushups ? '✅' : (d.pushups > 0 ? '⚠️' : '❌'),
        d.pullups >= goals.pullups ? '✅' : (d.pullups > 0 ? '⚠️' : '❌'),
        d.squats >= goals.squats ? '✅' : (d.squats > 0 ? '⚠️' : '❌')
      ].map(e => `<span>${e}</span>`).join('');
      const deadHang = d.deadHang || '';
      dayBox.innerHTML += `<div class="emoji-indicators">${indicators}</div>`;
      if (deadHang) dayBox.innerHTML += `<div>⏱ ${deadHang}</div>`;
    }

    dayBox.addEventListener('click', () => openEditModal(dateStr));
    calendar.appendChild(dayBox);
    date.setDate(date.getDate() + 1);
  }
}

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

  document.getElementById('summary').innerHTML = `
    <strong>Week to Date:</strong> Pushups: ${totals.week.pushups}, Pullups: ${totals.week.pullups}, Squats: ${totals.week.squats}<br>
    <strong>Month to Date:</strong> Pushups: ${totals.month.pushups}, Pullups: ${totals.month.pullups}, Squats: ${totals.month.squats}<br>
    <strong>Year to Date:</strong> Pushups: ${totals.year.pushups}, Pullups: ${totals.year.pullups}, Squats: ${totals.year.squats}<br>
    <strong>All Time:</strong> Pushups: ${totals.allTime.pushups}, Pullups: ${totals.allTime.pullups}, Squats: ${totals.allTime.squats}
  `;
}

function addToTotals(t, d) {
  t.pushups += d.pushups || 0;
  t.pullups += d.pullups || 0;
  t.squats += d.squats || 0;
}

window.addEventListener('DOMContentLoaded', () => {
  const savedGoals = JSON.parse(localStorage.getItem('goals'));
  if (savedGoals) {
    goals = savedGoals;
    document.getElementById('goalPushups').value = goals.pushups;
    document.getElementById('goalPullups').value = goals.pullups;
    document.getElementById('goalSquats').value = goals.squats;
  }
  updateProgressBars();
  renderCalendar();
  updateSummary();
});

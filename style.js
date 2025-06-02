```javascript
// script.js – Fitness Tracker App

const defaultGoals = {
  pushups: 200,
  pullups: 20,
  squats: 200
};

let goals = { ...defaultGoals };
let activityData = JSON.parse(localStorage.getItem('activityData') || '{}');
const todayStr = new Date().toISOString().split('T')[0];

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
  renderHistoryTable();
});

// Validate form inputs (used for both main and edit forms)
function validateForm(isEdit = false) {
  let isValid = true;
  const prefix = isEdit ? 'edit' : '';
  const errors = {};

  const pushups = document.getElementById(`${prefix}Pushups`).value;
  if (isNaN(pushups) || pushups < 0) {
    errors[`${prefix}Pushups`] = 'Please enter a valid non-negative number';
    isValid = false;
  }

  const pullups = document.getElementById(`${prefix}Pullups`).value;
  if (isNaN(pullups) || pullups < 0) {
    errors[`${prefix}Pullups`] = 'Please enter a valid non-negative number';
    isValid = false;
  }

  const squats = document.getElementById(`${prefix}Squats`).value;
  if (isNaN(squats) || squats < 0) {
    errors[`${prefix}Squats`] = 'Please enter a valid non-negative number';
    isValid = false;
  }

  const deadHang = document.getElementById(`${prefix}DeadHang`).value;
  if (deadHang && !/^\d+:\d{2}$/.test(deadHang)) {
    errors[`${prefix}DeadHang`] = 'Please enter time in mm:ss format (e.g., 1:30)';
    isValid = false;
  }

  // Show/hide error messages
  Object.keys(errors).forEach(field => {
    const errorElement = document.getElementById(`${field}-error`);
    errorElement.textContent = errors[field];
    errorElement.style.display = 'block';
  });
  document.querySelectorAll(`#${prefix}workout-form .invalid-feedback, #${prefix}edit-form .invalid-feedback`).forEach(el => {
    if (!errors[el.id.replace('-error', '')]) el.style.display = 'none';
  });

  return isValid;
}

function saveGoals() {
  goals.pushups = parseInt(document.getElementById('goalPushups').value) || 0;
  goals.pullups = parseInt(document.getElementById('goalPullups').value) || 0;
  goals.squats = parseInt(document.getElementById('goalSquats').value) || 0;
  localStorage.setItem('goals', JSON.stringify(goals));
  updateProgressBars();
  renderCalendar();
  updateSummary();
  renderHistoryTable();
}

function saveTodayEntry(e) {
  e.preventDefault();
  if (!validateForm()) return;

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
  renderHistoryTable();
  sendToGoogleSheets(todayStr, updatedEntry);

  document.getElementById('pushups').value = '';
  document.getElementById('pullups').value = '';
  document.getElementById('squats').value = '';
  document.getElementById('deadHang').value = '';
}

function sendToGoogleSheets(date, entry) {
  fetch("https://script.google.com/macros/s/AKfycby6_cBMbcJ4fsBvAfwOJe0gfzhNZWCE7onx5iuAMoUnFFlD2WHRVoMKDWciO4LpAva7/exec", {
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
  .then(msg => console.log("✅ Google Sheets Backup:", msg))
  .catch(err => console.error("❌ Google Sheets Backup Failed:", err));
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

function saveEditEntry(e) {
  e.preventDefault();
  if (!validateForm(true)) return;

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
  renderHistoryTable();
  if (dateStr === todayStr) updateProgressBars();
  sendToGoogleSheets(dateStr, entry);
  document.getElementById('editModal').classList.add('hidden');
}

function deleteEntry(dateStr) {
  if (confirm('Are you sure you want to delete this workout entry?')) {
    delete activityData[dateStr];
    localStorage.setItem('activityData', JSON.stringify(activityData));
    renderCalendar();
    updateSummary();
    renderHistoryTable();
    if (dateStr === todayStr) updateProgressBars();
    // Note: No Google Sheets API call to delete; consider adding if supported
  }
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

// New function to render workout history table
function renderHistoryTable(sortKey = 'date', ascending = true) {
  const tbody = document.getElementById('workout-history');
  tbody.innerHTML = '';

  const entries = Object.entries(activityData).map(([date, data]) => ({
    date,
    ...data
  }));

  entries.sort((a, b) => {
    if (sortKey === 'date') return ascending ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    if (sortKey === 'deadHang') return ascending ? (a.deadHang || '').localeCompare(b.deadHang || '') : (b.deadHang || '').localeCompare(a.deadHang || '');
    return ascending ? (a[sortKey] || 0) - (b[sortKey] || 0) : (b[sortKey] || 0) - (a[sortKey] || 0);
  });

  entries.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.pushups}</td>
      <td>${entry.pullups}</td>
      <td>${entry.squats}</td>
      <td>${entry.deadHang || '-'}</td>
      <td>
        <button class="btn btn-outline-primary btn-sm edit-btn" data-date="${entry.date}">Edit</button>
        <button class="btn btn-outline-danger btn-sm delete-btn" data-date="${entry.date}">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Add event listeners for edit/delete buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.date));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.date));
  });

  // Update sortable column indicators
  document.querySelectorAll('.sortable').forEach(th => {
    th.classList.remove('asc', 'desc');
    if (th.dataset.sort === sortKey) {
      th.classList.add(ascending ? 'asc' : 'desc');
    }
  });
}

// Event listeners
document.getElementById('workout-form').addEventListener('submit', saveTodayEntry);
document.getElementById('edit-form').addEventListener('submit', saveEditEntry);
document.querySelectorAll('.goals-section input').forEach(input => {
  input.addEventListener('change', saveGoals);
});
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('editModal').classList.add('hidden');
});

// Table sorting
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const sortKey = th.dataset.sort;
    const ascending = !th.classList.contains('asc');
    renderHistoryTable(sortKey, ascending);
  });
});
```

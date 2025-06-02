// Fitness Tracker JavaScript with Circular Progress, Streaks, and Persistent Storage

const defaultGoals = {
  pushups: 200,
  pullups: 20,
  squats: 200
};

let goals = JSON.parse(localStorage.getItem("goals")) || defaultGoals;
let activityData = JSON.parse(localStorage.getItem("activityData") || '{}');
const todayStr = new Date().toISOString().split('T')[0];

function saveGoals() {
  goals.pushups = parseInt(document.getElementById("goalPushups").value) || 0;
  goals.pullups = parseInt(document.getElementById("goalPullups").value) || 0;
  goals.squats = parseInt(document.getElementById("goalSquats").value) || 0;
  localStorage.setItem("goals", JSON.stringify(goals));
  updateProgress();
  renderCalendar();
  updateSummary();
}

function saveTodayEntry() {
  const newEntry = {
    pushups: parseInt(document.getElementById("pushups").value) || 0,
    pullups: parseInt(document.getElementById("pullups").value) || 0,
    squats: parseInt(document.getElementById("squats").value) || 0,
    deadHang: document.getElementById("deadHang").value || ""
  };

  const existing = activityData[todayStr] || { pushups: 0, pullups: 0, squats: 0, deadHang: "" };
  const updatedEntry = {
    pushups: existing.pushups + newEntry.pushups,
    pullups: existing.pullups + newEntry.pullups,
    squats: existing.squats + newEntry.squats,
    deadHang: newEntry.deadHang || existing.deadHang
  };

  activityData[todayStr] = updatedEntry;
  localStorage.setItem("activityData", JSON.stringify(activityData));

  ["pushups", "pullups", "squats", "deadHang"].forEach(id => document.getElementById(id).value = "");

  updateProgress();
  renderCalendar();
  updateSummary();
}

function updateProgress() {
  const today = activityData[todayStr] || { pushups: 0, pullups: 0, squats: 0 };
  updateRing("pushupRing", today.pushups, goals.pushups);
  updateRing("pullupRing", today.pullups, goals.pullups);
  updateRing("squatRing", today.squats, goals.squats);
}

function updateRing(id, value, goal) {
  const ring = document.querySelector(`#${id} .progress-ring-fill`);
  const percent = Math.min((value / goal) * 100, 100);
  ring.style.strokeDashoffset = 283 - (283 * percent / 100);
  document.querySelector(`#${id} .progress-label`).textContent = `${value}/${goal}`;
}

function calculateStreak() {
  const sortedDates = Object.keys(activityData).sort().reverse();
  let streak = 0;
  let currentDate = new Date();

  for (let dateStr of sortedDates) {
    const entry = activityData[dateStr];
    if (
      entry.pushups >= goals.pushups &&
      entry.pullups >= goals.pullups &&
      entry.squats >= goals.squats
    ) {
      const entryDate = new Date(dateStr);
      if (entryDate.toDateString() === currentDate.toDateString()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  document.getElementById("streakCount").textContent = `🔥 ${streak} day streak`;
}

function renderCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let date = new Date(firstDay);
  date.setDate(date.getDate() - firstDay.getDay());

  document.getElementById("calendarMonthYear").textContent = `${now.toLocaleString('default', { month: 'long' })} ${year}`;

  while (date <= lastDay || date.getDay() !== 0) {
    const dateStr = date.toISOString().split("T")[0];
    const dayBox = document.createElement("div");
    dayBox.className = "calendar-day";

    if (dateStr === todayStr) dayBox.classList.add("today");
    dayBox.innerHTML = `<div class="date-label">${date.getDate()}</div>`;

    if (activityData[dateStr]) {
      const d = activityData[dateStr];
      const indicators = [
        d.pushups >= goals.pushups ? "✅" : d.pushups > 0 ? "⚠️" : "❌",
        d.pullups >= goals.pullups ? "✅" : d.pullups > 0 ? "⚠️" : "❌",
        d.squats >= goals.squats ? "✅" : d.squats > 0 ? "⚠️" : "❌"
      ].map(e => `<span>${e}</span>`).join("");
      dayBox.innerHTML += `<div class="emoji-indicators">${indicators}</div>`;
      if (d.deadHang) dayBox.innerHTML += `<div class="dead-hang-label">⏱ ${d.deadHang}</div>`;
    }

    calendar.appendChild(dayBox);
    date.setDate(date.getDate() + 1);
  }
}

function updateSummary() {
  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const totals = { week: {}, month: {}, year: {}, allTime: {} };
  ["pushups", "pullups", "squats"].forEach(key => {
    totals.week[key] = totals.month[key] = totals.year[key] = totals.allTime[key] = 0;
  });

  for (const [dateStr, data] of Object.entries(activityData)) {
    const date = new Date(dateStr);
    ["pushups", "pullups", "squats"].forEach(key => {
      if (date >= startOfWeek) totals.week[key] += data[key] || 0;
      if (date >= startOfMonth) totals.month[key] += data[key] || 0;
      if (date >= startOfYear) totals.year[key] += data[key] || 0;
      totals.allTime[key] += data[key] || 0;
    });
  }

  document.getElementById("summary").innerHTML = `
    <strong>Week to Date:</strong> Pushups: ${totals.week.pushups}, Pullups: ${totals.week.pullups}, Squats: ${totals.week.squats}<br>
    <strong>Month to Date:</strong> Pushups: ${totals.month.pushups}, Pullups: ${totals.month.pullups}, Squats: ${totals.month.squats}<br>
    <strong>Year to Date:</strong> Pushups: ${totals.year.pushups}, Pullups: ${totals.year.pullups}, Squats: ${totals.year.squats}<br>
    <strong>All Time:</strong> Pushups: ${totals.allTime.pushups}, Pullups: ${totals.allTime.pullups}, Squats: ${totals.allTime.squats}
  `;
}

document.getElementById("saveEntry").addEventListener("click", saveTodayEntry);
document.querySelectorAll(".goals-section input").forEach(input => input.addEventListener("change", saveGoals));

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("goalPushups").value = goals.pushups;
  document.getElementById("goalPullups").value = goals.pullups;
  document.getElementById("goalSquats").value = goals.squats;
  updateProgress();
  renderCalendar();
  updateSummary();
  calculateStreak();
});

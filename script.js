// --- Login logic ---
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const mainApp = document.getElementById("mainApp");
const logoutButton = document.getElementById("logoutButton");

// Demo users
const USERS = [
  { username: "BedFlow", password: "BedFlow", role: "admin" },
  { username: "HelpDesk", password: "HelpDesk", role: "user" }
];

// --- App logic ---
const form = document.getElementById("jobForm");
const jobInput = document.getElementById("jobName");
const bedInput = document.getElementById("bedNumber");
const wardInput = document.getElementById("ward");
const locationInput = document.getElementById("location");
const pendingJobList = document.getElementById("pendingJobList");
const completedJobList = document.getElementById("completedJobList");
const refreshButton = document.getElementById("refreshButton");
const lastUpdated = document.getElementById("lastUpdated");
const createJobHeader = document.getElementById("createJobHeader");

let jobs = JSON.parse(localStorage.getItem("jobs")) || [];
let currentUser = null;
let isAdmin = false;

function saveJobs() {
  localStorage.setItem("jobs", JSON.stringify(jobs));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${sec} ${ampm}`;
}

function getDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateLastUpdatedTime() {
  lastUpdated.textContent = "Last updated: " + formatDate(new Date());
}

function moveJob(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= jobs.length) return;
  const tmp = jobs[index];
  jobs[index] = jobs[newIndex];
  jobs[newIndex] = tmp;
  saveJobs();
  renderJobs();
  updateLastUpdatedTime();
}

function createJobElement(job, index) {
  const li = document.createElement("li");
  li.setAttribute("data-id", index);
  li.className = job.completed ? "completed" : "";
  li.draggable = isAdmin;

  // Checkbox to mark completed/uncompleted (both roles)
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = job.completed;
  checkbox.title = "Mark as completed";
  checkbox.addEventListener("change", () => {
    jobs[index].completed = checkbox.checked;
    jobs[index].completedAt = checkbox.checked ? new Date().toISOString() : null;
    saveJobs();
    renderJobs();
    updateLastUpdatedTime();
  });

  // Rank number
  const rank = document.createElement("span");
  rank.className = "rank";
  rank.textContent = (index + 1) + ".";

  // Job details
  const jobText = document.createElement("div");
  jobText.className = "job-text";
  jobText.innerHTML = `
    <strong>${escapeHtml(job.name)}</strong><br/>
    🛏️ Bed: ${escapeHtml(job.bedNumber)} | 🏥 Ward: ${escapeHtml(job.ward)} | 📍 Location: ${escapeHtml(job.location)}<br/>
    <small>Logged: ${formatDate(job.timestamp)}</small><br/>
    ${job.completedAt ? `
      <small>✅ Completed: ${formatDate(job.completedAt)}</small><br/>
      <small>⏱️ Time to complete: ${getDuration(job.timestamp, job.completedAt)}</small>
    ` : `
      <small>⌛ Pending: ${getDuration(job.timestamp, new Date())}</small>
    `}
  `;

  // Actions for admin only
  const actions = document.createElement("div");
  actions.className = "job-actions";

  if (isAdmin) {
    // Move up/down
    const upBtn = document.createElement("button");
    upBtn.textContent = "↑";
    upBtn.title = "Move up";
    upBtn.disabled = index === 0;
    upBtn.addEventListener("click", () => moveJob(index, -1));

    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";
    downBtn.title = "Move down";
    downBtn.disabled = index === jobs.length - 1;
    downBtn.addEventListener("click", () => moveJob(index, 1));

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);

    // Edit
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      const newName = prompt("Edit job description:", job.name);
      if (!newName) return;
      const newBed = prompt("Edit bed number:", job.bedNumber);
      if (!newBed) return;
      const newWard = prompt("Edit ward:", job.ward);
      if (!newWard) return;
      const newLocation = prompt("Edit location:", job.location);
      if (!newLocation) return;
      jobs[index] = { ...job, name: newName, bedNumber: newBed, ward: newWard, location: newLocation };
      saveJobs();
      renderJobs();
      updateLastUpdatedTime();
    });

    // Delete
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      if (confirm("Delete this job?")) {
        jobs.splice(index, 1);
        saveJobs();
        renderJobs();
        updateLastUpdatedTime();
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
  }

  li.appendChild(checkbox);
  li.appendChild(rank);
  li.appendChild(jobText);
  if (isAdmin) li.appendChild(actions);

  // Drag & drop for admin only
  if (isAdmin) {
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", index.toString());
      li.style.opacity = "0.5";
    });

    li.addEventListener("dragend", () => {
      li.style.opacity = "1";
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      li.style.borderTop = "2px solid #002d54";
    });

    li.addEventListener("dragleave", () => {
      li.style.borderTop = "";
    });

    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.style.borderTop = "";
      const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"));
      if (draggedIndex === index) return;
      const draggedJob = jobs[draggedIndex];
      jobs.splice(draggedIndex, 1);
      jobs.splice(index, 0, draggedJob);
      saveJobs();
      renderJobs();
      updateLastUpdatedTime();
    });
  }

  return li;
}

function renderJobs() {
  pendingJobList.innerHTML = "";
  completedJobList.innerHTML = "";

  jobs.forEach((job, index) => {
    const jobElement = createJobElement(job, index);
    if (job.completed) {
      completedJobList.appendChild(jobElement);
    } else {
      pendingJobList.appendChild(jobElement);
    }
  });
}

// --- Login event ---
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  const user = USERS.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    loginError.textContent = "Invalid username or password.";
    return;
  }

  currentUser = user;
  isAdmin = user.role === "admin";

  // Hide login, show app
  loginScreen.style.display = "none";
  mainApp.style.display = "";

  // Show/hide admin controls
  form.style.display = isAdmin ? "" : "none";
  createJobHeader.style.display = isAdmin ? "" : "none";

  renderJobs();
  updateLastUpdatedTime();
});

// --- Logout event ---
logoutButton.addEventListener("click", () => {
  currentUser = null;
  isAdmin = false;
  mainApp.style.display = "none";
  loginScreen.style.display = "";
  loginForm.reset();
  loginError.textContent = "";
});

// --- Job add event (admin only) ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!isAdmin) return; // Prevent normal users from submitting

  const jobName = jobInput.value.trim();
  const bedNumber = bedInput.value.trim();
  const ward = wardInput.value.trim();
  const location = locationInput.value.trim();
  if (!jobName || !bedNumber || !ward || !location) return;

  jobs.push({
    name: jobName,
    bedNumber,
    ward,
    location,
    timestamp: new Date().toISOString(),
    completed: false,
    completedAt: null
  });

  saveJobs();
  form.reset();
  jobInput.focus();
  renderJobs();
  updateLastUpdatedTime();
});

// --- Refresh ---
refreshButton.addEventListener("click", () => {
  jobs = JSON.parse(localStorage.getItem("jobs")) || [];
  renderJobs();
  updateLastUpdatedTime();
});

// --- Sync every minute ---
setInterval(() => {
  if (mainApp.style.display !== "none") {
    jobs = JSON.parse(localStorage.getItem("jobs")) || [];
    renderJobs();
    updateLastUpdatedTime();
  }
}, 60000);

// --- Initial state ---
mainApp.style.display = "none";
loginScreen.style.display = "";

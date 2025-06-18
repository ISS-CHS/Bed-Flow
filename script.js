// --- Login logic ---
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const mainApp = document.getElementById("mainApp");
const logoutButton = document.getElementById("logoutButton");

// Demo users
const USERS = [
  { password: "BedFlow", role: "admin" },
  { password: "HelpDesk", role: "user" }
];

// --- App logic ---
const form = document.getElementById("jobForm");
const jobInput = document.getElementById("jobName");
const bedInput = document.getElementById("bedNumber");
const wardInput = document.getElementById("ward");
const locationInput = document.getElementById("location");
const pendingJobList = document.getElementById("pendingJobList");
const completedJobList = document.getElementById("completedJobList");
const archivedJobList = document.getElementById("archivedJobList");
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
  div.textContent = text || '';
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

// Archive jobs completed for more than 24 hours
function archiveOldCompletedJobs() {
  const now = new Date();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  let changed = false;

  jobs.forEach(job => {
    if (typeof job.archived === "undefined") job.archived = false;
  });

  jobs.forEach((job) => {
    if (
      job.completed &&
      job.completedAt &&
      !job.archived &&
      (now - new Date(job.completedAt)) > twentyFourHours
    ) {
      job.archived = true;
      changed = true;
    }
  });

  if (changed) {
    saveJobs();
    renderJobs();
    renderArchivedJobs();
  }
}

// ... (all your other code remains the same above)

function createJobElement(job, globalIndex, rankNumber) {
  const li = document.createElement("li");
  li.setAttribute("data-id", globalIndex);
  li.className = job.completed ? "completed" : "";
  li.draggable = isAdmin;

  // Checkbox to mark completed/uncompleted (both roles)
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = job.completed;
  checkbox.title = "Mark as completed";
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      jobs[globalIndex].completed = true;
      jobs[globalIndex].completedAt = new Date().toISOString();
      saveJobs();
      renderJobs();
      updateLastUpdatedTime();
    } else {
      // Confirm before marking as uncomplete
      const confirmUncomplete = confirm("Are you sure you want to mark this job as uncomplete?");
      if (confirmUncomplete) {
        jobs[globalIndex].completed = false;
        jobs[globalIndex].completedAt = null;
        saveJobs();
        renderJobs();
        updateLastUpdatedTime();
      } else {
        // Revert checkbox back to checked
        checkbox.checked = true;
      }
    }
  });

  // Rank number (use passed-in rankNumber)
  const rank = document.createElement("span");
  rank.className = "rank";
  rank.textContent = (rankNumber + 1) + ".";

  // Job header: Bed, Ward, Location (each on separate line, bold)
  const jobHeader = document.createElement("div");
  jobHeader.className = "job-header";
  jobHeader.innerHTML = `
    <strong>
      🛏️ Bed: ${escapeHtml(job.bedNumber)}<br>
      🏥 Ward: ${escapeHtml(job.ward)}<br>
      📍 Location: ${escapeHtml(job.location)}
    </strong>
  `;

  // Job details: Description (optional), time info (below header)
  const jobText = document.createElement("div");
  jobText.className = "job-text";
  jobText.innerHTML = `
    ${job.name ? `<div><em>${escapeHtml(job.name)}</em></div>` : ""}
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
    upBtn.disabled = globalIndex === 0;
    upBtn.addEventListener("click", () => moveJob(globalIndex, -1));

    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";
    downBtn.title = "Move down";
    downBtn.disabled = globalIndex === jobs.length - 1;
    downBtn.addEventListener("click", () => moveJob(globalIndex, 1));

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);

    // Edit
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      const newName = prompt("Edit job description:", job.name || "");
      const newBed = prompt("Edit bed number:", job.bedNumber);
      if (!newBed) return;
      const newWard = prompt("Edit ward:", job.ward);
      if (!newWard) return;
      const newLocation = prompt("Edit location:", job.location);
      if (!newLocation) return;
      jobs[globalIndex] = { ...job, name: newName, bedNumber: newBed, ward: newWard, location: newLocation };
      saveJobs();
      renderJobs();
      updateLastUpdatedTime();
    });

    // Delete
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      if (confirm("Delete this job?")) {
        jobs.splice(globalIndex, 1);
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
  li.appendChild(jobHeader); // Bed, Ward, Location at top
  li.appendChild(jobText);   // Description and times below
  if (isAdmin) li.appendChild(actions);

  // Drag & drop for admin only (remains unchanged)
  if (isAdmin) {
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", globalIndex.toString());
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
      if (draggedIndex === globalIndex) return;
      const draggedJob = jobs[draggedIndex];
      jobs.splice(draggedIndex, 1);
      jobs.splice(globalIndex, 0, draggedJob);
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

  // Filter jobs into separate arrays and keep their global index
  const pendingJobs = [];
  const completedJobs = [];
  jobs.forEach((job, idx) => {
    if (job.archived) return;
    if (job.completed) {
      completedJobs.push({ job, idx });
    } else {
      pendingJobs.push({ job, idx });
    }
  });

  // Render pending jobs with proper ranking
  pendingJobs.forEach((obj, localIdx) => {
    const jobElement = createJobElement(obj.job, obj.idx, localIdx);
    pendingJobList.appendChild(jobElement);
  });
  // Render completed jobs with proper ranking (if you want to number them too)
  completedJobs.forEach((obj, localIdx) => {
    const jobElement = createJobElement(obj.job, obj.idx, localIdx);
    completedJobList.appendChild(jobElement);
  });

  renderArchivedJobs();
}
function renderArchivedJobs() {
  if (!archivedJobList) return;
  archivedJobList.innerHTML = "";
  jobs.forEach((job, index) => {
    if (job.archived) {
      const jobElement = createJobElement(job, index);
      archivedJobList.appendChild(jobElement);
    }
  });
}

// --- Login event ---
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const password = loginPassword.value;

  const user = USERS.find(
    u => u.password === password
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

  archiveOldCompletedJobs();
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
  // Only bed, ward, location are required
  if (!bedNumber || !ward || !location) return;

  jobs.push({
    name: jobName, // May be empty string
    bedNumber,
    ward,
    location,
    timestamp: new Date().toISOString(),
    completed: false,
    completedAt: null,
    archived: false
  });

  saveJobs();
  form.reset();
  jobInput.focus();
  archiveOldCompletedJobs();
  renderJobs();
  updateLastUpdatedTime();
});

// --- Refresh ---
refreshButton.addEventListener("click", () => {
  jobs = JSON.parse(localStorage.getItem("jobs")) || [];
  archiveOldCompletedJobs();
  renderJobs();
  updateLastUpdatedTime();
});

// --- Sync every minute ---
setInterval(() => {
  if (mainApp.style.display !== "none") {
    jobs = JSON.parse(localStorage.getItem("jobs")) || [];
    archiveOldCompletedJobs();
    renderJobs();
    updateLastUpdatedTime();
  }
}, 60000);

// --- Initial state ---
mainApp.style.display = "none";
loginScreen.style.display = "";

// --- Archive on first load ---
archiveOldCompletedJobs();

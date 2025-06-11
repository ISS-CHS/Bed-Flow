const form = document.getElementById("jobForm");
const jobInput = document.getElementById("jobName");
const bedInput = document.getElementById("bedNumber");
const wardInput = document.getElementById("ward");
const locationInput = document.getElementById("location");
const pendingJobList = document.getElementById("pendingJobList");
const completedJobList = document.getElementById("completedJobList");
const refreshButton = document.getElementById("refreshButton");
const lastUpdated = document.getElementById("lastUpdated");

let jobs = JSON.parse(localStorage.getItem("jobs")) || [];
let isAdmin = false; // Set to true to enable admin features

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
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${dd}/${mm}/${yyyy} ${hh}:${min} ${ampm}`;
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

function createJobElement(job, index) {
  const li = document.createElement("li");
  li.setAttribute("data-id", index);
  li.className = job.completed ? "completed" : "";
  li.draggable = isAdmin;

  // Checkbox to mark completed
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

form.addEventListener("submit", (e) => {
  e.preventDefault();
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

refreshButton.addEventListener("click", () => {
  jobs = JSON.parse(localStorage.getItem("jobs")) || [];
  renderJobs();
  updateLastUpdatedTime();
});

setInterval(() => {
  jobs = JSON.parse(localStorage.getItem("jobs")) || [];
  renderJobs();
  updateLastUpdatedTime();
}, 60000);

// Initial render
renderJobs();
updateLastUpdatedTime();

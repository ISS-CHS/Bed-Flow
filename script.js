const form = document.getElementById("jobForm");
const jobInput = document.getElementById("jobName");
const bedInput = document.getElementById("bedNumber");
const wardInput = document.getElementById("ward");
const locationInput = document.getElementById("location");
const jobList = document.getElementById("jobList");
const refreshButton = document.getElementById("refreshButton");
const lastUpdated = document.getElementById("lastUpdated");

let jobs = JSON.parse(localStorage.getItem("jobs")) || [];

let role = null; // "admin" or "user"

// Prompt for password at page load
function askPassword() {
  const pwd = prompt("Enter password:");

  if (pwd === "BedFlow") {
    role = "admin";
  } else if (pwd === "HelpDesk") {
    role = "user";
  } else {
    alert("Incorrect password. Reload the page to try again.");
    role = null;
  }
}

askPassword();

if (!role) {
  document.body.innerHTML = "<h2>Access Denied</h2>";
  throw new Error("Access denied — no valid password.");
}

// Disable form inputs & submit button for user role only
if (role === "user") {
  jobInput.disabled = true;
  bedInput.disabled = true;
  wardInput.disabled = true;
  locationInput.disabled = true;
  form.querySelector("button[type='submit']").disabled = true;
}

// Save jobs to localStorage
function saveJobs() {
  localStorage.setItem("jobs", JSON.stringify(jobs));
}

// Escape HTML to prevent injection
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Update last updated timestamp
function updateLastUpdatedTime() {
  const now = new Date();
  lastUpdated.textContent = "Last updated: " + now.toLocaleTimeString();
}

// Render job list
function renderJobs() {
  jobList.innerHTML = "";
  jobs.forEach((job, index) => {
    const li = document.createElement("li");
    li.setAttribute("data-id", index);
    li.className = job.completed ? "completed" : "";
    li.draggable = (role === "admin"); // Only admin can drag

    // Completion checkbox (enabled for all)
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = job.completed;
    checkbox.title = "Mark as completed";
    checkbox.addEventListener("change", () => {
      jobs[index].completed = checkbox.checked;
      saveJobs();
      renderJobs();
      updateLastUpdatedTime();
    });

    // Job details
    const jobText = document.createElement("div");
    jobText.className = "job-text";
    jobText.innerHTML = `
      <strong>${escapeHtml(job.name)}</strong>
      <br/>
      🛏️ Bed: ${escapeHtml(job.bedNumber)} | 🏥 Ward: ${escapeHtml(job.ward)} | 📍 Location: ${escapeHtml(job.location)}
      <br/>
      <small>Logged: ${new Date(job.timestamp).toLocaleString()}</small>
    `;

    // Actions container
    const actions = document.createElement("div");
    actions.className = "job-actions";

    if (role === "admin") {
      // Edit button
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.title = "Edit job";
      editBtn.addEventListener("click", () => {
        const newName = prompt("Edit job description:", job.name);
        if (newName === null) return;

        const newBed = prompt("Edit bed number:", job.bedNumber);
        if (newBed === null) return;

        const newWard = prompt("Edit ward:", job.ward);
        if (newWard === null) return;

        const newLocation = prompt("Edit building/location:", job.location);
        if (newLocation === null) return;

        jobs[index] = {
          ...jobs[index],
          name: newName.trim(),
          bedNumber: newBed.trim(),
          ward: newWard.trim(),
          location: newLocation.trim(),
        };
        saveJobs();
        renderJobs();
        updateLastUpdatedTime();
      });

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.title = "Delete job";
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this job?")) {
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
    li.appendChild(jobText);
    li.appendChild(actions);

    // Drag and drop for admin only
    if (role === "admin") {
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
        const targetIndex = index;

        if (draggedIndex === targetIndex) return;

        const draggedJob = jobs[draggedIndex];
        jobs.splice(draggedIndex, 1);
        jobs.splice(targetIndex, 0, draggedJob);

        saveJobs();
        renderJobs();
        updateLastUpdatedTime();
      });
    }

    jobList.appendChild(li);
  });
}

// Form submission
form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (role !== "admin") return; // Only admin can add jobs

  const jobName = jobInput.value.trim();
  const bedNumber = bedInput.value.trim();
  const ward = wardInput.value.trim();
  const location = locationInput.value.trim();

  if (!jobName || !bedNumber || !ward || !location) return;

  const newJob = {
    name: jobName,
    bedNumber,
    ward,
    location,
    timestamp: new Date().toISOString(),
    completed: false,
  };

  jobs.push(newJob);
  saveJobs();
  form.reset();
  jobInput.focus();
  renderJobs();
  updateLastUpdatedTime();
});

// Refresh button for both roles
refreshButton.addEventListener("click", () => {
  jobs = JSON.parse(localStorage.getItem("jobs")) || [];
  renderJobs();
  updateLastUpdatedTime();
});

// Auto-refresh every 60 seconds for both roles
setInterval(() => {
  jobs = JSON.parse(localStorage.getItem("jobs")) || [];
  renderJobs();
  updateLastUpdatedTime();
}, 60000);

// Initial render
renderJobs();
updateLastUpdatedTime();

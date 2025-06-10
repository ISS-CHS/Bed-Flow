const form = document.getElementById("jobForm");
const jobList = document.getElementById("jobList");
const sortBy = document.getElementById("sortBy");

let jobs = JSON.parse(localStorage.getItem("jobs")) || [];

function renderJobs() {
  jobList.innerHTML = "";
  let sortedJobs = [...jobs];

  if (sortBy.value === "priority") {
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    sortedJobs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  } else {
    sortedJobs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  for (let job of sortedJobs) {
    const li = document.createElement("li");
    li.textContent = `[${job.priority}] ${job.name} — ${new Date(job.timestamp).toLocaleString()}`;
    jobList.appendChild(li);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const jobName = document.getElementById("jobName").value;
  const jobPriority = document.getElementById("jobPriority").value;

  const newJob = {
    name: jobName,
    priority: jobPriority,
    timestamp: new Date().toISOString()
  };

  jobs.push(newJob);
  localStorage.setItem("jobs", JSON.stringify(jobs));
  form.reset();
  renderJobs();
});

sortBy.addEventListener("change", renderJobs);

renderJobs();

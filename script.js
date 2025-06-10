const form = document.getElementById("jobForm");
const jobList = document.getElementById("jobList");

let jobs = JSON.parse(localStorage.getItem("jobs")) || [];

function saveJobs() {
  localStorage.setItem("jobs", JSON.stringify(jobs));
}

function renderJobs() {
  jobList.innerHTML = "";
  jobs.forEach((job, index) => {
    const li = document.createElement("li");
    li.textContent = `${job.name} — ${new Date(job.timestamp).toLocaleString()}`;
    li.setAttribute("data-index", index);
    jobList.appendChild(li);
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const jobName = document.getElementById("jobName").value;
  const newJob = {
    name: jobName,
    timestamp: new Date().toISOString()
  };
  jobs.push(newJob);
  saveJobs();
  form.reset();
  renderJobs();
});

const sortable = new Sortable(jobList, {
  animation: 150,
  onEnd: function () {
    const newOrder = [];
    document.querySelectorAll("#jobList li").forEach(li => {
      const index = parseInt(li.getAttribute("data-index"));
      newOrder.push(jobs[index]);
    });
    jobs = newOrder;
    saveJobs();
    renderJobs(); // reapply data-index values
  }
});

renderJobs();

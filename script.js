// --- Firebase Firestore Integration for Shared Jobs List with Roles + Admin Sort Order ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAD3LKX5Xsqpx88TSIoJUIOOXQ7VTTZbmU",
  authDomain: "cleaning-priority.firebaseapp.com",
  projectId: "cleaning-priority",
  storageBucket: "cleaning-priority.appspot.com",
  messagingSenderId: "610045219151",
  appId: "1:610045219151:web:6161ad0a01ec7cf3d7753a"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const jobsCol = collection(db, "jobs");

// --- App Variables ---
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const signupScreen = document.getElementById("signupScreen");
const signupForm = document.getElementById("signupForm");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupError = document.getElementById("signupError");

const mainApp = document.getElementById("mainApp");
const logoutButton = document.getElementById("logoutButton");

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

let jobs = [];
let currentUser = null;
let isAdmin = false;

// --- Utility Functions ---
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

// --- Firebase CRUD Functions ---
async function addJobToFirestore(job) {
  await addDoc(jobsCol, job);
}
async function updateJobInFirestore(id, updates) {
  await updateDoc(doc(jobsCol, id), updates);
}
async function deleteJobFromFirestore(id) {
  await deleteDoc(doc(jobsCol, id));
}

// --- Archive jobs completed > 24h ---
async function archiveOldCompletedJobs() {
  const now = new Date();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const batchUpdates = [];
  for (const job of jobs) {
    if (
      job.completed &&
      job.completedAt &&
      !job.archived &&
      (now - new Date(job.completedAt)) > twentyFourHours
    ) {
      batchUpdates.push(updateJobInFirestore(job.id, { archived: true }));
    }
  }
  if (batchUpdates.length) await Promise.all(batchUpdates);
}

// --- UI Rendering (unchanged, but gets jobs from Firestore) ---
function createJobElement(job, rankNumber) {
  const li = document.createElement("li");
  li.setAttribute("data-id", job.id);
  li.className = job.completed ? "completed" : "";
  li.draggable = isAdmin;

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = job.completed;
  checkbox.title = "Mark as completed";
  checkbox.addEventListener("change", async () => {
    if (checkbox.checked) {
      await updateJobInFirestore(job.id, {
        completed: true,
        completedAt: new Date().toISOString()
      });
    } else {
      const confirmUncomplete = confirm("Are you sure you want to mark this job as uncomplete?");
      if (confirmUncomplete) {
        await updateJobInFirestore(job.id, {
          completed: false,
          completedAt: null
        });
      } else {
        checkbox.checked = true;
      }
    }
  });

  // Rank number
  const rank = document.createElement("span");
  rank.className = "rank";
  rank.textContent = (rankNumber + 1) + ".";

  // Job header
  const jobHeader = document.createElement("div");
  jobHeader.className = "job-header";
  jobHeader.innerHTML = `
    <strong>
      🛏️ Bed: ${escapeHtml(job.bedNumber)}<br>
      🏥 Ward: ${escapeHtml(job.ward)}<br>
      📍 Location: ${escapeHtml(job.location)}
    </strong>
  `;

  // Job details
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

  // Admin actions
  const actions = document.createElement("div");
  actions.className = "job-actions";

  if (isAdmin) {
    // Move up/down
    const upBtn = document.createElement("button");
    upBtn.textContent = "↑";
    upBtn.title = "Move up";
    upBtn.disabled = rankNumber === 0;
    upBtn.addEventListener("click", () => moveJob(job.id, -1));

    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";
    downBtn.title = "Move down";
    downBtn.disabled =
      rankNumber === jobs.filter(j => !j.archived && !j.completed).length - 1;
    downBtn.addEventListener("click", () => moveJob(job.id, 1));

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);

    // Edit
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", async () => {
      const newName = prompt("Edit job description:", job.name || "");
      const newBed = prompt("Edit bed number:", job.bedNumber);
      if (!newBed) return;
      const newWard = prompt("Edit ward:", job.ward);
      if (!newWard) return;
      const newLocation = prompt("Edit location:", job.location);
      if (!newLocation) return;
      await updateJobInFirestore(job.id, {
        name: newName,
        bedNumber: newBed,
        ward: newWard,
        location: newLocation
      });
    });

    // Delete
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this job?")) {
        await deleteJobFromFirestore(job.id);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
  }

  li.appendChild(checkbox);
  li.appendChild(rank);
  li.appendChild(jobHeader);
  li.appendChild(jobText);
  if (isAdmin) li.appendChild(actions);

  return li;
}

function renderJobs() {
  pendingJobList.innerHTML = "";
  completedJobList.innerHTML = "";

  const pendingJobs = jobs.filter(j => !j.archived && !j.completed);
  const completedJobs = jobs.filter(j => !j.archived && j.completed);

  pendingJobs.forEach((job, idx) => {
    const jobElement = createJobElement(job, idx);
    pendingJobList.appendChild(jobElement);
  });
  completedJobs.forEach((job, idx) => {
    const jobElement = createJobElement(job, idx);
    completedJobList.appendChild(jobElement);
  });

  renderArchivedJobs();
}
function renderArchivedJobs() {
  if (!archivedJobList) return;
  archivedJobList.innerHTML = "";
  jobs.filter(j => j.archived).forEach((job, index) => {
    const jobElement = createJobElement(job, index);
    archivedJobList.appendChild(jobElement);
  });
}

// --- Move Job (admin only, swaps sortOrder field) ---
async function moveJob(jobId, direction) {
  if (!isAdmin) return;

  // Only sort non-archived, non-completed jobs
  const pendingJobs = jobs.filter(j => !j.archived && !j.completed);
  const index = pendingJobs.findIndex(j => j.id === jobId);
  if (index < 0) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= pendingJobs.length) return;

  const jobA = pendingJobs[index];
  const jobB = pendingJobs[newIndex];

  // Swap sortOrder fields
  const sortA = typeof jobA.sortOrder === "number" ? jobA.sortOrder : 0;
  const sortB = typeof jobB.sortOrder === "number" ? jobB.sortOrder : 0;
  await Promise.all([
    updateJobInFirestore(jobA.id, { sortOrder: sortB }),
    updateJobInFirestore(jobB.id, { sortOrder: sortA })
  ]);
}

// --- Auth state listener ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // ---- Firestore-based roles ----
    let role = "user";
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      role = userDocSnap.data().role || "user";
    }
    isAdmin = role === "admin";
    loginScreen.style.display = "none";
    signupScreen.style.display = "none";
    mainApp.style.display = "";
    form.style.display = isAdmin ? "" : "none";
    createJobHeader.style.display = isAdmin ? "" : "none";
    archiveOldCompletedJobs();
    renderJobs();
    updateLastUpdatedTime();
  } else {
    currentUser = null;
    isAdmin = false;
    mainApp.style.display = "none";
    loginScreen.style.display = "";
    signupScreen.style.display = "none";
    loginForm.reset();
    loginError.textContent = "";
  }
});

// --- Login event ---
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  signInWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      loginError.textContent = "Login failed: " + error.message;
    });
});

// --- Signup event ---
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        // Set user role in Firestore (default: user)
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email,
          role: "user" // Default role
        });
      })
      .catch((error) => {
        signupError.textContent = "Signup failed: " + error.message;
      });
  });
}

// --- Show signup screen ---
document.getElementById("showSignup")?.addEventListener("click", (e) => {
  e.preventDefault();
  loginScreen.style.display = "none";
  signupScreen.style.display = "";
  signupForm.reset();
  signupError.textContent = "";
});

// --- Show login screen from signup ---
document.getElementById("showLogin")?.addEventListener("click", (e) => {
  e.preventDefault();
  signupScreen.style.display = "none";
  loginScreen.style.display = "";
  loginForm.reset();
  loginError.textContent = "";
});

// --- Logout event ---
logoutButton.addEventListener("click", () => {
  signOut(auth);
});

// --- Job add event (admin only, include sortOrder) ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isAdmin) return;
  const jobName = jobInput.value.trim();
  const bedNumber = bedInput.value.trim();
  const ward = wardInput.value.trim();
  const location = locationInput.value.trim();
  if (!bedNumber || !ward || !location) return;

  // Find the highest sortOrder among jobs (pending only)
  const pendingJobs = jobs.filter(j => !j.archived && !j.completed);
  const maxSortOrder = pendingJobs.length
    ? Math.max(...pendingJobs.map(j => typeof j.sortOrder === "number" ? j.sortOrder : 0))
    : 0;

  await addJobToFirestore({
    name: jobName,
    bedNumber,
    ward,
    location,
    timestamp: new Date().toISOString(),
    completed: false,
    completedAt: null,
    archived: false,
    sortOrder: maxSortOrder + 1
  });
  form.reset();
  jobInput.focus();
  updateLastUpdatedTime();
});

// --- Refresh ---
refreshButton.addEventListener("click", () => {
  renderJobs();
  updateLastUpdatedTime();
});

// --- Real-time listener: keep jobs synced and sort by sortOrder ---
onSnapshot(jobsCol, async (snapshot) => {
  jobs = [];
  snapshot.forEach((doc) => {
    jobs.push({ id: doc.id, ...doc.data() });
  });
  // Use sortOrder (fallback to timestamp)
  jobs.sort((a, b) => {
    const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : 0;
    const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    // fallback
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
  await archiveOldCompletedJobs();
  renderJobs();
  updateLastUpdatedTime();
});

// --- Initial state ---
mainApp.style.display = "none";
loginScreen.style.display = "";
if (signupScreen) signupScreen.style.display = "none";

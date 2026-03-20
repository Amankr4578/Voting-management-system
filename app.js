const STORE_KEYS = {
  users: "vms_users",
  elections: "vms_elections",
  votes: "vms_votes",
  session: "vms_session"
};

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readStore(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setupSeedData() {
  const users = readStore(STORE_KEYS.users, []);
  if (!users.some((u) => u.role === "admin")) {
    users.push({
      id: uid("user"),
      name: "System Admin",
      email: "admin@vms.local",
      password: "admin123",
      phone: "0000000000",
      dob: "2000-01-01",
      address: "Admin Office",
      gender: "other",
      role: "admin",
      registeredAt: new Date().toISOString()
    });
    writeStore(STORE_KEYS.users, users);
  }

  const elections = readStore(STORE_KEYS.elections, []);
  if (elections.length === 0) {
    elections.push({
      id: uid("el"),
      title: "Student Council 2026",
      description: "Elect representatives for student council.",
      startAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 16),
      endAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 16),
      status: "open",
      createdBy: "seed",
      createdAt: new Date().toISOString(),
      candidates: [
        { id: uid("cand"), name: "Aarav Mehta", party: "Unity Front" },
        { id: uid("cand"), name: "Meera Singh", party: "Progress League" }
      ]
    });
    writeStore(STORE_KEYS.elections, elections);
  }

  if (!localStorage.getItem(STORE_KEYS.votes)) {
    writeStore(STORE_KEYS.votes, []);
  }
}

function getUsers() {
  return readStore(STORE_KEYS.users, []);
}

function getElections() {
  return readStore(STORE_KEYS.elections, []);
}

function getVotes() {
  return readStore(STORE_KEYS.votes, []);
}

function getSession() {
  return readStore(STORE_KEYS.session, null);
}

function getCurrentUser() {
  const session = getSession();
  if (!session) {
    return null;
  }
  return getUsers().find((u) => u.id === session.userId) || null;
}

function login(email, password) {
  const user = getUsers().find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) {
    return { ok: false, message: "Invalid email or password." };
  }
  writeStore(STORE_KEYS.session, { userId: user.id, loginAt: new Date().toISOString() });
  return { ok: true, user };
}

function logout() {
  localStorage.removeItem(STORE_KEYS.session);
}

function registerUser(payload) {
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const user = {
    id: uid("user"),
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    dob: payload.dob,
    address: payload.address,
    gender: payload.gender,
    role: "voter",
    registeredAt: new Date().toISOString()
  };

  users.push(user);
  writeStore(STORE_KEYS.users, users);
  return { ok: true, user };
}

function createElection(payload, createdBy) {
  const elections = getElections();
  const election = {
    id: uid("el"),
    title: payload.title,
    description: payload.description,
    startAt: payload.startAt,
    endAt: payload.endAt,
    status: payload.status,
    createdBy,
    createdAt: new Date().toISOString(),
    candidates: payload.candidates.map((c) => ({
      id: uid("cand"),
      name: c.name,
      party: c.party
    }))
  };
  elections.push(election);
  writeStore(STORE_KEYS.elections, elections);
  return election;
}

function updateElectionStatus(electionId, status) {
  const elections = getElections();
  const election = elections.find((e) => e.id === electionId);
  if (!election) {
    return false;
  }
  election.status = status;
  writeStore(STORE_KEYS.elections, elections);
  return true;
}

function deleteElection(electionId) {
  const elections = getElections().filter((e) => e.id !== electionId);
  const votes = getVotes().filter((v) => v.electionId !== electionId);
  writeStore(STORE_KEYS.elections, elections);
  writeStore(STORE_KEYS.votes, votes);
}

function hasVoted(userId, electionId) {
  return getVotes().some((v) => v.userId === userId && v.electionId === electionId);
}

function castVote({ userId, electionId, candidateId }) {
  const elections = getElections();
  const election = elections.find((e) => e.id === electionId);
  if (!election) {
    return { ok: false, message: "Election not found." };
  }
  if (election.status !== "open") {
    return { ok: false, message: "This election is not open for voting." };
  }
  if (hasVoted(userId, electionId)) {
    return { ok: false, message: "You have already voted in this election." };
  }

  const candidateExists = election.candidates.some((c) => c.id === candidateId);
  if (!candidateExists) {
    return { ok: false, message: "Selected candidate is invalid." };
  }

  const votes = getVotes();
  votes.push({
    id: uid("vote"),
    electionId,
    candidateId,
    userId,
    castAt: new Date().toISOString()
  });
  writeStore(STORE_KEYS.votes, votes);
  return { ok: true };
}

function getElectionResult(election) {
  const votes = getVotes().filter((v) => v.electionId === election.id);
  const counts = election.candidates.map((candidate) => ({
    candidate,
    count: votes.filter((v) => v.candidateId === candidate.id).length
  }));
  const max = Math.max(0, ...counts.map((c) => c.count));
  const winners = counts.filter((c) => c.count === max && max > 0);
  return {
    totalVotes: votes.length,
    counts,
    winners
  };
}

function displayMessage(element, text, type) {
  element.className = `message ${type}`;
  element.textContent = text;
}

function clearMessage(element) {
  element.className = "message";
  element.textContent = "";
}

function setAuthUI() {
  const user = getCurrentUser();
  const authState = document.getElementById("authState");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!authState || !logoutBtn) {
    return;
  }

  if (user) {
    authState.textContent = `${user.name} (${user.role})`;
    logoutBtn.classList.remove("hide");
  } else {
    authState.textContent = "Not logged in";
    logoutBtn.classList.add("hide");
  }

  logoutBtn.addEventListener("click", () => {
    logout();
    window.location.href = "Login in.html";
  });
}

function markActiveNav() {
  const page = document.body.dataset.page;
  if (!page) {
    return;
  }
  const navLink = document.querySelector(`.nav-links a[data-page='${page}']`);
  if (navLink) {
    navLink.classList.add("active");
  }
}

function initHomePage() {
  const users = getUsers();
  const elections = getElections();
  const votes = getVotes();

  document.getElementById("statUsers").textContent = users.filter((u) => u.role === "voter").length;
  document.getElementById("statOpen").textContent = elections.filter((e) => e.status === "open").length;
  document.getElementById("statElections").textContent = elections.length;
  document.getElementById("statVotes").textContent = votes.length;
}

function initRegistrationPage() {
  const form = document.getElementById("registerForm");
  const message = document.getElementById("registerMessage");
  if (!form || !message) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearMessage(message);

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      confirmPassword: String(formData.get("confirmPassword") || ""),
      phone: String(formData.get("phone") || "").trim(),
      dob: String(formData.get("dob") || ""),
      gender: String(formData.get("gender") || ""),
      address: String(formData.get("address") || "").trim()
    };

    if (payload.password.length < 6) {
      displayMessage(message, "Password must be at least 6 characters.", "error");
      return;
    }

    if (payload.password !== payload.confirmPassword) {
      displayMessage(message, "Password and confirm password do not match.", "error");
      return;
    }

    const result = registerUser(payload);
    if (!result.ok) {
      displayMessage(message, result.message, "error");
      return;
    }

    displayMessage(
      message,
      "Registration successful. You can login now using your email and password.",
      "success"
    );
    form.reset();
  });
}

function initLoginPage() {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  if (!form || !message) {
    return;
  }

  const current = getCurrentUser();
  if (current) {
    window.location.href = "Voting.html";
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearMessage(message);

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const result = login(email, password);
    if (!result.ok) {
      displayMessage(message, result.message, "error");
      return;
    }

    displayMessage(message, "Login successful. Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "Voting.html";
    }, 600);
  });
}

function renderAdminElections(container, user) {
  const elections = getElections();
  if (elections.length === 0) {
    container.innerHTML = '<p class="muted">No elections found. Create one using the form above.</p>';
    return;
  }

  container.innerHTML = elections
    .map(
      (election) => `
        <article class="item">
          <h3>${election.title}</h3>
          <p>${election.description || "No description"}</p>
          <p class="meta">Status: ${election.status.toUpperCase()} | Start: ${election.startAt || "-"} | End: ${election.endAt || "-"}</p>
          <p class="meta">Candidates: ${election.candidates.length}</p>
          <div class="actions">
            <button class="btn btn-primary" data-admin-action="open" data-id="${election.id}">Open</button>
            <button class="btn btn-warning" data-admin-action="close" data-id="${election.id}">Close</button>
            <button class="btn btn-danger" data-admin-action="delete" data-id="${election.id}">Delete</button>
          </div>
        </article>
      `
    )
    .join("");

  container.querySelectorAll("button[data-admin-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.adminAction;
      const id = button.dataset.id;
      if (!id) {
        return;
      }

      if (action === "open") {
        updateElectionStatus(id, "open");
      }
      if (action === "close") {
        updateElectionStatus(id, "closed");
      }
      if (action === "delete") {
        deleteElection(id);
      }

      renderAdminElections(container, user);
      renderResults(document.getElementById("resultsList"));
      const voterContainer = document.getElementById("voterElections");
      if (voterContainer) {
        renderVoterElections(voterContainer, user);
      }
    });
  });
}

function renderResults(container) {
  if (!container) {
    return;
  }
  const elections = getElections();
  if (elections.length === 0) {
    container.innerHTML = '<p class="muted">No elections available.</p>';
    return;
  }

  container.innerHTML = elections
    .map((election) => {
      const result = getElectionResult(election);
      const winnerText =
        result.winners.length === 0
          ? "No winner yet"
          : result.winners.map((w) => `${w.candidate.name} (${w.count})`).join(", ");
      const rows = result.counts
        .map((entry) => `<div class="candidate">${entry.candidate.name} - ${entry.candidate.party}: ${entry.count}</div>`)
        .join("");
      return `
        <article class="item">
          <h3>${election.title}</h3>
          <p class="meta">Total Votes: ${result.totalVotes} | Winner: ${winnerText}</p>
          ${rows}
        </article>
      `;
    })
    .join("");
}

function renderVoterElections(container, user) {
  const elections = getElections().filter((e) => e.status === "open");
  if (elections.length === 0) {
    container.innerHTML = '<p class="muted">No open elections right now.</p>';
    return;
  }

  container.innerHTML = elections
    .map((election) => {
      const voted = hasVoted(user.id, election.id);
      const candidateOptions = election.candidates
        .map(
          (candidate) => `
            <label class="candidate">
              <input type="radio" name="candidate_${election.id}" value="${candidate.id}" ${voted ? "disabled" : ""}>
              ${candidate.name} - ${candidate.party}
            </label>
          `
        )
        .join("");

      return `
        <article class="item">
          <h3>${election.title}</h3>
          <p>${election.description || "No description"}</p>
          <p class="meta">Voting window: ${election.startAt || "-"} to ${election.endAt || "-"}</p>
          <div>${candidateOptions}</div>
          <div class="actions">
            <button class="btn btn-primary" data-vote-election="${election.id}" ${voted ? "disabled" : ""}>
              ${voted ? "Vote Submitted" : "Submit Vote"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("button[data-vote-election]").forEach((button) => {
    button.addEventListener("click", () => {
      const electionId = button.dataset.voteElection;
      if (!electionId) {
        return;
      }
      const selected = document.querySelector(`input[name='candidate_${electionId}']:checked`);
      if (!selected) {
        alert("Please select a candidate before submitting your vote.");
        return;
      }

      const result = castVote({
        userId: user.id,
        electionId,
        candidateId: selected.value
      });

      if (!result.ok) {
        alert(result.message);
        return;
      }

      renderVoterElections(container, user);
      renderResults(document.getElementById("resultsList"));
    });
  });
}

function initVotingPage() {
  const user = getCurrentUser();
  const gate = document.getElementById("authGate");
  const app = document.getElementById("votingApp");
  const adminPanel = document.getElementById("adminPanel");
  const voterPanel = document.getElementById("voterPanel");
  const adminForm = document.getElementById("createElectionForm");
  const adminMessage = document.getElementById("adminMessage");
  const adminElectionsList = document.getElementById("adminElections");
  const voterElections = document.getElementById("voterElections");

  if (!gate || !app || !adminPanel || !voterPanel || !adminForm || !adminMessage || !adminElectionsList || !voterElections) {
    return;
  }

  if (!user) {
    gate.classList.remove("hide");
    app.classList.add("hide");
    return;
  }

  gate.classList.add("hide");
  app.classList.remove("hide");

  if (user.role === "admin") {
    adminPanel.classList.remove("hide");
    voterPanel.classList.add("hide");
    renderAdminElections(adminElectionsList, user);
  } else {
    adminPanel.classList.add("hide");
    voterPanel.classList.remove("hide");
    renderVoterElections(voterElections, user);
  }

  renderResults(document.getElementById("resultsList"));

  adminForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearMessage(adminMessage);

    const formData = new FormData(adminForm);
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const startAt = String(formData.get("startAt") || "");
    const endAt = String(formData.get("endAt") || "");
    const status = String(formData.get("status") || "open");
    const candidatesRaw = String(formData.get("candidates") || "").trim();

    if (!title) {
      displayMessage(adminMessage, "Election title is required.", "error");
      return;
    }

    const candidates = candidatesRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, party] = line.split("|").map((part) => (part || "").trim());
        return { name, party: party || "Independent" };
      })
      .filter((c) => c.name);

    if (candidates.length < 2) {
      displayMessage(
        adminMessage,
        "Please add at least 2 candidates using one line per candidate in Name|Party format.",
        "error"
      );
      return;
    }

    createElection(
      {
        title,
        description,
        startAt,
        endAt,
        status,
        candidates
      },
      user.id
    );

    adminForm.reset();
    displayMessage(adminMessage, "Election created successfully.", "success");
    renderAdminElections(adminElectionsList, user);
    renderResults(document.getElementById("resultsList"));
    renderVoterElections(voterElections, user);
  });
}

function initAboutPage() {
  const el = document.getElementById("yearStamp");
  if (el) {
    el.textContent = String(new Date().getFullYear());
  }
}

function boot() {
  setupSeedData();
  markActiveNav();
  setAuthUI();

  const page = document.body.dataset.page;
  if (page === "home") {
    initHomePage();
  }
  if (page === "registration") {
    initRegistrationPage();
  }
  if (page === "login") {
    initLoginPage();
  }
  if (page === "voting") {
    initVotingPage();
  }
  if (page === "about") {
    initAboutPage();
  }
}

document.addEventListener("DOMContentLoaded", boot);

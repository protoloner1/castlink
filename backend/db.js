// Simple, dependency-free JSON-backed datastore.
// Tables: users, actors, jobs, applications, messages
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db', 'data.json');

const DEFAULT = {
  users: [],        // {id, name, email, passwordHash, role: 'actor'|'employer', createdAt}
  actors: [],       // {id, userId, stageName, headline, bio, location, gender, age, height,
                    //   skills:[], languages:[], experience, reel, photo, rate, contactEmail, contactPhone, available, createdAt}
  jobs: [],         // {id, employerId, title, company, productionType, roleType, location, gender, ageRange,
                    //   pay, description, requirements, deadline, status:'open'|'closed', createdAt}
  applications: [], // {id, jobId, actorId, coverNote, status:'pending'|'shortlisted'|'rejected', createdAt}
  messages: [],     // {id, fromUserId, toUserId, body, jobId, read, createdAt}
  counters: { user: 0, actor: 0, job: 0, application: 0, message: 0 }
};

let data;

function load() {
  try {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const k of Object.keys(DEFAULT)) if (!(k in data)) data[k] = DEFAULT[k];
  } catch {
    data = JSON.parse(JSON.stringify(DEFAULT));
    persist();
  }
}

function persist() {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextId(name) {
  data.counters[name] = (data.counters[name] || 0) + 1;
  return data.counters[name];
}

load();

module.exports = {
  get data() { return data; },
  persist,
  nextId,
  reset() { data = JSON.parse(JSON.stringify(DEFAULT)); persist(); }
};

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'castlink-dev-secret-change-in-prod';

// ---------- middleware ----------
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// uploads
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `h_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 4 * 1024 * 1024 } });

// serve frontend + uploads
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- helpers ----------
function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}
function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) { if (required) return res.status(401).json({ error: 'Authentication required' }); req.user = null; return next(); }
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { if (required) return res.status(401).json({ error: 'Invalid or expired token' }); req.user = null; next(); }
  };
}
function publicUser(u) { return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }; }
function actorWithUser(a) {
  const u = db.data.users.find(x => x.id === a.userId);
  return { ...a, name: u ? u.name : a.stageName, userEmail: u ? u.email : null };
}

// ============================================================
//  AUTH
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields are required' });
  if (!['actor', 'employer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: 'An account with this email already exists' });

  const user = {
    id: db.nextId('user'), name: name.trim(), email: email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10), role, createdAt: new Date().toISOString()
  };
  db.data.users.push(user);

  // auto-create empty actor profile for actor accounts
  if (role === 'actor') {
    db.data.actors.push({
      id: db.nextId('actor'), userId: user.id, stageName: name.trim(), headline: '', bio: '',
      location: '', gender: '', age: '', height: '', skills: [], languages: [], experience: '',
      reel: '', photo: '', rate: '', contactEmail: email.trim().toLowerCase(), contactPhone: '',
      available: true, createdAt: new Date().toISOString()
    });
  }
  db.persist();
  res.json({ token: sign(user), user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.data.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(user), user: publicUser(user) });
});

app.get('/api/auth/me', auth(), (req, res) => {
  const user = db.data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const profile = user.role === 'actor' ? db.data.actors.find(a => a.userId === user.id) : null;
  res.json({ user: publicUser(user), profile });
});

// ============================================================
//  ACTORS  (directory + profiles)
// ============================================================
app.get('/api/actors', (req, res) => {
  const { q, location, skill, gender, available } = req.query;
  let list = db.data.actors.map(actorWithUser);
  if (q) {
    const t = q.toLowerCase();
    list = list.filter(a =>
      [a.stageName, a.name, a.headline, a.bio, a.location, (a.skills || []).join(' '), (a.languages || []).join(' ')]
        .join(' ').toLowerCase().includes(t));
  }
  if (location) list = list.filter(a => (a.location || '').toLowerCase().includes(location.toLowerCase()));
  if (skill) list = list.filter(a => (a.skills || []).some(s => s.toLowerCase().includes(skill.toLowerCase())));
  if (gender) list = list.filter(a => (a.gender || '').toLowerCase() === gender.toLowerCase());
  if (available === 'true') list = list.filter(a => a.available);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

app.get('/api/actors/:id', (req, res) => {
  const a = db.data.actors.find(x => x.id === +req.params.id);
  if (!a) return res.status(404).json({ error: 'Actor not found' });
  res.json(actorWithUser(a));
});

app.put('/api/actors/me', auth(), (req, res) => {
  if (req.user.role !== 'actor') return res.status(403).json({ error: 'Only actor accounts have a profile' });
  const a = db.data.actors.find(x => x.userId === req.user.id);
  if (!a) return res.status(404).json({ error: 'Profile not found' });
  const fields = ['stageName', 'headline', 'bio', 'location', 'gender', 'age', 'height',
    'experience', 'reel', 'photo', 'rate', 'contactEmail', 'contactPhone', 'available'];
  for (const f of fields) if (f in req.body) a[f] = req.body[f];
  if ('skills' in req.body) a.skills = Array.isArray(req.body.skills) ? req.body.skills
    : String(req.body.skills).split(',').map(s => s.trim()).filter(Boolean);
  if ('languages' in req.body) a.languages = Array.isArray(req.body.languages) ? req.body.languages
    : String(req.body.languages).split(',').map(s => s.trim()).filter(Boolean);
  db.persist();
  res.json(actorWithUser(a));
});

app.post('/api/upload', auth(), upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ============================================================
//  JOBS  (postings)
// ============================================================
app.get('/api/jobs', (req, res) => {
  const { q, location, roleType, status } = req.query;
  let list = db.data.jobs.map(j => {
    const emp = db.data.users.find(u => u.id === j.employerId);
    const appCount = db.data.applications.filter(a => a.jobId === j.id).length;
    return { ...j, employerName: emp ? emp.name : 'Unknown', applicationCount: appCount };
  });
  if (status) list = list.filter(j => j.status === status);
  else list = list.filter(j => j.status === 'open');
  if (q) {
    const t = q.toLowerCase();
    list = list.filter(j => [j.title, j.company, j.description, j.roleType, j.productionType]
      .join(' ').toLowerCase().includes(t));
  }
  if (location) list = list.filter(j => (j.location || '').toLowerCase().includes(location.toLowerCase()));
  if (roleType) list = list.filter(j => (j.roleType || '').toLowerCase().includes(roleType.toLowerCase()));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

app.get('/api/jobs/:id', (req, res) => {
  const j = db.data.jobs.find(x => x.id === +req.params.id);
  if (!j) return res.status(404).json({ error: 'Job not found' });
  const emp = db.data.users.find(u => u.id === j.employerId);
  res.json({ ...j, employerName: emp ? emp.name : 'Unknown', employerEmail: emp ? emp.email : null });
});

app.post('/api/jobs', auth(), (req, res) => {
  if (req.user.role !== 'employer') return res.status(403).json({ error: 'Only employers can post jobs' });
  const b = req.body || {};
  if (!b.title || !b.description) return res.status(400).json({ error: 'Title and description are required' });
  const job = {
    id: db.nextId('job'), employerId: req.user.id, title: b.title.trim(), company: b.company || '',
    productionType: b.productionType || '', roleType: b.roleType || '', location: b.location || '',
    gender: b.gender || '', ageRange: b.ageRange || '', pay: b.pay || '',
    description: b.description, requirements: b.requirements || '', deadline: b.deadline || '',
    status: 'open', createdAt: new Date().toISOString()
  };
  db.data.jobs.push(job);
  db.persist();
  res.json(job);
});

app.put('/api/jobs/:id', auth(), (req, res) => {
  const j = db.data.jobs.find(x => x.id === +req.params.id);
  if (!j) return res.status(404).json({ error: 'Job not found' });
  if (j.employerId !== req.user.id) return res.status(403).json({ error: 'Not your job posting' });
  const fields = ['title', 'company', 'productionType', 'roleType', 'location', 'gender',
    'ageRange', 'pay', 'description', 'requirements', 'deadline', 'status'];
  for (const f of fields) if (f in req.body) j[f] = req.body[f];
  db.persist();
  res.json(j);
});

app.delete('/api/jobs/:id', auth(), (req, res) => {
  const j = db.data.jobs.find(x => x.id === +req.params.id);
  if (!j) return res.status(404).json({ error: 'Job not found' });
  if (j.employerId !== req.user.id) return res.status(403).json({ error: 'Not your job posting' });
  db.data.jobs = db.data.jobs.filter(x => x.id !== j.id);
  db.data.applications = db.data.applications.filter(a => a.jobId !== j.id);
  db.persist();
  res.json({ ok: true });
});

app.get('/api/my/jobs', auth(), (req, res) => {
  const list = db.data.jobs.filter(j => j.employerId === req.user.id)
    .map(j => ({ ...j, applicationCount: db.data.applications.filter(a => a.jobId === j.id).length }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// ============================================================
//  APPLICATIONS
// ============================================================
app.post('/api/jobs/:id/apply', auth(), (req, res) => {
  if (req.user.role !== 'actor') return res.status(403).json({ error: 'Only actors can apply' });
  const job = db.data.jobs.find(x => x.id === +req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const actor = db.data.actors.find(a => a.userId === req.user.id);
  if (db.data.applications.find(a => a.jobId === job.id && a.actorId === actor.id))
    return res.status(409).json({ error: 'You already applied to this job' });
  const application = {
    id: db.nextId('application'), jobId: job.id, actorId: actor.id,
    coverNote: (req.body || {}).coverNote || '', status: 'pending', createdAt: new Date().toISOString()
  };
  db.data.applications.push(application);
  db.persist();
  res.json(application);
});

app.get('/api/my/applications', auth(), (req, res) => {
  if (req.user.role !== 'actor') return res.status(403).json({ error: 'Actors only' });
  const actor = db.data.actors.find(a => a.userId === req.user.id);
  const list = db.data.applications.filter(a => a.actorId === actor.id).map(a => {
    const job = db.data.jobs.find(j => j.id === a.jobId);
    return { ...a, job };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

app.get('/api/jobs/:id/applications', auth(), (req, res) => {
  const job = db.data.jobs.find(x => x.id === +req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.employerId !== req.user.id) return res.status(403).json({ error: 'Not your job posting' });
  const list = db.data.applications.filter(a => a.jobId === job.id).map(a => {
    const actor = db.data.actors.find(x => x.id === a.actorId);
    return { ...a, actor: actor ? actorWithUser(actor) : null };
  });
  res.json(list);
});

app.put('/api/applications/:id', auth(), (req, res) => {
  const application = db.data.applications.find(a => a.id === +req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });
  const job = db.data.jobs.find(j => j.id === application.jobId);
  if (!job || job.employerId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  if (req.body.status) application.status = req.body.status;
  db.persist();
  res.json(application);
});

// ============================================================
//  MESSAGES  (the "middleman" contact layer)
// ============================================================
app.post('/api/messages', auth(), (req, res) => {
  const { toUserId, body, jobId } = req.body || {};
  if (!toUserId || !body) return res.status(400).json({ error: 'Recipient and message body are required' });
  const msg = {
    id: db.nextId('message'), fromUserId: req.user.id, toUserId: +toUserId,
    body: body.trim(), jobId: jobId || null, read: false, createdAt: new Date().toISOString()
  };
  db.data.messages.push(msg);
  db.persist();
  res.json(msg);
});

app.get('/api/messages', auth(), (req, res) => {
  const mine = db.data.messages.filter(m => m.fromUserId === req.user.id || m.toUserId === req.user.id);
  // group into threads by the "other" user
  const threads = {};
  for (const m of mine) {
    const other = m.fromUserId === req.user.id ? m.toUserId : m.fromUserId;
    const u = db.data.users.find(x => x.id === other);
    if (!threads[other]) threads[other] = { otherUserId: other, otherName: u ? u.name : 'Unknown', otherRole: u ? u.role : '', messages: [] };
    threads[other].messages.push({ ...m, mine: m.fromUserId === req.user.id });
  }
  const out = Object.values(threads).map(t => {
    t.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    t.last = t.messages[t.messages.length - 1];
    t.unread = t.messages.filter(m => !m.read && m.toUserId === req.user.id).length;
    return t;
  }).sort((a, b) => new Date(b.last.createdAt) - new Date(a.last.createdAt));
  res.json(out);
});

app.put('/api/messages/read/:otherUserId', auth(), (req, res) => {
  const other = +req.params.otherUserId;
  db.data.messages.forEach(m => {
    if (m.fromUserId === other && m.toUserId === req.user.id) m.read = true;
  });
  db.persist();
  res.json({ ok: true });
});

// ============================================================
//  STATS (homepage)
// ============================================================
app.get('/api/stats', (_, res) => {
  res.json({
    actors: db.data.actors.length,
    jobs: db.data.jobs.filter(j => j.status === 'open').length,
    employers: db.data.users.filter(u => u.role === 'employer').length,
    applications: db.data.applications.length
  });
});

// SPA fallback (Express 5 named wildcard)
app.get('/*splat', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`CastLink server running on http://localhost:${PORT}`));

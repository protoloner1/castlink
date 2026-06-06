/* ============ CastLink SPA ============ */
const API = '/api';
let TOKEN = localStorage.getItem('cl_token') || null;
let ME = JSON.parse(localStorage.getItem('cl_user') || 'null');

/* ---------- API helper ---------- */
async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (TOKEN) headers.Authorization = 'Bearer ' + TOKEN;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(API + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/* ---------- utils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const app = () => $('#app');
const esc = s => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const initials = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.className = err ? 'err show' : 'show';
  setTimeout(() => t.className = '', 3200);
}
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  if (d < 604800) return Math.floor(d / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
}
function setAuth(token, user) {
  TOKEN = token; ME = user;
  localStorage.setItem('cl_token', token);
  localStorage.setItem('cl_user', JSON.stringify(user));
  renderNav();
}
function logout() {
  TOKEN = null; ME = null;
  localStorage.removeItem('cl_token'); localStorage.removeItem('cl_user');
  renderNav(); go('/');
  toast('Signed out.');
}
function go(path) { location.hash = '#' + path; }

/* ---------- NAV ---------- */
function renderNav() {
  const el = $('#nav-auth');
  if (ME) {
    const dash = ME.role === 'employer' ? '/dashboard' : '/profile';
    el.innerHTML = `
      <a href="#/messages" data-link>Messages</a>
      <span class="avatar-chip" id="me-chip">
        <span class="avatar">${initials(ME.name)}</span>
      </span>`;
    setTimeout(() => {
      const chip = $('#me-chip');
      if (chip) chip.onclick = () => go(ME.role === 'employer' ? '/dashboard' : '/profile');
    }, 0);
  } else {
    el.innerHTML = `<a href="#/login" data-link>Sign in</a>
      <a href="#/register" data-link><button class="btn btn-gold btn-sm">Join CastLink</button></a>`;
  }
}

/* ===================================================================
   VIEWS
=================================================================== */

/* ---------- HOME ---------- */
async function viewHome() {
  let stats = { actors: 0, jobs: 0, employers: 0, applications: 0 };
  try { stats = await api('/stats'); } catch {}
  app().innerHTML = `
  <section class="hero">
    <div class="hero-inner fade">
      <p class="kicker">Talent · Castings · Connections</p>
      <h1>Where <em>talent</em> meets <em>production</em>.</h1>
      <p>CastLink is the middleman for the screen and stage. Producers post castings, actors build standout profiles, and the right people find each other — directly.</p>
      <div class="hero-cta">
        <a href="#/actors" data-link><button class="btn btn-gold">Browse Talent →</button></a>
        <a href="#/jobs" data-link><button class="btn btn-ghost" style="color:var(--cream);border-color:var(--cream)">View Castings</button></a>
      </div>
      <div class="hero-stats">
        <div class="stat"><div class="n">${stats.actors}</div><div class="l">Actors</div></div>
        <div class="stat"><div class="n">${stats.jobs}</div><div class="l">Open Castings</div></div>
        <div class="stat"><div class="n">${stats.employers}</div><div class="l">Producers</div></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h2>How the middleman works</h2>
      <p class="sub">Two sides, one stage. CastLink keeps the connection clean and direct.</p>
    </div>
    <div class="feature-grid stagger">
      <div class="feature"><div class="ico">✦</div><h3>Actors</h3><p>Build a cinematic profile with your reel, skills, and rates. Get discovered and apply to live castings in one tap.</p></div>
      <div class="feature"><div class="ico">◇</div><h3>Producers</h3><p>Post a casting call, browse a curated talent directory, and shortlist applicants — all in one place.</p></div>
      <div class="feature"><div class="ico">◉</div><h3>Direct contact</h3><p>Found the right match? Message them through CastLink and take it from there. No noise, no gatekeepers.</p></div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="section-head"><h2>Latest castings</h2><a href="#/jobs" data-link style="color:var(--gold-deep);font-weight:600">See all →</a></div>
    <div id="home-jobs" class="grid jobs"><div class="loading">Loading…</div></div>
  </section>`;

  try {
    const jobs = (await api('/jobs')).slice(0, 3);
    $('#home-jobs').innerHTML = jobs.length
      ? `<div class="grid jobs stagger" style="display:contents">${jobs.map(jobCard).join('')}</div>`
      : emptyState('◇', 'No castings yet', 'Be the first to post one.');
    bindCards();
  } catch { $('#home-jobs').innerHTML = emptyState('!', 'Could not load castings', ''); }
}

/* ---------- ACTOR DIRECTORY ---------- */
async function viewActors() {
  app().innerHTML = `
  <section class="section fade">
    <div class="section-head">
      <h2>The Talent Directory</h2>
      <p class="sub">Discover actors by craft, location, and availability.</p>
    </div>
    <div class="filterbar">
      <input id="f-q" placeholder="Search name, skill, bio…" />
      <input id="f-loc" placeholder="Location" />
      <select id="f-gender"><option value="">Any gender</option><option>Male</option><option>Female</option><option>Non-binary</option><option>Other</option></select>
      <select id="f-avail"><option value="">All</option><option value="true">Available now</option></select>
      <button class="btn btn-primary" id="f-go">Filter</button>
    </div>
    <div id="actor-grid" class="grid actors"><div class="loading">Loading talent…</div></div>
  </section>`;
  const load = async () => {
    const p = new URLSearchParams();
    if ($('#f-q').value) p.set('q', $('#f-q').value);
    if ($('#f-loc').value) p.set('location', $('#f-loc').value);
    if ($('#f-gender').value) p.set('gender', $('#f-gender').value);
    if ($('#f-avail').value) p.set('available', $('#f-avail').value);
    $('#actor-grid').innerHTML = '<div class="loading">Loading…</div>';
    try {
      const list = await api('/actors?' + p.toString());
      $('#actor-grid').innerHTML = list.length
        ? `<div class="grid actors stagger" style="display:contents">${list.map(actorCard).join('')}</div>`
        : emptyState('✦', 'No actors found', 'Try adjusting your filters.');
      bindCards();
    } catch (e) { $('#actor-grid').innerHTML = emptyState('!', 'Error', e.message); }
  };
  $('#f-go').onclick = load;
  ['f-q', 'f-loc'].forEach(id => $('#' + id).addEventListener('keydown', e => e.key === 'Enter' && load()));
  $('#f-gender').onchange = load; $('#f-avail').onchange = load;
  load();
}

function actorCard(a) {
  const photo = a.photo
    ? `<img src="${esc(a.photo)}" alt="${esc(a.stageName)}"/>`
    : `<span class="ph">${initials(a.stageName || a.name)}</span>`;
  return `<div class="card actor-card" data-actor="${a.id}">
    <div class="photo">${photo}${a.available ? '<span class="av-badge">Available</span>' : ''}</div>
    <div class="body">
      <h3>${esc(a.stageName || a.name)}</h3>
      ${a.headline ? `<div class="headline">${esc(a.headline)}</div>` : ''}
      <div class="meta">${a.location ? `<span>◴ ${esc(a.location)}</span>` : ''}${a.age ? `<span>${esc(a.age)} yrs</span>` : ''}</div>
      ${(a.skills && a.skills.length) ? `<div class="tags">${a.skills.slice(0, 3).map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

/* ---------- JOBS ---------- */
async function viewJobs() {
  app().innerHTML = `
  <section class="section fade">
    <div class="section-head">
      <h2>Open Castings</h2>
      ${ME && ME.role === 'employer' ? `<a href="#/post-job" data-link><button class="btn btn-gold">+ Post a casting</button></a>` : ''}
    </div>
    <div class="filterbar">
      <input id="f-q" placeholder="Search role, production…" />
      <input id="f-loc" placeholder="Location" />
      <input id="f-role" placeholder="Role type (lead, extra…)" />
      <button class="btn btn-primary" id="f-go">Filter</button>
    </div>
    <div id="job-grid" class="grid jobs"><div class="loading">Loading castings…</div></div>
  </section>`;
  const load = async () => {
    const p = new URLSearchParams();
    if ($('#f-q').value) p.set('q', $('#f-q').value);
    if ($('#f-loc').value) p.set('location', $('#f-loc').value);
    if ($('#f-role').value) p.set('roleType', $('#f-role').value);
    $('#job-grid').innerHTML = '<div class="loading">Loading…</div>';
    try {
      const list = await api('/jobs?' + p.toString());
      $('#job-grid').innerHTML = list.length
        ? `<div class="grid jobs stagger" style="display:contents">${list.map(jobCard).join('')}</div>`
        : emptyState('◇', 'No castings found', 'Check back soon.');
      bindCards();
    } catch (e) { $('#job-grid').innerHTML = emptyState('!', 'Error', e.message); }
  };
  $('#f-go').onclick = load;
  ['f-q', 'f-loc', 'f-role'].forEach(id => $('#' + id).addEventListener('keydown', e => e.key === 'Enter' && load()));
  load();
}

function jobCard(j) {
  return `<div class="card job-card" data-job="${j.id}">
    <div class="top">
      <div><div class="ptype">${esc(j.productionType || 'Production')}</div></div>
      ${j.pay ? `<span class="pay">${esc(j.pay)}</span>` : ''}
    </div>
    <h3>${esc(j.title)}</h3>
    <div class="co">${esc(j.company || j.employerName)}</div>
    <div class="desc">${esc(j.description)}</div>
    <div class="foot">
      <span>${j.location ? '◴ ' + esc(j.location) : 'Location flexible'}</span>
      <span>${timeAgo(j.createdAt)}</span>
    </div>
  </div>`;
}

/* ---------- ACTOR DETAIL ---------- */
async function viewActorDetail(id) {
  app().innerHTML = '<div class="loading">Loading profile…</div>';
  let a;
  try { a = await api('/actors/' + id); } catch { app().innerHTML = emptyState('!', 'Actor not found', ''); return; }
  const photo = a.photo ? `<img src="${esc(a.photo)}"/>` : `<span class="ph">${initials(a.stageName || a.name)}</span>`;
  const canMsg = ME && ME.role === 'employer' && a.userId !== ME.id;
  app().innerHTML = `
  <div class="detail fade">
    <a class="back-link" href="#/actors" data-link>← Back to talent</a>
    <div class="profile-top">
      <div class="profile-photo">${photo}</div>
      <div class="profile-info">
        <h1>${esc(a.stageName || a.name)}</h1>
        ${a.headline ? `<div class="headline">${esc(a.headline)}</div>` : ''}
        ${a.available ? '<span class="pill open">Available for work</span>' : '<span class="pill closed">Not available</span>'}
        <div class="info-grid">
          ${a.location ? infoItem('Location', a.location) : ''}
          ${a.age ? infoItem('Age', a.age + ' yrs') : ''}
          ${a.gender ? infoItem('Gender', a.gender) : ''}
          ${a.height ? infoItem('Height', a.height) : ''}
          ${a.rate ? infoItem('Rate', a.rate) : ''}
          ${a.experience ? infoItem('Experience', a.experience) : ''}
        </div>
        ${a.bio ? `<p class="bio">${esc(a.bio)}</p>` : ''}
        ${(a.skills && a.skills.length) ? `<div class="sect-title">Skills</div><div class="tags">${a.skills.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
        ${(a.languages && a.languages.length) ? `<div class="sect-title">Languages</div><div class="tags">${a.languages.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
        ${a.reel ? `<div class="sect-title">Showreel</div><a href="${esc(a.reel)}" target="_blank" class="btn btn-ghost btn-sm">▶ Watch reel</a>` : ''}
        <div class="contact-box">
          <h3>Get in touch</h3>
          ${a.contactEmail ? `<div class="contact-row">✉ ${esc(a.contactEmail)}</div>` : ''}
          ${a.contactPhone ? `<div class="contact-row">☎ ${esc(a.contactPhone)}</div>` : ''}
          ${canMsg ? `<button class="btn btn-gold" id="msg-btn" style="margin-top:1rem">Message ${esc((a.stageName || a.name).split(' ')[0])}</button>`
            : (!ME ? `<a href="#/login" data-link><button class="btn btn-gold" style="margin-top:1rem">Sign in to contact</button></a>` : '')}
        </div>
      </div>
    </div>
  </div>`;
  if (canMsg) $('#msg-btn').onclick = () => openMessageModal(a.userId, a.stageName || a.name);
}
const infoItem = (k, v) => `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;

/* ---------- JOB DETAIL ---------- */
async function viewJobDetail(id) {
  app().innerHTML = '<div class="loading">Loading casting…</div>';
  let j;
  try { j = await api('/jobs/' + id); } catch { app().innerHTML = emptyState('!', 'Casting not found', ''); return; }
  const isOwner = ME && ME.id === j.employerId;
  const canApply = ME && ME.role === 'actor';
  app().innerHTML = `
  <div class="detail fade">
    <a class="back-link" href="#/jobs" data-link>← Back to castings</a>
    <div class="profile-info" style="max-width:760px">
      <div class="ptype" style="color:var(--gold-deep);letter-spacing:.16em;text-transform:uppercase;font-weight:700;font-size:.78rem">${esc(j.productionType || 'Production')}</div>
      <h1 style="margin-top:.5rem">${esc(j.title)}</h1>
      <div class="headline">${esc(j.company || j.employerName)} · ${timeAgo(j.createdAt)}</div>
      <div class="info-grid">
        ${j.roleType ? infoItem('Role', j.roleType) : ''}
        ${j.location ? infoItem('Location', j.location) : ''}
        ${j.pay ? infoItem('Pay', j.pay) : ''}
        ${j.gender ? infoItem('Gender', j.gender) : ''}
        ${j.ageRange ? infoItem('Age range', j.ageRange) : ''}
        ${j.deadline ? infoItem('Apply by', j.deadline) : ''}
      </div>
      <div class="sect-title">About the role</div>
      <p class="bio" style="white-space:pre-wrap">${esc(j.description)}</p>
      ${j.requirements ? `<div class="sect-title">Requirements</div><p class="bio" style="white-space:pre-wrap">${esc(j.requirements)}</p>` : ''}
      <div style="margin-top:2rem;display:flex;gap:1rem;flex-wrap:wrap">
        ${isOwner
          ? `<a href="#/dashboard" data-link><button class="btn btn-primary">Manage applicants</button></a>`
          : canApply
            ? `<button class="btn btn-gold" id="apply-btn">Apply to this casting</button>
               <button class="btn btn-ghost" id="msg-emp">Message producer</button>`
            : !ME ? `<a href="#/login" data-link><button class="btn btn-gold">Sign in to apply</button></a>` : ''}
      </div>
    </div>
  </div>`;
  if (canApply && !isOwner) {
    $('#apply-btn').onclick = () => openApplyModal(j);
    $('#msg-emp').onclick = () => openMessageModal(j.employerId, j.employerName, j.id);
  }
}

/* ---------- AUTH: LOGIN ---------- */
function viewLogin() {
  app().innerHTML = `
  <div class="form-wrap fade">
    <div class="form-card">
      <h2>Welcome back</h2>
      <p class="lead">Sign in to your CastLink account.</p>
      <div class="field"><label>Email</label><input id="l-email" type="email" placeholder="you@example.com"/></div>
      <div class="field"><label>Password</label><input id="l-pass" type="password" placeholder="••••••••"/></div>
      <button class="btn btn-primary btn-block" id="l-go">Sign in</button>
      <p class="form-alt">New here? <a href="#/register" data-link>Create an account</a></p>
    </div>
  </div>`;
  const submit = async () => {
    try {
      const r = await api('/auth/login', { method: 'POST', body: { email: $('#l-email').value, password: $('#l-pass').value } });
      setAuth(r.token, r.user); toast('Signed in. Welcome back!');
      go(r.user.role === 'employer' ? '/dashboard' : '/profile');
    } catch (e) { toast(e.message, true); }
  };
  $('#l-go').onclick = submit;
  $('#l-pass').addEventListener('keydown', e => e.key === 'Enter' && submit());
}

/* ---------- AUTH: REGISTER ---------- */
function viewRegister() {
  let role = 'actor';
  app().innerHTML = `
  <div class="form-wrap fade">
    <div class="form-card">
      <h2>Join CastLink</h2>
      <p class="lead">Choose how you want to use the platform.</p>
      <div class="role-toggle" id="role-toggle">
        <div class="role-opt active" data-role="actor"><div class="ti">I'm an Actor</div><div class="ds">Build a profile, get cast</div></div>
        <div class="role-opt" data-role="employer"><div class="ti">I'm a Producer</div><div class="ds">Post castings, hire talent</div></div>
      </div>
      <div class="field"><label>Full name</label><input id="r-name" placeholder="Your name"/></div>
      <div class="field"><label>Email</label><input id="r-email" type="email" placeholder="you@example.com"/></div>
      <div class="field"><label>Password</label><input id="r-pass" type="password" placeholder="At least 6 characters"/></div>
      <button class="btn btn-gold btn-block" id="r-go">Create account</button>
      <p class="form-alt">Already have one? <a href="#/login" data-link>Sign in</a></p>
    </div>
  </div>`;
  $('#role-toggle').querySelectorAll('.role-opt').forEach(opt => {
    opt.onclick = () => {
      $('#role-toggle').querySelectorAll('.role-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active'); role = opt.dataset.role;
    };
  });
  $('#r-go').onclick = async () => {
    const name = $('#r-name').value, email = $('#r-email').value, password = $('#r-pass').value;
    if (!name || !email || password.length < 6) return toast('Fill all fields (password 6+ chars).', true);
    try {
      const r = await api('/auth/register', { method: 'POST', body: { name, email, password, role } });
      setAuth(r.token, r.user); toast('Account created. Welcome to CastLink!');
      go(role === 'employer' ? '/dashboard' : '/profile');
    } catch (e) { toast(e.message, true); }
  };
}

/* ---------- ACTOR PROFILE EDITOR ---------- */
async function viewProfile() {
  if (!ME) return go('/login');
  if (ME.role !== 'actor') return go('/dashboard');
  app().innerHTML = '<div class="loading">Loading your profile…</div>';
  let me;
  try { me = await api('/auth/me'); } catch { return go('/login'); }
  const p = me.profile || {};
  app().innerHTML = `
  <div class="form-wrap wide fade">
    <div class="dash-head">
      <h1 style="font-family:'Fraunces',serif;font-weight:400;font-size:2.4rem">Your profile</h1>
      <a href="#/actors/${p.id}" data-link><button class="btn btn-ghost btn-sm">View public page</button></a>
    </div>
    <div class="form-card">
      <div class="field" style="text-align:center">
        <div class="profile-photo" style="width:160px;margin:0 auto 1rem" id="photo-prev">
          ${p.photo ? `<img src="${esc(p.photo)}"/>` : `<span class="ph">${initials(p.stageName || ME.name)}</span>`}
        </div>
        <label class="btn btn-ghost btn-sm" style="cursor:pointer">Upload headshot
          <input type="file" id="photo-file" accept="image/*" hidden/>
        </label>
      </div>
      <div class="row2">
        <div class="field"><label>Stage name</label><input id="p-stage" value="${esc(p.stageName || '')}"/></div>
        <div class="field"><label>Headline</label><input id="p-headline" placeholder="e.g. Theatre & film actor" value="${esc(p.headline || '')}"/></div>
      </div>
      <div class="field"><label>Bio</label><textarea id="p-bio" placeholder="Tell producers about your craft…">${esc(p.bio || '')}</textarea></div>
      <div class="row2">
        <div class="field"><label>Location</label><input id="p-loc" value="${esc(p.location || '')}"/></div>
        <div class="field"><label>Gender</label>
          <select id="p-gender">${['', 'Male', 'Female', 'Non-binary', 'Other'].map(g => `<option ${p.gender === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
        </div>
      </div>
      <div class="row2">
        <div class="field"><label>Age</label><input id="p-age" value="${esc(p.age || '')}"/></div>
        <div class="field"><label>Height</label><input id="p-height" placeholder="e.g. 5'9&quot;" value="${esc(p.height || '')}"/></div>
      </div>
      <div class="field"><label>Skills (comma-separated)</label><input id="p-skills" placeholder="Improv, Stage combat, Dance" value="${esc((p.skills || []).join(', '))}"/></div>
      <div class="field"><label>Languages (comma-separated)</label><input id="p-langs" value="${esc((p.languages || []).join(', '))}"/></div>
      <div class="row2">
        <div class="field"><label>Experience</label><input id="p-exp" placeholder="e.g. 5 years" value="${esc(p.experience || '')}"/></div>
        <div class="field"><label>Rate</label><input id="p-rate" placeholder="e.g. ₹5,000/day" value="${esc(p.rate || '')}"/></div>
      </div>
      <div class="field"><label>Showreel URL</label><input id="p-reel" placeholder="https://…" value="${esc(p.reel || '')}"/></div>
      <div class="row2">
        <div class="field"><label>Contact email</label><input id="p-cemail" value="${esc(p.contactEmail || '')}"/></div>
        <div class="field"><label>Contact phone</label><input id="p-cphone" value="${esc(p.contactPhone || '')}"/></div>
      </div>
      <div class="field"><label><input type="checkbox" id="p-avail" ${p.available ? 'checked' : ''} style="width:auto;margin-right:.5rem"/> Available for work</label></div>
      <button class="btn btn-primary btn-block" id="p-save">Save profile</button>
      <button class="btn btn-ghost btn-block" style="margin-top:.8rem" onclick="logout()">Sign out</button>
    </div>
  </div>`;

  let photoUrl = p.photo || '';
  $('#photo-file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('photo', f);
    try {
      const r = await api('/upload', { method: 'POST', form: fd });
      photoUrl = r.url;
      $('#photo-prev').innerHTML = `<img src="${r.url}"/>`;
      toast('Headshot uploaded.');
    } catch (err) { toast(err.message, true); }
  };
  $('#p-save').onclick = async () => {
    try {
      await api('/actors/me', { method: 'PUT', body: {
        stageName: $('#p-stage').value, headline: $('#p-headline').value, bio: $('#p-bio').value,
        location: $('#p-loc').value, gender: $('#p-gender').value, age: $('#p-age').value, height: $('#p-height').value,
        skills: $('#p-skills').value, languages: $('#p-langs').value, experience: $('#p-exp').value,
        rate: $('#p-rate').value, reel: $('#p-reel').value, contactEmail: $('#p-cemail').value,
        contactPhone: $('#p-cphone').value, available: $('#p-avail').checked, photo: photoUrl
      }});
      toast('Profile saved!');
    } catch (e) { toast(e.message, true); }
  };
}

/* ---------- POST JOB ---------- */
function viewPostJob() {
  if (!ME) return go('/login');
  if (ME.role !== 'employer') { toast('Only producers can post castings.', true); return go('/jobs'); }
  app().innerHTML = `
  <div class="form-wrap wide fade">
    <div class="form-card">
      <h2>Post a casting</h2>
      <p class="lead">Describe the role and find your talent.</p>
      <div class="field"><label>Role / title *</label><input id="j-title" placeholder="e.g. Lead — Indie Feature Film"/></div>
      <div class="row2">
        <div class="field"><label>Production / company</label><input id="j-company"/></div>
        <div class="field"><label>Production type</label>
          <select id="j-ptype">${['', 'Feature Film', 'Short Film', 'Web Series', 'TV', 'Theatre', 'Commercial', 'Music Video', 'Voiceover'].map(o => `<option>${o}</option>`).join('')}</select>
        </div>
      </div>
      <div class="row2">
        <div class="field"><label>Role type</label><input id="j-role" placeholder="Lead, Supporting, Extra…"/></div>
        <div class="field"><label>Location</label><input id="j-loc"/></div>
      </div>
      <div class="row2">
        <div class="field"><label>Gender</label>
          <select id="j-gender">${['', 'Any', 'Male', 'Female', 'Non-binary'].map(o => `<option>${o}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Age range</label><input id="j-age" placeholder="e.g. 20–30"/></div>
      </div>
      <div class="row2">
        <div class="field"><label>Pay</label><input id="j-pay" placeholder="e.g. ₹10,000/day"/></div>
        <div class="field"><label>Apply by</label><input id="j-deadline" type="date"/></div>
      </div>
      <div class="field"><label>Description *</label><textarea id="j-desc" placeholder="About the role, the project, what you're looking for…"></textarea></div>
      <div class="field"><label>Requirements</label><textarea id="j-req" placeholder="Skills, availability, audition details…"></textarea></div>
      <button class="btn btn-gold btn-block" id="j-go">Publish casting</button>
    </div>
  </div>`;
  $('#j-go').onclick = async () => {
    if (!$('#j-title').value || !$('#j-desc').value) return toast('Title and description are required.', true);
    try {
      const j = await api('/jobs', { method: 'POST', body: {
        title: $('#j-title').value, company: $('#j-company').value, productionType: $('#j-ptype').value,
        roleType: $('#j-role').value, location: $('#j-loc').value, gender: $('#j-gender').value,
        ageRange: $('#j-age').value, pay: $('#j-pay').value, deadline: $('#j-deadline').value,
        description: $('#j-desc').value, requirements: $('#j-req').value
      }});
      toast('Casting published!'); go('/jobs/' + j.id);
    } catch (e) { toast(e.message, true); }
  };
}

/* ---------- EMPLOYER DASHBOARD ---------- */
async function viewDashboard() {
  if (!ME) return go('/login');
  if (ME.role !== 'employer') return go('/profile');
  app().innerHTML = `
  <div class="dash fade">
    <div class="dash-head">
      <h1>Producer dashboard</h1>
      <div style="display:flex;gap:.8rem">
        <a href="#/post-job" data-link><button class="btn btn-gold">+ New casting</button></a>
        <button class="btn btn-ghost btn-sm" onclick="logout()">Sign out</button>
      </div>
    </div>
    <div id="dash-jobs"><div class="loading">Loading your castings…</div></div>
  </div>`;
  try {
    const jobs = await api('/my/jobs');
    if (!jobs.length) { $('#dash-jobs').innerHTML = emptyState('◇', 'No castings yet', 'Post your first casting to start receiving applications.'); return; }
    $('#dash-jobs').innerHTML = jobs.map(j => `
      <div class="list-row">
        <div>
          <h4>${esc(j.title)}</h4>
          <div class="sub">${esc(j.productionType || 'Production')} · ${j.applicationCount} application${j.applicationCount === 1 ? '' : 's'} · ${timeAgo(j.createdAt)}</div>
        </div>
        <div style="display:flex;gap:.6rem;align-items:center">
          <span class="pill ${j.status}">${j.status}</span>
          <button class="btn btn-primary btn-sm" data-applicants="${j.id}">Applicants (${j.applicationCount})</button>
          <button class="btn btn-ghost btn-sm" data-toggle="${j.id}" data-status="${j.status}">${j.status === 'open' ? 'Close' : 'Reopen'}</button>
          <button class="btn btn-ghost btn-sm" data-del="${j.id}">Delete</button>
        </div>
      </div>
      <div id="applicants-${j.id}"></div>`).join('');

    $('#dash-jobs').querySelectorAll('[data-applicants]').forEach(b => b.onclick = () => loadApplicants(b.dataset.applicants));
    $('#dash-jobs').querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => {
      const ns = b.dataset.status === 'open' ? 'closed' : 'open';
      await api('/jobs/' + b.dataset.toggle, { method: 'PUT', body: { status: ns } });
      viewDashboard();
    });
    $('#dash-jobs').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      confirmModal('Delete this casting?', 'This will remove the casting and all its applications.', async () => {
        await api('/jobs/' + b.dataset.del, { method: 'DELETE' }); toast('Casting deleted.'); viewDashboard();
      });
    });
  } catch (e) { $('#dash-jobs').innerHTML = emptyState('!', 'Error', e.message); }
}

async function loadApplicants(jobId) {
  const box = $('#applicants-' + jobId);
  if (box.dataset.open === '1') { box.innerHTML = ''; box.dataset.open = '0'; return; }
  box.dataset.open = '1';
  box.innerHTML = '<div class="loading" style="padding:1.5rem">Loading applicants…</div>';
  try {
    const apps = await api('/jobs/' + jobId + '/applications');
    if (!apps.length) { box.innerHTML = `<div class="list-row" style="opacity:.7">No applications yet.</div>`; return; }
    box.innerHTML = apps.map(a => `
      <div class="list-row" style="margin-left:2rem;background:var(--paper)">
        <div>
          <h4 style="cursor:pointer" data-actor="${a.actor ? a.actor.id : ''}">${esc(a.actor ? (a.actor.stageName || a.actor.name) : 'Actor')}</h4>
          <div class="sub">${a.actor && a.actor.location ? esc(a.actor.location) + ' · ' : ''}${esc(a.coverNote || 'No cover note')}</div>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center">
          <span class="pill ${a.status}">${a.status}</span>
          <button class="btn btn-gold btn-sm" data-app="${a.id}" data-st="shortlisted">Shortlist</button>
          <button class="btn btn-ghost btn-sm" data-app="${a.id}" data-st="rejected">Pass</button>
          ${a.actor ? `<button class="btn btn-primary btn-sm" data-msg="${a.actor.userId}" data-name="${esc(a.actor.stageName || a.actor.name)}">Message</button>` : ''}
        </div>
      </div>`).join('');
    box.querySelectorAll('[data-app]').forEach(b => b.onclick = async () => {
      await api('/applications/' + b.dataset.app, { method: 'PUT', body: { status: b.dataset.st } });
      toast('Applicant ' + b.dataset.st + '.'); box.dataset.open = '0'; loadApplicants(jobId);
    });
    box.querySelectorAll('[data-actor]').forEach(b => b.dataset.actor && (b.onclick = () => go('/actors/' + b.dataset.actor)));
    box.querySelectorAll('[data-msg]').forEach(b => b.onclick = () => openMessageModal(+b.dataset.msg, b.dataset.name, jobId));
  } catch (e) { box.innerHTML = emptyState('!', 'Error', e.message); }
}

/* ---------- MESSAGES ---------- */
async function viewMessages() {
  if (!ME) return go('/login');
  app().innerHTML = `<div class="section fade"><div class="section-head"><h2>Messages</h2></div>
    <div id="msg-root"><div class="loading">Loading…</div></div></div>`;
  let threads;
  try { threads = await api('/messages'); } catch (e) { $('#msg-root').innerHTML = emptyState('!', 'Error', e.message); return; }
  if (!threads.length) { $('#msg-root').innerHTML = emptyState('◉', 'No messages yet', 'When you connect with someone, your conversation appears here.'); return; }
  $('#msg-root').innerHTML = `
    <div class="msg-layout">
      <div class="thread-list" id="threads">
        ${threads.map((t, i) => `
          <div class="thread-item ${i === 0 ? 'active' : ''}" data-other="${t.otherUserId}">
            <div class="tn">${esc(t.otherName)} ${t.unread ? '<span class="unread-dot"></span>' : ''}</div>
            <div class="tp">${esc(t.last.body)}</div>
          </div>`).join('')}
      </div>
      <div class="chat" id="chat"></div>
    </div>`;
  const openThread = t => {
    $('#threads').querySelectorAll('.thread-item').forEach(x => x.classList.toggle('active', +x.dataset.other === t.otherUserId));
    renderChat(t);
    if (t.unread) api('/messages/read/' + t.otherUserId, { method: 'PUT' }).catch(() => {});
  };
  $('#threads').querySelectorAll('.thread-item').forEach(item => {
    item.onclick = () => openThread(threads.find(t => t.otherUserId === +item.dataset.other));
  });
  openThread(threads[0]);
}

function renderChat(t) {
  $('#chat').innerHTML = `
    <div class="chat-head">${esc(t.otherName)} <span style="font-size:.8rem;color:var(--muted)">· ${esc(t.otherRole)}</span></div>
    <div class="chat-body" id="chat-body">
      ${t.messages.map(m => `<div class="bubble ${m.mine ? 'mine' : 'theirs'}">${esc(m.body)}<div class="t">${timeAgo(m.createdAt)}</div></div>`).join('')}
    </div>
    <div class="chat-input">
      <input id="chat-text" placeholder="Write a message…"/>
      <button class="btn btn-primary" id="chat-send">Send</button>
    </div>`;
  const body = $('#chat-body'); body.scrollTop = body.scrollHeight;
  const send = async () => {
    const text = $('#chat-text').value.trim(); if (!text) return;
    try {
      await api('/messages', { method: 'POST', body: { toUserId: t.otherUserId, body: text } });
      $('#chat-text').value = ''; viewMessages();
    } catch (e) { toast(e.message, true); }
  };
  $('#chat-send').onclick = send;
  $('#chat-text').addEventListener('keydown', e => e.key === 'Enter' && send());
}

/* ---------- MODALS ---------- */
function modal(html) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.onclick = e => { if (e.target === bg) bg.remove(); };
  document.body.appendChild(bg);
  return bg;
}
function confirmModal(title, msg, onYes) {
  const m = modal(`<h3>${esc(title)}</h3><p style="color:var(--muted)">${esc(msg)}</p>
    <div class="modal-actions"><button class="btn btn-ghost" id="m-no">Cancel</button><button class="btn btn-primary" id="m-yes">Confirm</button></div>`);
  $('#m-no', m).onclick = () => m.remove();
  $('#m-yes', m).onclick = async () => { await onYes(); m.remove(); };
}
function openApplyModal(job) {
  const m = modal(`<h3>Apply to "${esc(job.title)}"</h3>
    <p style="color:var(--muted);margin-bottom:1rem">Add a short note for the producer.</p>
    <div class="field"><textarea id="cover" placeholder="Why you're a great fit…"></textarea></div>
    <div class="modal-actions"><button class="btn btn-ghost" id="c-x">Cancel</button><button class="btn btn-gold" id="c-go">Send application</button></div>`);
  $('#c-x', m).onclick = () => m.remove();
  $('#c-go', m).onclick = async () => {
    try {
      await api('/jobs/' + job.id + '/apply', { method: 'POST', body: { coverNote: $('#cover', m).value } });
      toast('Application sent!'); m.remove();
    } catch (e) { toast(e.message, true); }
  };
}
function openMessageModal(toUserId, name, jobId) {
  if (!ME) return go('/login');
  const m = modal(`<h3>Message ${esc(name)}</h3>
    <div class="field"><textarea id="mbody" placeholder="Write your message…"></textarea></div>
    <div class="modal-actions"><button class="btn btn-ghost" id="mx">Cancel</button><button class="btn btn-gold" id="mg">Send</button></div>`);
  $('#mx', m).onclick = () => m.remove();
  $('#mg', m).onclick = async () => {
    const body = $('#mbody', m).value.trim(); if (!body) return;
    try {
      await api('/messages', { method: 'POST', body: { toUserId, body, jobId } });
      toast('Message sent!'); m.remove();
    } catch (e) { toast(e.message, true); }
  };
}

/* ---------- shared ---------- */
function emptyState(ico, h, p) {
  return `<div class="empty"><div class="ico">${ico}</div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`;
}
function bindCards() {
  document.querySelectorAll('[data-actor]').forEach(c => c.dataset.actor && (c.onclick = () => go('/actors/' + c.dataset.actor)));
  document.querySelectorAll('[data-job]').forEach(c => c.onclick = () => go('/jobs/' + c.dataset.job));
}

/* ===================================================================
   ROUTER
=================================================================== */
function router() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (hash === '/' || hash === '') return viewHome();
  if (parts[0] === 'actors' && parts[1]) return viewActorDetail(parts[1]);
  if (parts[0] === 'actors') return viewActors();
  if (parts[0] === 'jobs' && parts[1]) return viewJobDetail(parts[1]);
  if (parts[0] === 'jobs') return viewJobs();
  if (parts[0] === 'login') return viewLogin();
  if (parts[0] === 'register') return viewRegister();
  if (parts[0] === 'profile') return viewProfile();
  if (parts[0] === 'post-job') return viewPostJob();
  if (parts[0] === 'dashboard') return viewDashboard();
  if (parts[0] === 'messages') return viewMessages();
  viewHome();
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => { renderNav(); router(); });
renderNav();
router();

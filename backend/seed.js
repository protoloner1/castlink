const B = 'http://localhost:4000/api';
async function post(p, body, tok) { const h = { 'Content-Type': 'application/json' }; if (tok) h.Authorization = 'Bearer ' + tok; const r = await fetch(B + p, { method: 'POST', headers: h, body: JSON.stringify(body) }); return r.json(); }
async function put(p, body, tok) { const r = await fetch(B + p, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) }); return r.json(); }
(async () => {
  const actors = [
    { name: 'Maya Rao', email: 'maya@cl.com', h: 'Theatre & film actor', loc: 'Mumbai', g: 'Female', age: '26', ht: `5'6"`, sk: 'Improv, Classical dance, Stage combat', ln: 'Hindi, English, Marathi', exp: '6 years', rate: '₹12,000/day', bio: 'NSD-trained actor with a love for character-driven indie cinema and physical theatre.' },
    { name: 'Arjun Mehta', email: 'arjun@cl.com', h: 'Lead / commercial actor', loc: 'Delhi NCR', g: 'Male', age: '31', ht: `6'0"`, sk: 'Method acting, Horse riding, Boxing', ln: 'Hindi, English, Punjabi', exp: '9 years', rate: '₹20,000/day', bio: 'Versatile lead with feature and ad-film credits. Comfortable with action choreography.' },
    { name: 'Leïla Haddad', email: 'leila@cl.com', h: 'Voice & screen artist', loc: 'Bangalore', g: 'Female', age: '29', ht: `5'4"`, sk: 'Voiceover, Singing, Accents', ln: 'English, French, Tamil', exp: '7 years', rate: '₹15,000/day', bio: 'Multilingual performer specialising in voice work and emotionally grounded screen roles.' },
    { name: 'Sam Okafor', email: 'sam@cl.com', h: 'Physical theatre performer', loc: 'Mumbai', g: 'Male', age: '24', ht: `5'11"`, sk: 'Mime, Acrobatics, Clowning', ln: 'English, Hindi', exp: '4 years', rate: '₹8,000/day', bio: 'Movement-first performer trained in Lecoq technique. Loves experimental work.' },
    { name: 'Priya Nair', email: 'priya@cl.com', h: 'Drama & web series actor', loc: 'Hyderabad', g: 'Female', age: '22', ht: `5'5"`, sk: 'Bharatanatyam, Comedy, Singing', ln: 'Telugu, Tamil, English, Hindi', exp: '3 years', rate: '₹6,000/day', bio: 'Rising talent with a strong comedic instinct and a growing web-series filmography.' },
    { name: 'Daniel Cohen', email: 'dan@cl.com', h: 'Character actor', loc: 'Pune', g: 'Male', age: '45', ht: `5'9"`, sk: 'Improv, Dialects, Piano', ln: 'English, Hindi, German', exp: '20 years', rate: '₹18,000/day', bio: 'Seasoned character actor for stage and screen. Known for nuanced supporting roles.' },
  ];
  for (const a of actors) {
    const r = await post('/auth/register', { name: a.name, email: a.email, password: 'secret1', role: 'actor' });
    await put('/actors/me', { headline: a.h, location: a.loc, gender: a.g, age: a.age, height: a.ht, skills: a.sk, languages: a.ln, experience: a.exp, rate: a.rate, bio: a.bio, available: Math.random() > 0.3, contactEmail: a.email, contactPhone: '+91 90000 000' + Math.floor(Math.random() * 9) }, r.token);
  }
  const emps = [{ name: 'Reel Studios', email: 'reel@cl.com' }, { name: 'Saffron Pictures', email: 'saffron@cl.com' }, { name: 'Northlight Media', email: 'north@cl.com' }];
  const toks = [];
  for (const e of emps) { const r = await post('/auth/register', { name: e.name, email: e.email, password: 'secret1', role: 'employer' }); toks.push(r.token); }
  const jobs = [
    { t: 'Lead — Coming-of-age Feature', c: 'Reel Studios', pt: 'Feature Film', rt: 'Lead', loc: 'Mumbai', g: 'Female', ar: '20–28', pay: '₹15,000/day', d: 'We are casting the lead for an indie coming-of-age drama shooting across Mumbai this winter. The role demands emotional range and comfort with improvisation. Six-week shoot.', req: 'Theatre background preferred. Must be available Nov–Dec. Self-tape audition required.', dl: '2026-07-15' },
    { t: 'Supporting Roles — Period Web Series', c: 'Saffron Pictures', pt: 'Web Series', rt: 'Supporting', loc: 'Delhi NCR', g: 'Any', ar: '25–45', pay: '₹10,000/day', d: 'A streaming period drama set in 1940s Delhi seeks an ensemble of supporting actors. Multiple roles open across the eight-episode arc.', req: 'Comfort with period costume and Hindustani diction. Prior screen experience a plus.', dl: '2026-06-30' },
    { t: 'Voice Artist — Animated Feature', c: 'Northlight Media', pt: 'Voiceover', rt: 'Voice', loc: 'Remote', g: 'Any', ar: '18–60', pay: '₹8,000/session', d: 'Casting distinctive voices for an animated feature. Looking for range, character work, and the ability to take direction quickly in-booth or remotely.', req: 'Home studio or willingness to record in Bangalore. Demo reel required.', dl: '2026-08-01' },
    { t: 'Brand Ambassador — National TVC', c: 'Saffron Pictures', pt: 'Commercial', rt: 'Lead', loc: 'Mumbai', g: 'Male', ar: '28–38', pay: '₹25,000/day', d: 'A leading lifestyle brand seeks a charismatic face for its national television campaign. Warm, aspirational on-camera presence essential.', req: 'Strong screen presence. Two-day shoot plus usage buyout. Portfolio required.', dl: '2026-07-10' },
    { t: 'Ensemble — Experimental Theatre', c: 'Northlight Media', pt: 'Theatre', rt: 'Ensemble', loc: 'Pune', g: 'Any', ar: '21–40', pay: '₹5,000/show', d: 'A devised physical-theatre production seeks movement-driven performers for a six-week run. Collaborative rehearsal process.', req: 'Movement or physical-theatre training. Available for full rehearsal period.', dl: '2026-06-25' },
  ];
  for (let i = 0; i < jobs.length; i++) { const j = jobs[i]; await post('/jobs', { title: j.t, company: j.c, productionType: j.pt, roleType: j.rt, location: j.loc, gender: j.g, ageRange: j.ar, pay: j.pay, description: j.d, requirements: j.req, deadline: j.dl }, toks[i % toks.length]); }
  const s = await (await fetch(B + '/stats')).json();
  console.log('Seeded:', JSON.stringify(s));
})();

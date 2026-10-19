const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENC_FILE = path.join(__dirname, '..', 'd7k9x2.enc');

function decrypt(password) {
  const b64 = fs.readFileSync(ENC_FILE, 'utf8');
  const buf = Buffer.from(b64, 'base64');
  const salt = buf.slice(0, 16);
  const iv = buf.slice(16, 28);
  const tag = buf.slice(28, 44);
  const ciphertext = buf.slice(44);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return JSON.parse(decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8'));
}

function encrypt(password, data) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data, null, 2), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  fs.writeFileSync(ENC_FILE, combined.toString('base64'));
}

function parseIssueBody(body) {
  const fields = {};
  const patterns = {
    name: /\*\*Full Name:\*\*\s*(.+)/i,
    gender: /\*\*Gender:\*\*\s*(.+)/i,
    father: /\*\*Father's Name:\*\*\s*(.+)/i,
    mother: /\*\*Mother's Name:\*\*\s*(.+)/i,
    spouse: /\*\*Spouse's Name:\*\*\s*(.+)/i,
    birthYear: /\*\*Birth Year:\*\*\s*(.+)/i,
    gotra: /\*\*Gotra:\*\*\s*(.+)/i,
    nativeTown: /\*\*Native Town:\*\*\s*(.+)/i,
    children: /\*\*Children:\*\*\s*(.+)/i,
    submitter: /\*\*Submitted By:\*\*\s*(.+)/i,
  };
  for (const [key, regex] of Object.entries(patterns)) {
    const match = body.match(regex);
    if (match) fields[key] = match[1].trim();
  }
  return fields;
}

function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findConflicts(data, newName, fatherName) {
  const norm = normalize(newName);
  const conflicts = [];
  for (const [id, node] of Object.entries(data.nodes)) {
    if (normalize(node.name) === norm) {
      const father = data.edges.find(e => e.type === 'isFatherOf' && e.target === id);
      const fatherNode = father ? data.nodes[father.source] : null;
      conflicts.push({
        id,
        name: node.name,
        gender: node.gender,
        gotra: node.gotra,
        nativeTown: node.nativeTown,
        fatherName: fatherNode ? fatherNode.name : 'unknown',
      });
    }
  }
  return conflicts;
}

function getNextId(data) {
  const ids = Object.keys(data.nodes).map(id => parseInt(id.replace('ii', ''), 10));
  const max = Math.max(...ids);
  return 'ii' + String(max + 1).padStart(4, '0');
}

function findPersonByName(data, name) {
  if (!name) return null;
  const norm = normalize(name);
  for (const [id, node] of Object.entries(data.nodes)) {
    if (normalize(node.name) === norm) return id;
  }
  return null;
}

function addPerson(data, fields) {
  const newId = getNextId(data);
  const node = { name: fields.name };
  if (fields.gender) node.gender = fields.gender === 'Male' ? 'M' : 'F';
  if (fields.gotra) node.gotra = fields.gotra;
  if (fields.nativeTown) node.nativeTown = fields.nativeTown;
  if (fields.birthYear) node.birthYear = parseInt(fields.birthYear, 10) || undefined;

  data.nodes[newId] = node;

  const fatherId = findPersonByName(data, fields.father);
  if (fatherId) {
    data.edges.push({ source: fatherId, type: 'isFatherOf', target: newId });
  }

  const motherId = findPersonByName(data, fields.mother);
  if (motherId) {
    data.edges.push({ source: motherId, type: 'isMotherOf', target: newId });
  }

  const spouseId = findPersonByName(data, fields.spouse);
  if (spouseId) {
    data.edges.push({ source: newId, type: 'isSpouseOf', target: spouseId });
  }

  if (fields.children) {
    const childNames = fields.children.split('\n').map(c => c.trim()).filter(Boolean);
    for (const childName of childNames) {
      const childId = findPersonByName(data, childName);
      if (childId) {
        const edgeType = node.gender === 'M' ? 'isFatherOf' : 'isMotherOf';
        data.edges.push({ source: newId, type: edgeType, target: childId });
      }
    }
  }

  return { newId, node, edgesAdded: data.edges.length };
}

// Main
const password = process.env.ENCRYPTION_KEY;
const issueBody = process.env.ISSUE_BODY;
const mode = process.argv[2] || 'check';

if (!password || !issueBody) {
  console.error('Missing ENCRYPTION_KEY or ISSUE_BODY env vars');
  process.exit(1);
}

const fields = parseIssueBody(issueBody);

if (!fields.name) {
  console.log('::set-output name=status::error');
  console.log('::set-output name=message::Could not parse member name from issue body');
  process.exit(0);
}

const data = decrypt(password);
const conflicts = findConflicts(data, fields.name, fields.father);

if (mode === 'check') {
  if (conflicts.length > 0) {
    const details = conflicts.map(c =>
      `- **${c.name}** (ID: ${c.id}, Father: ${c.fatherName}, Gotra: ${c.gotra || 'n/a'}, Town: ${c.nativeTown || 'n/a'})`
    ).join('\n');
    const msg = `A person with a similar name already exists in the tree:\n\n${details}\n\n` +
      `Is this the **same person** or a **different person**?\n` +
      `- Reply **"different person"** to add them as a new entry\n` +
      `- Reply **"same person"** to skip (and describe any updates needed)`;
    console.log(`::set-output name=status::conflict`);
    console.log(`::set-output name=message::${msg.replace(/\n/g, '%0A')}`);
  } else {
    console.log(`::set-output name=status::clear`);
    console.log(`::set-output name=message::No conflicts found`);
  }
}

if (mode === 'add') {
  const result = addPerson(data, fields);
  encrypt(password, data);
  const summary = `Added **${fields.name}** as ${result.newId}`;
  const parentInfo = [];
  if (fields.father) parentInfo.push(`Father: ${fields.father}`);
  if (fields.mother) parentInfo.push(`Mother: ${fields.mother}`);
  if (fields.spouse) parentInfo.push(`Spouse: ${fields.spouse}`);
  const msg = summary + (parentInfo.length ? `\n${parentInfo.join(', ')}` : '');
  console.log(`::set-output name=status::added`);
  console.log(`::set-output name=message::${msg.replace(/\n/g, '%0A')}`);
  console.log(`::set-output name=new_id::${result.newId}`);
}

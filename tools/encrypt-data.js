const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const password = process.argv[2];
const inputFile = process.argv[3] || path.join(__dirname, '..', 'd7k9x2.json');
const outputFile = process.argv[4] || inputFile.replace(/\.json$/, '.enc');

if (!password) {
  console.error('Usage: node encrypt-data.js <password> [input.json] [output.enc]');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

const plaintext = fs.readFileSync(inputFile, 'utf8');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

// Format: base64(salt + iv + tag + ciphertext)
const combined = Buffer.concat([salt, iv, tag, encrypted]);
fs.writeFileSync(outputFile, combined.toString('base64'));

console.log(`Encrypted ${inputFile} -> ${outputFile} (${combined.length} bytes)`);

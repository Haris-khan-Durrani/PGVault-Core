const fs = require('fs');
const archiver = require('archiver');
archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));
const unzipper = require('unzipper');

async function test() {
  const password = "mysecretpassword";
  const zipPath = 'test_aes.zip';
  const extractPath = 'test_extracted.txt';

  // Create
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver.create('zip-encrypted', {
      zlib: { level: 8 },
      encryptionMethod: 'aes256',
      password: password
    });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.append('Hello World!', { name: 'test.txt' });
    archive.finalize();
  });

  console.log("Created zip.");

  // Extract
  try {
    const directory = await unzipper.Open.file(zipPath);
    const file = directory.files.find(d => d.path === 'test.txt');
    const content = await file.buffer(password);
    console.log("Extracted:", content.toString());
  } catch (err) {
    console.error("Extraction failed:", err);
  } finally {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  }
}

test();

const fs = require('fs');
const archiver = require('archiver');
archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));
const sevenBin = require('7zip-bin');
const { extractFull } = require('node-7z');

async function test() {
  const password = "mysecretpassword";
  const zipPath = 'test_aes.zip';
  const extractDir = 'test_extract_dir';

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

  if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir);

  // Extract
  try {
    const pathTo7zip = sevenBin.path7za;
    console.log("Using 7zip at:", pathTo7zip);
    
    await new Promise((resolve, reject) => {
      const myStream = extractFull(zipPath, extractDir, {
        $bin: pathTo7zip,
        password: password
      });

      myStream.on('end', () => resolve());
      myStream.on('error', (err) => reject(err));
    });

    const content = fs.readFileSync(`${extractDir}/test.txt`, 'utf8');
    console.log("Extracted:", content);
  } catch (err) {
    console.error("Extraction failed:", err);
  } finally {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(`${extractDir}/test.txt`)) fs.unlinkSync(`${extractDir}/test.txt`);
    if (fs.existsSync(extractDir)) fs.rmdirSync(extractDir);
  }
}

test();

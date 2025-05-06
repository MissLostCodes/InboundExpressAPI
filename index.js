const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let cachedData = [];

/* Extract markdown zip */
async function extractMarkdownZip() {
  const zipPath = path.join(__dirname, 'markdown_files.zip');
  const outputDir = path.join(__dirname, 'markdowns');

  try {
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: outputDir }))
      .promise();
    console.log('ZIP extracted');
  } catch (err) {
    console.error('Failed to unzip:', err);
  }
}

/* Load markdowns */
function loadMarkdowns() {
  const dir = path.join(__dirname, 'markdowns');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');

      const base = path.basename(file, '.md');
      const cleanUrl = base
        .replace(/^www_/, '')
        .replace(/_/g, '/')
        .replace(/\/+/g, '/');

      const fullURL = `https://${cleanUrl}`;

      cachedData.push({
        markdown: content,
        source_url: fullURL
      });
    }
  });

  console.log(`Loaded ${cachedData.length} markdown files`);
}

/* Load crawled JSON data */
function loadCrawledJSON() {
  const filePath = path.join(__dirname, 'IMAcrawledData.json');
  if (!fs.existsSync(filePath)) {
    console.warn(' No crawled_data.json found');
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON:', err);
    return;
  }

  parsed.forEach(entry => {
    if (entry.content && entry.url) {
      cachedData.push({
        markdown: entry.content,
        source_url: entry.url
      });
    }
  });

  console.log(`Loaded ${parsed.length} crawled entries`);
}

/* Step 4: Init everything */
async function initialize() {
  await extractMarkdownZip();
  loadMarkdowns();
  loadCrawledJSON();
}
initialize();

/* Step 5: Main plugin-friendly endpoint */
app.post('/analyze', (req, res) => {
  const { query } = req.body;

  if (!cachedData.length) {
    return res.status(500).json({ error: 'Data not loaded yet' });
  }

  if (typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Query must be a non-empty string' });
  }

  const q = query.toLowerCase();

  const results = cachedData.filter(doc =>
    doc.markdown && doc.markdown.toLowerCase().includes(q)
  );

  res.json({
    results,
    count: results.length,
    source: 'Inbound Medic content (markdown + crawled)'
  });
});


app.get('/', (req, res) => {
  res.send('Inbound Medic AI API is running');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

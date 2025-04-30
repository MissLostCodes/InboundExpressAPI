const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let cachedData = null;

// Load the JSON file when the server starts
fs.readFile('IMAcrawledData.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Failed to read JSON file:', err);
  } else {
    try {
      cachedData = JSON.parse(data);
      console.log('Crawled data loaded successfully.');
    } catch (parseErr) {
      console.error('Error parsing JSON:', parseErr);
    }
  }
});

//  API endpoint
app.post('/analyze', (req, res) => {
  const { query } = req.body;

  if (!cachedData) {
    return res.status(500).json({ error: 'Data not loaded yet' });
  }

  // Extract markdown content from each object in the array
  const result = cachedData
    .map(doc => doc.markdown) // Extract the markdown field
    .filter(text => !query || text.toLowerCase().includes(query.toLowerCase())); // Apply basic search filtering if query is provided

  res.json({ data: result });
});
app.get('/', (req, res) => {
  res.send('This is Inbound Medic AI API ');
});
app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});

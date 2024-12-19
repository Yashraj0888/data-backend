const express = require('express');
const fs = require('fs');
const csvParser = require('csv-parser');
const archiver = require('archiver');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 3000;

// Function to load CSV data
const loadCSV = () => {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream('record.csv')
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
};

// Route to get all records
app.get('/api/papers', async (req, res) => {
    try {
        const data = await loadCSV();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// Route to get filters dynamically
app.get('/api/filters', async (req, res) => {
    try {
        const data = await loadCSV();
        const filters = {
            regions: [...new Set(data.map((item) => item.Region))],
            countries: [...new Set(data.map((item) => item.Country))],
            itemTypes: [...new Set(data.map((item) => item['Item Type']))],
        };
        res.json(filters);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load filters' });
    }
});

// Route to export filtered data
app.post('/api/export', async (req, res) => {
    try {
        const data = await loadCSV();
        const filteredData = req.body.filteredData; // Receive filtered data from frontend

        const output = fs.createWriteStream('filtered_data.zip');
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);

        // Add JSON data to zip
        archive.append(JSON.stringify(filteredData, null, 2), { name: 'filtered_data.json' });

        // Finalize archive
        archive.finalize();

        output.on('close', () => {
            res.download('filtered_data.zip', 'filtered_data.zip', () => {
                fs.unlinkSync('filtered_data.zip'); // Clean up after download
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to export data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

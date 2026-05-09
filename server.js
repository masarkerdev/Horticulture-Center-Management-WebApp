const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// MIDDLEWARE
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files — Frontend
app.use(express.static(path.join(__dirname, 'public')));

// ROUTES
app.use('/api', require('./routes/index'));

// Health check — root এ JSON না দিয়ে index.html serve করব
// (static middleware উপরে করে দিয়েছে)

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
});

// Local dev-এ listen করুন, Vercel-এ না
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

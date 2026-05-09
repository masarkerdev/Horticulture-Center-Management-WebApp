const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files — Frontend ও Images
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// ROUTES
// ============================================================
app.use('/api', require('./routes/index'));

// Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🌿 উদ্যানতত্ত্ব কেন্দ্র API চালু আছে।',
        org: process.env.ORG_NAME_EN || 'Horticulture Center, Asambasti, Rangamati',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// ERROR HANDLING
// ============================================================
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'রুট পাওয়া যায়নি। / Route not found.' });
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা হয়েছে।', error: err.message });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n🌿 ====================================');
    console.log('   উদ্যানতত্ত্ব কেন্দ্র API');
    console.log('   Horticulture Center - Asambasti');
    console.log(`   Server: http://localhost:${PORT}`);
    console.log('   স্ট্যাটাস: চালু / Status: Running');
    console.log('========================================\n');
});

module.exports = app;

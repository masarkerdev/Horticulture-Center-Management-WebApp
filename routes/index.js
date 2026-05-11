const express = require('express');
const router = express.Router();

const { authenticate, adminOnly, adminOrManager, canProduce, canSell } = require('../middleware/auth');

const { login, getProfile, changePassword }             = require('../controllers/authController');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { getAllSeedlings, getSeedlingById, createSeedling, updateSeedling, deleteSeedling, getLowStockSeedlings } = require('../controllers/seedlingController');
const { getAllBatches, createSeedBatch, createAsexualBatch, getBatchById } = require('../controllers/productionController');
const { getAllSales, getSaleById, createSale, getTodaySummary, getMonthlySales } = require('../controllers/salesController');
const { getStockSummary, getStockLedger, stockAdjustment, getAllDamages, reportDamage, getDashboardStats } = require('../controllers/stockController');

// ============================================================
// AUTH ROUTES - /api/auth
// ============================================================
router.post('/auth/login',           login);
router.get ('/auth/profile',         authenticate, getProfile);
router.put ('/auth/change-password', authenticate, changePassword);

// ============================================================
// DASHBOARD - /api/dashboard
// ============================================================
router.get('/dashboard/stats', authenticate, getDashboardStats);

// ============================================================
// USER ROUTES - /api/users
// ============================================================
router.get   ('/users',     authenticate, adminOnly,       getAllUsers);
router.post  ('/users',     authenticate, adminOnly,       createUser);
router.put   ('/users/:id', authenticate, adminOnly,       updateUser);
router.delete('/users/:id', authenticate, adminOnly,       deleteUser);

// ============================================================
// CATEGORY ROUTES - /api/categories
// ============================================================
const db = require('../config/db');
router.get('/categories', authenticate, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY name_bn');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// SEEDLING ROUTES - /api/seedlings
// ============================================================
router.get   ('/seedlings/low-stock',  authenticate,                   getLowStockSeedlings);
router.get   ('/seedlings',            authenticate,                   getAllSeedlings);
router.get   ('/seedlings/:id',        authenticate,                   getSeedlingById);
router.post  ('/seedlings',            authenticate, canProduce,        createSeedling);
router.put   ('/seedlings/:id',        authenticate, canProduce,        updateSeedling);
router.delete('/seedlings/:id',        authenticate, adminOrManager,    deleteSeedling);

// ============================================================
// PRODUCTION ROUTES - /api/production
// ============================================================
router.get ('/production',                authenticate,             getAllBatches);
router.get ('/production/:id',            authenticate,             getBatchById);
router.post('/production/seed',           authenticate, canProduce, createSeedBatch);
router.post('/production/asexual',        authenticate, canProduce, createAsexualBatch);

// Batch আপডেট করুন (edit করলে নতুন তৈরি না হয়ে আপডেট হবে)
router.post('/production/:id/update', authenticate, canProduce, async (req, res) => {
    const { id } = req.params;
    const fields = req.body;
    try {
        const setClauses = [];
        const values = [];
        let idx = 1;
        const allowed = ['produced_quantity','success_quantity','failed_quantity','seed_source','seed_quantity','sowing_date','germination_date','germination_percent','propagation_date','success_percent','remarks','status','available_quantity'];
        for (const key of allowed) {
            if (fields[key] !== undefined) {
                setClauses.push(`${key} = $${idx++}`);
                values.push(fields[key]);
            }
        }
        if (setClauses.length === 0) return res.json({ success: true, message: 'কিছু পরিবর্তন নেই।' });
        values.push(id);
        const result = await db.query(
            `UPDATE production_batches SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        res.json({ success: true, message: 'ব্যাচ আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// MOTHER PLANT ROUTES - /api/mother-plants
// ============================================================
router.get('/mother-plants', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT mp.*, s.name_bn AS seedling_bn, s.seedling_code
             FROM mother_plants mp
             LEFT JOIN seedlings s ON mp.seedling_id = s.id
             WHERE mp.is_active = TRUE ORDER BY mp.mp_code`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/mother-plants', authenticate, canProduce, async (req, res) => {
    const { variety, seedling_id, age_years, location, health_status, notes } = req.body;
    try {
        const countResult = await db.query('SELECT COUNT(*) FROM mother_plants');
        const nextNum = parseInt(countResult.rows[0].count) + 1;
        const mp_code = 'MP-' + String(nextNum).padStart(3, '0');

        const result = await db.query(
            `INSERT INTO mother_plants (mp_code, variety, seedling_id, age_years, location, health_status, notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [mp_code, variety, seedling_id, age_years, location, health_status || 'good', notes, req.user.id]
        );
        res.status(201).json({ success: true, message: 'মাদার প্ল্যান্ট যোগ হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// STOCK ROUTES - /api/stock
// ============================================================
router.get ('/stock',            authenticate,              getStockSummary);
router.get ('/stock/ledger',     authenticate,              getStockLedger);
router.post('/stock/adjustment', authenticate, adminOrManager, stockAdjustment);

// ============================================================
// SALES ROUTES - /api/sales
// ============================================================
router.get ('/sales',         authenticate,         getAllSales);
router.get ('/sales/today',   authenticate,         getTodaySummary);
router.get ('/sales/monthly', authenticate,         getMonthlySales);
router.get ('/sales/:id',     authenticate,         getSaleById);
router.post('/sales',         authenticate, canSell, createSale);

// ============================================================
// DAMAGE ROUTES - /api/damages
// ============================================================
router.get ('/damages',     authenticate,             getAllDamages);
router.post('/damages',     authenticate, canProduce,  reportDamage);

// ============================================================
// CUSTOMER ROUTES - /api/customers
// ============================================================
router.get('/customers', authenticate, async (req, res) => {
    const { search } = req.query;
    try {
        const params = [];
        const where = search ? (params.push(`%${search}%`), `WHERE c.name ILIKE $1 OR c.phone ILIKE $1`) : '';
        const result = await db.query(
            `SELECT c.*,
                COUNT(s.id) AS total_orders,
                COALESCE(SUM(s.total_amount), 0) AS total_spent
             FROM customers c
             LEFT JOIN sales s ON (c.id = s.customer_id OR c.phone = s.customer_phone)
             ${where}
             GROUP BY c.id
             ORDER BY total_orders DESC, c.name`,
            params
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/customers', authenticate, canSell, async (req, res) => {
    const { name, phone, address, email, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'নাম দিন।' });
    try {
        const result = await db.query(
            'INSERT INTO customers (name, phone, address, email, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [name, phone, address, email, notes]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// গ্রাহক আপডেট করুন
router.put('/customers/:id', authenticate, canSell, async (req, res) => {
    const { name, phone, address, email, notes } = req.body;
    try {
        const result = await db.query(
            `UPDATE customers SET name=$1, phone=$2, address=$3, email=$4, notes=$5
             WHERE id=$6 RETURNING *`,
            [name, phone, address, email, notes, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: 'গ্রাহক পাওয়া যায়নি।' });
        res.json({ success: true, message: 'গ্রাহক আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// গ্রাহক মুছুন
router.delete('/customers/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        await db.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'গ্রাহক মুছে ফেলা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// SALES UPDATE - /api/sales/:id (নতুন — বিক্রয় আপডেট)
// ============================================================
router.put('/sales/:id', authenticate, canSell, async (req, res) => {
    const { customer_name, customer_phone, customer_address, payment_method, payment_status, discount, notes } = req.body;
    try {
        const result = await db.query(
            `UPDATE sales SET
                customer_name = COALESCE($1, customer_name),
                customer_phone = COALESCE($2, customer_phone),
                customer_address = COALESCE($3, customer_address),
                payment_method = COALESCE($4, payment_method),
                payment_status = COALESCE($5, payment_status),
                discount = COALESCE($6, discount),
                notes = COALESCE($7, notes)
             WHERE id = $8 RETURNING *`,
            [customer_name, customer_phone, customer_address, payment_method, payment_status, discount, notes, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: 'বিক্রয় পাওয়া যায়নি।' });
        res.json({ success: true, message: 'বিক্রয় আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// SALES DELETE - /api/sales/:id
// ============================================================
router.delete('/sales/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        await db.query('DELETE FROM sales_items WHERE sale_id = $1', [req.params.id]);
        await db.query('DELETE FROM sales WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'বিক্রয় মুছে ফেলা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// PRODUCTION BATCH DELETE - /api/production-batches/:id
// ============================================================
router.delete('/production-batches/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        await db.query('DELETE FROM stock_transactions WHERE batch_id = $1', [req.params.id]);
        await db.query('DELETE FROM production_batches WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'ব্যাচ মুছে ফেলা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// MOTHER PLANT DELETE - /api/mother-plants/:id
// ============================================================
router.delete('/mother-plants/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        await db.query('UPDATE mother_plants SET is_active = FALSE WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'মাদার প্ল্যান্ট নিষ্ক্রিয় করা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// DAMAGE DELETE - /api/damages/:id
// ============================================================
router.delete('/damages/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        await db.query('DELETE FROM damages WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'ক্ষতি রিপোর্ট মুছে ফেলা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// REPORTS ROUTES - /api/reports
// ============================================================
router.get('/reports/production', authenticate, async (req, res) => {
    const { from_date, to_date } = req.query;
    try {
        const result = await db.query(
            `SELECT pb.batch_code, s.name_bn, pb.production_type,
                    pb.produced_quantity, pb.success_quantity, pb.failed_quantity,
                    COALESCE(pb.success_percent, pb.germination_percent) AS success_rate,
                    pb.available_quantity, pb.status, pb.created_at
             FROM production_batches pb
             LEFT JOIN seedlings s ON pb.seedling_id = s.id
             WHERE ($1::DATE IS NULL OR DATE(pb.created_at) >= $1::DATE)
               AND ($2::DATE IS NULL OR DATE(pb.created_at) <= $2::DATE)
             ORDER BY pb.created_at DESC`,
            [from_date || null, to_date || null]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/reports/profit-loss', authenticate, adminOrManager, async (req, res) => {
    const { from_date, to_date } = req.query;
    try {
        const revenue = await db.query(
            `SELECT COALESCE(SUM(total_amount),0) AS total
             FROM sales WHERE ($1::DATE IS NULL OR sale_date >= $1::DATE)
               AND ($2::DATE IS NULL OR sale_date <= $2::DATE)`,
            [from_date || null, to_date || null]
        );

        const cost = await db.query(
            `SELECT COALESCE(SUM(pb.produced_quantity * s.production_cost), 0) AS total
             FROM production_batches pb
             LEFT JOIN seedlings s ON pb.seedling_id = s.id
             WHERE ($1::DATE IS NULL OR DATE(pb.created_at) >= $1::DATE)
               AND ($2::DATE IS NULL OR DATE(pb.created_at) <= $2::DATE)`,
            [from_date || null, to_date || null]
        );

        const totalRevenue = parseFloat(revenue.rows[0].total);
        const totalCost = parseFloat(cost.rows[0].total);

        res.json({
            success: true,
            data: {
                total_revenue: totalRevenue,
                total_cost: totalCost,
                profit: totalRevenue - totalCost,
                profit_margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(2) : 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// মাসিক উৎপাদন — /api/reports/monthly-production
// ============================================================
router.get('/reports/monthly-production', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                TO_CHAR(created_at, 'YYYY-MM') AS month_key,
                TO_CHAR(created_at, 'Mon') AS month_name,
                EXTRACT(MONTH FROM created_at) AS month_num,
                EXTRACT(YEAR FROM created_at) AS year_num,
                SUM(CASE WHEN production_type = 'seed' THEN produced_quantity ELSE 0 END) AS seed_qty,
                SUM(CASE WHEN production_type != 'seed' THEN produced_quantity ELSE 0 END) AS asexual_qty,
                SUM(produced_quantity) AS total_qty
            FROM production_batches
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY month_key, month_name, month_num, year_num
            ORDER BY year_num, month_num
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// ক্যাটাগরি অনুযায়ী বিক্রয় — /api/reports/sales-by-category
// ============================================================
router.get('/reports/sales-by-category', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                c.name_bn AS category,
                COALESCE(SUM(si.total_price), 0) AS total_sales,
                COUNT(DISTINCT si.sale_id) AS total_orders
            FROM categories c
            LEFT JOIN seedlings s ON s.category_id = c.id
            LEFT JOIN sales_items si ON si.seedling_id = s.id
            GROUP BY c.id, c.name_bn
            ORDER BY total_sales DESC
        `);

        const total = result.rows.reduce((sum, r) => sum + parseFloat(r.total_sales), 0);
        const dataWithPercent = result.rows.map(r => ({
            ...r,
            percent: total > 0 ? ((parseFloat(r.total_sales) / total) * 100).toFixed(1) : 0
        }));

        res.json({ success: true, data: dataWithPercent, total });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// পাসওয়ার্ড পরিবর্তনের অনুরোধ — /api/auth/request-password-change
// ============================================================
router.post('/auth/request-password-change', authenticate, async (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6)
        return res.status(400).json({ success: false, message: 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।' });
    try {
        const bcrypt = require('bcryptjs');
        const hashed = await bcrypt.hash(new_password, 10);
        await db.query(
            `UPDATE users SET pending_password=$1, password_request_status='pending' WHERE id=$2`,
            [hashed, req.user.id]
        );
        res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তনের অনুরোধ পাঠানো হয়েছে। Admin অনুমোদনের জন্য অপেক্ষা করুন।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin — অনুরোধ Approve করুন
router.post('/users/:id/approve-password', authenticate, adminOnly, async (req, res) => {
    try {
        const user = await db.query('SELECT pending_password FROM users WHERE id=$1', [req.params.id]);
        if (!user.rows[0]?.pending_password)
            return res.status(400).json({ success: false, message: 'কোনো pending অনুরোধ নেই।' });
        await db.query(
            `UPDATE users SET password=$1, pending_password=NULL, password_request_status='approved' WHERE id=$2`,
            [user.rows[0].pending_password, req.params.id]
        );
        res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তন অনুমোদিত হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin — অনুরোধ Reject করুন
router.post('/users/:id/reject-password', authenticate, adminOnly, async (req, res) => {
    try {
        await db.query(
            `UPDATE users SET pending_password=NULL, password_request_status='rejected' WHERE id=$1`,
            [req.params.id]
        );
        res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তনের অনুরোধ প্রত্যাখ্যান করা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

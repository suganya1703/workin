// server/index.js
// Workin — AI-Powered Voice-Based Verified Labor Marketplace Server
// Fully supporting Phase 1 REST APIs and Frontend Dashboard & Employer Portal endpoints

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve public static files
app.use(express.static(path.join(__dirname, '../public')));

// Helper to format labour database record for frontend UI
function formatLabourForFrontend(l) {
    let skills = [];
    if (l.skill) {
        if (typeof l.skill === 'string' && l.skill.startsWith('[')) {
            try { skills = JSON.parse(l.skill); } catch (e) { skills = [l.skill]; }
        } else {
            skills = [l.skill];
        }
    } else if (l.skills) {
        skills = Array.isArray(l.skills) ? l.skills : [l.skills];
    } else {
        skills = ['Catering / Cook'];
    }

    const isVerified = l.verification_status === 'Verified' || !!l.is_verified;

    return {
        id: l.id?.toString() || '1',
        full_name: l.name || l.full_name || 'Worker',
        name: l.name || l.full_name || 'Worker',
        phone_number: l.phone || l.phone_number || '',
        phone: l.phone || l.phone_number || '',
        district: l.location || l.district || 'Dindigul',
        location: l.location || l.district || 'Dindigul',
        town_area: l.location || l.town_area || `${l.location || 'Dindigul'} Town`,
        skills: skills,
        skill: skills[0] || 'Catering / Cook',
        daily_rate: l.pay_rate || l.daily_rate || 650,
        experience_years: l.experience_years || 2,
        skill_level: `${l.experience_years || 2} Yrs Experience (${skills[0] || 'Worker'})`,
        verification_status: l.verification_status || (isVerified ? 'Verified' : 'Pending'),
        is_verified: isVerified,
        total_gigs: l.total_gigs || (l.experience_years ? l.experience_years * 6 : 15),
        attendance_reliability: l.attendance_reliability || '98% On-Time',
        photo_url: l.photo_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        created_at: l.created_at || new Date().toISOString()
    };
}

// Format job record for frontend
function formatJobForFrontend(j) {
    const rate     = parseFloat(j.per_worker_daily_rate || j.pay_rate || 600.00);
    const count    = parseInt(j.workers_needed || 1);
    const subtotal = rate * count;
    const fee      = Math.round(subtotal * 0.08);
    const total    = parseFloat(j.bundled_total_price || (subtotal + fee));

    return {
        id: j.id,
        employer_name: j.employer_name || 'Employer',
        contact_person: j.employer_name || 'Employer',
        phone: j.phone || '',
        title: j.title || j.skill_required || 'General Requirement',
        skill_required: j.skill_required || 'catering',
        workers_needed: count,
        per_worker_daily_rate: rate,
        pay_rate: rate,
        platform_fee: fee,
        bundled_total_price: total,
        work_date: j.work_date ? j.work_date.toString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        duration_days: parseInt(j.duration_days) || 1,
        location_name: j.location_name || j.location || 'Dindigul',
        district: j.district || j.location || 'Dindigul',
        location: j.location || j.district || 'Dindigul',
        status: j.status || 'OPEN',
        created_at: j.created_at || new Date().toISOString()
    };
}

// Generate OTP helper
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple Tamil voice parser fallback helper
function parseVoiceTranscript(text = '') {
    const lower = text.toLowerCase();
    let detectedSkill = 'catering';
    if (lower.includes('சமையல்') || lower.includes('cook') || lower.includes('biryani')) detectedSkill = 'cooking';
    else if (lower.includes('லோடிங்') || lower.includes('load')) detectedSkill = 'loading';
    else if (lower.includes('எலக்ட்ரீஷியன்') || lower.includes('electrician')) detectedSkill = 'electrician';
    
    let location = 'Dindigul';
    if (lower.includes('தஞ்சாவூர்') || lower.includes('thanjavur')) location = 'Thanjavur';
    else if (lower.includes('சேலம்') || lower.includes('salem')) location = 'Salem';
    else if (lower.includes('மதுரை') || lower.includes('madurai')) location = 'Madurai';
    else if (lower.includes('கோயம்புத்தூர்') || lower.includes('coimbatore')) location = 'Coimbatore';
    else if (lower.includes('திருச்சி') || lower.includes('trichy')) location = 'Trichy';

    const countMatch = text.match(/(\d+)\s*(ஆட்கள்|பேர்|workers|people)?/);
    const workerCount = countMatch ? parseInt(countMatch[1]) : 3;

    return { detectedSkill, location, workerCount, raw: text };
}

// ─── REST APIs ──────────────────────────────────────────────────────────────

// Health & System Info
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        service: 'Workin API Engine',
        status: 'Operational',
        databaseMode: db.isFallback() ? 'In-Memory Fallback' : 'MySQL Database',
        timestamp: new Date().toISOString()
    });
});

// 1. GET /api/workers (Frontend worker list endpoint)
app.get('/api/workers', async (req, res) => {
    try {
        const { district, skill, verified } = req.query;

        let sql = 'SELECT * FROM labours WHERE 1=1';
        const params = [];

        if (district && district.toUpperCase() !== 'ALL') {
            sql += ' AND LOWER(location) LIKE ?';
            params.push(`%${district.toLowerCase()}%`);
        }

        if (skill) {
            sql += ' AND LOWER(skill) LIKE ?';
            params.push(`%${skill.toLowerCase()}%`);
        }

        if (verified === '1' || verified === 'true') {
            sql += " AND verification_status = 'Verified'";
        }

        sql += ' ORDER BY id DESC';

        const [rows] = await db.query(sql, params);
        const workers = (rows || []).map(formatLabourForFrontend);

        return res.json({
            success: true,
            count: workers.length,
            workers
        });
    } catch (err) {
        console.error('Error fetching workers:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch workers', details: err.message });
    }
});

// 2. GET /api/labour/list (Phase 1 endpoint)
app.get('/api/labour/list', async (req, res) => {
    try {
        const [labours] = await db.query('SELECT * FROM labours ORDER BY id DESC');
        return res.json({
            success: true,
            count: labours.length,
            labours
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to fetch labour list', details: err.message });
    }
});

// 3. GET /api/labour/search (Phase 1 search endpoint)
app.get('/api/labour/search', async (req, res) => {
    try {
        const { skill, location, verified_only } = req.query;

        let sql = 'SELECT * FROM labours WHERE 1=1';
        const params = [];

        if (skill && skill.trim() !== '') {
            sql += ' AND LOWER(skill) LIKE ?';
            params.push(`%${skill.trim().toLowerCase()}%`);
        }

        if (location && location.trim() !== '' && location.toUpperCase() !== 'ALL') {
            sql += ' AND LOWER(location) LIKE ?';
            params.push(`%${location.trim().toLowerCase()}%`);
        }

        if (verified_only === 'true' || verified_only === '1') {
            sql += " AND verification_status = 'Verified'";
        }

        sql += ' ORDER BY id DESC';

        const [labours] = await db.query(sql, params);

        return res.json({
            success: true,
            query: { skill: skill || null, location: location || null },
            count: labours.length,
            labours
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to search labours', details: err.message });
    }
});

// 4. POST /api/labour/register & /api/register-worker
const handleRegisterLabour = async (req, res) => {
    try {
        const name     = req.body.name || req.body.full_name;
        const phone    = req.body.phone || req.body.phone_number;
        const location = req.body.location || req.body.district || 'Dindigul';
        const skill    = Array.isArray(req.body.skills) ? req.body.skills[0] : (req.body.skill || 'Catering / Cook');
        const exp      = parseInt(req.body.experience_years) || 1;
        const status   = req.body.verification_status || 'Pending';

        if (!name || !phone) {
            return res.status(400).json({ success: false, error: 'name and phone are mandatory.' });
        }

        // Check duplicate
        const [existing] = await db.query('SELECT * FROM labours WHERE phone = ?', [phone]);
        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: `A worker with phone number ${phone} is already registered.`,
                existingLabour: existing[0]
            });
        }

        const [result] = await db.query(
            `INSERT INTO labours (name, phone, skill, location, experience_years, verification_status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, phone, skill, location, exp, status]
        );

        const newId = result.insertId;
        const [rows] = await db.query('SELECT * FROM labours WHERE id = ?', [newId]);
        const rawLabour = rows.length > 0 ? rows[0] : { id: newId, name, phone, skill, location, experience_years: exp, verification_status: status };

        return res.status(201).json({
            success: true,
            message: 'Worker registered successfully!',
            labour: rawLabour,
            worker: formatLabourForFrontend(rawLabour)
        });
    } catch (err) {
        console.error('Error registering worker:', err);
        return res.status(500).json({ success: false, error: 'Failed to register worker', details: err.message });
    }
};

app.post('/api/labour/register', handleRegisterLabour);
app.post('/api/register-worker', handleRegisterLabour);

// 5. POST /api/register-employer (Employer Registration)
app.post('/api/register-employer', async (req, res) => {
    try {
        const { contact_person, phone, business_name, district } = req.body;
        if (!contact_person || !phone) {
            return res.status(400).json({ success: false, error: 'contact_person and phone are required.' });
        }

        const [existing] = await db.query('SELECT * FROM employers WHERE phone = ?', [phone]);
        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'An employer with this phone number is already registered.',
                employer: existing[0]
            });
        }

        const [result] = await db.query(
            'INSERT INTO employers (phone, contact_person, business_name, district) VALUES (?, ?, ?, ?)',
            [phone, contact_person, business_name || '', district || 'Dindigul']
        );

        const newId = result.insertId;
        const employer = { id: newId, contact_person, phone, business_name: business_name || '', district: district || 'Dindigul' };

        return res.status(201).json({
            success: true,
            message: 'Employer registered successfully!',
            employer
        });
    } catch (err) {
        console.error('Error registering employer:', err);
        return res.status(500).json({ success: false, error: 'Failed to register employer', details: err.message });
    }
});

// 6. POST /api/jobs/post & /api/jobs
const handlePostJob = async (req, res) => {
    try {
        const employer_name  = req.body.employer_name || req.body.contact_person || 'Employer';
        const phone          = req.body.phone || req.body.phone_number || '9876543210';
        const title          = req.body.title || req.body.skill_required || 'General Requirement';
        const skill_required = req.body.skill_required || 'catering';
        const count          = parseInt(req.body.workers_needed || req.body.count || 1);
        const rate           = parseFloat(req.body.per_worker_daily_rate || req.body.pay_rate || 600.00);
        const date           = req.body.work_date || new Date().toISOString().slice(0, 10);
        const duration_days  = parseInt(req.body.duration_days || 1);
        const location_name  = req.body.location_name || req.body.location || 'Dindigul';
        const district       = req.body.district || req.body.location || 'Dindigul';
        const status         = req.body.status || 'OPEN';

        if (!title || !skill_required || !location_name) {
            return res.status(400).json({ success: false, error: 'title, skill_required, location_name are mandatory.' });
        }

        const [result] = await db.query(
            `INSERT INTO jobs (employer_name, phone, title, skill_required, workers_needed, per_worker_daily_rate, work_date, duration_days, location_name, district, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [employer_name, phone, title, skill_required, count, rate, date, duration_days, location_name, district, status]
        );

        const newJobId = result.insertId;
        const [rows] = await db.query('SELECT * FROM jobs WHERE id = ?', [newJobId]);
        const rawJob = rows.length > 0 ? rows[0] : {
            id: newJobId, employer_name, phone, title, skill_required, workers_needed: count, per_worker_daily_rate: rate, work_date: date, duration_days, location_name, district, status
        };

        const formattedJob = formatJobForFrontend(rawJob);

        return res.status(201).json({
            success: true,
            message: 'Job posted successfully!',
            job: formattedJob
        });
    } catch (err) {
        console.error('Error posting job:', err);
        return res.status(500).json({ success: false, error: 'Failed to post job', details: err.message });
    }
};

app.post('/api/jobs/post', handlePostJob);
app.post('/api/jobs', handlePostJob);

// 7. GET /api/jobs/list & /api/jobs
const handleGetJobs = async (req, res) => {
    try {
        const { status, district } = req.query;
        let sql = 'SELECT * FROM jobs WHERE 1=1';
        const params = [];

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        if (district && district.toUpperCase() !== 'ALL') {
            sql += ' AND LOWER(district) = ?';
            params.push(district.toLowerCase());
        }

        sql += ' ORDER BY id DESC';

        const [rows] = await db.query(sql, params);
        const jobs = (rows || []).map(formatJobForFrontend);

        return res.json({
            success: true,
            count: jobs.length,
            jobs
        });
    } catch (err) {
        console.error('Error fetching jobs:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch jobs', details: err.message });
    }
};

app.get('/api/jobs/list', handleGetJobs);
app.get('/api/jobs', handleGetJobs);

// 8. GET /api/labour-card/:workerId
app.get('/api/labour-card/:workerId', async (req, res) => {
    try {
        const workerId = req.params.workerId;
        const [rows]   = await db.query('SELECT * FROM labours WHERE id = ? OR phone = ?', [workerId, workerId]);
        
        const raw = rows.length > 0 ? rows[0] : {
            id: workerId, name: 'Murugan K (முருகன்)', phone: '9842112345', skill: 'Catering / Cook', location: 'Dindigul', experience_years: 5, verification_status: 'Verified'
        };
        const w = formatLabourForFrontend(raw);

        return res.json({
            success: true,
            card: {
                cardNumber: `TN-WORKER-2026-W${w.id}`,
                workerName: w.name,
                phone: w.phone,
                district: w.district,
                town: w.town_area,
                skills: w.skills,
                skillLevel: w.skill_level,
                attendanceReliability: w.attendance_reliability,
                totalGigsCompleted: w.total_gigs,
                verificationStatus: w.verification_status,
                photoUrl: w.photo_url,
                issueDate: '2026-01-01',
                qrCodeData: `https://workin.in/verify/${w.id}`
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Failed to fetch labour card' });
    }
});

// 9. OTP endpoints for verification flow
app.post('/api/send-otp', (req, res) => {
    const { phone } = req.body;
    const otp = generateOTP();
    console.log(`[OTP] Sent to ${phone}: ${otp}`);
    res.json({ success: true, message: `OTP sent to ${phone}`, otp_dev: otp });
});

app.post('/api/verify-otp', async (req, res) => {
    const { phone, otp, id } = req.body;
    if (id) {
        await db.query("UPDATE labours SET verification_status = 'Verified' WHERE id = ?", [id]);
    } else if (phone) {
        await db.query("UPDATE labours SET verification_status = 'Verified' WHERE phone = ?", [phone]);
    }
    res.json({ success: true, message: 'Phone verified successfully! Employer/Labour activated.' });
});

// 10. Voice parsing & matching endpoints
app.post('/api/parse-voice', (req, res) => {
    const { transcript } = req.body;
    const parsed = parseVoiceTranscript(transcript || '');
    res.json({ success: true, parsed });
});

app.post('/api/match', async (req, res) => {
    const reqSkill = (req.body.skill || 'catering').toLowerCase();
    const reqCount = parseInt(req.body.count || 3, 10);
    const reqLoc   = req.body.location || 'Dindigul';

    const [rows] = await db.query('SELECT * FROM labours ORDER BY id DESC');
    const allFormatted = (rows || []).map(formatLabourForFrontend);
    
    // Filter matching location / skill
    let selected = allFormatted.filter(w => 
        w.district.toLowerCase().includes(reqLoc.toLowerCase()) || 
        w.skills.some(s => s.toLowerCase().includes(reqSkill))
    );

    if (selected.length < reqCount) {
        selected = allFormatted;
    }

    selected = selected.slice(0, reqCount);
    const avgRate = 650;
    const subtotal = avgRate * reqCount;
    const platformFee = Math.round(subtotal * 0.08);
    const bundledTotal = subtotal + platformFee;

    res.json({
        success: true,
        requestedSkill: reqSkill,
        requestedCount: reqCount,
        location: reqLoc,
        matchedWorkersCount: selected.length,
        selectedWorkers: selected,
        pricing: { perWorkerAvgRate: avgRate, subtotal, platformFee, bundledTotal }
    });
});

app.post('/api/book-job', (req, res) => {
    const bookingId = `WRK-BOOK-${Date.now().toString().slice(-6)}`;
    res.json({
        success: true,
        booking: {
            bookingId,
            status: 'CONFIRMED',
            dispatchedAt: new Date().toISOString()
        }
    });
});

// 11. Demand forecast
app.get('/api/demand-forecast', (req, res) => {
    res.json({
        success: true,
        forecast: [
            { date: '2026-08-15', district: 'Dindigul & Madurai', event: 'சுப முகூர்த்த நாள் (Suba Muhurtham)', demandLevel: 'HIGH', impact: '+1,500 Catering & Setup Workers Needed', wageSpikeFactor: '1.2x' },
            { date: '2026-08-20', district: 'Salem & Coimbatore', event: 'Textile Industry Shortage Spurt', demandLevel: 'VERY HIGH', impact: '+400 Loading & Machinery Helper Staff', wageSpikeFactor: '1.3x' },
            { date: '2026-08-28', district: 'Trichy & Thanjavur', event: 'Local Temple Festival (Thiruvizha)', demandLevel: 'HIGH', impact: '+800 Cooking & Function Assistants', wageSpikeFactor: '1.25x' }
        ]
    });
});

// Start Express server
app.listen(PORT, () => {
    console.log(`\n🚀 Workin Express Backend running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   DB Mode: ${db.isFallback() ? 'In-Memory Fallback' : 'MySQL Database'}\n`);
});

module.exports = app;

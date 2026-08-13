// server/db.js
// Dual-mode database handler for Workin MVP:
// Uses MySQL (mysql2/promise) if available, with automatic graceful in-memory fallback.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

let mysqlPool = null;
let useFallback = false;

// Initial in-memory data store for fallback mode
const inMemoryData = {
    labours: [
        { id: 1, name: 'Murugan K (முருகன்)', phone: '9842112345', skill: 'Catering / Cook', location: 'Dindigul', experience_years: 5, verification_status: 'Verified', created_at: new Date().toISOString() },
        { id: 2, name: 'Senthil Kumar (செந்தில்)', phone: '9789067890', skill: 'Catering Helper', location: 'Madurai', experience_years: 3, verification_status: 'Verified', created_at: new Date().toISOString() },
        { id: 3, name: 'Marimuthu P (மாரிமுத்து)', phone: '9443154321', skill: 'Biryani Specialist Cook', location: 'Thanjavur', experience_years: 8, verification_status: 'Verified', created_at: new Date().toISOString() },
        { id: 4, name: 'Karthik S (கார்த்திக்)', phone: '9629111223', skill: 'Loading & Unloading', location: 'Salem', experience_years: 2, verification_status: 'Verified', created_at: new Date().toISOString() },
        { id: 5, name: 'Ramu M (ராமு)', phone: '9894099887', skill: 'Electrician', location: 'Coimbatore', experience_years: 6, verification_status: 'Verified', created_at: new Date().toISOString() },
        { id: 6, name: 'Velusamy R (வேலுசாமி)', phone: '9487233445', skill: 'Function Cook', location: 'Trichy', experience_years: 4, verification_status: 'Pending', created_at: new Date().toISOString() }
    ],
    jobs: [
        {
            id: 1,
            employer_name: 'Lakshmi Marriage Hall',
            phone: '9876543210',
            title: 'Catering Staff for Wedding Feast',
            skill_required: 'Catering / Cook',
            workers_needed: 3,
            per_worker_daily_rate: 750.00,
            pay_rate: 750.00,
            platform_fee: 180.00,
            bundled_total_price: 2430.00,
            work_date: new Date().toISOString().slice(0, 10),
            location_name: 'Lakshmi Marriage Hall',
            location: 'Dindigul',
            district: 'Dindigul',
            status: 'OPEN',
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            employer_name: 'Kannan Traders',
            phone: '9876543211',
            title: 'Lorry Unloading & Stacking',
            skill_required: 'Loading & Unloading',
            workers_needed: 4,
            per_worker_daily_rate: 600.00,
            pay_rate: 600.00,
            platform_fee: 192.00,
            bundled_total_price: 2592.00,
            work_date: new Date().toISOString().slice(0, 10),
            location_name: 'Main Market Yard',
            location: 'Salem',
            district: 'Salem',
            status: 'OPEN',
            created_at: new Date().toISOString()
        },
        {
            id: 3,
            employer_name: 'Sri Murugan Hotel',
            phone: '9876543212',
            title: 'Master Biryani Chef Needed',
            skill_required: 'Biryani Specialist Cook',
            workers_needed: 2,
            per_worker_daily_rate: 900.00,
            pay_rate: 900.00,
            platform_fee: 144.00,
            bundled_total_price: 1944.00,
            work_date: new Date().toISOString().slice(0, 10),
            location_name: 'Bus Stand Road',
            location: 'Madurai',
            district: 'Madurai',
            status: 'OPEN',
            created_at: new Date().toISOString()
        }
    ],
    employers: [],
    nextLabourId: 7,
    nextJobId: 4,
    nextEmployerId: 1
};

try {
    mysqlPool = mysql.createPool({
        host:               process.env.DB_HOST || 'localhost',
        port:               parseInt(process.env.DB_PORT || '3306'),
        user:               process.env.DB_USER || 'root',
        password:           process.env.DB_PASSWORD || '',
        database:           process.env.DB_NAME || 'workin',
        waitForConnections: true,
        connectionLimit:    10,
        queueLimit:         0,
        charset:            'utf8mb4'
    });
} catch (e) {
    useFallback = true;
    mysqlPool = null;
}

// Test MySQL connectivity on launch
if (mysqlPool) {
    mysqlPool.getConnection()
        .then(conn => {
            console.log('✅ Connected to MySQL database:', process.env.DB_NAME || 'workin');
            conn.release();
        })
        .catch(err => {
            console.warn('⚠️  MySQL connection failed:', err.message);
            console.warn('⚡ Operating in resilient In-Memory database mode for Workin MVP.');
            useFallback = true;
            if (mysqlPool) {
                try { mysqlPool.end(); } catch (e) {}
                mysqlPool = null;
            }
        });
}

// Unified query wrapper
async function query(sql, params = []) {
    if (!useFallback && mysqlPool) {
        try {
            return await mysqlPool.query(sql, params);
        } catch (err) {
            console.warn('⚠️ MySQL query failed, executing via in-memory store:', err.message);
        }
    }
    return executeInMemory(sql, params);
}

function executeInMemory(sql, params) {
    const cleanSql = sql.trim();
    
    // --- LABOUR REGISTER ---
    if (cleanSql.startsWith('INSERT INTO labours')) {
        const [name, phone, skill, location, exp, status] = params;
        
        const existing = inMemoryData.labours.find(l => l.phone === phone);
        if (existing) {
            const err = new Error('Duplicate entry');
            err.code = 'ER_DUP_ENTRY';
            throw err;
        }

        const newLabour = {
            id: inMemoryData.nextLabourId++,
            name,
            phone,
            skill,
            location,
            experience_years: parseInt(exp) || 1,
            verification_status: status || 'Pending',
            created_at: new Date().toISOString()
        };
        inMemoryData.labours.unshift(newLabour);
        return [{ insertId: newLabour.id, affectedRows: 1 }];
    }

    // --- LABOUR LIST / SEARCH ---
    if (cleanSql.startsWith('SELECT * FROM labours')) {
        let list = [...inMemoryData.labours];
        
        if (cleanSql.includes('WHERE id = ?')) {
            const id = parseInt(params[0]);
            list = list.filter(l => l.id === id);
        } else if (cleanSql.includes('WHERE phone = ?')) {
            const phone = params[0];
            list = list.filter(l => l.phone === phone);
        } else {
            let paramIdx = 0;
            if (cleanSql.includes('LOWER(skill) LIKE ?')) {
                const s = params[paramIdx++]?.toLowerCase().replace(/%/g, '');
                if (s) list = list.filter(l => l.skill.toLowerCase().includes(s));
            }
            if (cleanSql.includes('LOWER(location) LIKE ?')) {
                const loc = params[paramIdx++]?.toLowerCase().replace(/%/g, '');
                if (loc) list = list.filter(l => l.location.toLowerCase().includes(loc));
            }
            if (cleanSql.includes("verification_status = 'Verified'")) {
                list = list.filter(l => l.verification_status === 'Verified');
            }
        }
        return [list];
    }

    // --- UPDATE LABOUR VERIFICATION ---
    if (cleanSql.startsWith('UPDATE labours SET verification_status')) {
        const status = params[0];
        const id = parseInt(params[1]);
        const target = inMemoryData.labours.find(l => l.id === id);
        if (target) {
            target.verification_status = status;
        }
        return [{ affectedRows: target ? 1 : 0 }];
    }

    // --- EMPLOYERS ---
    if (cleanSql.startsWith('INSERT INTO employers') || cleanSql.includes('employers')) {
        if (cleanSql.startsWith('SELECT * FROM employers WHERE phone')) {
            const phone = params[0];
            const found = inMemoryData.employers.filter(e => e.phone === phone);
            return [found];
        }
        if (cleanSql.startsWith('INSERT INTO employers')) {
            const [phone, contact_person, business_name, district] = params;
            const newEmp = {
                id: inMemoryData.nextEmployerId++,
                phone,
                contact_person,
                business_name: business_name || '',
                district: district || 'Dindigul',
                created_at: new Date().toISOString()
            };
            inMemoryData.employers.push(newEmp);
            return [{ insertId: newEmp.id, affectedRows: 1 }];
        }
    }

    // --- JOBS POST ---
    if (cleanSql.startsWith('INSERT INTO jobs')) {
        let employer_name, phone, skill_required, location, pay_rate, status, title, count, work_date, duration_days, location_name, district;

        if (params.length === 6) {
            [employer_name, phone, skill_required, location, pay_rate, status] = params;
            title = skill_required;
            count = 1;
            location_name = location;
            district = location;
            work_date = new Date().toISOString().slice(0, 10);
        } else {
            // Extended job insertion
            [employer_name, phone, title, skill_required, count, pay_rate, work_date, duration_days, location_name, district, status] = params;
        }

        const rate = parseFloat(pay_rate) || 600.00;
        const workerCount = parseInt(count) || 1;
        const subtotal = rate * workerCount;
        const fee = Math.round(subtotal * 0.08);
        const total = subtotal + fee;

        const newJob = {
            id: inMemoryData.nextJobId++,
            employer_name: employer_name || 'Employer',
            phone: phone || '9876543210',
            title: title || skill_required || 'General Help',
            skill_required: skill_required || 'catering',
            workers_needed: workerCount,
            per_worker_daily_rate: rate,
            pay_rate: rate,
            platform_fee: fee,
            bundled_total_price: total,
            work_date: work_date || new Date().toISOString().slice(0, 10),
            duration_days: parseInt(duration_days) || 1,
            location_name: location_name || location || 'Dindigul',
            location: district || location || 'Dindigul',
            district: district || location || 'Dindigul',
            status: status || 'OPEN',
            created_at: new Date().toISOString()
        };

        inMemoryData.jobs.unshift(newJob);
        return [{ insertId: newJob.id, affectedRows: 1 }];
    }

    // --- JOBS LIST / GET BY ID ---
    if (cleanSql.startsWith('SELECT * FROM jobs')) {
        let list = [...inMemoryData.jobs];
        if (cleanSql.includes('WHERE id = ?')) {
            const id = parseInt(params[0]);
            list = list.filter(j => j.id === id);
        } else if (cleanSql.includes('WHERE status = ?')) {
            const st = params[0];
            list = list.filter(j => j.status === st);
            if (cleanSql.includes('AND district = ?')) {
                const dist = params[1];
                if (dist && dist.toUpperCase() !== 'ALL') {
                    list = list.filter(j => j.district.toLowerCase() === dist.toLowerCase());
                }
            }
        }
        return [list];
    }

    return [[]];
}

module.exports = {
    query,
    isFallback: () => useFallback,
    getInMemoryState: () => inMemoryData
};

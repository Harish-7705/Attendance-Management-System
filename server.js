const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express(); // ✅ Initialize app before using it

// Use session middleware
app.use(session({
    secret: 'superSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // set secure:true if using https
}));
const cors = require('cors');
app.use(cors());  // Allow all origins


const PORT = 3000;


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Serve login page first
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Harish7705', 
    database: 'attendance_db',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error(' Database connection failed:', err.message);
        process.exit(1);
    }
    console.log(' Connected to MySQL Database');
});


// Get users in leave-master
app.get('/get-users', (req, res) => {
  db.query('SELECT userid FROM users;', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});
//Update leave in leave-master

app.post('/update-leave', (req, res) => {
  const { userid, leaveType, leaveCount } = req.body; // Get the payload from the request body

  // Validate input
  if (!userid || !leaveType || leaveCount === undefined) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  // Map of accepted input values (various synonyms) -> actual DB column names
  const leaveTypeMap = {
    'casual_leave': 'casual_leave',
    'casual leave': 'casual_leave',
    'casual': 'casual_leave',
    'cl': 'casual_leave',

    'earned_leave': 'earned_leave',
    'earned leave': 'earned_leave',
    'earned': 'earned_leave',
    'el': 'earned_leave',

    'sick_leave': 'sick_leave',
    'sick leave': 'sick_leave',
    'sick': 'sick_leave',
  'hospital leave': 'sick_leave',
  'hospital': 'sick_leave',
    'hl': 'sick_leave'
  };

  // Normalize incoming leaveType:
  // - remove any parenthesized content like "(CL)";
  // - remove punctuation;
  // - lowercase and collapse spaces so different variants map reliably
  const normalized = String(leaveType)
    .replace(/\(.*?\)/g, '')        // remove contents inside parentheses
    .replace(/[^a-zA-Z0-9\s]/g, '') // remove punctuation
    .toLowerCase()
    .trim();
  const normalizedKey = normalized.replace(/\s+/g, ' ');

  console.log('Normalized leaveType:', { original: leaveType, normalizedKey });

  const columnName = leaveTypeMap[normalizedKey];

  if (!columnName) {
    const allowed = Array.from(new Set(Object.values(leaveTypeMap))).join(', ');
    console.warn('Invalid leave type received:', leaveType, 'normalized->', normalizedKey);
    return res.status(400).json({ message: `Invalid leave type. Allowed: ${allowed}` });
  }

  console.log('Payload received:', { userid, leaveType, normalizedKey, columnName, leaveCount });

  // Use parameterized query but the column name must be interpolated after validation
  const sql = `UPDATE users SET \`${columnName}\` = ? WHERE userid = ?`;
  console.log('Executing SQL query:', sql, [leaveCount, userid]);

  db.query(sql, [leaveCount, userid], (err, result) => {
    if (err) {
      console.error('Error updating leave:', err.sqlMessage || err.message || err);
      return res.status(500).json({ message: 'Database error', error: err.sqlMessage || err.message });
    }

    if (result.affectedRows === 0) {
      console.log('No rows affected, user not found or update failed for userid:', userid);
      return res.status(404).json({ message: 'User not found or no changes made' });
    }

    console.log(`Successfully updated ${columnName} for ${userid}`);
    res.json({ message: `Successfully updated ${columnName} for ${userid}` });
  });
});

// ================= REPORTS ==================

//  app.post('/generate-report', (req, res) => {
//   const { department, employeeId, startDate, endDate } = req.body;
//   const user = req.session.user;
//   if (!user) {
//     return res.status(401).json({ error: 'User not logged in' });
//   }

//   // Base query: join leave_applications with users to get names and departments
//   let query = `
//     SELECT
//       l.employeeID AS employeeId,
//       u.username AS name,
//       u.department,
//       l.leave_type AS leaveType,
//       l.start_date AS startDate,
//       l.end_date AS endDate,
//       l.status,
//       l.reason
//     FROM
//       leave_applications l
//     JOIN
//       users u
//     ON
//       l.employeeID = u.userid
//     WHERE
//       l.start_date BETWEEN ? AND ?`;
//   const queryParams = [startDate, endDate];

//   // Managers can filter by department and employee
//   if (user.role === 'manager') {
//     if (department && department !== 'all') {
//       query += ' AND u.department = ?';
//       queryParams.push(department);
//     }
//     if (employeeId && employeeId !== 'All Employees') {
//       query += ' AND l.employeeID = ?';
//       queryParams.push(employeeId);
//     }
//   } else {
//     // Employees and admins can only see their own reports
//     query += ' AND l.employeeID = ?';
//     queryParams.push(user.id);
//   }

//   query += ' ORDER BY l.start_date DESC';

//   db.execute(query, queryParams, (err, results) => {
//     if (err) {
//       console.error('Error executing leave report query:', err);
//       return res.status(500).json({ error: 'Database query error' });
//     }
//     res.json(results);
//   });
// });
app.post('/generate-report', (req, res) => {
  const { reportType, department, employeeId, startDate, endDate } = req.body;
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  let query = '';
  let queryParams = [];

  // =====================================================
  // 1️⃣ ATTENDANCE REPORT
  // =====================================================
  if (reportType === 'attendance') {
    query = `
      SELECT
        u.userid AS employeeId,
        u.username AS name,
        u.department,
        a.start_time AS startTime,
        a.end_time AS endTime,
        a.hours_worked AS hoursWorked
      FROM
        attendance a
      JOIN
        users u ON a.user_id = u.userid
      WHERE
        a.start_time BETWEEN ? AND ?`;
    queryParams = [startDate, endDate];

    // Manager/admin-level filters: managers and admins may filter across employees
    if (user.role === 'manager' || user.role === 'admin') {
      if (department && department !== 'all') {
        query += ' AND u.department = ?';
        queryParams.push(department);
      }
      if (employeeId && employeeId !== 'All Employees') {
        query += ' AND a.user_id = ?';
        queryParams.push(employeeId);
      }
    } else {
      // Normal employees → see only own attendance
      query += ' AND a.user_id = ?';
      queryParams.push(user.id);
    }

    query += ' ORDER BY a.start_time DESC';
  }

  // =====================================================
  // 2️⃣ LEAVE REPORT
  // =====================================================
  else if (reportType === 'leave') {
    query = `
      SELECT
        l.employeeID AS employeeId,
        u.username AS name,
        u.department,
        l.leave_type AS leaveType,
        l.start_date AS startDate,
        l.end_date AS endDate,
        l.no_of_days AS noOfDays,
        l.status,
        l.reason,
        l.away_hq AS awayHq
      FROM
        leave_applications l
      JOIN
        users u ON l.employeeID = u.userid
      WHERE
        l.start_date BETWEEN ? AND ?`;
    queryParams = [startDate, endDate];

    if (user.role === 'manager' || user.role === 'admin') {
      if (department && department !== 'all') {
        query += ' AND u.department = ?';
        queryParams.push(department);
      }
      if (employeeId && employeeId !== 'All Employees') {
        query += ' AND l.employeeID = ?';
        queryParams.push(employeeId);
      }
    } else {
      query += ' AND l.employeeID = ?';
      queryParams.push(user.id);
    }

    query += ' ORDER BY l.start_date DESC';
  }

  else {
    return res.status(400).json({ error: 'Invalid report type' });
  }

  // =====================================================
  // Execute Query
  // =====================================================
  db.execute(query, queryParams, (err, results) => {
    if (err) {
      console.error('Error executing report query:', err);
      return res.status(500).json({ error: 'Database query error' });
    }
    res.json(results);
  });
});



app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = `
        SELECT * FROM users
        WHERE (username = ? OR email = ?) AND password = ?
    `;

    db.query(query, [username, username, password], (err, results) => {
        if (err) {
            console.error(' Error querying database:', err);
            return res.status(500).send('Internal server error');
        }

        if (results.length > 0) {
            const user = results[0];
             // ✅ Save logged in user to session
            req.session.user = {
                id: user.userid,       // e.g. "E01"
                role: user.role,        // employee / manager
                username: user.username
            };
            // res.json({
            //   success:true,
            //   userId:user.user_id,
            //   role:user.role
            // });

            console.log(`Login success for: ${user.username || user.email}, role: ${user.role}`);

            if (user.role === 'admin') {
                return res.redirect('/Admin_Main.html');
            } else if (user.role === 'manager') {
                return res.redirect('/manager.html');
            } else if (user.role === 'employee') {
                return res.redirect('/employee.html');
            } else {
                return res.send('<h2>Role not recognized</h2><a href="/">Go back</a>');
            }
        } else {
            console.log(` Invalid login attempt for: ${username}`);
           return res.send('<h2>Invalid username/email or password</h2><a href="/">Go back</a>');
        }
    });
});

// ================= EMPLOYEE APIs ==================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// ================= EMPLOYEE APIs ==================

// Add new employee
app.post("/addEmployee", (req, res) => {
    const {
        userid,
        username,
        dob,
        doj,
        email,
        phone,
        address,
        department,
        designation,
        employee_type,
        status,
        password,
        role //  now coming from the form!
    } = req.body;

    if (!userid || !username || !designation || !status || !password || !role) {
        return res.status(400).json({ message: "Required fields missing" });
    }
 


    const cleanRole = req.body.role?.trim().toLowerCase() || "employee"; // this n

    const sql = `
        INSERT INTO users
        (userid, username, dob, doj, email, phone, address, department, designation, employee_type, status, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        userid,
        username,
        dob || null,
        doj || null,
        email || null,
        phone || null,
        address || null,
        department || null,
        designation || null,
        employee_type || null,
        status,
        password,
        cleanRole // ✅ use form role
    ];

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("❌ Error adding employee:", err.sqlMessage);
            return res.status(500).json({
                message: "Error adding employee",
                error: err.sqlMessage
            });
        }

        console.log("✅ Employee added successfully with role:", cleanRole);
        res.redirect("/manager.html");
    });
});


// Fetch all employees
app.get("/employees", (req, res) => {
    const sql = "SELECT * FROM users ORDER BY id ASC";

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Error fetching employees:", err);
            return res.status(500).json({ message: "Error fetching employees" });
        }

        return res.json(results);
    });
});

// const cors = require("cors");
// app.use(cors());
app.get("/api/users/count", (req, res) => {
    const sql = "SELECT COUNT(*) AS total FROM users";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching count:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ total: result[0].total });
    });
});

app.get("/api/leave/pending-count", (req, res) => {
    const sql = "SELECT COUNT(*) AS total_pending FROM leave_applications WHERE status = 'pending'";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching pending leave count:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(result[0]);
    });
});

app.post("/api/leave", (req, res) => {
  console.log("Incoming Leave Payload:", req.body);

  const { leave_type, start_date, end_date, reason, no_of_days, away_hq } = req.body;

  if (!leave_type || !start_date || !end_date || !reason || !no_of_days) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const employeeID = req.session.user?.id;
  if (!employeeID) {
    return res.status(401).json({ success: false, message: "User not logged in" });
  }

  const sql = `
    INSERT INTO leave_applications 
    (employeeID, leave_type, start_date, end_date, reason, no_of_days, status, away_hq)
    VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
  `;

  db.query(sql, [employeeID, leave_type, start_date, end_date, reason, no_of_days, away_hq || 'no'], (err, result) => {
    if (err) {
      console.error("SQL Error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to submit leave",
        error: err.message,
      });
    }

    console.log("✅ Leave Application Inserted:", result);
    res.json({
      success: true,
      message: "Leave application submitted successfully",
      leave_id: result.insertId,
      employeeID,
      status: "Pending",
    });
  });
});



app.get('/api/leavesS', (req, res) => {
   const userId = req.session.user.id;
   console.log('Logged-in userId:', userId);


  const sql = 'SELECT * FROM leave_applications where employeeId=? ORDER BY id DESC';

  db.query(sql, [userId],(err, results) => {
    if (err) {
      console.error('SQL Error:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(results);
  });
});

//============leave approval==================
// Get all leaves
app.get("/api/Leaves", (req, res) => {
  const sql = `
    SELECT * 
    FROM leave_applications 
    ORDER BY FIELD(status, 'Pending', 'Approved', 'Rejected')
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json(results);
  });
});
//Testing
app.get('/api/leaves', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leaves_applications');
    res.json(rows); // ✅ frontend expects an array
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching leaves' });
  }
});

// Update leave status and reduce leave balance
app.post("/api/Leaves/update", (req, res) => {
  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ success: false, message: "Missing id or status" });
  }

  // Step 1: Get leave info first
  const getLeaveSql = "SELECT employeeID, leave_type, start_date, end_date, status FROM leave_applications WHERE id = ?";
  db.query(getLeaveSql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    if (results.length === 0) return res.status(400).json({ success: false, message: "Leave not found" });

    const leave = results[0];
    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: "Leave already processed" });
    }

    // Calculate number of days
    const startDate = new Date(leave.start_date);
    const endDate = new Date(leave.end_date);
    const leaveDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Step 2: Update leave status
    const updateStatusSql = "UPDATE leave_applications SET status = ? WHERE id = ?";
    db.query(updateStatusSql, [status, id], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: "DB error" });

      // Step 3: Reduce leave count only if approved
      if (status === 'Approved') {
        // Map leave type to correct column name
        let columnName;
        switch (leave.leave_type.trim().toLowerCase()) {
          case 'sick':
          case 'sick leave':
            columnName = 'sick_leave';
            break;
          case 'casual':
          case 'casual leave':
            columnName = 'casual_leave';
            break;
          case 'earned':
          case 'earned leave':
            columnName = 'earned_leave';
            break;
          default:
            return res.status(400).json({ success: false, message: `Invalid leave type: ${leave.leave_type}` });
        }
        const deductSql = `
          UPDATE users
          SET \`${columnName}\` = GREATEST(\`${columnName}\` - ?, 0)
          WHERE userid = ?
        `;
        // Debug logs
        console.log('--- LEAVE BALANCE UPDATE DEBUG ---');
        console.log('columnName:', columnName);
        console.log('leaveDays:', leaveDays);
        console.log('userid:', leave.employeeID);
        console.log('deductSql:', deductSql);
        console.log('params:', [leaveDays, leave.employeeID]);
        db.query(deductSql, [leaveDays, leave.employeeID], (err, result) => {
          if (err) {
            console.error('Error reducing leave balance:', err.sqlMessage || err.message, err);
            return res.status(500).json({ success: false, message: "Error reducing leave balance", error: err.sqlMessage || err.message });
          }
          return res.json({ success: true, message: "Leave approved and balance updated" });
        });
      } else {
        return res.json({ success: true, message: "Leave rejected successfully" });
      }
    });
  });
});

app.post('/clockin', (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ error: 'User not logged in' });
  }
  const userId = req.session.user.id;

  // Check if the user already clocked in
  const checkSql = 'SELECT * FROM attendance WHERE user_id = ? AND end_time IS NULL';
  db.query(checkSql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    if (rows.length > 0) {
      // User already clocked in
      return res.status(400).json({ error: 'You have already clocked in and not clocked out yet.' });
    }

    // No active clock-in, insert new record
    const sql = 'INSERT INTO attendance (user_id, start_time) VALUES (?, NOW())';
    db.query(sql, [userId], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Return the inserted start_time
      db.query('SELECT start_time FROM attendance WHERE id=?', [result.insertId], (err3, rows2) => {
        if (err3) return res.status(500).json({ error: err3.message });

        res.json({ start_time: rows2[0].start_time });
      });
    });
  });
});


// Clock Out
app.post('/clockout', (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ error: 'User not logged in' });
  }
  const userId = req.session.user.id;

  // Find the active attendance row for this user
  const findSql = `SELECT id, start_time FROM attendance WHERE user_id = ? AND end_time IS NULL ORDER BY id DESC LIMIT 1`;
  db.query(findSql, [userId], (err, rows) => {
    if (err) {
      console.error('Error finding active attendance row:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'No active clock-in found' });
    }

    const attendanceId = rows[0].id;

    // Update that row: set end_time = NOW() and compute hours_worked using TIMESTAMPDIFF
    const updateSql = `
      UPDATE attendance
      SET end_time = NOW(), hours_worked = ROUND(TIMESTAMPDIFF(SECOND, start_time, NOW())/3600, 2)
      WHERE id = ?
    `;

    db.query(updateSql, [attendanceId], (err2, result) => {
      if (err2) {
        console.error('Error updating attendance end_time/hours_worked:', err2);
        return res.status(500).json({ error: err2.message });
      }

      // Return the persisted attendance row (with hours_worked)
      const fetchSql = `SELECT id, start_time, end_time, hours_worked FROM attendance WHERE id = ?`;
      db.query(fetchSql, [attendanceId], (err3, rows3) => {
        if (err3) {
          console.error('Error fetching updated attendance row:', err3);
          return res.status(500).json({ error: err3.message });
        }
        return res.json(rows3[0]);
      });
    });
  });
});


app.get('/summary', (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ error: 'User not logged in' });
  }
  const userId = req.session.user.id;

  const sql = `SELECT 
    ROUND(SUM(hours_worked), 2) AS hours_worked
FROM (
    SELECT 
        start_time, 
        end_time,
        IF(end_time IS NOT NULL, 
            ROUND(TIMESTAMPDIFF(SECOND, start_time, end_time)/3600, 2),
            0
        ) AS hours_worked
    FROM attendance
    WHERE user_id = ? 
      AND DATE(start_time) = CURDATE()
) AS sub
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      // Default if no attendance today
      return res.json({
        start_time: null,
        end_time: null,
        hours_worked: 0
      });
    }

    // Normalize the response
    const { start_time, end_time, hours_worked } = rows[0];
    res.json({ start_time, end_time, hours_worked });
  });
});

// Return today's attendance logs for the logged-in user
app.get('/api/attendance', (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ error: 'User not logged in' });
  }
  const userId = req.session.user.id;
  const sql = `
    SELECT id, start_time, end_time,
      ROUND(IF(end_time IS NOT NULL, TIMESTAMPDIFF(SECOND, start_time, end_time)/3600, 0), 2) AS hours_worked
    FROM attendance
    WHERE user_id = ? AND DATE(start_time) = CURDATE()
    ORDER BY id DESC
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching attendance logs:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});


// ===================== Company Holidays API =====================

// Get all holidays
app.get('/holidays', (req, res) => {
  db.query('SELECT * FROM holidays ORDER BY date ASC', (err, results) => {
    if (err) {
      console.error('Error fetching holidays:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get single holiday by id
app.get('/holidays/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM holidays WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error fetching holiday by id:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.json(results[0]);
  });
});

// Add a new holiday
app.post('/holidays', (req, res) => {
  const { year, date, name } = req.body;
  if (!year || !date || !name) {
    return res.status(400).json({ error: 'All fields required' });
  }
  // Check for duplicate date
  db.query('SELECT id FROM holidays WHERE date = ?', [date], (err, results) => {
    if (err) {
      console.error('Error checking for duplicate holiday:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results && results.length > 0) {
      return res.status(400).json({ error: 'A holiday already exists for this date.' });
    }
    // No duplicate, proceed to insert
    db.query(
      'INSERT INTO holidays (year, date, name) VALUES (?, ?, ?)',
      [year, date, name],
      (err2, result) => {
        if (err2) {
          console.error('Error adding holiday:', err2);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Holiday added', id: result.insertId });
      }
    );
  });
});

// Delete a holiday
app.delete('/holidays/:id', (req, res) => {
  db.query('DELETE FROM holidays WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      console.error('Error deleting holiday:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Holiday deleted' });
  });
});
// Update or edit a holiday
app.put('/holidays/:id', (req, res) => {
  const { year, date, name } = req.body;
  const id = req.params.id;

  console.log('PUT /holidays/%s payload:', id, { year, date, name });

  if (!year || !date || !name) {
    console.warn('PUT /holidays/%s missing fields', id);
    return res.status(400).json({ error: 'Missing fields' });
  }

  db.query(
    'UPDATE holidays SET year=?, date=?, name=? WHERE id=?',
    [year, date, name, id],
    (err, result) => {
      if (err) {
        console.error('Error updating holiday:', err.sqlMessage || err.message || err);
        return res.status(500).json({ error: err.sqlMessage || err.message || 'Database error' });
      }
      if (result.affectedRows === 0) {
        console.warn('PUT /holidays/%s no rows affected', id);
        return res.status(404).json({ error: 'Holiday not found' });
      }
      console.log('Holiday updated for id:', id);
      res.json({ message: 'Holiday updated' });
    }
  );
});


app.get('/employees', (req, res) => {
    const sql = 'SELECT * FROM users ORDER BY id ASC';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching employees:', err);
            return res.status(500).json({ message: 'Error fetching employees' });
        }

        return res.json(results);
    });
});

app.get('/employee/:id', (req, res) => {
    const empId = req.params.id;
    const sql = 'SELECT * FROM users WHERE userid = ?'; // adjust table/column names

    db.query(sql, [empId], (err, results) => {
        if (err) {
            console.error('Error fetching employee:', err.message);
            return res.status(500).json({ error: 'Database query failed' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Send back the first row (or format however you need)
        res.json(results[0]);
    });
});

//load username
app.get('/user/profile', (req, res) => {
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sql = 'SELECT username, role FROM users where userid=?;';

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { username, role } = results[0];
    res.json({ username, role });
  });
});



// Frontend script.js code to render employees
app.post("/update", (req, res) => {
  const { id, status } = req.body;

  // Step 1: Update leave status
  const updateStatusSQL = "UPDATE leave_applications SET status = ? WHERE id = ?";
  db.query(updateStatusSQL, [status, id], (err) => {
    if (err) {
      console.error("❌ Error updating leave status:", err);
      return res.status(500).json({
        success: false,
        message: "Error updating leave status",
        error: err.sqlMessage || err.message,
      });
    }

    if (status !== "Approved") {
      console.log("ℹ️ Leave status updated (no deduction):", status);
      return res.json({ success: true, message: "Leave status updated (no deduction)" });
    }

    // Step 2: Fetch leave details
    const getLeaveSQL = "SELECT employeeID, leave_type, no_of_days FROM leave_applications WHERE id = ?";
    db.query(getLeaveSQL, [id], (err, results) => {
      if (err) {
        console.error("❌ Error fetching leave details:", err);
        return res.status(500).json({
          success: false,
          message: "Error fetching leave details",
          error: err.sqlMessage || err.message,
        });
      }

      if (results.length === 0) {
        console.warn("⚠️ No leave found for ID:", id);
        return res.status(404).json({ success: false, message: "Leave not found" });
      }

      const { employeeID, leave_type, no_of_days } = results[0];
      const days = parseInt(no_of_days, 10);
      if (isNaN(days)) {
        console.error("❌ Invalid number of leave days:", no_of_days);
        return res.status(400).json({ success: false, message: "Invalid number of leave days" });
      }

      // Use leave_type directly but normalize it
      const columnName = leave_type.trim().toLowerCase().replace(" ", "_") + "_leave";

      // Safety: check against allowed columns
      const allowedColumns = ["sick_leave", "casual_leave", "earned_leave"];
      if (!allowedColumns.includes(columnName)) {
        console.error("❌ Invalid leave type or column:", leave_type, "->", columnName);
        return res.status(400).json({
          success: false,
          message: `Invalid leave type: '${leave_type}'`,
        });
      }

      console.log("🔎 Leave details:", { id, employeeID, leave_type, no_of_days });
      console.log("➡️ Column to deduct from:", columnName);

      // Step 3: Get user and check current balance
      const userCheckSQL = `SELECT userid, \`${columnName}\` AS current_balance FROM users WHERE userid = ?`;
      db.query(userCheckSQL, [employeeID], (err, userRows) => {
        if (err) {
          console.error("❌ Error checking user balance:", err);
          return res.status(500).json({
            success: false,
            message: "Error checking user balance",
            error: err.sqlMessage || err.message,
          });
        }

        if (userRows.length === 0) {
          console.warn("⚠️ User not found:", employeeID);
          return res.status(404).json({
            success: false,
            message: `No user found with userid = ${employeeID}`,
          });
        }

        console.log("👤 User before deduction:", userRows[0]);

        // Step 4: Deduct leave
        const updateLeaveSQL = `
          UPDATE users
          SET \`${columnName}\` = CASE
            WHEN \`${columnName}\` - ? < 0 THEN 0
            ELSE \`${columnName}\` - ?
          END
          WHERE userid = ?
        `;
        const params = [days, days, employeeID];

        console.log("📝 Executing SQL:", updateLeaveSQL.trim());
        console.log("📦 With Params:", params);

        db.query(updateLeaveSQL, params, (err, result) => {
          if (err) {
            console.error("❌ SQL error during deduction:", err.sqlMessage || err.message);
            return res.status(500).json({
              success: false,
              message: "Error reducing leave balance",
              error: err.sqlMessage || err.message,
            });
          }

          if (result.affectedRows === 0) {
            console.warn("⚠️ Deduction skipped — no rows affected.");
            return res.status(400).json({
              success: false,
              message: `No deduction made for userid = ${employeeID}`,
            });
          }

          console.log("✅ Leave successfully deducted for:", employeeID);
          return res.json({
            success: true,
            message: "Leave approved and balance updated successfully",
          });
        });
      });
    });
  });
});





//  Get logged-in user info (like userid)
app.get("/api/getUser", (req, res) => {
  if (req.session && req.session.user) {
    res.json({ userid: req.session.user.id });  // sends the userid to frontend
  } else {
    res.status(401).json({ error: "User not logged in" });
  }
});


//Getting the employee leave remaning details
// Example: server.js or index.js

app.get("/api/leaveBalance/:userid", (req, res) => {
  const userID = req.session.user?.id;  

  const sql = "SELECT casual_leave, sick_leave, earned_leave FROM users WHERE userid = ?";
  
  db.query(sql, [userID], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Return leave balance
    res.json({
      success: true,
      data: results[0]
    });
  });
});

//TO get data in the dashboard
//  Get leave balances for a specific user
app.get("/leave-balances/:userid", (req, res) => {
  const { userid } = req.params;

  if (!userid) {
    return res.status(400).json({ success: false, message: "Missing userid" });
  }

  const sql = `
    SELECT casual_leave, earned_leave, sick_leave
    FROM users
    WHERE userid = ?
  `;

  db.query(sql, [userid], (err, results) => {
    if (err) {
      console.error("❌ Error fetching leave balances:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching leave balances",
        error: err.sqlMessage || err.message,
      });
    }

    if (!results.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = results[0];
    res.json({
      success: true,
      data: {
        userid: user.userid,
        casual_leave: user.casual_leave ?? 0,
        earned_leave: user.earned_leave ?? 0,
        sick_leave: user.sick_leave ?? 0,
      },
    });
  });
});

app.get('/api/userids', (req, res) => {
  const query = "SELECT userid FROM users"; // Assuming "userid" is the column containing employee codes

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching user IDs:', err);
      return res.status(500).json({ error: "Error fetching user IDs" });
    }

    console.log('Fetched results from DB:', results);  // Log results to ensure data is being fetched

    // If no user IDs were found in the database
    if (!results || results.length === 0) {
      return res.status(404).json({ error: "No user IDs found" });
    }

    // Send the array of user IDs (employee codes) directly to the frontend
    const userIds = results.map(r => r.userid);
    console.log(`/api/userids -> returning ${userIds.length} user IDs`);  // Log the count of user IDs
    res.json(userIds); // Send array of user IDs (employee codes) to the frontend
  });
});
app.get('/api/current/userids/:userid', (req, res) => {
  const requestedUserId = req.params.userid;
  console.log("Fetching user data for:", { requestedUserId });

  // Validate the requested user ID
  if (!requestedUserId) {
    console.warn("No userid provided in URL");
    return res.status(400).json({ success: false, message: "Missing userid parameter" });
  }

  // Query to fetch user details including username and role for validation
  const query = `
    SELECT userid, username, role, department
    FROM users 
    WHERE userid = ?
  `;

  db.query(query, [requestedUserId], (err, results) => {
    if (err) {
      console.error('Error fetching user IDs:', err);
      return res.status(500).json({ error: "Error fetching user IDs" });
    }

    if (!results || results.length === 0) {
      console.warn(`No user found with ID: ${requestedUserId}`);
      return res.status(404).json({ error: "No user IDs found" });
    }

    // Return full user details (except sensitive fields)
    const user = results[0];
    const safeUserData = {
      userid: user.userid,
      username: user.username,
      department: user.department,
      role: user.role
    };
    
    console.log(`Returning user data for ${requestedUserId}:`, safeUserData);
    return res.json({ 
      success: true, 
      user: safeUserData
    });
  });
});

//FOr leave master
app.get('/api/leave-balances', (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  let query;
  let params = [];
  if (user.role === 'manager') {
    query = 'SELECT userid, casual_leave, earned_leave, sick_leave FROM users';
  } else {
    query = 'SELECT userid, casual_leave, earned_leave, sick_leave FROM users WHERE userid = ?';
    params = [user.id];
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('MySQL error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const response = [];
    const leaveDescriptions = {
      'Casual Leave (CL)': 'Casual leave for personal reasons',
      'Earned Leave (EL)': 'Earned leave accumulated over time',
      'Hospital Leave (HL)': 'Leave for hospitalization'
    };

    results.forEach(row => {
      response.push({
        empId: row.userid,
        leaveType: 'Casual Leave (CL)',
        description: leaveDescriptions['Casual Leave (CL)'],
        balance: row.casual_leave
      });
      response.push({
        empId: row.userid,
        leaveType: 'Earned Leave (EL)',
        description: leaveDescriptions['Earned Leave (EL)'],
        balance: row.earned_leave
      });
      response.push({
        empId: row.userid,
        leaveType: 'Hospital Leave (HL)',
        description: leaveDescriptions['Hospital Leave (HL)'],
        balance: row.sick_leave
      });
    });

    res.json(response);
  });
});





// ==================================================
app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
});


import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, ".env") });

const { Pool } = pkg;
const app = express();
const port = 5001;
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const isStrongPassword = (password = "") => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return strongRegex.test(password);
};

const PASSWORD_REQUIREMENTS =
  "Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters.";

// Test email connection on startup
transporter.verify(function (error, success) {
  if (process.env.NODE_ENV === "development") {
    console.log("✅ Email server is ready to send messages");
  }
});

const auth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, "mysecretkey", (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });

    console.log("Decoded token:", decoded);
    req.user = decoded;
    next();
  });
};

app.post("/send-verification", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email already exists
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old codes for this email
    await pool.query("DELETE FROM verification_codes WHERE email = $1", [
      email,
    ]);

    // Insert new code
    await pool.query(
      "INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)",
      [email, code, expiresAt]
    );

    // Send email
    await transporter.sendMail({
      from: '"Castillo Children Clinic" <your-email@gmail.com>',
      to: email,
      subject: "Email Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0284c7;">Welcome to Castillo Children Clinic!</h2>
          <p>Your verification code is:</p>
          <div style="background: #f0f9ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #0284c7; font-size: 36px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "Verification code sent to your email" });
  } catch (err) {
    console.error("Error sending verification:", err);
    res.status(500).json({ error: "Failed to send verification code" });
  }
});

// 🔹 STEP 2: Verify Code & Complete Signup
app.post("/verify-and-signup", async (req, res) => {
  const {
    email,
    code,
    full_name,
    password,
    birth_date,
    gender,
    address,
    father_name,
    mother_name,
    guardian,
    phone_number,
    guardian_number,
    blood_type,
    chronic_conditions,
    allergies,
  } = req.body;

  try {
    // Basic validation
    if (!email || !code || !full_name || !password || !birth_date || !gender) {
      return res
        .status(400)
        .json({ error: "All required fields must be filled" });
    }

    // Verify code
    const verification = await pool.query(
      "SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > NOW()",
      [email, code]
    );

    if (verification.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: PASSWORD_REQUIREMENTS });
    }

    // Hash password
    const hashedPass = await bcrypt.hash(password, 10);

    // Get next QR code
    const lastQR = await pool.query(
      "SELECT qr_code FROM users WHERE qr_code IS NOT NULL ORDER BY user_id DESC LIMIT 1"
    );

    let nextQR = "PAT001";
    if (lastQR.rows.length > 0) {
      const lastCode = lastQR.rows[0].qr_code;
      const num = parseInt(lastCode.replace("PAT", ""), 10);
      const nextNum = num + 1;
      nextQR = `PAT${String(nextNum).padStart(3, "0")}`;
    }

    // Insert into users table
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password, role, qr_code, birth_date, gender, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING user_id, full_name, role, qr_code, birth_date, gender`,
      [full_name, email, hashedPass, "patient", nextQR, birth_date, gender]
    );

    const user = result.rows[0];

    // Insert patient profile
    await pool.query(
      `INSERT INTO patient_profiles
        (user_id, address, father_name, mother_name, guardian, phone_number, guardian_number, blood_type, chronic_conditions, allergies)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        user.user_id,
        address || null,
        father_name || null,
        mother_name || null,
        guardian || null,
        phone_number || null,
        guardian_number || null,
        blood_type || null,
        chronic_conditions || null,
        allergies || null,
      ]
    );

    // Delete used verification code
    await pool.query("DELETE FROM verification_codes WHERE email = $1", [
      email,
    ]);

    // Create JWT token
    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      "mysecretkey",
      { expiresIn: "1h" }
    );

    res.json({
      token,
      role: user.role,
      full_name: user.full_name,
      qr_code: user.qr_code,
      birth_date: user.birth_date,
      gender: user.gender,
      message: "✅ Signup successful! Account verified.",
    });
  } catch (err) {
    console.error("Error during signup:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// 🔑 SIGNUP (default role: patient)
// 🔑 SIGNUP (default role: patient)
app.post("/signup", async (req, res) => {
  const {
    full_name,
    email,
    password,
    birth_date,
    gender,
    address,
    father_name,
    mother_name,
    guardian,
    phone_number,
    guardian_number,
    blood_type,
    chronic_conditions,
    allergies,
  } = req.body;

  try {
    // Basic validation for core user fields
    if (!full_name || !email || !password || !birth_date || !gender) {
      return res
        .status(400)
        .json({ error: "All required fields must be filled" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: PASSWORD_REQUIREMENTS });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    // ✅ Step 1: Get the last QR code used
    const lastQR = await pool.query(
      "SELECT qr_code FROM users WHERE qr_code IS NOT NULL ORDER BY user_id DESC LIMIT 1"
    );

    let nextQR = "PAT001"; // Default if no previous record

    if (lastQR.rows.length > 0) {
      const lastCode = lastQR.rows[0].qr_code; // e.g., "PAT005"
      const num = parseInt(lastCode.replace("PAT", ""), 10);
      const nextNum = num + 1;
      nextQR = `PAT${String(nextNum).padStart(3, "0")}`;
    }

    // ✅ Step 2: Insert into `users` table
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password, role, qr_code, birth_date, gender, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING user_id, full_name, role, qr_code, birth_date, gender`,
      [full_name, email, hashedPass, "patient", nextQR, birth_date, gender]
    );

    const user = result.rows[0];

    // ✅ Step 3: Insert additional patient details into `patient_profiles`
    await pool.query(
      `INSERT INTO patient_profiles
        (user_id, address, father_name, mother_name, guardian, phone_number, guardian_number, blood_type, chronic_conditions, allergies)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        user.user_id,
        address || null,
        father_name || null,
        mother_name || null,
        guardian || null,
        phone_number || null,
        guardian_number || null,
        blood_type || null,
        chronic_conditions || null,
        allergies || null,
      ]
    );

    // ✅ Step 4: Create JWT token
    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      "mysecretkey",
      { expiresIn: "1h" }
    );

    // ✅ Step 5: Send back response
    res.json({
      token,
      role: user.role,
      full_name: user.full_name,
      qr_code: user.qr_code,
      birth_date: user.birth_date,
      gender: user.gender,
      message: "Signup successful, patient profile created!",
    });
  } catch (err) {
    console.error("Error during signup:", err.message);
    res.status(500).send("Server Error");
  }
});

// 🔑 LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: Find user in 'users' table
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0)
      return res.status(400).json({ msg: "Invalid credentials" });

    const user = result.rows[0];
    console.log("User from database:", user);

    // Step 2: Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Step 3: Create token
    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      "mysecretkey",
      { expiresIn: "1h" }
    );

    let patient = null;

    // Step 4: If role is 'patient', fetch from 'patients' table
    if (user.role === "patient") {
      const patientResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      if (patientResult.rows.length > 0) {
        patient = patientResult.rows[0];
      } else {
        console.warn(`⚠️ No patient record found for ${email}`);
      }
    }

    // Step 5: Return token + data
    res.json({ token, role: user.role, full_name: user.full_name, patient });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// DOCTOR SIGNUP FOR STAFF (CREATE USER)
app.post("/users", async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    // Validate required fields
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING user_id, full_name, email, role",
      [full_name, email, hashedPassword, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// GET Users
app.get("/users", async (req, res) => {
  try {
    const role = req.query.role;
    let query = "SELECT user_id, full_name, email, role FROM users";
    let params = [];

    if (role) {
      query += " WHERE LOWER(role) = LOWER($1)";
      params.push(role);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE User (Fixed route path)
app.put("/users/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { full_name, email, password } = req.body;

    // Validate required fields
    if (!full_name || !email) {
      return res
        .status(400)
        .json({ error: "Full name and email are required" });
    }

    let query, params;

    // If password is provided, hash it and update
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      query =
        "UPDATE users SET full_name = $1, email = $2, password = $3 WHERE user_id = $4 RETURNING user_id, full_name, email, role";
      params = [full_name, email, hashedPassword, user_id];
    } else {
      // Update without password
      query =
        "UPDATE users SET full_name = $1, email = $2 WHERE user_id = $3 RETURNING user_id, full_name, email, role";
      params = [full_name, email, user_id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE User
app.delete("/users/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      "DELETE FROM users WHERE user_id = $1 RETURNING user_id",
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User deleted successfully",
      user_id: result.rows[0].user_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// ✅ POST /appointments
app.post("/appointments", auth, async (req, res) => {
  try {
    const { date, time, type, concerns, additional_services } = req.body;
    const userId = req.user.id;

    if (!date || !time || !type) {
      return res.status(400).json({
        error: "Please fill in all required fields (date, time, type).",
      });
    }

    // ✅ Default additional_services to "None" if not provided
    const additionalServicesValue = additional_services || "None";

    // ✅ Match the exact column order: status before concerns
    await pool.query(
      `INSERT INTO appointments 
       (user_id, appointment_date, appointment_time, appointment_type, status, concerns, additional_services)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
      [userId, date, time, type, concerns || "", additionalServicesValue]
    );

    res.json({ message: "Appointment booked successfully!" });
  } catch (error) {
    console.error("❌ Error booking appointment:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET appointments for logged-in user
app.get("/get/appointments", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT * FROM appointments WHERE user_id = $1 ORDER BY appointment_date, appointment_time",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// GET all appointments with patient info
app.get("/appointments/nurse", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.appointment_type, a.concerns,
          a.status, a.additional_services, u.full_name, u.email
   FROM appointments a
   JOIN users u ON a.user_id = u.user_id
   ORDER BY a.appointment_date, a.appointment_time`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 🩺 GET specific patient profile by user_id
app.get("/patients/:user_id/profile", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        u.user_id, 
        u.full_name, 
        u.email, 
        u.birth_date, 
        u.gender, 
        u.role,
        p.guardian,
        p.guardian_number,
        p.phone_number,
        p.address,
        p.blood_type,
        p.allergies,
        p.chronic_conditions,
        p.father_name,
        p.mother_name
      FROM users u
      LEFT JOIN patient_profiles p ON u.user_id = p.user_id
      WHERE u.user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient profile not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching patient profile:", err.message);
    res
      .status(500)
      .json({ error: "Server error while fetching patient profile" });
  }
});

app.get("/appointments/doctor", auth, async (req, res) => {
  try {
    console.log("Fetching appointments for today...");

    const result = await pool.query(
      `SELECT a.appointment_id, 
              a.appointment_date::text as appointment_date,
              a.appointment_time::text as appointment_time,
              a.appointment_type, 
              a.status, 
              u.full_name, 
              u.email
       FROM appointments a
       JOIN users u ON a.user_id = u.user_id
       WHERE LOWER(a.status) = 'approved'
         AND a.appointment_date::date = CURRENT_DATE
       ORDER BY a.appointment_time`
    );

    console.log("Query result:", result.rows);

    // Additional processing to ensure consistent format
    const processedRows = result.rows.map((row) => ({
      ...row,
      appointment_date: row.appointment_date.split("T")[0], // Ensure YYYY-MM-DD format
      appointment_time: row.appointment_time.substring(0, 8), // Ensure HH:MM:SS format
    }));

    console.log("Processed rows:", processedRows);
    res.json(processedRows);
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});
// Update status (approve/completed/canceled)
app.put("/appointments/:id/status", auth, async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    // Normalize status to capitalize first letter
    if (status) {
      status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    // Allow: Approved, Completed, Canceled, Pending
    const validStatuses = ["Approved", "Completed", "Canceled", "Pending"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error:
          "Invalid status. Allowed: Approved, Completed, Canceled, Pending",
      });
    }

    const result = await pool.query(
      "UPDATE appointments SET status = $1 WHERE appointment_id = $2 RETURNING appointment_id, status",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json(result.rows[0]); // return only id and status
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete appointment
app.delete("/appointments/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM appointments WHERE appointment_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json({ message: "Appointment deleted", id });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔒 Middleware para sa protected routes
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token, access denied" });

  try {
    const decoded = jwt.verify(token, "mysecretkey");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
}

// Get all products - FIXED ROUTE with  prefix
app.get("/inventory", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM inventory ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Add product - FIXED ROUTE with  prefix
app.post("/inventory/add", async (req, res) => {
  const { name, stock } = req.body;
  if (!name || stock == null)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await pool.query(
      "INSERT INTO inventory (name, stock) VALUES ($1, $2) RETURNING *",
      [name, stock]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Update product - FIXED ROUTE with  prefix
app.put("/inventory/update/:inventory_id", async (req, res) => {
  const { inventory_id } = req.params;
  const { name, stock } = req.body;
  if (!name || stock == null)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await pool.query(
      "UPDATE inventory SET name = $1, stock = $2 WHERE inventory_id = $3 RETURNING *",
      [name, stock, inventory_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product - FIXED ROUTE with  prefix
app.delete("/inventory/:inventory_id", async (req, res) => {
  const { inventory_id } = req.params;
  try {
    await pool.query("DELETE FROM inventory WHERE inventory_id = $1", [
      inventory_id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.get("/patients", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          a.appointment_id,
          a.appointment_date::text AS appointment_date,
          a.appointment_time::text AS appointment_time,
          a.appointment_type,       -- ✅ added this line
          a.status,
          u.full_name,
          u.email,
          u.birth_date,
          m.weight,
          m.height,
          m.temperature,
          m.pulse_rate,
          m.diagnosis,
          m.remarks
       FROM appointments a
       JOIN users u ON a.user_id = u.user_id
       LEFT JOIN medical_records m ON a.appointment_id = m.appointment_id
       WHERE LOWER(a.status) = 'completed'
       ORDER BY a.appointment_date DESC`
    );

    const processedRows = result.rows.map((row) => ({
      ...row,
      appointment_date: row.appointment_date.split("T")[0],
      appointment_time: row.appointment_time.substring(0, 8),
    }));

    res.json(processedRows);
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Route: Get all appointments with patient full_name
// GET route for nurse dashboard
app.get("/appointments/nurse", async (req, res) => {
  try {
    const query = `
      SELECT 
        a.appointment_id,
        a.user_id,
        u.full_name,
        a.appointment_date AS date,
        a.appointment_time AS time,
        a.appointment_type,
        a.status,
        a.concerns,
        a.created_at
      FROM appointments a
      JOIN users u ON a.user_id = u.user_id
      ORDER BY a.appointment_date ASC, a.appointment_time ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching appointments for nurse:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📅 Get current patient's latest approved appointment
app.get("/appointments/latest-approved", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 🔍 Fetch the most recent approved appointment for the logged-in patient
    const result = await pool.query(
      `
      SELECT 
        a.appointment_id,
        a.appointment_date::text AS appointment_date,
        a.appointment_time::text AS appointment_time,
        a.appointment_type,
        a.concerns,
        a.status,
        u.full_name,
        u.email
      FROM appointments a
      JOIN users u ON a.user_id = u.user_id
      WHERE a.user_id = $1
        AND LOWER(a.status) = 'approved'
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 1
      `,
      [userId]
    );

    // ❌ No approved appointment found
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No approved appointment found." });
    }

    // ✅ Format for cleaner output
    const appointment = result.rows[0];
    const formatted = {
      appointment_id: appointment.appointment_id,
      appointment_date: appointment.appointment_date.split("T")[0],
      appointment_time: appointment.appointment_time.substring(0, 8),
      appointment_type: appointment.appointment_type,
      concerns: appointment.concerns,
      status: appointment.status,
      full_name: appointment.full_name,
      email: appointment.email,
    };

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching latest approved appointment:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/patients/add", auth, async (req, res) => {
  const {
    full_name,
    email,
    password,
    birth_date,
    gender,
    guardian,
    guardian_number,
    phone_number,
    address,
    blood_type,
    allergies,
    chronic_conditions,
    mother_name,
    father_name,
  } = req.body;

  try {
    // ✅ Validation
    if (!full_name || !email || !password || !birth_date || !gender) {
      return res.status(400).json({
        message: "Please fill all required fields",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS });
    }

    // ✅ Check if email already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    // ✅ Hash password
    const hashedPass = await bcrypt.hash(password, 10);

    // ✅ Generate next QR code
    const lastQR = await pool.query(
      "SELECT qr_code FROM users WHERE qr_code IS NOT NULL ORDER BY user_id DESC LIMIT 1"
    );

    let nextQR = "PAT001";
    if (lastQR.rows.length > 0) {
      const lastCode = lastQR.rows[0].qr_code;
      const num = parseInt(lastCode.replace("PAT", ""), 10);
      const nextNum = num + 1;
      nextQR = `PAT${String(nextNum).padStart(3, "0")}`;
    }

    // ✅ Insert into users table
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password, role, qr_code, birth_date, gender, created_at)
       VALUES ($1, $2, $3, 'patient', $4, $5, $6, NOW())
       RETURNING user_id, full_name, email, qr_code`,
      [full_name, email, hashedPass, nextQR, birth_date, gender]
    );

    const user = result.rows[0];

    // ✅ Insert into patient_profiles table
    await pool.query(
      `INSERT INTO patient_profiles
        (user_id, address, father_name, mother_name, guardian, phone_number, guardian_number, blood_type, chronic_conditions, allergies)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user.user_id,
        address || null,
        father_name || null,
        mother_name || null,
        guardian || null,
        phone_number || null,
        guardian_number || null,
        blood_type || null,
        chronic_conditions || null,
        allergies || null,
      ]
    );

    res.status(201).json({
      message: "Patient added successfully!",
      patient: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        qr_code: user.qr_code,
      },
    });
  } catch (err) {
    console.error("Error adding patient:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// 📍 GET patient info + latest vitals by QR code
app.get("/patients/qr/:qr_code", async (req, res) => {
  try {
    const { qr_code } = req.params;
    console.log("🔍 Scanned QR received:", qr_code);

    // 1️⃣ Find the patient by QR code
    const userResult = await pool.query(
      `SELECT 
         user_id AS id, 
         full_name AS name, 
         birth_date, 
         gender,
         qr_code
       FROM users
       WHERE LOWER(qr_code) = LOWER(TRIM($1))`,
      [qr_code]
    );

    if (userResult.rows.length === 0) {
      console.log("❌ No patient found for QR:", qr_code);
      return res.status(404).json({ error: "Patient not found" });
    }

    const user = userResult.rows[0];

    // 🧮 Compute age from birth_date (if available)
    let age = null;
    if (user.birth_date) {
      const birth = new Date(user.birth_date);
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    // 2️⃣ Get the latest medical record (height, weight, diagnosis, remarks)
    const recordResult = await pool.query(
      `SELECT 
         m.weight, 
         m.height, 
         m.diagnosis, 
         m.remarks,
         m.created_at
       FROM medical_records m
       JOIN appointments a ON m.appointment_id = a.appointment_id
       WHERE a.user_id = $1
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [user.id]
    );

    const record = recordResult.rows[0] || {};

    // 3️⃣ Combine and send JSON response
    const response = {
      id: user.id,
      name: user.name,
      birth_date: user.birth_date,
      age: age,
      gender: user.gender || null,
      qr_code: user.qr_code,
      weight: record.weight || null,
      height: record.height || null,
      diagnosis: record.diagnosis || null,
      remarks: record.remarks || null,
      last_updated: record.created_at || null,
    };

    console.log("✅ Sending response:", response);
    res.json(response);
  } catch (err) {
    console.error("⚠️ Error fetching patient QR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 📍 GET latest vitals for a patient using appointment link
app.get("/vitals", async (req, res) => {
  try {
    const { patient_id } = req.query;
    console.log("🧩 Received patient_id:", patient_id);

    if (!patient_id) {
      return res.status(400).json({ error: "Missing patient_id" });
    }

    const result = await pool.query(
      `
      SELECT 
        mr.weight,
        mr.height,
        mr.diagnosis,
        mr.remarks,
        mr.created_at
      FROM medical_records mr
      JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE a.user_id = $1
      ORDER BY mr.created_at DESC
      LIMIT 1
      `,
      [patient_id]
    );

    console.log("✅ Query result:", result.rows);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No vitals found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("⚠️ Error fetching vitals:", err.stack);
    res.status(500).json({ error: "Unexpected error", details: err.message });
  }
});

// 🩺 Save or update medical record
app.post("/medical-records", auth, async (req, res) => {
  try {
    let {
      appointment_id,
      weight,
      height,
      diagnosis,
      remarks,
      temperature,
      pulse_rate,
    } = req.body;

    // ✅ Convert empty strings to null (for numeric columns)
    weight = weight === "" ? null : weight;
    height = height === "" ? null : height;
    temperature = temperature === "" ? null : temperature;
    pulse_rate = pulse_rate === "" ? null : pulse_rate;

    const check = await pool.query(
      "SELECT * FROM medical_records WHERE appointment_id = $1",
      [appointment_id]
    );

    let result;
    if (check.rows.length > 0) {
      // ✅ Update existing record
      result = await pool.query(
        `UPDATE medical_records
         SET weight=$1, height=$2, diagnosis=$3, remarks=$4,
             temperature=$5, pulse_rate=$6, updated_at=NOW()
         WHERE appointment_id=$7 RETURNING *`,
        [
          weight,
          height,
          diagnosis,
          remarks,
          temperature,
          pulse_rate,
          appointment_id,
        ]
      );
    } else {
      // ✅ Insert new record
      result = await pool.query(
        `INSERT INTO medical_records 
         (appointment_id, weight, height, diagnosis, remarks, temperature, pulse_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          appointment_id,
          weight,
          height,
          diagnosis,
          remarks,
          temperature,
          pulse_rate,
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error saving medical record:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🧾 Get all medical records for logged-in patient
app.get("/patient/medical-records", auth, async (req, res) => {
  try {
    console.log("req.user:", req.user);
    const userId = req.user.id; // ✅ Correct field from token

    if (!userId) {
      return res.status(400).json({ error: "User ID not found in token" });
    }

    const result = await pool.query(
      `SELECT 
        a.appointment_id,
        a.appointment_date::text AS appointment_date,
        a.appointment_time::text AS appointment_time,
        a.appointment_type,       
        a.user_id,
        u.full_name,
        u.email,
        u.birth_date, 
        m.weight,
        m.height,
        m.temperature,
        m.pulse_rate,
        m.diagnosis,
        m.remarks,
        m.created_at,
        m.updated_at
      FROM appointments a
      JOIN users u ON a.user_id = u.user_id
      JOIN medical_records m ON a.appointment_id = m.appointment_id
      WHERE a.user_id = $1 
        AND LOWER(a.status) = 'completed'
      ORDER BY a.appointment_date DESC`,
      [userId]
    );

    const processedRows = result.rows.map((row) => ({
      ...row,
      appointment_date:
        row.appointment_date?.split("T")[0] || row.appointment_date,
      appointment_time: row.appointment_time?.substring(0, 8) || null,
    }));

    res.json(processedRows);
  } catch (err) {
    console.error("Error fetching patient medical records:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔎 Search medical records by unique identifiers for import
app.post("/patient/medical-records/import/search", auth, async (req, res) => {
  try {
    const { mother_name, father_name } = req.body || {};

    if (!mother_name && !father_name) {
      return res
        .status(400)
        .json({ error: "Either mother_name or father_name is required" });
    }

    // Fetch logged-in user's full name to ensure strict match
    const currentUser = await pool.query(
      "SELECT full_name FROM users WHERE user_id = $1",
      [req.user.id]
    );
    if (currentUser.rows.length === 0) {
      return res.status(404).json({ error: "Current user not found" });
    }
    const currentFullName = currentUser.rows[0].full_name;

    const result = await pool.query(
      `
      SELECT 
        a.appointment_id,
        a.appointment_date::text AS appointment_date,
        a.appointment_time::text AS appointment_time,
        a.appointment_type,
        a.concerns,
        a.additional_services,
        u.full_name,
        u.user_id,
        m.weight,
        m.height,
        m.temperature,
        m.pulse_rate,
        m.diagnosis,
        m.remarks,
        m.created_at,
        m.updated_at
      FROM users u
      LEFT JOIN patient_profiles p ON u.user_id = p.user_id
      JOIN appointments a ON a.user_id = u.user_id
      LEFT JOIN medical_records m ON m.appointment_id = a.appointment_id
      WHERE TRIM(LOWER(u.full_name)) = TRIM(LOWER($1))
        AND (
          ($2::text IS NOT NULL AND TRIM(LOWER(p.mother_name)) = TRIM(LOWER($2::text)))
          OR
          ($3::text IS NOT NULL AND TRIM(LOWER(p.father_name)) = TRIM(LOWER($3::text)))
        )
        AND LOWER(a.status) = 'completed'
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `,
      [currentFullName, mother_name || null, father_name || null]
    );

    // Check which records are already imported for the current user
    const currentUserId = req.user.id;
    const existingRecords = await pool.query(
      `
      SELECT 
        a.appointment_date::text AS appointment_date,
        a.appointment_time::text AS appointment_time,
        a.appointment_type,
        m.diagnosis,
        m.weight,
        m.height
      FROM appointments a
      JOIN medical_records m ON m.appointment_id = a.appointment_id
      WHERE a.user_id = $1
        AND LOWER(a.status) = 'completed'
      `,
      [currentUserId]
    );

    // Helper function to format date safely
    const formatDate = (dateValue) => {
      if (!dateValue) return "";
      if (typeof dateValue === "string") {
        return dateValue.split("T")[0];
      }
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split("T")[0];
      }
      return String(dateValue).split("T")[0] || "";
    };

    // Helper function to format time safely
    const formatTime = (timeValue) => {
      if (!timeValue) return "";
      if (typeof timeValue === "string") {
        return timeValue.substring(0, 8);
      }
      return String(timeValue).substring(0, 8) || "";
    };

    // Create a set of imported record signatures for quick lookup
    // Use date, time, type, and diagnosis as the unique identifier
    const importedSignatures = new Set(
      existingRecords.rows.map((r) => {
        const date = formatDate(r.appointment_date);
        const time = formatTime(r.appointment_time);
        const type = r.appointment_type || "";
        const diagnosis = r.diagnosis || "";
        return `${date}|${time}|${type}|${diagnosis}`;
      })
    );

    // Return minimal, useful fields for the client UI with import status
    const rows = result.rows.map((r) => {
      const date = formatDate(r.appointment_date);
      const time = formatTime(r.appointment_time);
      const type = r.appointment_type || "";
      const diagnosis = r.diagnosis || "";
      const signature = `${date}|${time}|${type}|${diagnosis}`;
      const isImported = importedSignatures.has(signature);

      return {
        appointment_id: r.appointment_id,
        appointment_date: date,
        appointment_time: time,
        appointment_type: r.appointment_type,
        full_name: r.full_name,
        diagnosis: r.diagnosis,
        weight: r.weight,
        height: r.height,
        is_imported: isImported,
      };
    });

    res.json(rows);
  } catch (err) {
    console.error("Error searching import medical records:", err.message);
    res.status(500).json({ error: "Server error during search" });
  }
});

// ⬇️ Import selected medical records into the current account
app.post("/patient/medical-records/import", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { record_ids } = req.body || {};

    if (!Array.isArray(record_ids) || record_ids.length === 0) {
      return res
        .status(400)
        .json({ error: "record_ids must be a non-empty array" });
    }

    await client.query("BEGIN");

    // Fetch source appointments + medical records to be imported
    const src = await client.query(
      `
      SELECT 
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.appointment_type,
        a.concerns,
        a.additional_services,
        a.status,
        m.weight,
        m.height,
        m.temperature,
        m.pulse_rate,
        m.diagnosis,
        m.remarks
      FROM appointments a
      JOIN medical_records m ON m.appointment_id = a.appointment_id
      WHERE a.appointment_id = ANY($1::int[])
        AND LOWER(a.status) = 'completed'
      `,
      [record_ids]
    );

    if (src.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "No completed records found to import" });
    }

    let importedCount = 0;

    for (const row of src.rows) {
      // Create a new appointment for the current user, copying essential fields
      const insertAppt = await client.query(
        `
        INSERT INTO appointments
          (user_id, appointment_date, appointment_time, appointment_type, status, concerns, additional_services)
        VALUES
          ($1, $2, $3, $4, 'completed', $5, $6)
        RETURNING appointment_id
        `,
        [
          userId,
          row.appointment_date,
          row.appointment_time,
          row.appointment_type,
          row.concerns || "",
          row.additional_services || "None",
        ]
      );

      const newAppointmentId = insertAppt.rows[0].appointment_id;

      // Copy the medical record to the new appointment
      await client.query(
        `
        INSERT INTO medical_records
          (appointment_id, weight, height, temperature, pulse_rate, diagnosis, remarks, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `,
        [
          newAppointmentId,
          row.weight ?? null,
          row.height ?? null,
          row.temperature ?? null,
          row.pulse_rate ?? null,
          row.diagnosis ?? null,
          row.remarks ?? null,
        ]
      );

      importedCount += 1;
    }

    await client.query("COMMIT");
    res.json({ message: "Import successful", imported: importedCount });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error importing medical records:", err.message);
    res.status(500).json({ error: "Server error during import" });
  } finally {
    client.release();
  }
});

// Record a sale
app.post("/sales", async (req, res) => {
  const { inventory_id, quantity } = req.body;
  if (!inventory_id || !quantity) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    await pool.query("BEGIN");

    // Check stock
    const check = await pool.query(
      "SELECT stock FROM inventory WHERE inventory_id = $1",
      [inventory_id]
    );

    if (check.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }

    const currentStock = check.rows[0].stock;
    if (currentStock < quantity) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough stock" });
    }

    // Deduct stock
    await pool.query(
      "UPDATE inventory SET stock = stock - $1 WHERE inventory_id = $2",
      [quantity, inventory_id]
    );

    // Insert sale record
    const result = await pool.query(
      "INSERT INTO sales (inventory_id, quantity) VALUES ($1, $2) RETURNING *",
      [inventory_id, quantity]
    );

    await pool.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to record sale" });
  }
});

app.get("/sales/summary", async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT i.name, SUM(s.quantity) as total_sold
        FROM sales s
        JOIN inventory i ON s.inventory_id = i.inventory_id
        GROUP BY i.name
        ORDER BY total_sold DESC
      `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sales summary" });
  }
});

app.get("/analytics", auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    const selectedMonth = month && month !== "all" ? parseInt(month) : null;
    const selectedDiagnosis =
      req.query.diagnosis && req.query.diagnosis !== "all"
        ? req.query.diagnosis
        : null;

    // Get available years from appointments
    const availableYearsResult = await pool.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM appointment_date) AS year
      FROM appointments
      ORDER BY year DESC
    `);
    const availableYears = availableYearsResult.rows.map((r) =>
      parseInt(r.year)
    );

    // Get available months for selected year
    const availableMonthsResult = await pool.query(`
      SELECT DISTINCT EXTRACT(MONTH FROM appointment_date) AS month
      FROM appointments
      WHERE EXTRACT(YEAR FROM appointment_date) = ${selectedYear}
      ORDER BY month
    `);
    const availableMonths = availableMonthsResult.rows.map((r) =>
      parseInt(r.month)
    );

    // Build date filter conditions
    let dateFilter = `EXTRACT(YEAR FROM appointment_date) = ${selectedYear}`;
    let medicalRecordDateFilter = `EXTRACT(YEAR FROM a.appointment_date) = ${selectedYear}`;

    if (selectedMonth) {
      dateFilter += ` AND EXTRACT(MONTH FROM appointment_date) = ${selectedMonth}`;
      medicalRecordDateFilter += ` AND EXTRACT(MONTH FROM a.appointment_date) = ${selectedMonth}`;
    }

    // Total Appointments (filtered)
    const totalAppointments = await pool.query(`
      SELECT COUNT(*) AS total
      FROM appointments
      WHERE ${dateFilter};
    `);

    // Most Common Appointment Type (filtered)
    const commonType = await pool.query(`
      SELECT appointment_type, COUNT(*) AS count
      FROM appointments
      WHERE ${dateFilter}
      GROUP BY appointment_type
      ORDER BY count DESC
      LIMIT 1;
    `);

    // Most Common Diagnosis (filtered)
    const commonDiagnosis = await pool.query(`
      SELECT diagnosis, COUNT(*) AS count
      FROM medical_records mr
      JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE ${medicalRecordDateFilter}
        AND diagnosis IS NOT NULL AND diagnosis != ''
      GROUP BY diagnosis
      ORDER BY count DESC
      LIMIT 1;
    `);

    // Total Appointment Trend (always by month for selected year)
    const appointmentTrend = await pool.query(`
      SELECT EXTRACT(MONTH FROM appointment_date) AS month, COUNT(*) AS total
      FROM appointments
      WHERE EXTRACT(YEAR FROM appointment_date) = ${selectedYear}
      GROUP BY month
      ORDER BY month;
    `);

    // Top Diagnosis Per Month (always by month for selected year)
    const diagnosisTrend = await pool.query(`
      WITH ranked_diagnoses AS (
        SELECT 
          EXTRACT(MONTH FROM a.appointment_date) AS month,
          mr.diagnosis,
          COUNT(*) AS count,
          ROW_NUMBER() OVER (PARTITION BY EXTRACT(MONTH FROM a.appointment_date) ORDER BY COUNT(*) DESC) AS rank
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.appointment_id
        WHERE EXTRACT(YEAR FROM a.appointment_date) = ${selectedYear}
          AND mr.diagnosis IS NOT NULL 
          AND mr.diagnosis != ''
        GROUP BY month, mr.diagnosis
      )
      SELECT month, diagnosis, count
      FROM ranked_diagnoses
      WHERE rank = 1
      ORDER BY month;
    `);

    // Top Appointment Type Per Month (always by month for selected year)
    const appointmentTypeTrend = await pool.query(`
      WITH ranked_types AS (
        SELECT 
          EXTRACT(MONTH FROM appointment_date) AS month,
          appointment_type,
          COUNT(*) AS count,
          ROW_NUMBER() OVER (PARTITION BY EXTRACT(MONTH FROM appointment_date) ORDER BY COUNT(*) DESC) AS rank
        FROM appointments
        WHERE EXTRACT(YEAR FROM appointment_date) = ${selectedYear}
        GROUP BY month, appointment_type
      )
      SELECT month, appointment_type, count
      FROM ranked_types
      WHERE rank = 1
      ORDER BY month;
    `);

    // Inventory Usage (filtered by year and month)
    let inventoryUsage = { rows: [] };
    try {
      const inventoryDateFilter = selectedMonth
        ? `AND EXTRACT(YEAR FROM s.sale_date) = ${selectedYear} AND EXTRACT(MONTH FROM s.sale_date) = ${selectedMonth}`
        : `AND EXTRACT(YEAR FROM s.sale_date) = ${selectedYear}`;

      inventoryUsage = await pool.query(`
        SELECT i.name, SUM(s.quantity) as total_sold
        FROM sales s
        JOIN inventory i ON s.inventory_id = i.inventory_id
        WHERE 1=1 ${inventoryDateFilter}
        GROUP BY i.name
        ORDER BY total_sold DESC
        LIMIT 10
      `);
    } catch (inventoryError) {
      console.log("Inventory/Sales tables not found, skipping inventory usage");
    }

    // Get all available diagnoses for filter dropdown
    const allDiagnoses = await pool.query(`
      SELECT DISTINCT diagnosis
      FROM medical_records mr
      JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE diagnosis IS NOT NULL AND diagnosis != ''
      ORDER BY diagnosis
    `);

    // Diagnosis Time Trend (filtered by specific diagnosis or all)
    let diagnosisTimeTrend = { rows: [] };

    if (selectedMonth) {
      // Show daily trend when a specific month is selected
      const diagnosisFilter = selectedDiagnosis
        ? `AND mr.diagnosis = '${selectedDiagnosis.replace(/'/g, "''")}'`
        : "";

      diagnosisTimeTrend = await pool.query(`
        SELECT 
          EXTRACT(DAY FROM a.appointment_date) AS day,
          COUNT(*) AS count
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.appointment_id
        WHERE ${medicalRecordDateFilter}
          AND mr.diagnosis IS NOT NULL 
          AND mr.diagnosis != ''
          ${diagnosisFilter}
        GROUP BY day
        ORDER BY day
      `);
    } else {
      // Show monthly trend when viewing full year
      const diagnosisFilter = selectedDiagnosis
        ? `AND mr.diagnosis = '${selectedDiagnosis.replace(/'/g, "''")}'`
        : "";

      diagnosisTimeTrend = await pool.query(`
        SELECT 
          EXTRACT(MONTH FROM a.appointment_date) AS month,
          COUNT(*) AS count
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.appointment_id
        WHERE EXTRACT(YEAR FROM a.appointment_date) = ${selectedYear}
          AND mr.diagnosis IS NOT NULL 
          AND mr.diagnosis != ''
          ${diagnosisFilter}
        GROUP BY month
        ORDER BY month
      `);
    }

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    res.json({
      // Metadata
      availableYears,
      availableMonths,

      // Filtered KPIs
      totalAppointments: parseInt(totalAppointments.rows[0]?.total || 0),
      commonAppointmentType: commonType.rows[0]?.appointment_type || "N/A",
      commonDiagnosis: commonDiagnosis.rows[0]?.diagnosis || "N/A",

      // Always by month for selected year
      appointmentTrend: appointmentTrend.rows.map((r) => ({
        month: parseInt(r.month),
        total: parseInt(r.total),
      })),
      diagnosisTrend: diagnosisTrend.rows.map((r) => ({
        month: parseInt(r.month),
        diagnosis: r.diagnosis,
        count: parseInt(r.count),
      })),
      appointmentTypeTrend: appointmentTypeTrend.rows.map((r) => ({
        month: parseInt(r.month),
        appointment_type: r.appointment_type,
        count: parseInt(r.count),
      })),

      // Filtered inventory
      inventoryUsage: inventoryUsage.rows || [],

      // Diagnosis filter data
      allDiagnoses: allDiagnoses.rows.map((r) => r.diagnosis),
      diagnosisTimeTrend: diagnosisTimeTrend.rows.map((r) => {
        if (selectedMonth) {
          // Daily view
          return {
            period: parseInt(r.day),
            period_label: `${monthNames[selectedMonth - 1]} ${
              r.day
            }, ${selectedYear}`,
            count: parseInt(r.count),
          };
        } else {
          // Monthly view
          return {
            period: monthNames[parseInt(r.month) - 1],
            period_label: `${
              monthNames[parseInt(r.month) - 1]
            } ${selectedYear}`,
            count: parseInt(r.count),
          };
        }
      }),
    });
  } catch (err) {
    console.error("Analytics Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Helper function
function getMonthName(monthNum) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[monthNum - 1] || "";
}
app.get("/patient/user-info", auth, async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from JWT token
    console.log("📥 Fetching user info for user_id:", userId);

    const result = await pool.query(
      `
      SELECT 
        user_id,
        full_name,
        email,
        qr_code,
        gender,
        birth_date,
        role,
        created_at
      FROM users
      WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      console.warn("⚠️ No user found for ID:", userId);
      return res.status(404).json({ message: "User not found." });
    }

    console.log("✅ User info fetched successfully for user_id:", userId);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching user info:", err.message);
    res.status(500).json({ message: "Server error fetching user info." });
  }
});

// 📍 GET /patient/profile-data
// ✅ Returns the patient_profiles record linked to the logged-in user
app.get("/patient/profile-data", auth, async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from JWT middleware

    console.log("📥 Fetching profile for user_id:", userId);

    const result = await pool.query(
      `
      SELECT 
        p.user_id,
        p.gender,
        p.father_name,
        p.mother_name,
        p.guardian,
        p.phone_number,
        p.guardian_number,
        p.address,
        p.blood_type,
        p.allergies,
        p.chronic_conditions,
        p.created_at,
        u.full_name,
        u.email,
        u.qr_code,
        u.role
      FROM patient_profiles p
      INNER JOIN users u ON p.user_id = u.user_id
      WHERE p.user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      console.warn("⚠️ No patient profile found for user_id:", userId);
      return res
        .status(404)
        .json({ message: "No patient profile found for this user." });
    }

    console.log("✅ Patient profile fetched successfully for user_id:", userId);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching patient profile:", err.message);
    res.status(500).json({ message: "Server error fetching patient profile." });
  }
});

// 📍 GET latest completed appointment for logged-in patient
app.get("/patient/last-checkup", auth, async (req, res) => {
  try {
    const userId = req.user.id; // ✅ from JWT

    const result = await pool.query(
      `
      SELECT appointment_date
      FROM appointments
      WHERE user_id = $1 AND status = 'Completed'
      ORDER BY appointment_date DESC
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No completed appointments found." });
    }

    // ✅ Convert UTC timestamp to local (Philippine) date only
    const lastCheckup = result.rows[0].appointment_date;
    const formattedDate = new Date(lastCheckup).toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    }); // → e.g. "2025-10-13"

    res.json({ last_checkup: formattedDate });
  } catch (err) {
    console.error("❌ Error fetching last checkup:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching last checkup." });
  }
});

// 📍 POST (update or insert) patient profile
app.post("/patient/profile", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      address,
      father_name,
      mother_name,
      guardian,
      guardian_number,
      phone_number,
      blood_type,
      chronic_conditions,
      allergies,
      last_checkup,
    } = req.body;

    // ✅ Update or insert patient profile (gender/birth_date stay in users table)
    const result = await pool.query(
      `INSERT INTO patient_profiles 
        (user_id, address, father_name, mother_name, guardian, guardian_number, phone_number, blood_type, chronic_conditions, allergies, last_checkup)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (user_id) 
       DO UPDATE SET
         address = EXCLUDED.address,
         father_name = EXCLUDED.father_name,
         mother_name = EXCLUDED.mother_name,
         guardian = EXCLUDED.guardian,
         guardian_number = EXCLUDED.guardian_number,
         phone_number = EXCLUDED.phone_number,
         blood_type = EXCLUDED.blood_type,
         chronic_conditions = EXCLUDED.chronic_conditions,
         allergies = EXCLUDED.allergies,
         last_checkup = EXCLUDED.last_checkup
       RETURNING *`,
      [
        userId,
        address,
        father_name,
        mother_name,
        guardian,
        guardian_number,
        phone_number,
        blood_type,
        chronic_conditions,
        allergies,
        last_checkup,
      ]
    );

    res.json({
      message: "Profile saved successfully!",
      profile: result.rows[0],
    });
  } catch (err) {
    console.error("Error saving patient profile:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Generate AI Insights Endpoint
app.post("/generate-insights", async (req, res) => {
  try {
    const { chartType, data, context } = req.body;

    // Validate input
    if (!chartType || !data || !context) {
      return res.status(400).json({
        error: "Missing required fields: chartType, data, or context",
      });
    }

    // Create a simple, concise prompt
    const prompt = `Analyze this ${chartType} data briefly:

${JSON.stringify(data, null, 2)}

Context: ${context}

Give me 3-4 SHORT insights using simple words. Make each point 1 sentence only. Focus on what's important and what to do.`;

    // Call Google Gemini API (using gemini-2.0-flash - stable version)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 250,
            candidateCount: 1,
            stopSequences: [],
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);

      // Handle specific error cases
      if (response.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please try again in a moment.",
        });
      }

      if (response.status === 401) {
        return res.status(500).json({
          error: "Invalid API key. Please check your Gemini API configuration.",
        });
      }

      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();

    // Log the full response for debugging
    console.log("Gemini API Response:", JSON.stringify(result, null, 2));

    // Extract the generated text with better error handling
    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];

      // Check if content and parts exist
      if (
        candidate.content &&
        candidate.content.parts &&
        candidate.content.parts.length > 0
      ) {
        const insights = candidate.content.parts[0].text;

        res.json({
          insights,
          success: true,
        });
      } else if (candidate.finishReason === "MAX_TOKENS") {
        // Handle MAX_TOKENS error
        throw new Error(
          "Response was too long and got cut off. Please try again with a smaller dataset."
        );
      } else if (candidate.finishReason === "SAFETY") {
        // Handle safety filter
        throw new Error(
          "Content was blocked by safety filters. Please try with different data."
        );
      } else {
        console.error("No parts in response. Candidate:", candidate);
        throw new Error("No content generated - response may be empty");
      }
    } else if (result.error) {
      console.error("Gemini API returned error:", result.error);
      throw new Error(result.error.message || "Gemini API error");
    } else {
      console.error("No candidates in response:", result);
      throw new Error("No insights generated - empty response");
    }
  } catch (error) {
    console.error("Generate Insights Error:", error);
    res.status(500).json({
      error: "Failed to generate insights. Please try again.",
      details: error.message,
    });
  }
});

app.post("/walkin", async (req, res) => {
  const { fullName, gender, age, contactPerson, contactNumber } = req.body;

  if (!fullName || !gender || !age || !contactPerson || !contactNumber) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const result = await pool.query(
    `INSERT INTO walkin_patients (full_name, gender, age, contact_person, contact_number)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id`,
    [fullName, gender, age, contactPerson, contactNumber]
  );

  res
    .status(201)
    .json({ message: "Saved successfully", id: result.rows[0].id });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

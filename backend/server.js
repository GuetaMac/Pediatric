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

// 🔹 FORGOT PASSWORD - Send Code
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email exists
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "Email not found" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old codes
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
      subject: "Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0284c7;">Password Reset Request</h2>
          <p>You requested to reset your password. Use this code:</p>
          <div style="background: #fef3c7; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #d97706; font-size: 36px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "Reset code sent to your email" });
  } catch (err) {
    console.error("Error sending reset code:", err);
    res.status(500).json({ error: "Failed to send reset code" });
  }
});

// 🔹 VERIFY CODE & RESET PASSWORD
app.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    // Check verification code
    const codeCheck = await pool.query(
      "SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > NOW()",
      [email, code]
    );

    if (codeCheck.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query("UPDATE users SET password = $1 WHERE email = $2", [
      hashedPassword,
      email,
    ]);

    // Delete used code
    await pool.query("DELETE FROM verification_codes WHERE email = $1", [
      email,
    ]);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ error: "Failed to reset password" });
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
  const client = await pool.connect();
  try {
    const { patient_id } = req.params;
    const {
      pulse_rate,
      temperature,
      height,
      weight,
      diagnosis,
      remarks,
      appointment_id: providedAppointmentId,
    } = req.body;

    const pid = parseInt(patient_id, 10);
    if (isNaN(pid)) {
      client.release();
      return res.status(400).json({ error: "Invalid patient_id" });
    }

    // Ensure patient exists
    const userCheck = await client.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [pid]
    );
    if (userCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "Patient not found" });
    }

    await client.query("BEGIN");

    // Priority 1: If client provided an appointment_id, try to use it (but do not change status)
    let appointmentIdToUse = null;
    if (providedAppointmentId) {
      const apCheck = await client.query(
        "SELECT appointment_id, status FROM appointments WHERE appointment_id = $1 AND user_id = $2",
        [providedAppointmentId, pid]
      );
      if (apCheck.rows.length > 0) {
        appointmentIdToUse = apCheck.rows[0].appointment_id;
      }
    }

    // Priority 2: Find an existing approved appointment for today
    if (!appointmentIdToUse) {
      const approvedToday = await client.query(
        `SELECT appointment_id FROM appointments
         WHERE user_id = $1 AND LOWER(status) = 'approved' AND appointment_date::date = CURRENT_DATE
         ORDER BY appointment_date DESC, appointment_time DESC LIMIT 1`,
        [pid]
      );
      if (approvedToday.rows.length > 0) {
        appointmentIdToUse = approvedToday.rows[0].appointment_id;
      }
    }

    // Priority 3: Find any other approved appointment (most recent)
    if (!appointmentIdToUse) {
      const approvedAny = await client.query(
        `SELECT appointment_id FROM appointments
         WHERE user_id = $1 AND LOWER(status) = 'approved'
         ORDER BY appointment_date DESC, appointment_time DESC LIMIT 1`,
        [pid]
      );
      if (approvedAny.rows.length > 0) {
        appointmentIdToUse = approvedAny.rows[0].appointment_id;
      }
    }

    // If still none, create a new appointment marked as Approved (walk-in)
    let createdAppointment = false;
    if (!appointmentIdToUse) {
      // Get current time in HH:MM:SS format from the Node.js server (client's timezone)
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const appt = await client.query(
        `INSERT INTO appointments
           (user_id, appointment_date, appointment_time, appointment_type, status, concerns, additional_services, created_at)
         VALUES ($1, NOW()::date, $2::time, 'Walk-in', 'Approved', '', 'None', NOW())
         RETURNING appointment_id`,
        [pid, currentTime]
      );
      appointmentIdToUse = appt.rows[0].appointment_id;
      createdAppointment = true;
    }

    // Upsert medical record for the chosen appointment: update if exists, otherwise insert
    const existingMR = await client.query(
      "SELECT * FROM medical_records WHERE appointment_id = $1",
      [appointmentIdToUse]
    );

    let mrResult;
    if (existingMR.rows.length > 0) {
      // Update: preserve existing values when the field is not present in the request
      const cur = existingMR.rows[0];
      const has = (k) => Object.prototype.hasOwnProperty.call(req.body, k);

      const weightToSet = has("weight")
        ? weight === ""
          ? null
          : weight
        : cur.weight;
      const heightToSet = has("height")
        ? height === ""
          ? null
          : height
        : cur.height;
      const temperatureToSet = has("temperature")
        ? temperature === ""
          ? null
          : temperature
        : cur.temperature;
      const pulseRateToSet = has("pulse_rate")
        ? pulse_rate === ""
          ? null
          : pulse_rate
        : cur.pulse_rate;
      const diagnosisToSet = has("diagnosis")
        ? diagnosis === ""
          ? null
          : diagnosis
        : cur.diagnosis;
      const remarksToSet = has("remarks")
        ? remarks === ""
          ? null
          : remarks
        : cur.remarks;

      const upd = await client.query(
        `UPDATE medical_records SET
           weight = $1,
           height = $2,
           temperature = $3,
           pulse_rate = $4,
           diagnosis = $5,
           remarks = $6,
           updated_at = NOW()
         WHERE appointment_id = $7 RETURNING *`,
        [
          weightToSet,
          heightToSet,
          temperatureToSet,
          pulseRateToSet,
          diagnosisToSet,
          remarksToSet,
          appointmentIdToUse,
        ]
      );
      mrResult = upd.rows[0];
    } else {
      const ins = await client.query(
        `INSERT INTO medical_records
           (appointment_id, weight, height, temperature, pulse_rate, diagnosis, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
        [
          appointmentIdToUse,
          weight == null || weight === "" ? null : weight,
          height == null || height === "" ? null : height,
          temperature == null || temperature === "" ? null : temperature,
          pulse_rate == null || pulse_rate === "" ? null : pulse_rate,
          diagnosis || null,
          remarks || null,
        ]
      );
      mrResult = ins.rows[0];
    }

    await client.query("COMMIT");
    client.release();

    return res.status(createdAppointment ? 201 : 200).json({
      message: createdAppointment
        ? "Walk-in appointment created and vitals saved"
        : "Vitals attached to approved appointment",
      appointment_id: appointmentIdToUse,
      createdAppointment,
      medical_record: mrResult,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    console.error("Error saving vitals endpoint:", err);
    return res.status(500).json({ error: "Server error" });
  }
});
// ✅ POST /appointments
app.post("/appointments", auth, async (req, res) => {
  try {
    const {
      date,
      time,
      type,
      concerns,
      additional_services,
      vaccination_type,
    } = req.body;
    const userId = req.user.id;

    if (!date || !time || !type) {
      return res.status(400).json({
        error: "Please fill in all required fields (date, time, type).",
      });
    }

    // Validate vaccination_type if type is Vaccination
    if (type === "Vaccination") {
      if (!vaccination_type) {
        return res.status(400).json({
          error: "Please select a vaccination type.",
        });
      }

      // Check if vaccine is available for this user
      const userResult = await pool.query(
        "SELECT birth_date FROM users WHERE user_id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const birthDate = userResult.rows[0].birth_date;
      if (!birthDate) {
        return res.status(400).json({
          error:
            "Birth date not set. Please update your profile to book vaccinations.",
        });
      }

      const ageInMonths = calculateAgeInMonths(birthDate);

      // Check vaccine eligibility
      const vaccineCheck = await pool.query(
        `
        SELECT * FROM vaccine_definitions 
        WHERE vaccine_name = $1 
          AND min_age_months <= $2 
          AND (max_age_months IS NULL OR max_age_months >= $2)
      `,
        [vaccination_type, ageInMonths]
      );

      if (vaccineCheck.rows.length === 0) {
        return res.status(400).json({
          error: `You are not eligible for ${vaccination_type} based on your age.`,
        });
      }

      const vaccine = vaccineCheck.rows[0];

      // Check vaccination history for cooldown
      const historyCheck = await pool.query(
        `
        SELECT vaccine_name, dose_number, vaccination_date, next_due_date
        FROM vaccine_history
        WHERE user_id = $1 AND vaccine_name = $2
        ORDER BY vaccination_date DESC
        LIMIT 1
      `,
        [userId, vaccination_type]
      );

      if (historyCheck.rows.length > 0) {
        const lastVaccination = historyCheck.rows[0];

        // Count total doses received
        const doseCountResult = await pool.query(
          `
          SELECT COUNT(*) as count
          FROM vaccine_history
          WHERE user_id = $1 AND vaccine_name = $2
        `,
          [userId, vaccination_type]
        );

        const dosesReceived = parseInt(doseCountResult.rows[0].count);

        // Check if all doses completed (excluding boosters)
        if (
          dosesReceived >= vaccine.total_doses &&
          !vaccine.booster_interval_days
        ) {
          return res.status(400).json({
            error: `You have already completed all doses for ${vaccination_type}.`,
          });
        }

        // Check cooldown period
        if (lastVaccination.next_due_date) {
          const nextDueDate = new Date(lastVaccination.next_due_date);
          const appointmentDate = new Date(date);

          if (appointmentDate < nextDueDate) {
            const daysRemaining = Math.ceil(
              (nextDueDate - appointmentDate) / (1000 * 60 * 60 * 24)
            );
            return res.status(400).json({
              error: `${vaccination_type} is on cooldown. Next dose available on ${nextDueDate.toLocaleDateString()} (${daysRemaining} days remaining).`,
            });
          }
        }
      }
    }

    const additionalServicesValue = additional_services || "None";

    const result = await pool.query(
      `INSERT INTO appointments 
       (user_id, appointment_date, appointment_time, appointment_type, status, concerns, additional_services, vaccination_type)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
       RETURNING appointment_id`,
      [
        userId,
        date,
        time,
        type,
        concerns || "",
        additionalServicesValue,
        vaccination_type || null,
      ]
    );

    res.json({
      message: "Appointment booked successfully!",
      appointment_id: result.rows[0].appointment_id,
    });
  } catch (error) {
    console.error("❌ Error booking appointment:", error);
    res.status(500).json({ error: "Server error" });
  }
});
// ✅ Cancel appointment endpoint
app.patch("/appointments/:id/cancel", auth, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user.id;

    // Check if appointment exists and belongs to user
    const checkResult = await pool.query(
      "SELECT * FROM appointments WHERE appointment_id = $1 AND user_id = $2", // ✅ CHANGED
      [appointmentId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const appointment = checkResult.rows[0];

    // Prevent canceling if already completed or canceled
    if (
      appointment.status === "completed" ||
      appointment.status === "canceled"
    ) {
      return res.status(400).json({
        error: `Cannot cancel ${appointment.status} appointment`,
      });
    }

    // Update status to canceled and save cancel reason if provided
    const cancelReason = req.body?.cancel_remarks || null;
    if (cancelReason) {
      await pool.query(
        "UPDATE appointments SET status = 'canceled', cancel_remarks = $2 WHERE appointment_id = $1",
        [appointmentId, cancelReason]
      );
    } else {
      await pool.query(
        "UPDATE appointments SET status = 'canceled' WHERE appointment_id = $1",
        [appointmentId]
      );
    }

    res.json({ message: "Appointment canceled successfully" });
  } catch (error) {
    console.error("❌ Error canceling appointment:", error);
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

app.get("/appointments/nurse", async (req, res) => {
  try {
    const query = `
      SELECT 
        a.appointment_id,
        a.user_id,
        a.full_name as walk_in_name,
        u.full_name as user_full_name,
        COALESCE(a.full_name, u.full_name) as full_name,
        u.email,
        a.appointment_date,
        a.appointment_time,
        a.appointment_type,
        a.status,
        a.concerns,
        a.additional_services,
        a.vaccination_type,
        a.cancel_remarks,
        a.is_walkin,
        a.created_at,
        COALESCE(pp.phone_number, '') as phone_number
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN patient_profiles pp ON u.user_id = pp.user_id
      ORDER BY a.appointment_date, a.appointment_time;
    `;
    const result = await pool.query(query);

    console.log("📋 Total appointments:", result.rows.length);
    console.log(
      "🚶 Walk-ins:",
      result.rows.filter((r) => r.is_walkin || !r.user_id).length
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching appointments for nurse:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT endpoint to update patient
app.put("/patients/:user_id", async (req, res) => {
  const { user_id } = req.params;
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
    // Start a transaction
    await pool.query("BEGIN");

    // Format birth_date to YYYY-MM-DD (remove time if present)
    const formattedBirthDate = birth_date ? birth_date.split("T")[0] : null;

    // Update users table
    let userUpdateQuery = `
      UPDATE users 
      SET full_name = $1, email = $2, birth_date = $3, gender = $4
    `;
    let userParams = [full_name, email, formattedBirthDate, gender];

    // Only update password if provided
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      userUpdateQuery += `, password = $5 WHERE user_id = $6 RETURNING *`;
      userParams.push(hashedPassword, user_id);
    } else {
      userUpdateQuery += ` WHERE user_id = $5 RETURNING *`;
      userParams.push(user_id);
    }

    const userResult = await pool.query(userUpdateQuery, userParams);

    if (userResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Patient not found" });
    }

    // Update or insert patient_profiles
    const profileQuery = `
      INSERT INTO patient_profiles (
        user_id, guardian, guardian_number, phone_number, 
        address, blood_type, allergies, chronic_conditions, 
        mother_name, father_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        guardian = EXCLUDED.guardian,
        guardian_number = EXCLUDED.guardian_number,
        phone_number = EXCLUDED.phone_number,
        address = EXCLUDED.address,
        blood_type = EXCLUDED.blood_type,
        allergies = EXCLUDED.allergies,
        chronic_conditions = EXCLUDED.chronic_conditions,
        mother_name = EXCLUDED.mother_name,
        father_name = EXCLUDED.father_name
      RETURNING *
    `;

    await pool.query(profileQuery, [
      user_id,
      guardian || null,
      guardian_number || null,
      phone_number || null,
      address || null,
      blood_type || null,
      allergies || null,
      chronic_conditions || null,
      mother_name || null,
      father_name || null,
    ]);

    // Commit transaction
    await pool.query("COMMIT");

    // Fetch complete updated patient data
    const result = await pool.query(
      `SELECT 
        u.user_id, 
        u.full_name, 
        u.email, 
        TO_CHAR(u.birth_date, 'YYYY-MM-DD') as birth_date,
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

    res.json({
      message: "Patient updated successfully",
      patient: result.rows[0],
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error updating patient:", err.message);

    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({
      error: "Server error while updating patient",
      message: err.message,
    });
  }
});

app.get("/patients/:user_id/profile", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        u.user_id, 
        u.full_name, 
        u.email, 
        TO_CHAR(u.birth_date, 'YYYY-MM-DD') as birth_date,
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
              u.email,
              m.weight,
              m.height,
              m.temperature,
              m.pulse_rate,
              m.diagnosis,
              m.remarks
       FROM appointments a
       JOIN users u ON a.user_id = u.user_id
       LEFT JOIN medical_records m ON a.appointment_id = m.appointment_id
       WHERE LOWER(a.status) = 'approved'
         AND a.appointment_date::date = CURRENT_DATE
       ORDER BY a.appointment_time`
    );

    console.log("Query result:", result.rows);

    // Additional processing to ensure consistent format
    const processedRows = result.rows.map((row) => ({
      ...row,
      appointment_date: row.appointment_date.split("T")[0], // Ensure YYYY-MM-DD format
      appointment_time: row.appointment_time
        ? row.appointment_time.substring(0, 8)
        : null, // Ensure HH:MM:SS format
      weight: row.weight || null,
      height: row.height || null,
      temperature: row.temperature || null,
      pulse_rate: row.pulse_rate || null,
      diagnosis: row.diagnosis || null,
      remarks: row.remarks || null,
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
    let { status, cancel_remarks } = req.body; // 👈 ADD cancel_remarks

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

    // fetch appointment before updating so we have context (user, type, date, etc.)
    const apptRes = await pool.query(
      "SELECT * FROM appointments WHERE appointment_id = $1",
      [id]
    );
    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    const appointment = apptRes.rows[0];

    // 👇 UPDATE: Save cancel_remarks if status is Canceled
    const result = await pool.query(
      "UPDATE appointments SET status = $1, cancel_remarks = $2 WHERE appointment_id = $3 RETURNING appointment_id, status, cancel_remarks",
      [status, status === "Canceled" ? cancel_remarks : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const updated = result.rows[0];

    // If appointment was marked Completed and it's a Vaccination appointment,
    // persist the vaccine to `vaccine_history` if not already recorded for this appointment.
    if (
      status === "Completed" &&
      appointment.appointment_type === "Vaccination"
    ) {
      try {
        // Check if vaccine history already linked to this appointment
        const exist = await pool.query(
          "SELECT COUNT(*) as cnt FROM vaccine_history WHERE appointment_id = $1",
          [id]
        );
        if (parseInt(exist.rows[0].cnt) === 0) {
          // Determine vaccine name, dose, and date from request body if provided
          const { vaccine_name, dose_number, date_given } = req.body || {};
          const vaccineName = vaccine_name || appointment.vaccination_type;

          // If no vaccine name available, skip
          if (vaccineName) {
            // Count existing doses for this user+vaccine
            const doseCountResult = await pool.query(
              "SELECT COUNT(*) as count FROM vaccine_history WHERE user_id = $1 AND vaccine_name = $2",
              [appointment.user_id, vaccineName]
            );
            const dosesReceived = parseInt(doseCountResult.rows[0].count);
            const nextDoseNumber = dose_number
              ? parseInt(dose_number)
              : dosesReceived + 1;

            // Try to fetch vaccine definition to compute next_due_date
            const vaccineDefRes = await pool.query(
              "SELECT * FROM vaccine_definitions WHERE vaccine_name = $1",
              [vaccineName]
            );
            const vaccinationDate =
              date_given ||
              appointment.appointment_date ||
              new Date().toISOString();
            let nextDueDate = null;
            if (vaccineDefRes.rows.length > 0) {
              const vdef = vaccineDefRes.rows[0];
              if (nextDoseNumber === 1 && vdef.interval_dose_2_days) {
                const nd = new Date(vaccinationDate);
                nd.setDate(nd.getDate() + vdef.interval_dose_2_days);
                nextDueDate = nd;
              } else if (nextDoseNumber === 2 && vdef.interval_dose_3_days) {
                const nd = new Date(vaccinationDate);
                nd.setDate(nd.getDate() + vdef.interval_dose_3_days);
                nextDueDate = nd;
              } else if (
                nextDoseNumber >= vdef.total_doses &&
                vdef.booster_interval_days
              ) {
                const nd = new Date(vaccinationDate);
                nd.setDate(nd.getDate() + vdef.booster_interval_days);
                nextDueDate = nd;
              }
            }

            await pool.query(
              `INSERT INTO vaccine_history
               (user_id, vaccine_name, dose_number, vaccination_date, next_due_date, appointment_id)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                appointment.user_id,
                vaccineName,
                nextDoseNumber,
                vaccinationDate,
                nextDueDate,
                id,
              ]
            );
          }
        }
      } catch (err) {
        console.error(
          "Error saving vaccine history on appointment completion:",
          err
        );
        // don't fail the status update if vaccine save fails; just log
      }
    }

    res.json(updated); // return id, status, and cancel_remarks
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

app.post("/medical-records", auth, async (req, res) => {
  try {
    const {
      appointment_id,
      weight,
      height,
      diagnosis,
      remarks,
      temperature,
      pulse_rate,
    } = req.body;

    const check = await pool.query(
      "SELECT * FROM medical_records WHERE appointment_id = $1",
      [appointment_id]
    );

    let result;
    if (check.rows.length > 0) {
      // ✅ Build dynamic update query based on provided fields
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (weight !== undefined && weight !== "") {
        updates.push(`weight = $${paramIndex++}`);
        values.push(weight);
      }
      if (height !== undefined && height !== "") {
        updates.push(`height = $${paramIndex++}`);
        values.push(height);
      }
      if (diagnosis !== undefined && diagnosis !== "") {
        updates.push(`diagnosis = $${paramIndex++}`);
        values.push(diagnosis);
      }
      if (remarks !== undefined && remarks !== "") {
        updates.push(`remarks = $${paramIndex++}`);
        values.push(remarks);
      }
      if (temperature !== undefined && temperature !== "") {
        updates.push(`temperature = $${paramIndex++}`);
        values.push(temperature);
      }
      if (pulse_rate !== undefined && pulse_rate !== "") {
        updates.push(`pulse_rate = $${paramIndex++}`);
        values.push(pulse_rate);
      }

      // Always update timestamp
      updates.push(`updated_at = NOW()`);
      values.push(appointment_id);

      const query = `
        UPDATE medical_records
        SET ${updates.join(", ")}
        WHERE appointment_id = $${paramIndex}
        RETURNING *
      `;

      result = await pool.query(query, values);
    } else {
      // ✅ Insert new record
      const weightVal = weight === "" ? null : weight;
      const heightVal = height === "" ? null : height;
      const tempVal = temperature === "" ? null : temperature;
      const pulseVal = pulse_rate === "" ? null : pulse_rate;

      result = await pool.query(
        `INSERT INTO medical_records 
         (appointment_id, weight, height, diagnosis, remarks, temperature, pulse_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          appointment_id,
          weightVal,
          heightVal,
          diagnosis || null,
          remarks || null,
          tempVal,
          pulseVal,
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

// Provide aggregated sales per inventory item for inventory UI
app.get("/sales", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.inventory_id,
        i.name,
        COALESCE(SUM(s.quantity), 0) AS total_sold,
        MAX(s.sale_date) AS last_sold,
        COALESCE(
          (
            SELECT json_agg(t) FROM (
                SELECT date_trunc('month', s2.sale_date)::date AS date, SUM(s2.quantity) AS quantity
                FROM sales s2
                WHERE s2.inventory_id = i.inventory_id
                GROUP BY date_trunc('month', s2.sale_date)::date
                ORDER BY date DESC
            ) t
          ), '[]'
        ) AS history
      FROM inventory i
      LEFT JOIN sales s ON s.inventory_id = i.inventory_id
      GROUP BY i.inventory_id, i.name
      ORDER BY total_sold DESC, i.name ASC
    `);

    const rows = result.rows.map((r) => ({
      inventory_id: r.inventory_id,
      name: r.name,
      total_sold: parseInt(r.total_sold, 10) || 0,
      date: r.last_sold || null,
      history: r.history || [],
    }));

    res.json(rows);
  } catch (err) {
    console.error("Error fetching /sales:", err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

app.get("/analytics", auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    const isAllYears = year === "all";
    const selectedYear =
      !isAllYears && year ? parseInt(year) : new Date().getFullYear();
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

    // Get available months for selected year (empty for all-years view)
    let availableMonths = [];
    if (!isAllYears) {
      const availableMonthsResult = await pool.query(`
        SELECT DISTINCT EXTRACT(MONTH FROM appointment_date) AS month
        FROM appointments
        WHERE EXTRACT(YEAR FROM appointment_date) = ${selectedYear}
        ORDER BY month
      `);
      availableMonths = availableMonthsResult.rows.map((r) =>
        parseInt(r.month)
      );
    }

    // If requesting all years, return per-year aggregates and KPIs
    if (isAllYears) {
      // Appointment counts per year
      const appointmentPerYear = await pool.query(`
        SELECT EXTRACT(YEAR FROM appointment_date) AS year, COUNT(*) AS total
        FROM appointments
        GROUP BY year
        ORDER BY year
      `);

      // Diagnosis counts per year (split comma-separated diagnoses)
      const diagnosisPerYear = await pool.query(`
        SELECT EXTRACT(YEAR FROM a.appointment_date) AS year, COUNT(*) AS count
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.appointment_id
        CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
        WHERE mr.diagnosis IS NOT NULL
          AND mr.diagnosis != ''
          AND TRIM(diagnosis_item) != ''
        GROUP BY year
        ORDER BY year
      `);

      // Appointment type counts per year
      const appointmentTypePerYear = await pool.query(`
        SELECT EXTRACT(YEAR FROM appointment_date) AS year, COUNT(*) AS count
        FROM appointments
        GROUP BY year
        ORDER BY year
      `);

      // Total appointments (all years)
      const totalAppointmentsAll = await pool.query(`
        SELECT COUNT(*) AS total FROM appointments
      `);

      // Overall distinct patients (assumes appointments.user_id references patient)
      const overallPatientsRes = await pool.query(`
        SELECT COUNT(DISTINCT user_id) AS total FROM appointments
      `);

      // Most common appointment type (all years)
      const commonTypeAll = await pool.query(`
        SELECT appointment_type, COUNT(*) AS count
        FROM appointments
        GROUP BY appointment_type
        ORDER BY count DESC
        LIMIT 1;
      `);

      // Most common diagnosis (all years)
      const commonDiagnosisAll = await pool.query(`
        SELECT TRIM(diagnosis_item) AS diagnosis, COUNT(*) AS count
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.appointment_id
        CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
        WHERE mr.diagnosis IS NOT NULL
          AND mr.diagnosis != ''
          AND TRIM(diagnosis_item) != ''
        GROUP BY TRIM(diagnosis_item)
        ORDER BY count DESC
        LIMIT 1;
      `);

      // Inventory usage across all years
      let inventoryUsageAll = { rows: [] };
      try {
        inventoryUsageAll = await pool.query(`
          SELECT i.name, SUM(s.quantity) as total_sold
          FROM sales s
          JOIN inventory i ON s.inventory_id = i.inventory_id
          GROUP BY i.name
          ORDER BY total_sold DESC
          LIMIT 10
        `);
      } catch (e) {
        console.log(
          "Inventory/Sales tables not found, skipping inventory usage"
        );
      }

      // All diagnoses (already global)
      const allDiagnoses = await pool.query(`
        SELECT DISTINCT TRIM(diagnosis_item) AS diagnosis
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.appointment_id
        CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
        WHERE mr.diagnosis IS NOT NULL 
          AND mr.diagnosis != ''
          AND TRIM(diagnosis_item) != ''
        ORDER BY diagnosis
      `);

      return res.json({
        availableYears,
        availableMonths,
        totalAppointments: parseInt(totalAppointmentsAll.rows[0]?.total || 0),
        overallPatients: parseInt(overallPatientsRes.rows[0]?.total || 0),
        commonAppointmentType: commonTypeAll.rows[0]?.appointment_type || "N/A",
        commonDiagnosis: commonDiagnosisAll.rows[0]?.diagnosis || "N/A",
        appointmentTrendByYear: appointmentPerYear.rows.map((r) => ({
          year: String(parseInt(r.year)),
          total: parseInt(r.total),
        })),
        diagnosisTrendByYear: diagnosisPerYear.rows.map((r) => ({
          year: String(parseInt(r.year)),
          count: parseInt(r.count),
        })),
        appointmentTypeTrendByYear: appointmentTypePerYear.rows.map((r) => ({
          year: String(parseInt(r.year)),
          count: parseInt(r.count),
        })),
        inventoryUsage: inventoryUsageAll.rows || [],
        allDiagnoses: allDiagnoses.rows.map((r) => r.diagnosis),
        diagnosisTimeTrend: [],
      });
    }

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
    // Most Common Diagnosis (filtered) - WITH SPLITTING
    const commonDiagnosis = await pool.query(`
      SELECT 
        TRIM(diagnosis_item) AS diagnosis, 
        COUNT(*) AS count
      FROM medical_records mr
      JOIN appointments a ON mr.appointment_id = a.appointment_id
      CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
      WHERE ${medicalRecordDateFilter}
        AND mr.diagnosis IS NOT NULL 
        AND mr.diagnosis != ''
        AND TRIM(diagnosis_item) != ''
      GROUP BY TRIM(diagnosis_item)
      ORDER BY count DESC
      LIMIT 1;
    `);

    // Total Appointment Trend (always by month for selected year)
    // Total Appointment Trend
    const appointmentTrend = selectedMonth
      ? await pool.query(`
      SELECT EXTRACT(DAY FROM appointment_date) AS period, COUNT(*) AS total
      FROM appointments
      WHERE ${dateFilter}
      GROUP BY period
      ORDER BY period;
    `)
      : await pool.query(`
      SELECT EXTRACT(MONTH FROM appointment_date) AS period, COUNT(*) AS total
      FROM appointments
      WHERE EXTRACT(YEAR FROM appointment_date) = ${selectedYear}
      GROUP BY period
      ORDER BY period;
    `);

    // Top Diagnosis Per Month (always by month for selected year)
    // Top Diagnosis Per Month
    const diagnosisTrend = selectedMonth
      ? await pool.query(`
      SELECT 
        ${selectedMonth} AS month,
        TRIM(diagnosis_item) AS diagnosis,
        COUNT(*) AS count
      FROM medical_records mr
      JOIN appointments a ON mr.appointment_id = a.appointment_id
      CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
      WHERE ${medicalRecordDateFilter}
        AND mr.diagnosis IS NOT NULL 
        AND mr.diagnosis != ''
        AND TRIM(diagnosis_item) != ''
      GROUP BY TRIM(diagnosis_item)
      ORDER BY count DESC
      LIMIT 1
    `)
      : await pool.query(`
      WITH split_diagnoses AS (
        SELECT 
          EXTRACT(MONTH FROM a.appointment_date) AS month,
          TRIM(diagnosis_item) AS diagnosis
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.appointment_id
        CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
        WHERE EXTRACT(YEAR FROM a.appointment_date) = ${selectedYear}
          AND mr.diagnosis IS NOT NULL 
          AND mr.diagnosis != ''
          AND TRIM(diagnosis_item) != ''
      ),
      ranked_diagnoses AS (
        SELECT 
          month,
          diagnosis,
          COUNT(*) AS count,
          ROW_NUMBER() OVER (PARTITION BY month ORDER BY COUNT(*) DESC) AS rank
        FROM split_diagnoses
        GROUP BY month, diagnosis
      )
      SELECT month, diagnosis, count
      FROM ranked_diagnoses
      WHERE rank = 1
      ORDER BY month
    `);

    // Top Appointment Type Per Month (always by month for selected year)
    // Top Appointment Type Per Month
    const appointmentTypeTrend = selectedMonth
      ? await pool.query(`
      SELECT 
        ${selectedMonth} AS month,
        appointment_type,
        COUNT(*) AS count
      FROM appointments
      WHERE ${dateFilter}
      GROUP BY appointment_type
      ORDER BY count DESC
      LIMIT 1
    `)
      : await pool.query(`
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
      ORDER BY month
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
    SELECT DISTINCT TRIM(diagnosis_item) AS diagnosis
    FROM medical_records mr
    JOIN appointments a ON mr.appointment_id = a.appointment_id
    CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
    WHERE mr.diagnosis IS NOT NULL 
      AND mr.diagnosis != ''
      AND TRIM(diagnosis_item) != ''
    ORDER BY diagnosis
`);

    // Diagnosis Time Trend (filtered by specific diagnosis or all)
    let diagnosisTimeTrend = { rows: [] };

    // For daily trend (when month is selected)
    if (selectedMonth) {
      const diagnosisFilter = selectedDiagnosis
        ? `AND TRIM(diagnosis_item) = '${selectedDiagnosis.replace(
            /'/g,
            "''"
          )}'`
        : "";

      diagnosisTimeTrend = await pool.query(`
    SELECT 
      EXTRACT(DAY FROM a.appointment_date) AS day,
      COUNT(*) AS count
      FROM medical_records mr
      JOIN appointments a ON mr.appointment_id = a.appointment_id
      CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
      WHERE ${medicalRecordDateFilter}
        AND mr.diagnosis IS NOT NULL 
        AND mr.diagnosis != ''
        AND TRIM(diagnosis_item) != ''
        ${diagnosisFilter}
      GROUP BY day
      ORDER BY day
  `);
    } else {
      // For monthly trend
      const diagnosisFilter = selectedDiagnosis
        ? `AND TRIM(diagnosis_item) = '${selectedDiagnosis.replace(
            /'/g,
            "''"
          )}'`
        : "";

      diagnosisTimeTrend = await pool.query(`
    SELECT 
      EXTRACT(MONTH FROM a.appointment_date) AS month,
      COUNT(*) AS count
      FROM medical_records mr
      JOIN appointments a ON mr.appointment_id = a.appointment_id
      CROSS JOIN LATERAL regexp_split_to_table(mr.diagnosis, ',') AS diagnosis_item
      WHERE EXTRACT(YEAR FROM a.appointment_date) = ${selectedYear}
        AND mr.diagnosis IS NOT NULL 
        AND mr.diagnosis != ''
        AND TRIM(diagnosis_item) != ''
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
      // Appointment trend (monthly or daily based on filter)
      appointmentTrend: appointmentTrend.rows.map((r) => {
        if (selectedMonth) {
          // Daily view
          return {
            month: parseInt(r.period), // using 'month' key for consistency with chart
            monthLabel: `${monthNames[selectedMonth - 1]} ${r.period}`,
            total: parseInt(r.total),
          };
        } else {
          // Monthly view
          return {
            month: parseInt(r.period),
            monthLabel: monthNames[parseInt(r.period) - 1],
            total: parseInt(r.total),
          };
        }
      }),
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

// 📍 POST vitals for a patient (kiosk workflow)
// Kiosk Workflow:
// 1. Check for existing approved appointment (today → any day)
// 2. If found: attach vitals to it (keep status=Approved), return 200
// 3. If not found: create new Walk-in appointment with status=Approved + attach vitals, return 201
// 4. Appointment stays Approved until nurse/doctor marks it Completed
app.post("/patients/:patient_id/vitals", async (req, res) => {
  const client = await pool.connect();
  try {
    const { patient_id } = req.params;
    const {
      pulse_rate,
      temperature,
      height,
      weight,
      diagnosis,
      remarks,
      appointment_id: providedAppointmentId,
    } = req.body;

    const pid = parseInt(patient_id, 10);
    if (isNaN(pid)) {
      client.release();
      return res.status(400).json({ error: "Invalid patient_id" });
    }

    // Ensure patient exists
    const userCheck = await client.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [pid]
    );
    if (userCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "Patient not found" });
    }

    await client.query("BEGIN");

    // Priority 1: If client provided an appointment_id, try to use it (but do not change status)
    let appointmentIdToUse = null;
    if (providedAppointmentId) {
      const apCheck = await client.query(
        "SELECT appointment_id, status FROM appointments WHERE appointment_id = $1 AND user_id = $2",
        [providedAppointmentId, pid]
      );
      if (apCheck.rows.length > 0) {
        appointmentIdToUse = apCheck.rows[0].appointment_id;
        console.log(
          `[Vitals] Priority 1: Using provided appointment_id = ${appointmentIdToUse}`
        );
      }
    }

    // Priority 2: Find an existing approved WalkIn appointment (any day, prefer most recent)
    if (!appointmentIdToUse) {
      const approvedWalkIn = await client.query(
        `SELECT appointment_id FROM appointments
         WHERE user_id = $1 AND LOWER(status) = 'approved' AND LOWER(appointment_type) = 'walkin'
         ORDER BY appointment_date DESC, appointment_time DESC LIMIT 1`,
        [pid]
      );
      if (approvedWalkIn.rows.length > 0) {
        appointmentIdToUse = approvedWalkIn.rows[0].appointment_id;
        console.log(
          `[Vitals] Priority 2: Found existing WalkIn appointment = ${appointmentIdToUse}`
        );
      }
    }

    // Priority 3: Find an existing approved appointment for today (any type)
    if (!appointmentIdToUse) {
      const approvedToday = await client.query(
        `SELECT appointment_id FROM appointments
         WHERE user_id = $1 AND LOWER(status) = 'approved' AND appointment_date::date = CURRENT_DATE
         ORDER BY appointment_date DESC, appointment_time DESC LIMIT 1`,
        [pid]
      );
      if (approvedToday.rows.length > 0) {
        appointmentIdToUse = approvedToday.rows[0].appointment_id;
        console.log(
          `[Vitals] Priority 3: Found approved appointment today = ${appointmentIdToUse}`
        );
      }
    }

    // Priority 4: Find any other approved appointment (most recent)
    if (!appointmentIdToUse) {
      const approvedAny = await client.query(
        `SELECT appointment_id FROM appointments
         WHERE user_id = $1 AND LOWER(status) = 'approved'
         ORDER BY appointment_date DESC, appointment_time DESC LIMIT 1`,
        [pid]
      );
      if (approvedAny.rows.length > 0) {
        appointmentIdToUse = approvedAny.rows[0].appointment_id;
        console.log(
          `[Vitals] Priority 4: Found any approved appointment = ${appointmentIdToUse}`
        );
      }
    }

    // If still none, create a new appointment marked as Approved (walk-in)
    let createdAppointment = false;
    if (!appointmentIdToUse) {
      // Create a walk-in appointment. Use a consistent appointment_type so
      // medical records group under "WalkIn" instead of creating a "Vitals" folder.
      // Get current time in HH:MM:SS format to ensure correct time recording
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const appt = await client.query(
        `INSERT INTO appointments
           (user_id, appointment_date, appointment_time, appointment_type, status, concerns, additional_services, created_at)
        VALUES ($1, NOW()::date, $2::time, 'WalkIn', 'Approved', '', 'None', NOW())
         RETURNING appointment_id`,
        [pid, currentTime]
      );
      appointmentIdToUse = appt.rows[0].appointment_id;
      createdAppointment = true;
      console.log(
        `[Vitals] Priority 5: Created new WalkIn appointment = ${appointmentIdToUse} at time ${currentTime}`
      );
    }

    // Upsert medical record for the chosen appointment: update if exists, otherwise insert
    const existingMR = await client.query(
      "SELECT * FROM medical_records WHERE appointment_id = $1",
      [appointmentIdToUse]
    );

    let mrResult;
    if (existingMR.rows.length > 0) {
      // Update existing medical record but preserve fields not provided in the request
      const cur = existingMR.rows[0];
      const has = (k) => Object.prototype.hasOwnProperty.call(req.body, k);

      const weightToSet = has("weight")
        ? weight === ""
          ? null
          : weight
        : cur.weight;
      const heightToSet = has("height")
        ? height === ""
          ? null
          : height
        : cur.height;
      const temperatureToSet = has("temperature")
        ? temperature === ""
          ? null
          : temperature
        : cur.temperature;
      const pulseRateToSet = has("pulse_rate")
        ? pulse_rate === ""
          ? null
          : pulse_rate
        : cur.pulse_rate;
      const diagnosisToSet = has("diagnosis")
        ? diagnosis === ""
          ? null
          : diagnosis
        : cur.diagnosis;
      const remarksToSet = has("remarks")
        ? remarks === ""
          ? null
          : remarks
        : cur.remarks;

      const upd = await client.query(
        `UPDATE medical_records SET
           weight = $1,
           height = $2,
           temperature = $3,
           pulse_rate = $4,
           diagnosis = $5,
           remarks = $6,
           updated_at = NOW()
         WHERE appointment_id = $7 RETURNING *`,
        [
          weightToSet,
          heightToSet,
          temperatureToSet,
          pulseRateToSet,
          diagnosisToSet,
          remarksToSet,
          appointmentIdToUse,
        ]
      );
      mrResult = upd.rows[0];
    } else {
      // Insert new medical record
      const ins = await client.query(
        `INSERT INTO medical_records
           (appointment_id, weight, height, temperature, pulse_rate, diagnosis, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
        [
          appointmentIdToUse,
          weight == null || weight === "" ? null : weight,
          height == null || height === "" ? null : height,
          temperature == null || temperature === "" ? null : temperature,
          pulse_rate == null || pulse_rate === "" ? null : pulse_rate,
          diagnosis || null,
          remarks || null,
        ]
      );
      mrResult = ins.rows[0];
    }

    await client.query("COMMIT");
    client.release();

    return res.status(createdAppointment ? 201 : 200).json({
      message: createdAppointment
        ? "Walk-in appointment created and vitals saved"
        : "Vitals attached to approved appointment",
      appointment_id: appointmentIdToUse,
      createdAppointment,
      medical_record: mrResult,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    console.error("Error saving vitals endpoint:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/appointments/walkin", auth, async (req, res) => {
  try {
    const {
      full_name,
      appointment_type,
      vaccination_type,
      concerns,
      additional_services,
    } = req.body;

    if (!full_name || !appointment_type) {
      return res
        .status(400)
        .json({ error: "Patient name and appointment type are required" });
    }

    // Get current date and time in Philippine timezone
    const now = new Date();
    const phTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    const date = phTime.toISOString().split("T")[0]; // YYYY-MM-DD
    const time = phTime.toTimeString().split(" ")[0].substring(0, 5); // HH:MM

    console.log("🚶 Adding walk-in:", {
      full_name,
      date,
      time,
      appointment_type,
    });

    const result = await pool.query(
      `INSERT INTO appointments 
       (user_id, full_name, appointment_date, appointment_time, appointment_type, status, concerns, additional_services, vaccination_type, is_walkin, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Approved', $6, $7, $8, true, NOW())
       RETURNING *`,
      [
        null,
        full_name,
        date,
        time,
        appointment_type,
        concerns || "",
        additional_services || "None",
        vaccination_type || null,
      ]
    );

    console.log("✅ Walk-in added:", result.rows[0]);

    res.json({
      message: "Walk-in patient added to queue successfully!",
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error adding walk-in:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// Get unread notifications for nurse
app.get("/notifications/nurse", async (req, res) => {
  try {
    const query = `
      SELECT 
        a.appointment_id,
        COALESCE(a.full_name, u.full_name) as patient_name,
        a.appointment_date,
        a.appointment_time,
        a.appointment_type,
        a.status,
        a.created_at,
        a.is_walkin
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.user_id
      WHERE a.status = 'pending'
      ORDER BY a.created_at DESC
      LIMIT 20;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark notification as read (optional - for future use)
app.patch("/notifications/:appointmentId/read", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    // You can add a 'notification_read' column to appointments table later
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get notifications for patient (approved, canceled, completed appointments)
app.get("/notifications/patient", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.appointment_type,
        a.status,
        a.cancel_remarks,
        a.vaccination_type,
        a.additional_services,
        a.created_at
      FROM appointments a
      WHERE a.user_id = $1
        AND LOWER(a.status) IN ('approved', 'canceled', 'completed')
        AND a.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY a.created_at DESC
      LIMIT 20;
    `;

    const result = await pool.query(query, [userId]);

    console.log(`📬 Patient ${userId} notifications:`, result.rows.length);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching patient notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper function to calculate age in months from birth_date
function calculateAgeInMonths(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();

  let months = (today.getFullYear() - birth.getFullYear()) * 12;
  months += today.getMonth() - birth.getMonth();

  // Adjust if the day hasn't been reached yet in the current month
  if (today.getDate() < birth.getDate()) {
    months--;
  }

  return months;
}

// Get available vaccines for user based on age and history
app.get("/patient/available-vaccines", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's birth date
    const userResult = await pool.query(
      "SELECT birth_date FROM users WHERE user_id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const birthDate = userResult.rows[0].birth_date;
    if (!birthDate) {
      return res.status(400).json({
        error: "Birth date not set. Please update your profile.",
      });
    }

    const ageInMonths = calculateAgeInMonths(birthDate);

    // Get all vaccine definitions
    const vaccinesResult = await pool.query(
      `
      SELECT * FROM vaccine_definitions 
      WHERE min_age_months <= $1 
        AND (max_age_months IS NULL OR max_age_months >= $1)
      ORDER BY vaccine_name
    `,
      [ageInMonths]
    );

    // Get user's vaccination history
    const historyResult = await pool.query(
      `
      SELECT vaccine_name, dose_number, vaccination_date, next_due_date
      FROM vaccine_history
      WHERE user_id = $1
      ORDER BY vaccination_date DESC
    `,
      [userId]
    );

    const vaccineHistory = historyResult.rows;

    // Process each vaccine to determine availability
    const availableVaccines = [];

    for (const vaccine of vaccinesResult.rows) {
      const userHistory = vaccineHistory.filter(
        (h) => h.vaccine_name === vaccine.vaccine_name
      );

      const lastDose = userHistory[0]; // Most recent dose
      const dosesReceived = userHistory.length;

      let available = true;
      let reason = "";
      let nextDoseNumber = dosesReceived + 1;

      // Check if all doses completed
      if (dosesReceived >= vaccine.total_doses) {
        // Check if booster is available
        if (vaccine.booster_interval_days && lastDose) {
          const daysSinceLastDose = Math.floor(
            (new Date() - new Date(lastDose.vaccination_date)) /
              (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastDose >= vaccine.booster_interval_days) {
            nextDoseNumber = dosesReceived + 1; // Booster
            reason = `Booster available (last dose: ${new Date(
              lastDose.vaccination_date
            ).toLocaleDateString()})`;
          } else {
            available = false;
            const daysRemaining =
              vaccine.booster_interval_days - daysSinceLastDose;
            reason = `Cooldown: ${daysRemaining} days until booster`;
          }
        } else {
          available = false;
          reason = "All doses completed";
        }
      } else if (lastDose && lastDose.next_due_date) {
        // Check if next dose is due
        const nextDueDate = new Date(lastDose.next_due_date);
        const today = new Date();

        if (today < nextDueDate) {
          available = false;
          const daysRemaining = Math.ceil(
            (nextDueDate - today) / (1000 * 60 * 60 * 24)
          );
          reason = `Cooldown: ${daysRemaining} days until next dose`;
        } else {
          reason = `Dose ${nextDoseNumber}/${vaccine.total_doses} due`;
        }
      } else {
        reason = `Dose ${nextDoseNumber}/${vaccine.total_doses} available`;
      }

      availableVaccines.push({
        vaccine_id: vaccine.vaccine_id,
        vaccine_name: vaccine.vaccine_name,
        description: vaccine.description,
        available: available,
        reason: reason,
        next_dose_number: nextDoseNumber,
        total_doses: vaccine.total_doses,
        doses_received: dosesReceived,
      });
    }

    res.json({
      age_in_months: ageInMonths,
      vaccines: availableVaccines,
    });
  } catch (err) {
    console.error("❌ Error fetching available vaccines:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Public endpoint to fetch all vaccine definitions from DB
app.get("/vaccine_definitions", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM vaccine_definitions ORDER BY vaccine_name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching vaccine_definitions:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/appointments/:id/complete-vaccination", auth, async (req, res) => {
  try {
    const appointmentId = req.params.id;

    // Get appointment details
    const apptResult = await pool.query(
      `
      SELECT a.*, u.birth_date
      FROM appointments a
      JOIN users u ON a.user_id = u.user_id
      WHERE a.appointment_id = $1 AND a.appointment_type = 'Vaccination'
    `,
      [appointmentId]
    );

    if (apptResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Vaccination appointment not found" });
    }

    const appointment = apptResult.rows[0];

    // Get vaccine definition
    const vaccineResult = await pool.query(
      `
      SELECT * FROM vaccine_definitions WHERE vaccine_name = $1
    `,
      [appointment.vaccination_type]
    );

    if (vaccineResult.rows.length === 0) {
      return res.status(404).json({ error: "Vaccine definition not found" });
    }

    const vaccine = vaccineResult.rows[0];

    // Count current doses
    const doseCountResult = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM vaccine_history
      WHERE user_id = $1 AND vaccine_name = $2
    `,
      [appointment.user_id, appointment.vaccination_type]
    );

    const dosesReceived = parseInt(doseCountResult.rows[0].count);
    const nextDoseNumber = dosesReceived + 1;

    // Calculate next due date
    let nextDueDate = null;
    const vaccinationDate = new Date(appointment.appointment_date);

    if (nextDoseNumber === 1 && vaccine.interval_dose_2_days) {
      nextDueDate = new Date(vaccinationDate);
      nextDueDate.setDate(nextDueDate.getDate() + vaccine.interval_dose_2_days);
    } else if (nextDoseNumber === 2 && vaccine.interval_dose_3_days) {
      nextDueDate = new Date(vaccinationDate);
      nextDueDate.setDate(nextDueDate.getDate() + vaccine.interval_dose_3_days);
    } else if (
      nextDoseNumber >= vaccine.total_doses &&
      vaccine.booster_interval_days
    ) {
      nextDueDate = new Date(vaccinationDate);
      nextDueDate.setDate(
        nextDueDate.getDate() + vaccine.booster_interval_days
      );
    }

    // Record in vaccine history
    await pool.query(
      `
      INSERT INTO vaccine_history 
      (user_id, vaccine_name, dose_number, vaccination_date, next_due_date, appointment_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        appointment.user_id,
        appointment.vaccination_type,
        nextDoseNumber,
        appointment.appointment_date,
        nextDueDate,
        appointmentId,
      ]
    );

    res.json({
      message: "Vaccination recorded successfully",
      next_due_date: nextDueDate,
    });
  } catch (err) {
    console.error("❌ Error completing vaccination:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ GET USER VACCINATION HISTORY ============
app.get("/patient/vaccination-history", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT vh.*, vd.description, vd.total_doses
      FROM vaccine_history vh
      JOIN vaccine_definitions vd ON vh.vaccine_name = vd.vaccine_name
      WHERE vh.user_id = $1
      ORDER BY vh.vaccination_date DESC
    `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching vaccination history:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

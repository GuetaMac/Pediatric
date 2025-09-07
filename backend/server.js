import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { Pool } = pkg;
const app = express();
const port = 5001;
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres", // adjust kung iba user mo
  host: "localhost",
  database: "Pediatric", // dapat existing DB
  password: "12345",
  port: 5432,
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

// 🔑 SIGNUP (default role: patient)
app.post("/api/signup", async (req, res) => {
  const { full_name, email, password } = req.body;
  try {
    const hashedPass = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (full_name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING *",
      [full_name, email, hashedPass, "patient"]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, "mysecretkey", {
      expiresIn: "1h",
    });

    res.json({ token, role: user.role, full_name: user.full_name });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 🔑 LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0)
      return res.status(400).json({ msg: "Invalid credentials" });

    const user = result.rows[0];

    // Add this debug line
    console.log("User from database:", user);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Fix this line - use the correct column name
    const token = jwt.sign(
      {
        id: user.user_id, // Changed from user.id to user.user_id
        role: user.role,
      },
      "mysecretkey",
      {
        expiresIn: "1h",
      }
    );

    res.json({ token, role: user.role, full_name: user.full_name });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// DOCTOR SIGNUP FOR STAFF (CREATE USER)
app.post("/api/users", async (req, res) => {
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
app.get("/api/users", async (req, res) => {
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
app.put("/api/users/:user_id", async (req, res) => {
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
app.delete("/api/users/:user_id", async (req, res) => {
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

// POST /api/appointments
app.post("/api/appointments", auth, async (req, res) => {
  try {
    const { date, time, type } = req.body;
    const userId = req.user.id;

    if (!date || !time || !type) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // check if slot is already booked
    const existing = await pool.query(
      "SELECT * FROM appointments WHERE appointment_date = $1 AND appointment_time = $2",
      [date, time]
    );
    if (existing.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "This time slot is already booked" });
    }

    const result = await pool.query(
      "INSERT INTO appointments (user_id, appointment_date, appointment_time, appointment_type) VALUES ($1,$2,$3,$4) RETURNING *",
      [userId, date, time, type]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// GET appointments for logged-in user
app.get("/api/get/appointments", auth, async (req, res) => {
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
app.get("/api/appointments/nurse", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.appointment_type, 
              a.status, u.full_name, u.email
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

// Update status (approve/completed)
app.put("/api/appointments/:id/status", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Approved", "Completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
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
app.delete("/api/appointments/:id", auth, async (req, res) => {
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

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

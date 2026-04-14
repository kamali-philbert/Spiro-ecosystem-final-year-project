const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../config/db');

// ── Mailer ────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (to, name, code) => {
  await transporter.sendMail({
    from: `"Spiro Ecosystem" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} — Your Spiro Login Code`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:420px;margin:auto;background:#0d1230;border-radius:16px;padding:32px;color:#fff;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="background:#2B3EE6;border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#C8F000;font-size:18px;font-weight:900;">⚡</span>
          </div>
          <span style="color:#C8F000;font-weight:800;font-size:18px;">spiro</span>
        </div>
        <p style="color:#aaa;font-size:14px;margin-bottom:8px;">Hi <strong style="color:#fff;">${name}</strong>,</p>
        <p style="color:#aaa;font-size:14px;margin-bottom:24px;">Use the code below to complete your login. It expires in <strong style="color:#fff;">5 minutes</strong>.</p>
        <div style="background:#1a2255;border:1px solid #2B3EE6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:42px;font-weight:900;letter-spacing:14px;color:#C8F000;">${code}</span>
        </div>
        <p style="color:#555;font-size:12px;">If you did not request this, ignore this email. Do not share this code with anyone.</p>
      </div>
    `,
  });
};

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { full_name, email, password, role, phone_number } = req.body;
    if (!full_name || !email || !password || !role)
      return res.status(400).json({ status: 'error', message: 'Please provide all required fields' });

    const exists = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ status: 'error', message: 'User already exists with that email' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO users (full_name, email, password_hash, role, phone_number) VALUES ($1,$2,$3,$4,$5) RETURNING user_id, full_name, email, role',
      [full_name, email, password_hash, role, phone_number]
    );

    res.status(201).json({ status: 'success', message: 'User registered successfully', data: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error during registration' });
  }
};

// ── Rider Self-Signup (pending admin approval) ────────────────────────────────
exports.riderSignup = async (req, res) => {
  try {
    const { full_name, email, password, phone_number } = req.body;
    if (!full_name || !email || !password)
      return res.status(400).json({ status: 'error', message: 'Full name, email, and password are required' });

    if (password.length < 6)
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });

    const exists = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ status: 'error', message: 'An account with this email already exists' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // is_active = false → requires admin approval before the rider can log in
    const newUser = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone_number, is_active)
       VALUES ($1,$2,$3,'RIDER',$4,false)
       RETURNING user_id, full_name, email, role`,
      [full_name, email, password_hash, phone_number || null]
    );

    res.status(201).json({
      status: 'success',
      message: 'Account created. An admin will review and activate your account shortly.',
      data: newUser.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error during signup' });
  }
};

// ── Step 1: Verify credentials → send OTP ────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ status: 'error', message: 'Please provide email and password' });

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

    const user = result.rows[0];
    if (!user.is_active)
      return res.status(403).json({ status: 'error', message: 'Account is deactivated' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate old OTPs
    await db.query('UPDATE otp_codes SET used = true WHERE user_id = $1 AND used = false', [user.user_id]);
    // Save new OTP
    await db.query('INSERT INTO otp_codes (user_id, code, expires_at) VALUES ($1,$2,$3)', [user.user_id, code, expiresAt]);

    // Send email
    try {
      await sendOtpEmail(user.email, user.full_name, code);
    } catch (mailErr) {
      console.error('Email send failed:', mailErr.message);
      console.log('\n========================================');
      console.log(`  OTP for ${user.email}: ${code}`);
      console.log('  (valid for 5 minutes)');
      console.log('========================================\n');
    }

    res.status(200).json({
      status: 'otp_sent',
      message: `Verification code sent to ${user.email}`,
      user_id: user.user_id,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error during login' });
  }
};

// ── Step 2: Verify OTP → issue JWT ───────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { user_id, code } = req.body;
    if (!user_id || !code)
      return res.status(400).json({ status: 'error', message: 'user_id and code are required' });

    const currentDate = new Date();
    const otpRes = await db.query(
      `SELECT * FROM otp_codes
       WHERE user_id=$1 AND code=$2 AND used=false AND expires_at > $3
       ORDER BY id DESC LIMIT 1`,
      [user_id, code, currentDate]
    );

    if (otpRes.rows.length === 0)
      return res.status(401).json({ status: 'error', message: 'Invalid or expired code. Try again.' });

    // Mark used
    await db.query('UPDATE otp_codes SET used=true WHERE id=$1', [otpRes.rows[0].id]);

    const userRes = await db.query(
      'SELECT user_id, full_name, email, role FROM users WHERE user_id=$1',
      [user_id]
    );
    const user = userRes.rows[0];

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({ status: 'success', message: 'Login successful', token, user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error during OTP verification' });
  }
};

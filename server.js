import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import xlsx from "xlsx";
import nodemailer from "nodemailer";
import { pool, initDb } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3005;
const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASS || "admin123";
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || smtpUser;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", true);

const now = () => new Date().toISOString();
const addMinutes = (minutes) =>
  new Date(Date.now() + minutes * 60 * 1000).toISOString();

const initPromise = initDb();

const query = (text, params) => pool.query(text, params);

const getUserByEmail = async (email) => {
  const result = await query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
};

const getUserById = async (id) => {
  const result = await query("SELECT id, email, balance FROM users WHERE id = $1", [id]);
  return result.rows[0];
};

const createUser = async (email, passwordHash) => {
  await query(
    "INSERT INTO users (email, password_hash, balance, created_at) VALUES ($1, $2, $3, $4)",
    [email, passwordHash, 0, now()]
  );
};

const createSession = async (token, userId) => {
  await query("INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)", [
    token,
    userId,
    now(),
  ]);
};

const getSession = async (token) => {
  const result = await query(
    "SELECT sessions.token, sessions.user_id, users.email, users.balance FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.token = $1",
    [token]
  );
  return result.rows[0];
};

const deleteSession = async (token) => {
  await query("DELETE FROM sessions WHERE token = $1", [token]);
};

const createAdminSession = async (token) => {
  await query("INSERT INTO admin_sessions (token, created_at) VALUES ($1, $2)", [token, now()]);
};

const getAdminSession = async (token) => {
  const result = await query("SELECT token, created_at FROM admin_sessions WHERE token = $1", [
    token,
  ]);
  return result.rows[0];
};

const deleteAdminSession = async (token) => {
  await query("DELETE FROM admin_sessions WHERE token = $1", [token]);
};

const insertEmailCode = async (email, code, expiresAt) => {
  await query(
    "INSERT INTO email_codes (email, code, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [email, code, expiresAt, now()]
  );
};

const getValidEmailCode = async (email, code) => {
  const result = await query(
    "SELECT * FROM email_codes WHERE email = $1 AND code = $2 AND expires_at > $3 ORDER BY id DESC LIMIT 1",
    [email, code, now()]
  );
  return result.rows[0];
};

const deleteEmailCodes = async (email) => {
  await query("DELETE FROM email_codes WHERE email = $1", [email]);
};

const insertLoginCaptcha = async (id, code, expiresAt) => {
  await query(
    "INSERT INTO login_captchas (id, code, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [id, code, expiresAt, now()]
  );
};

const getLoginCaptcha = async (id) => {
  const result = await query(
    "SELECT id, code, expires_at FROM login_captchas WHERE id = $1",
    [id]
  );
  return result.rows[0];
};

const deleteLoginCaptcha = async (id) => {
  await query("DELETE FROM login_captchas WHERE id = $1", [id]);
};

const addTransaction = async (userId, type, amount, balance) => {
  await query(
    "INSERT INTO transactions (user_id, type, amount, balance, created_at) VALUES ($1, $2, $3, $4, $5)",
    [userId, type, amount, balance, now()]
  );
};

const listTransactions = async (userId) => {
  const result = await query(
    "SELECT type, amount, balance, created_at FROM transactions WHERE user_id = $1 ORDER BY id DESC LIMIT 50",
    [userId]
  );
  return result.rows;
};

const listUsers = async () => {
  const result = await query(
    "SELECT id, email, balance, created_at FROM users ORDER BY id DESC"
  );
  return result.rows;
};

const listAllTransactions = async () => {
  const result = await query(
    "SELECT transactions.id, users.email, transactions.type, transactions.amount, transactions.balance, transactions.created_at FROM transactions JOIN users ON transactions.user_id = users.id ORDER BY transactions.id DESC"
  );
  return result.rows;
};

const updateBalance = async (balance, userId) => {
  await query("UPDATE users SET balance = $1 WHERE id = $2", [balance, userId]);
};

const updateLastLogin = async (ip, time, userId) => {
  await query("UPDATE users SET last_login_ip = $1, last_login_at = $2 WHERE id = $3", [
    ip,
    time,
    userId,
  ]);
};

const auth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "未登录" });
  }
  await initPromise;
  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ message: "会话无效" });
  }
  req.user = session;
  req.token = token;
  next();
};

const adminAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "未登录" });
  }
  await initPromise;
  const session = await getAdminSession(token);
  if (!session) {
    return res.status(401).json({ message: "会话无效" });
  }
  req.adminToken = token;
  next();
};

const sendMail = async ({ to, subject, text }) => {
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("邮件服务未配置");
  }
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
  });
};

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.post("/api/send-code", async (req, res) => {
  await initPromise;
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: "请输入邮箱" });
  }
  if (await getUserByEmail(email)) {
    return res.status(409).json({ message: "该邮箱已注册" });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = addMinutes(5);
  await deleteEmailCodes(email);
  await insertEmailCode(email, code, expiresAt);

  try {
    await sendMail({
      to: email,
      subject: "大肠粉平台注册验证码",
      text: `您的验证码是 ${code}，5分钟内有效。`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "发送失败" });
  }

  res.json({ success: true });
});

app.post("/api/register", async (req, res) => {
  await initPromise;
  const { email, password, code } = req.body || {};
  if (!email || !password || password.length < 6 || !code) {
    return res.status(400).json({ message: "邮箱、验证码或密码不符合要求" });
  }
  if (await getUserByEmail(email)) {
    return res.status(409).json({ message: "该邮箱已注册" });
  }
  const validCode = await getValidEmailCode(email, String(code).trim());
  if (!validCode) {
    return res.status(400).json({ message: "验证码无效或已过期" });
  }
  await deleteEmailCodes(email);

  const passwordHash = bcrypt.hashSync(password, 10);
  await createUser(email, passwordHash);
  const user = await getUserByEmail(email);

  const token = randomUUID();
  await createSession(token, user.id);

  res.json({ token, email: user.email, balance: user.balance });
});

const makeCaptchaSvg = (code) => {
  const letters = code.split("").join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="42" viewBox="0 0 120 42">
  <rect width="120" height="42" rx="6" fill="#f3f5ff"/>
  <text x="12" y="28" font-size="20" font-family="Arial" fill="#3e59e8" letter-spacing="3">${letters}</text>
  <line x1="8" y1="10" x2="112" y2="32" stroke="#c9d2ff" stroke-width="2"/>
  <line x1="8" y1="30" x2="112" y2="12" stroke="#d6ddff" stroke-width="2"/>
</svg>`;
};

const createCaptcha = async () => {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const id = randomUUID();
  const expiresAt = addMinutes(5);
  await insertLoginCaptcha(id, code, expiresAt);
  const svg = makeCaptchaSvg(code);
  return { id, svg };
};

app.get("/api/login-captcha", async (req, res) => {
  await initPromise;
  const { id, svg } = await createCaptcha();
  res.json({ id, svg });
});

app.get("/api/login-captcha.svg", async (req, res) => {
  await initPromise;
  const { id, svg } = await createCaptcha();
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Captcha-Id", id);
  res.send(svg);
});

app.post("/api/login", async (req, res) => {
  await initPromise;
  const { email, password, captcha, captchaId } = req.body || {};
  const user = await getUserByEmail(email || "");
  if (!user) {
    return res.status(401).json({ message: "账号或密码错误" });
  }
  if (!captchaId || !captcha) {
    return res.status(400).json({ message: "请输入验证码" });
  }
  const record = await getLoginCaptcha(String(captchaId));
  if (!record || new Date(record.expires_at) <= new Date()) {
    return res.status(400).json({ message: "验证码无效或已过期" });
  }
  if (String(captcha).trim() !== String(record.code)) {
    return res.status(400).json({ message: "验证码错误" });
  }
  await deleteLoginCaptcha(String(captchaId));

  const ok = bcrypt.compareSync(password || "", user.password_hash);
  if (!ok) {
    return res.status(401).json({ message: "账号或密码错误" });
  }

  const token = randomUUID();
  await createSession(token, user.id);
  const previousLogin = {
    ip: user.last_login_ip || "",
    time: user.last_login_at || "",
  };
  await updateLastLogin(req.ip, now(), user.id);
  res.json({
    token,
    email: user.email,
    balance: user.balance,
    lastLogin: previousLogin,
  });
});

app.post("/api/logout", auth, async (req, res) => {
  await deleteSession(req.token);
  res.json({ success: true });
});

app.get("/api/me", auth, async (req, res) => {
  const user = await getUserById(req.user.user_id);
  res.json({ email: user.email, balance: user.balance });
});

app.get("/api/transactions", auth, async (req, res) => {
  const rows = await listTransactions(req.user.user_id);
  res.json(rows);
});

app.post("/api/recharge", auth, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "请输入正确金额" });
  }

  const user = await getUserById(req.user.user_id);
  const newBalance = Number(user.balance) + amount;
  await updateBalance(newBalance, user.id);
  await addTransaction(user.id, "充值", amount, newBalance);

  res.json({ balance: newBalance });
});

app.post("/api/consume", auth, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "请输入正确金额" });
  }

  const user = await getUserById(req.user.user_id);
  if (Number(user.balance) < amount) {
    return res.status(400).json({ message: "余额不足" });
  }

  const newBalance = Number(user.balance) - amount;
  await updateBalance(newBalance, user.id);
  await addTransaction(user.id, "消费", amount, newBalance);

  res.json({ balance: newBalance });
});

app.post("/api/admin/login", async (req, res) => {
  await initPromise;
  const { username, password } = req.body || {};
  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ message: "管理员账号或密码错误" });
  }
  const token = randomUUID();
  await createAdminSession(token);
  res.json({ token, username });
});

app.post("/api/admin/logout", adminAuth, async (req, res) => {
  await deleteAdminSession(req.adminToken);
  res.json({ success: true });
});

app.get("/api/admin/users", adminAuth, async (req, res) => {
  res.json(await listUsers());
});

app.get("/api/admin/transactions", adminAuth, async (req, res) => {
  res.json(await listAllTransactions());
});

app.get("/api/admin/export", adminAuth, async (req, res) => {
  const users = await listUsers();
  const transactions = await listAllTransactions();
  const userSheet = xlsx.utils.json_to_sheet(users);
  const txSheet = xlsx.utils.json_to_sheet(transactions);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, userSheet, "users");
  xlsx.utils.book_append_sheet(workbook, txSheet, "transactions");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=\"export.xlsx\"");
  res.send(buffer);
});

if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export default app;

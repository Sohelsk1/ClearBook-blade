import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8000);
const HOST = "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-clearbook-secret";
const dataDir = join(dirname(fileURLToPath(import.meta.url)), "data");
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(join(dataDir, "clearbook.sqlite"));
db.exec(`
  create table if not exists docs (
    coll text not null,
    id text not null,
    user_id text,
    email text,
    category text,
    data text not null,
    primary key (coll, id)
  );
  create index if not exists docs_user on docs(coll, user_id);
  create index if not exists docs_email on docs(coll, email);
`);

const nowIso = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function rowToDoc(row) {
  if (!row) return null;
  return JSON.parse(row.data);
}

function findOne(coll, filter) {
  if (filter.email) {
    return rowToDoc(db.prepare("select data from docs where coll = ? and email = ?").get(coll, filter.email));
  }
  if (filter.id && filter.user_id) {
    return rowToDoc(db.prepare("select data from docs where coll = ? and id = ? and user_id = ?").get(coll, filter.id, filter.user_id));
  }
  if (filter.id) {
    return rowToDoc(db.prepare("select data from docs where coll = ? and id = ?").get(coll, filter.id));
  }
  return null;
}

function insert(coll, doc) {
  db.prepare("insert into docs (coll, id, user_id, email, category, data) values (?, ?, ?, ?, ?, ?)").run(
    coll,
    doc.id,
    doc.user_id || null,
    doc.email || null,
    doc.category || null,
    JSON.stringify(doc),
  );
}

function listItems(coll, userId) {
  const rows = db.prepare("select data from docs where coll = ? and user_id = ?").all(coll, userId);
  return rows.map((row) => {
    const doc = JSON.parse(row.data);
    delete doc.user_id;
    delete doc.password_hash;
    return doc;
  });
}

function updateItem(coll, userId, itemId, patch) {
  const current = findOne(coll, { id: itemId, user_id: userId });
  if (!current) return null;
  const next = { ...current, ...patch };
  db.prepare("update docs set email = ?, category = ?, data = ? where coll = ? and id = ?").run(
    next.email || null,
    next.category || null,
    JSON.stringify(next),
    coll,
    itemId,
  );
  const pub = { ...next };
  delete pub.user_id;
  delete pub.password_hash;
  return pub;
}

function deleteItem(coll, userId, itemId) {
  const res = db.prepare("delete from docs where coll = ? and id = ? and user_id = ?").run(coll, itemId, userId);
  return res.changes > 0;
}

function deleteMany(coll, userId, category) {
  db.prepare("delete from docs where coll = ? and user_id = ? and category = ?").run(coll, userId, category);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const hash = scryptSync(password, parts[1], 32);
  const expected = Buffer.from(parts[2], "hex");
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function makeToken(userId) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ sub: userId, exp: Date.now() + 30 * 86400000 }));
  const sig = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function readToken(header) {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const [h, b, s] = token.split(".");
  if (!h || !b || !s) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${h}.${b}`).digest("base64url");
  const a = Buffer.from(s);
  const c = Buffer.from(expected);
  if (a.length !== c.length || !timingSafeEqual(a, c)) return null;
  const payload = JSON.parse(Buffer.from(b, "base64url").toString());
  if (!payload.sub || payload.exp < Date.now()) return null;
  return findOne("users", { id: payload.sub });
}

function userOut(user) {
  return { id: user.id, name: user.name, email: user.email, currency: user.currency || "INR" };
}

function seedFor(userId) {
  const today = new Date();
  const d = (offset) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const expenses = [
    [d(-1), 480, "food", "Zomato dinner"],
    [d(-2), 220, "transport", "Uber to office"],
    [d(-3), 1899, "shopping", "Nykaa skincare"],
    [d(-4), 349, "entertainment", "Netflix"],
    [d(-5), 2450, "bills", "Electricity bill"],
    [d(-6), 620, "food", "Groceries"],
    [d(-7), 180, "transport", "Metro card recharge"],
    [d(-9), 4200, "travel", "Weekend trip"],
    [d(-10), 890, "health", "Pharmacy"],
    [d(-12), 260, "food", "Coffee & snacks"],
  ];
  const incomes = [
    [d(-1), 65000, "salary", "Monthly salary"],
    [d(-8), 12000, "freelance", "Website project"],
    [d(-15), 3200, "invest", "Dividend"],
  ];
  const budgets = [["food", 6000], ["transport", 2500], ["shopping", 4000], ["bills", 5000], ["entertainment", 2000]];
  const goals = [
    ["Emergency Fund", 200000, 85000, "2026-06-30", "#10b981"],
    ["Goa Trip", 40000, 22500, "2026-02-15", "#6366f1"],
    ["New MacBook", 150000, 42000, "2026-09-01", "#f59e0b"],
  ];
  for (const [date, amount, category, note] of expenses) {
    insert("expenses", { id: uuid(), user_id: userId, amount, category, date, note, created_at: nowIso() });
  }
  for (const [date, amount, source, note] of incomes) {
    insert("incomes", { id: uuid(), user_id: userId, amount, source, date, note, created_at: nowIso() });
  }
  for (const [category, limit] of budgets) {
    insert("budgets", { id: uuid(), user_id: userId, category, limit });
  }
  for (const [name, target, saved, deadline, color] of goals) {
    insert("goals", { id: uuid(), user_id: userId, name, target, saved, deadline, color });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (error) { reject(error); }
    });
  });
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  });
  res.end(payload);
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    });
    res.end();
    return;
  }
  const url = new URL(req.url || "/", "http://localhost");
  const path = url.pathname;
  try {
    if (req.method === "GET" && path === "/api") return send(res, 200, { message: "ClearBook API", ok: true });
    if (req.method === "GET" && path === "/api/") return send(res, 200, { message: "ClearBook API", ok: true });

    if (req.method === "POST" && path === "/api/auth/signup") {
      const body = await readBody(req);
      const email = String(body.email || "").toLowerCase().trim();
      if (!body.name || !email || !body.password) return send(res, 400, { detail: "Missing fields" });
      if (findOne("users", { email })) return send(res, 400, { detail: "Email already in use" });
      const user = {
        id: uuid(),
        name: String(body.name).trim() || "You",
        email,
        password_hash: hashPassword(String(body.password)),
        currency: "INR",
        created_at: nowIso(),
        user_id: undefined,
      };
      user.user_id = user.id;
      insert("users", user);
      seedFor(user.id);
      return send(res, 200, { token: makeToken(user.id), user: userOut(user) });
    }

    if (req.method === "POST" && path === "/api/auth/login") {
      const body = await readBody(req);
      const email = String(body.email || "").toLowerCase().trim();
      const user = findOne("users", { email });
      if (!user || !verifyPassword(String(body.password || ""), user.password_hash)) {
        return send(res, 401, { detail: "Invalid email or password" });
      }
      return send(res, 200, { token: makeToken(user.id), user: userOut(user) });
    }

    const user = readToken(req.headers.authorization);
    const needsUser = path.startsWith("/api/") && !path.startsWith("/api/auth/");
    if (needsUser && !user) return send(res, 401, { detail: "Not authenticated" });

    if (req.method === "GET" && path === "/api/me") return send(res, 200, { user: userOut(user) });
    if (req.method === "PATCH" && path === "/api/me") {
      const body = await readBody(req);
      const patch = {};
      if (body.name != null) patch.name = body.name;
      if (body.currency != null) patch.currency = body.currency;
      if (body.email != null) {
        patch.email = String(body.email).toLowerCase().trim();
        const other = findOne("users", { email: patch.email });
        if (other && other.id !== user.id) return send(res, 400, { detail: "Email already in use" });
      }
      const fresh = updateItem("users", user.id, user.id, patch) || userOut({ ...user, ...patch });
      return send(res, 200, { user: userOut(fresh.id ? { ...user, ...fresh } : fresh) });
    }

    const resources = {
      expenses: ["amount", "category", "date", "note"],
      incomes: ["amount", "source", "date", "note"],
      budgets: ["category", "limit"],
      goals: ["name", "target", "saved", "deadline", "color"],
    };
    const match = path.match(/^\/api\/(expenses|incomes|budgets|goals)(?:\/([^/]+))?$/);
    if (match) {
      const [, coll, itemId] = match;
      if (req.method === "GET" && !itemId) return send(res, 200, listItems(coll, user.id));
      if (req.method === "POST" && !itemId) {
        const body = await readBody(req);
        if (coll === "budgets" && body.category) deleteMany("budgets", user.id, body.category);
        const data = {};
        for (const key of resources[coll]) if (body[key] !== undefined) data[key] = body[key];
        if (coll === "goals" && data.saved == null) data.saved = 0;
        if (coll === "goals" && !data.color) data.color = "#10b981";
        const doc = { id: uuid(), user_id: user.id, ...data, created_at: nowIso() };
        insert(coll, doc);
        delete doc.user_id;
        return send(res, 200, doc);
      }
      if (req.method === "PUT" && itemId) {
        const body = await readBody(req);
        const data = {};
        for (const key of resources[coll]) if (body[key] !== undefined) data[key] = body[key];
        const updated = updateItem(coll, user.id, itemId, data);
        if (!updated) return send(res, 404, { detail: "Not found" });
        return send(res, 200, updated);
      }
      if (req.method === "DELETE" && itemId) {
        if (!deleteItem(coll, user.id, itemId)) return send(res, 404, { detail: "Not found" });
        return send(res, 200, { ok: true });
      }
    }

    if (req.method === "GET" && path === "/api/summary") {
      const expenses = listItems("expenses", user.id);
      const incomes = listItems("incomes", user.id);
      const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
      const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
      const savingsRate = totalIncome ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
      const byCat = {};
      for (const expense of expenses) byCat[expense.category] = (byCat[expense.category] || 0) + Number(expense.amount);
      const weekly = [...expenses].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 7).map((item) => ({ day: item.date, amount: item.amount }));
      const trend = {};
      for (const income of incomes) {
        const month = String(income.date || "").slice(0, 7);
        trend[month] = trend[month] || { income: 0, expenses: 0 };
        trend[month].income += Number(income.amount);
      }
      for (const expense of expenses) {
        const month = String(expense.date || "").slice(0, 7);
        trend[month] = trend[month] || { income: 0, expenses: 0 };
        trend[month].expenses += Number(expense.amount);
      }
      const yearTrend = Object.keys(trend).sort().map((month) => ({
        month,
        income: trend[month].income,
        expenses: trend[month].expenses,
        savings: trend[month].income - trend[month].expenses,
      }));
      let score = 78;
      if (totalIncome) score = Math.max(20, Math.min(100, Math.round(100 - (totalExpense / totalIncome) * 60)));
      const tier = score >= 75 ? "Great" : score >= 55 ? "Good" : "Watch";
      return send(res, 200, {
        totalIncome,
        totalExpense,
        remaining: totalIncome - totalExpense,
        savingsRate,
        byCategory: Object.entries(byCat).map(([category, amount]) => ({ category, amount })),
        weekly,
        yearTrend,
        spendScore: { score, trend: 6, tier },
      });
    }

    send(res, 404, { detail: "Not Found" });
  } catch (error) {
    send(res, 500, { detail: "Server error" });
  }
});

server.listen(PORT, HOST);
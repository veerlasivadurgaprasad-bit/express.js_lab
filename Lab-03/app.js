const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "books.db");
const PORT = process.env.PORT || 3000;
let db;

const SORT_FIELDS = ["id", "title", "author", "price", "pages"];
const INT_MAX = 2147483647;

// Error with an HTTP status attached. The error middleware at the
// bottom converts it into the standard { message } JSON response.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => new HttpError(status, message);

// ---------- query / path helpers ----------

// Returns the single string value of a query parameter, or the fallback
// when it is missing or empty. Repeated parameters (?a=1&a=2) are rejected.
function getQueryText(query, key, fallback) {
  const value = query[key];
  if (value === undefined || value === "") return fallback;
  if (typeof value !== "string") throw fail(400, `${key} must be given only once`);
  return value;
}

// Same, but the value must be a whole number between lo and hi.
function getQueryInt(query, key, fallback, lo, hi) {
  const text = getQueryText(query, key, null);
  if (text === null) return fallback;
  const n = Number(text);
  if (!Number.isInteger(n) || n < lo || n > hi) {
    throw fail(400, `${key} must be a whole number between ${lo} and ${hi}`);
  }
  return n;
}

function parseId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw fail(400, "bookId must be a positive whole number");
  }
  return n;
}

// % and _ are wildcards in LIKE; escape them so they match literally.
const escapeForLike = (s) => s.replace(/[\\%_]/g, (ch) => "\\" + ch);

// ---------- body validation (POST and PUT) ----------

function checkBookBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const { title, author, price, pages } = b;

  const isText = (v) => typeof v === "string" && v.trim().length > 0;
  const isWhole = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;

  if (!isText(title)) throw fail(400, "title is required and must be non-empty text");
  if (!isText(author)) throw fail(400, "author is required and must be non-empty text");
  if (!isWhole(price)) throw fail(400, "price is required and must be a whole number, 0 or more");
  if (!isWhole(pages)) throw fail(400, "pages is required and must be a whole number, 0 or more");

  return { title: title.trim(), author: author.trim(), price, pages };
}

// ---------- routes ----------

// List books: search, sort, price range, pagination
app.get("/books/", async (req, res) => {
  const q = req.query;
  const search = getQueryText(q, "search_q", "");
  const orderBy = getQueryText(q, "order_by", "id").toLowerCase();
  const order = getQueryText(q, "order", "ASC").toUpperCase();
  const limit = getQueryInt(q, "limit", 10, 1, 100);
  const offset = getQueryInt(q, "offset", 0, 0, INT_MAX);
  const minPrice = getQueryInt(q, "min_price", 0, 0, INT_MAX);
  const maxPrice = getQueryInt(q, "max_price", INT_MAX, 0, INT_MAX);

  if (!SORT_FIELDS.includes(orderBy)) {
    throw fail(400, `order_by must be one of: ${SORT_FIELDS.join(", ")}`);
  }
  if (order !== "ASC" && order !== "DESC") {
    throw fail(400, "order must be ASC or DESC");
  }
  if (minPrice > maxPrice) {
    throw fail(400, "min_price cannot be greater than max_price");
  }

  // orderBy and order are not user text any more: they passed the
  // whitelist checks above, so it is safe to place them in the SQL.
  // Everything else goes through ? placeholders.
  const books = await db.all(
    `SELECT id, title, author, price, pages
       FROM book
      WHERE title LIKE ? ESCAPE '\\'
        AND price BETWEEN ? AND ?
      ORDER BY ${orderBy} ${order}
      LIMIT ? OFFSET ?;`,
    [`%${escapeForLike(search)}%`, minPrice, maxPrice, limit, offset]
  );
  res.status(200).json(books);
});

// One book
app.get("/books/:bookId/", async (req, res) => {
  const id = parseId(req.params.bookId);
  const book = await db.get("SELECT * FROM book WHERE id = ?;", [id]);
  if (book === undefined) throw fail(404, "Book not found");
  res.status(200).json(book);
});

// Create
app.post("/books/", async (req, res) => {
  const { title, author, price, pages } = checkBookBody(req.body);
  const { lastID } = await db.run(
    "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);",
    [title, author, price, pages]
  );
  res.status(201).json({ message: "Book added", bookId: lastID });
});

// Replace all fields of an existing book
app.put("/books/:bookId/", async (req, res) => {
  const id = parseId(req.params.bookId);
  const { title, author, price, pages } = checkBookBody(req.body);
  const { changes } = await db.run(
    "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;",
    [title, author, price, pages, id]
  );
  if (changes === 0) throw fail(404, "Book not found");
  res.status(200).json({ message: "Book updated" });
});

// Delete
app.delete("/books/:bookId/", async (req, res) => {
  const id = parseId(req.params.bookId);
  const { changes } = await db.run("DELETE FROM book WHERE id = ?;", [id]);
  if (changes === 0) throw fail(404, "Book not found");
  res.status(200).json({ message: "Book deleted" });
});

// ---------- 404 and error handling ----------

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Express 5 passes errors thrown inside async routes to this handler.
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

// ---------- start ----------

async function main() {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
  } catch (e) {
    console.error(`Database error: ${e.message}`);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });

  // e.g. EADDRINUSE when the port is already taken
  server.on("error", (e) => {
    console.error(`Server error: ${e.message}`);
    process.exit(1);
  });
}

main();

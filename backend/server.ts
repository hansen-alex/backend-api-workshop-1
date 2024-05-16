import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mysql from "mysql2/promise";

type User = { id: number; username: string; password: string };
type Account = { id: number; userId: number; balance: number };
type Session = { userId: number; token: string };

const PORT = 3000;
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Generera engångslösenord
function generateOTP() {
  // Generera en sexsiffrig numerisk OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

const GetAuthTokenFromHeader = (request: any) => {
  return request.headers.authorization?.replace(/\D/g, "");
};

// Database connection
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "banksajt",
  port: 3306,
});

// Database query helper
async function query(sql: any, params: any) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// Endpoints:
app.post("/users", async (request, response) => {
  const { username, password } = request.body;
  let userId;

  try {
    const users = (await query("SELECT * FROM users WHERE username = ?", [username]) as User[]);
    if(users.length > 0) throw { status: 409, message: "Username already occupied. " };

    const result = await query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, password]
    );

    userId = (result as any).insertId;
  } catch (error: any) {
    console.log(error);
    
    response.status(error.status).send({ message: "Creating user. " + error.message });
    return;
  }

  try {
    await query("INSERT INTO accounts (userId) VALUES (?)", [userId]);

    response.status(201).send({ message: "User created" });
  } catch (error) {
    console.error(error);
    response.status(500).send("Error creating account for user. " + error);
  }
});

app.post("/sessions", async (request, response) => {
  const { username, password } = request.body;

  try {
    const result = (await query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    )) as User[];
    if (result.length < 1) throw new Error("No user found");

    const user: User = result[0];
    const token = generateOTP();
    const sessions = (await query("SELECT * FROM sessions WHERE userId = ?", [
      user.id,
    ])) as Session[];
    if (sessions.length < 1) {
      await query("INSERT INTO sessions (userId, token) VALUES(?, ?)", [
        user.id,
        token,
      ]);
    } else {
      await query("UPDATE sessions SET token = ? WHERE userId = ?", [
        token,
        user.id,
      ]);
    }

    response.status(200).send({ token: token });
  } catch (error) {
    console.error(error);
    response.status(500).send("Error signing in. " + error);
  }
});

app.post("/me/account", async (request, response) => {
  try {
    const sessionToken = GetAuthTokenFromHeader(request);
    const sessions = (await query("SELECT * FROM sessions WHERE token = ?", [
      sessionToken,
    ])) as Session[];
    if (sessions.length < 1) throw new Error("No session found.");
    const session = sessions[0];
    
    const accounts = (await query("SELECT * FROM accounts WHERE userID = ?", [
      session.userId,
    ])) as Account[];
    if (accounts.length < 1) throw new Error("No account found.");
    const account = accounts[0];
    
    const users = (await query("SELECT * FROM users WHERE id = ?", [session.userId]) as User[]);
    if(users.length < 1) throw new Error("No user found.")
    const user = users[0];

    response.status(200).send({ username: user.username, balance: account.balance });
  } catch (error) {
    console.error(error);
    response.status(500).send("Error fetching account. " + error);
  }
});

app.post("/me/account/transaction", async (request, response) => {
  const { amount } = request.body;

  try {
    const sessionToken = GetAuthTokenFromHeader(request);
    const sessions = (await query("SELECT * FROM sessions WHERE token = ?", [
      sessionToken,
    ])) as Session[];
    if (sessions.length < 0) throw new Error("No session found.");
    const session = sessions[0];

    const accounts = (await query("SELECT * FROM accounts WHERE userID = ?", [
      session.userId,
    ])) as Account[];
    if (accounts.length < 1) throw new Error("No account found.");
    const account = accounts[0];

    account.balance += amount;
    await query("UPDATE accounts SET balance = ? WHERE userId = ?", [
      account.balance,
      account.userId,
    ]);

    response.status(200).send({ balance: account.balance });
  } catch (error) {
    console.error(error);
    response.status(500).send("Error depositing to account. " + error);
  }
});

// Starta servern
app.listen(PORT, () => {
  console.log(`Bankens backend körs på http://localhost:${PORT}`);
});

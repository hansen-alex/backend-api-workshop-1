import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

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

const users: User[] = [];
const accounts: Account[] = [];
const sessions: Session[] = [];

const GetAuthToken = (request: any) => {
  return request.headers.authorization?.replace(/\D/g, "");
};

// Din kod här. Skriv dina routes:
app.post("/users", async (request, response) => {
  const { username, password } = request.body;

  try {
    users.push({ id: 0, username: username, password: password });
    accounts.push({ id: 0, userId: users[users.length - 1].id, balance: 0 });
    response.status(201).send(`User ${username} created`);
    // console.log(users);
    // console.log(accounts);
  } catch (error) {
    console.error(error);
    response.status(500).send("Error creating user. " + error);
  }
});

app.post("/sessions", async (request, response) => {
  try {
    sessions.push({ userId: 0, token: generateOTP() });
    response.status(200).send({ token: sessions[sessions.length - 1].token });
    // console.log(sessions);
  } catch (error) {
    console.error(error);
    response.status(500).send("Error signing in. " + error);
  }
});

app.post("/me/account", async (request, response) => {
  try {
    const sessionToken = GetAuthToken(request);
    const session = sessions.find((session) => session.token == sessionToken);
    if (!session) throw new Error("No session found.");

    const account = accounts.find(
      (account) => account.userId == session.userId
    );
    if (!account) throw new Error("No account found.");

    response.status(200).send({ balance: account.balance });
  } catch (error) {
    console.error(error);
    response.status(500).send("Error fetching account. " + error);
  }
});

app.post("/me/account/transaction", async (request, response) => {
  const { amount } = request.body;

  try {
    const sessionToken = GetAuthToken(request);
    const session = sessions.find((session) => session.token == sessionToken);
    if (!session) throw new Error("No session found.");

    const account = accounts.find(
      (account) => account.userId == session.userId
    );
    if (!account) throw new Error("No account found.");

    account.balance += amount;

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

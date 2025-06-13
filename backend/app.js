require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const menteeRoutes = require("./routes/menteeRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const jobRoutes = require("./routes/jobRoutes");
const meetingRoutes = require("./routes/meetingRoutes");

const session = require("express-session");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const prisma = require("./models/prismaClient");

const passport = require("passport");

const workshopRoutes = require("./routes/workshopRoutes");
const adminRoutes = require("./routes/adminRoutes");
const communityRoutes = require("./routes/communityRoutes");
const eventRoutes = require("./routes/eventRoutes");
const mentorStatRoutes = require("./routes/mentorStatRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Frontend URL
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.AUTH_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);
app.use(passport.authenticate("session"));

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/", userRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/mentee", menteeRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/event",eventRoutes);
app.use("/api/mentorStat", mentorStatRoutes);

require("express-ws")(app);
const chatRoutes = require("./routes/chatRoutes");
app.use("/api/chat", chatRoutes);

// Start server

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

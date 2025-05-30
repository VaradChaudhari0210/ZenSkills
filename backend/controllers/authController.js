const prisma = require("../models/prismaClient");
const nodemailer = require("nodemailer");
const LocalStrategy = require("passport-local");
const argon2 = require("argon2");
const { google } = require("googleapis");

const path = require("path");

const multer = require("multer");
const upload = multer({ dest: "uploads/files/" });

const googleAuthClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CLIENT_REDIRECT_URI,
);
exports.googleClient = googleAuthClient;

google.options({ auth: googleAuthClient });

const googlePeopleClient = google.people("v1");

const sendVerificationEmail = async (user, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // You can use your email provider
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
  });

  const verificationUrl = `http://localhost:5173/verify/callback?token=${token}&role=${user.role}`;

  await transporter.sendMail({
    from: '"Mentoring Platform" <no-reply@example.com>',
    to: user.email,
    subject: "Email Verification",
    html: `
      <h2>Verify Your Email</h2>
      <p>Please click the link below to verify your email:</p>
      <a href="${verificationUrl}">Verify Email</a>
    `,
  });
};

exports.login = new LocalStrategy(
  { usernameField: "email", passReqToCallback: true },
  async (req, email, password, done) => {
    const { role } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { account_id: { email, role } },
      });

      if (!user) {
        done("User not found. Check email and role.", false);
        return;
      }

      if (await argon2.verify(user.password, password)) {
        //for blocking the mentor logging until the mentor is verified
        if (role === "mentor" && !user.credentialsVerified) {
          done("Credentials verification process still ongoing.", false);
          return;
        }
        done(null, user);
      } else {
        done("Wrong credentials.", false);
      }
    } catch (err) {
      done(err);
    }
  },
);

exports.register = async (req, res) => {
  const { email, password, phoneNum, role } = req.body;

  if (
    (await prisma.user.existsUnique({ account_id: { email, role } })) ||
    (await prisma.tempuser.existsUnique({ account_id: { email, role } }))
  ) {
    return res.sendStatus(409);
  }

  const hashedPassword = await argon2.hash(password);

  try {
    await prisma.tempuser.create({
      data: {
        email: email,
        password: hashedPassword,
        phone_number: phoneNum,
        role: role,
      },
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
};

exports.sendEmail = (user, token) => {
  return sendVerificationEmail(user, token);
};

exports.verifyEmail = async (user) => {
  const tempuser = await prisma.tempuser.findUnique({
    where: {
      account_id: {
        email: user.email,
        role: user.role,
      },
    },
  });

  const newUser = await prisma.user.create({
    data: {
      email: tempuser.email,
      password: tempuser.password,
      phone_number: tempuser.phone_number,
      role: tempuser.role,
      is_deleted: false,
      status: "active",
      is_verified: true,
    },
  });

  await prisma.tempuser.delete({ where: { id: tempuser.id } });

  return newUser;
};

async function getGoogleEmailAddress() {
  const response = await googlePeopleClient.people.get({
    resourceName: "people/me",
    personFields: "emailAddresses",
  });

  return response.data.emailAddresses[0].value;
}

exports.googleCallback = async (req, done) => {
  const { code, role } = req.body;

  try {
    const { tokens } = await googleAuthClient.getToken(code);
    googleAuthClient.setCredentials(tokens);

    const email = await getGoogleEmailAddress();

    const user = await prisma.user.upsert({
      include: {
        mentee: role === "mentee",
        mentor: role === "mentor",
      },
      where: {
        account_id: {
          email,
          role,
        },
      },
      update: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiryDate: new Date(tokens.expiry_date),
      },
      create: {
        email,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiryDate: new Date(tokens.expiry_date),
        status: "active",
        is_deleted: false,
        password: "",
        role,
      },
    });

    if (role === "mentor" && user.mentor) {
      if (!user.credentialsVerified) {
        done("Credentials verification process still ongoing.", false);
        return;
      }
      req.isRegistered = true;
    } else if (role === "mentee" && user.mentee) {
      req.isRegistered = true;
    } else {
      req.isRegistered = false;
    }

    done(null, user);
  } catch (err) {
    done(err);
  }
};

exports.logout = function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.sendStatus(200);
  });
};

exports.uploadDocuments = async (req, res) => {
  await prisma.MentorVerification.create({
    data: {
      government_id: {
        create: {
          filename: req.files["government_id"][0].originalname,
          path: req.files["government_id"][0].path,
          size: req.files["government_id"][0].size,
          mimeType: req.files["government_id"][0].mimetype,
        },
      },
      degree_certificate: {
        create: {
          filename: req.files["degree_certificate"][0].originalname,
          path: req.files["degree_certificate"][0].path,
          size: req.files["degree_certificate"][0].size,
          mimeType: req.files["degree_certificate"][0].mimetype,
        },
      },
      additional_file: {
        create: {
          filename: req.files["additional_file"][0].originalname,
          path: req.files["additional_file"][0].path,
          size: req.files["additional_file"][0].size,
          mimeType: req.files["additional_file"][0].mimetype,
        },
      },
      work_email: req.body.work_email,
      linkedin_profile: req.body.linkedin,
      additional_info: req.body.additional_info,
      government_id_type: req.body.government_id_type,
      user: {
        connect: {
          id: req.user.id,
        },
      },
    },
  });

  // Send verification email to the mentor's work email
  await sendWorkEmail(req.body.work_email);
  res
    .status(201)
    .json({ message: "Mentor verification submitted successfully" });
};

exports.getDocument = async (req, res) => {
  const { id } = req.params;

  const document = await prisma.document.findUnique({
    where: {
      id,
    },
  });

  if (!document) {
    return res.sendStatus(404);
  }

  const startPath = path.join(__dirname, "..");
  const fullPath = path.join(startPath, document.path);

  res.download(fullPath, document.filename);
};

const sendWorkEmail = async (work_email) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // You can use your email provider
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
  });

  await transporter.sendMail({
    from: '"Mentoring Platform" <no-reply@example.com>',
    to: work_email,
    subject: "Mentor Verification Submitted",
    html: `
      <h2>Mentor Verification Submitted</h2>
      <p>Your mentor verification details have been submitted successfully. Please wait until your credentials are verified by the admin.</p>
      <p>We will get back to you within 48 hours</p>`,
  });
};

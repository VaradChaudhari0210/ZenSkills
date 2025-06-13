import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "../../node_modules/bootstrap/dist/css/bootstrap.min.css";
// import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "../styles/style.css";
import "../styles/custom.scss";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Upcoming from "./Upcoming.jsx";
import Register from "./Register.jsx";
import Login from "./Login.jsx";
import RegisterUserInfo from "./RegisterUserInfo.jsx";
import RegisterProfession from "./RegisterProfession.jsx";
import RegisterBio from "./RegisterBio.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import MenteeWelcome from "./MenteeWelcome.jsx";
import MentorWelcome from "./MentorWelcome.jsx";
import ExploreMentor from "./ExloreMentors.jsx";
import VerifyEmailCallback from "./VerifyEmailCallback.jsx";

import UserInfo from "../components/UserInfo.jsx";
import ProfileCard from "../components/ProfileCard.jsx";
import MenteeProfile from "./MenteeProfile.jsx";
import MenteeExploring from "./MenteeExploring.jsx";
import Milestone from "../components/Milestones.jsx";
import JobList from "./Jobs.jsx";
import Workshops from "./Workshop.jsx";
import JobDetails from "./JobDetails.jsx";
import SessionForm from "./CreateSession_1.jsx";
import SessionForm1 from "./CreateSession2.jsx";
import Meeting from "./Meeting.jsx";
import WorkshopDetails from "./WorkshopDetails.jsx";
import Sessions from "./Sessions.jsx";
import Dashboard from "./Dashboard.jsx";
import UserProfile from "./UserProfile.jsx";
import Chat from "./Chat.jsx";
import CreateJobs from "./CreateJobs.jsx";
import CreateWorkshop from "./CreateWorkshop.jsx";
import LandingPage from "./LandingPage.jsx";
import BookSession from "./BookSession.jsx";
import Error from "./Error.jsx";
import Community from "./Community.jsx";
import Question from "./Question.jsx";
import BlankPage from "./blank.jsx";
import RegisterTimeSlots from "./RegisterTimeSlots.jsx";
import AdminPage from "./Admin.jsx";
import Verification from "./Verification.jsx";

import UpdateTimeSlots from "./UpdateTimeSlots.jsx";
import Referrals from "./Referrals.jsx";
import ReferralRequests from "./referral_request.jsx";
import MentorStats from "./MentorStats.jsx";


const mentor = {
  id: "id",
  name: "mentor",
  rating: 4.5,
  currentPost: "Test Architecture manager at Align",
  noOfSessions: 19,
  noOfReviews: 4,
  // Experience: 23,
  experienceYears: 10,
  experienceMonths: 7,
  creditScore: 95,
};
const eventdetails = {
  name: "Bergen International Film Festival",
  desc: " Films from all over the world gather all film enthusiasts for unique moments at the Bergen International Film Festival.",
  date: "28/11",
  time: "17:00",
};

const demoTags = [
  "Technology",
  "IT",
  "Computer",
  "Engineering",
  "Blockchain",
  "Gaming",
  "Education",
  "Web Development",
];

// const mentors = Array(12).fill(mentor);
// these are the hardcoded mentors on welcome page for testing purposes
const mentors = [
  // {
  //   id: "mentor_001",
  //   name: "Alice Johnson",
  //   rating: 4.8,
  //   currentPost: "Senior Data Scientist at Google",
  //   noOfSessions: 25,
  //   noOfReviews: 8,
  //   experienceYears: 12,
  //   experienceMonths: 3,
  //   creditScore: 98,
  // },
  // {
  //   id: "mentor_002",
  //   name: "Bob Martinez",
  //   rating: 4.2,
  //   currentPost: "DevOps Engineer at Amazon",
  //   noOfSessions: 15,
  //   noOfReviews: 6,
  //   experienceYears: 8,
  //   experienceMonths: 10,
  //   creditScore: 92,
  // },
  // {
  //   id: "mentor_003",
  //   name: "Chloe Kim",
  //   rating: 4.9,
  //   currentPost: "Lead UX Designer at Adobe",
  //   noOfSessions: 30,
  //   noOfReviews: 12,
  //   experienceYears: 14,
  //   experienceMonths: 2,
  //   creditScore: 99,
  // },
  // {
  //   id: "mentor_004",
  //   name: "David Patel",
  //   rating: 4.7,
  //   currentPost: "AI Researcher at OpenAI",
  //   noOfSessions: 40,
  //   noOfReviews: 20,
  //   experienceYears: 11,
  //   experienceMonths: 6,
  //   creditScore: 96,
  // },
  // {
  //   id: "mentor_005",
  //   name: "Emily Wright",
  //   rating: 4.5,
  //   currentPost: "Blockchain Developer at IBM",
  //   noOfSessions: 18,
  //   noOfReviews: 7,
  //   experienceYears: 9,
  //   experienceMonths: 8,
  //   creditScore: 94,
  // },
];

const events = Array(6).fill(eventdetails);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <Error />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      }, {
        path: "admin",
        element: <AdminPage />
      },
      {
        path: "upcoming",
        element: <Upcoming />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register/1",
        element: <RegisterUserInfo />,
      },
      {
        path: "register/2",
        element: <RegisterProfession />,
      },
      {
        path: "register/3",
        element: <RegisterBio />,
      },
      {
        path: "register/4",
        element: <RegisterTimeSlots />,
      },
      {
        path: "mentee_welcome",
        element: <MenteeWelcome mentors_={mentors} events_={events} />,
      },
      {
        path: "mentor_welcome",
        element: <MentorWelcome events_={events} />,
      },
      {
        path: "explore",
        // element: <ExploreMentor/>
        element: <ExploreMentor mentors_={mentors} demoTags={demoTags} />,
        // this array is just passed for test/preview
      },
      {
        path: "verify/callback",
        element: <VerifyEmailCallback />,
      },
      {
        path: "mentee_profile/:menteeId",
        element: <MenteeProfile />,
      },
      {
        path: "profilecard",
        element: <ProfileCard />,
      },
      {
        path: "mentee_exploring/:mentorId",
        element: <MenteeExploring />,
      },
      {
        path: "milestone",
        element: <Milestone />,
      },
      {
        path: "jobs",
        element: <JobList />,
      },
      {
        path: "jobs/:jobId",
        element: <JobDetails />,
      },
      // {
      //   path: "jobdetails",
      //   element: <JobDetails/>
      // },
      {
        path: "workshops",
        element: <Workshops demoTags={demoTags} />,
      },
      {
        path: "workshops/:workshopId",
        element: <WorkshopDetails />,
      },
      {
        path: "createsession_1",
        element: <SessionForm />,
      },
      {
        path: "createsession_2",
        element: <SessionForm1 />,
      },
      {
        path: "meeting",
        element: <Meeting />,
      },
      {
        path: "meeting/:meetingId",
        element: <Meeting />
      },
      {
        path: "sessions",
        element: <Sessions />
      },
      {
        path: "user_profile",
        element: <UserProfile _isEditing={false} />,
      },
      {
        path: "edit_profile",
        element: <UserProfile _isEditing={true} />,
      },
      {
        path: "chat",
        element: <Chat />
      },
      {
        path: "create_job",
        element: <CreateJobs />
      },
      {
        path: "create_workshop",
        element: <CreateWorkshop />
      },
      {
        path: "book_session/:availableSessionId",
        element: <BookSession />
      }, {
        path: "community",
        element: <Community />
      }, {
        path: "community/:questionId",
        element: <Question />
      },
      {
        path: "landing_page",
        element: <LandingPage />
      },
      {
        path: "admin",
        element: <AdminPage />
      },
      {
        path: "verification",
        element: <Verification />
      },
      {
        path: "update_slots",
        element: <UpdateTimeSlots />
      },
      {
        path: "referrals",
        element: <Referrals />
      },
      {
        path: "referral_request",
        element: <ReferralRequests />,
      },
      {
        path: "mentorstats",
        element: <MentorStats />,
      },
    ],
  }, {
    path: "/landing-page",
    element: <LandingPage />,
  }
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </StrictMode>
);

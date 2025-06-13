import {
  Col,
  Container,
  Row,
  Form,
  Button,
  Card,
  ProgressBar,
  Spinner,
} from "react-bootstrap";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { GiHand } from "react-icons/gi";
import { MdKeyboardArrowRight, MdClose } from "react-icons/md";
import { PiPlantFill } from "react-icons/pi";
import { Link } from "react-router-dom";
import { MdOutlineKeyboardDoubleArrowRight } from "react-icons/md";
import { RiCopperCoinLine } from "react-icons/ri";
import EventCard from "../components/Events";
import MentorCard from "../components/MentorCard";
import axios from "axios";
import useProfile from "../hooks/useProfile";
import Calendar from "../components/Calendar";
import { axiosInstance } from "../apis/commons";
import { fetchMentors } from "../apis/explore";
import { getAllWorkshops } from '../apis/workshops';

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" />

const API_URL = import.meta.env.VITE_API_URL;

const DUMMY_WORKSHOPS = [
  {
    id: 1,
    title: "Web Development",
    date: new Date("2024-03-01"),
    description: "Learn the basics of HTML, CSS, and JavaScript in this comprehensive workshop designed for beginners. Build your first responsive website from scratch!",
    instructor: "John Doe",
    duration: "2 hours",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 2,
    title: "React.js for Beginners",
    date: new Date("2024-03-15"),
    description: "Master the fundamentals of React.js, including components, state management, and hooks. Perfect for those looking to build modern web applications.",
    instructor: "Jane Smith",
    duration: "3 hours",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 3,
    title: "Data Structures & Algorithms",
    date: new Date("2024-03-20"),
    description: "Deep dive into essential data structures and algorithms. Improve your problem-solving skills and ace technical interviews.",
    instructor: "Mike Johnson",
    duration: "4 hours",
    image: "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 4,
    title: "UI/UX Design Principles",
    date: new Date("2024-03-25"),
    description: "Learn the core principles of user interface and user experience design. Create beautiful, intuitive designs that users will love.",
    instructor: "Sarah Williams",
    duration: "2.5 hours",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: 5,
    title: "Machine Learning Basics",
    date: new Date("2024-04-01"),
    description: "Introduction to machine learning concepts and practical applications. Build your first ML model using Python and popular libraries.",
    instructor: "David Chen",
    duration: "3 hours",
    image: "https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  }
];

function MenteeWelcome({ mentors_, events_ }) {
  const [mentors, setMentors] = useState(mentors_);
  const [workshops, setWorkshops] = useState(DUMMY_WORKSHOPS);

  const { profile, isProfileLoading } = useProfile();

  const userName = profile?.name || "User";

  const [tasks, setTasks] = useState([
    { label: "Complete your profile", done: true },
    { label: "Book your first session", done: false },
  ]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isVisible) {
      setIsVisible(!tasks.every((task) => task.done));
    }
  }, [tasks])

  const [events, setEvents] = useState(events_);
  const progress = useMemo(() => {
    let done = 0;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].done) {
        done++;
      }
    }
    return (done / tasks.length) * 100;
  }, [tasks]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const allCompleted = tasks.every((task) => task.done);

  const profilestatus = "Beginner";

  const navigate = useNavigate();

  // Fetch mentors and events
  useEffect(() => {
    async function fetchData() {
      try {
        const mentorsResponse = await axios.post(
          `${API_URL}/api/mentors/recommendations`,
          {},
          { withCredentials: true }
        );
        setMentors(mentorsResponse.data.mentors || []);
        // Workshop fetch removed since we're using dummy data
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    }
    fetchData();
  }, []);

  if (isProfileLoading) {
    return (
      <div className="d-flex h-100 w-100 justify-content-center align-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Container className="d-flex flex-column gap-4 px-md-4 " fluid>
      {/* Greeting Section */}
      <div className="pt-0">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h2 className="fw-bold">Hello, {userName}!</h2>
          <GiHand size={"2rem"} color="#ffa426" />
        </div>
        <div>
          {mentors.length === 0 && (
            <h6 style={{ color: "#436DA7" }} className="m-0">
              You have no upcoming sessions.
            </h6>
          )}
        </div>
      </div>

      <div className="d-flex gap-4 mb-4" >
        {/* Tour Guide Section - Left Side */}
        <div className="flex-grow-1" style={{ marginRight: "100px", width: "800px" }}>
          <div
            className="d-grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(2, 1fr)'
            }}
          >
            {/* AI-Powered Search Card */}
            <Card
              className="h-100 border-0 shadow-sm hover-lift"
              style={{
                background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
                transition: "transform 0.2s",
                cursor: "pointer",
              }}
              onClick={() => {
                localStorage.setItem('openAIModal', 'true');
                navigate("/explore");
              }}
            >
              <Card.Body className="d-flex flex-column gap-2 p-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle p-3"
                    style={{ background: "rgba(25, 118, 210, 0.2)" }}
                  >
                    <i className="bi bi-robot fs-4" style={{ color: "#1976d2" }}></i>
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1">AI-Powered Mentor Search</h4>
                    <p className="text-muted mb-0">Find the perfect mentor using our intelligent AI assistant</p>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Community Card */}
            <Card
              className="h-100 border-0 shadow-sm hover-lift"
              style={{
                background: "linear-gradient(135deg, #f8e5ff, #ecd6ff)",
                transition: "transform 0.2s",
                cursor: "pointer",
              }}
              onClick={() => navigate("/community")}
            >
              <Card.Body className="d-flex flex-column gap-2 p-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle p-3"
                    style={{ background: "rgba(147, 51, 234, 0.2)" }}
                  >
                    <i className="bi bi-people-fill fs-4" style={{ color: "#9333ea" }}></i>
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1">Community</h4>
                    <p className="text-muted mb-0">Connect with peers and share experiences</p>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Workshops Card */}
            <Card
              className="h-100 border-0 shadow-sm hover-lift"
              style={{
                background: "linear-gradient(135deg, #f3f9f1, #e7f4e4)",
                transition: "transform 0.2s",
                cursor: "pointer",
              }}
              onClick={() => navigate("/workshops")}
            >
              <Card.Body className="d-flex flex-column gap-2 p-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle p-3"
                    style={{ background: "rgba(3, 127, 125, 0.2)" }}
                  >
                    <i className="bi bi-laptop fs-4" style={{ color: "#037f7d" }}></i>
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1">Workshops</h4>
                    <p className="text-muted mb-0">Join interactive learning sessions</p>
                  </div>

                </div>

              </Card.Body>
            </Card>

            {/* Sessions Card */}
            <Card
              className="h-100 border-0 shadow-sm hover-lift"
              style={{
                background: "linear-gradient(135deg, #fff7e6, #fff0cc)",
                transition: "transform 0.2s",
                cursor: "pointer",
              }}
              onClick={() => navigate("/sessions")}
            >
              <Card.Body className="d-flex flex-column gap-2 p-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle p-3"
                    style={{ background: "rgba(255, 164, 38, 0.2)" }}
                  >
                    <i className="bi bi-calendar-event fs-4" style={{ color: "#ffa426" }}></i>
                  </div>
                  <div>
                    <h4 className="fw-bold mb-1">Sessions</h4>
                    <p className="text-muted mb-0">Schedule and manage your mentoring sessions</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Calendar Section - Right Side */}
        <div style={{ width: '400px', flexShrink: 0 }}>
          <Calendar profile={profile} />
        </div>
      </div>

      {/* Then continue with the Recommendations sections */}

      <Row>

        <Col md={8} className="d-flex flex-column gap-4">

          {/* {isVisible && (
            <Card className="shadow-sm">
              <Card.Body className="d-flex flex-column gap-3">
                <div className="d-flex">
                  <div className="flex-grow-1">
                    <h3 className="fw-bold">Let's start with the basics</h3>
                    <h6 style={{ color: "#436DA7" }}>
                      Get more by setting up a profile you love.
                    </h6>
                  </div>
                  <div className="d-flex flex-column justify-content-between align-items-end ms-auto">
                    <MdClose style={{ cursor: "pointer" }} onClick={handleClose} />
                    <h6 style={{ color: "#436DA7" }}>{Math.floor(progress)}% completed</h6>
                  </div>
                </div>
                <ProgressBar now={progress} />
                {tasks.map((value, index) => (
                  <Form.Group
                    key={index}
                    className="d-flex align-content-center gap-2"
                  >
                    <Form.Check className="pe-none" checked={value.done} />
                    <Form.Label
                      className={`${value.done ? "text-decoration-line-through" : ""
                        }`}
                      style={{ color: "#037f7d" }}
                    >
                      {value.label}
                    </Form.Label>
                  </Form.Group>
                ))}
              </Card.Body>
            </Card>
          )}*/}

          {/* Recommended Mentors Section */}
          <div >
            <h3 className="fw-bold">Recommended Mentors</h3>
            <h6 style={{ color: "#436DA7" }} className="m-0">
              Find the right mentor for your goals—handpicked by our AI, perfectly tailored to your needs!
            </h6>
          </div>

          {/* Mentors Horizontal Scroll */}
          <div
            className="d-flex overflow-auto pb-3"
            style={{
              gap: "1rem",
              scrollbarWidth: "thin",
              scrollBehavior: "smooth",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
              width: "89vw"
            }}
          >
            {mentors.length > 0 ? (
              mentors.map((mentor) => (
                <div
                  key={mentor.id}
                  style={{
                    flex: "0 0 auto",
                    width: "300px"
                  }}
                >
                  <MentorCard mentor={mentor} width_={"100%"} />
                </div>
              ))
            ) : (
              <p>No mentors available.</p>
            )}
          </div>

          {/* Recommended Workshops Section */}
          <div>
            <h3 className="fw-bold">Recommended Workshops</h3>
            <h6 style={{ color: "#436DA7" }} className="m-0">
              Enhance your skills with our curated workshops
            </h6>
          </div>

          {/* Workshops Horizontal Scroll */}
          <div
            className="d-flex overflow-auto pb-3"
            style={{
              gap: "1rem",
              scrollbarWidth: "thin",
              scrollBehavior: "smooth",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
              width:"89vw"
            }}
          >
            {workshops.length > 0 ? (
              workshops.map((workshop) => (
                <div
                  key={workshop.id}
                  style={{
                    flex: "0 0 auto",
                    width: "300px"
                  }}
                >
                  <Card className="h-100 shadow-sm">
                    <Card.Img
                      variant="top"
                      src={workshop.image}
                      style={{
                        height: '160px',
                        objectFit: 'cover',
                        borderTopLeftRadius: 'calc(0.375rem - 1px)',
                        borderTopRightRadius: 'calc(0.375rem - 1px)'
                      }}
                    />
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Card.Title className="mb-0">{workshop.title}</Card.Title>
                      </div>
                      <div className="d-flex gap-2 mb-2">
                        <small className="text-muted">
                          <i className="bi bi-calendar me-1"></i>
                          {new Date(workshop.date).toLocaleDateString()}
                        </small>
                        <small className="text-muted">
                          <i className="bi bi-clock me-1"></i>
                          {workshop.duration}
                        </small>
                      </div>
                      <Card.Text className="mb-2" style={{ fontSize: '0.9rem' }}>
                        {workshop.description.length > 100
                          ? `${workshop.description.substring(0, 100)}...`
                          : workshop.description}
                      </Card.Text>
                      <div className="mt-auto">
                        <Button
                          variant="outline-primary"
                          onClick={() => navigate(`/workshops/${workshop.id}`)}
                          className="w-100"
                        >
                          View Details
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))
            ) : (
              <p>No workshops available.</p>
            )}
          </div>

          {/* <div>
            <h3 className="fw-bold">Events</h3>
            <h6 style={{ color: "#436DA7" }} className="m-0">
              To help you connect and grow.
            </h6>
          </div>
          <div
            className="d-flex flex-wrap gap-4 justify-content-start"
            style={{ maxWidth: "100%" }}
          >
            {events.length > 0 ? (
              events.map((event) => <EventCard key={event.id} event={event} />)
            ) : (
              <p>No events available.</p>
            )}
          </div> */}
        </Col>

        {/* Sidebar Section */}

        {/* <Card
              text="primary"
              bg="white"
              border="primary"
              className="mb-5 mt-5"
              style={{ width: "320px", height: "160px", color: "#ffa426", boxShadow: '6px 6px 10px gray' }}
            >
              <Card.Body>
                <Card.Title className="mt-3 py-0 mb-0"
                  style={{ fontSize: "15px", textAlign: 'center' }}>Showcase wins, amplify your impact</Card.Title>
                <Card.Text className="mx-3 mt-2" style={{ fontSize: "13px", textAlign: 'center' }}>
                  Share profile, get more bookings
                </Card.Text>
                  <div className="d-flex justify-content-center">
                  <Button
                    className="custom-hover-button"
                    style={{
                      backgroundColor: "white",
                      color: "#0E003F",
                      fontWeight: "bold",
                      borderRadius: "10px",
                      border: "1px solid #0E003F",

                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              </Card.Body>
            </Card>*/}


      </Row>
    </Container >

  );
}

export default MenteeWelcome;

import { useState, useEffect } from "react";
import ReactPaginate from "react-paginate";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { axiosInstance } from "../apis/commons";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random&name=";

export default function Question() {
  const navigate = useNavigate();
  const { questionId } = useParams();
  console.log("question: ", questionId)
  const [comment, setComment] = useState("")
  const [question, setQuestion] = useState(null)
  const [showError, setShowError] = useState(false);

  function getTime(time) {
    const current = new Date();
    time = new Date(time);
    if (time.getFullYear() !== current.getFullYear())
      return current.getFullYear() - time.getFullYear() + " years";
    if (time.getMonth() !== current.getMonth())
      return current.getMonth() - time.getMonth() + " months";
    if (time.getDate() !== current.getDate())
      return current.getDate() - time.getDate() + " days";
    if (time.getHours() !== current.getHours())
      return current.getHours() - time.getHours() + " hours";
    if (time.getMinutes() !== current.getMinutes())
      return current.getMinutes() - time.getMinutes() + " minutes";
    if (time.getSeconds() !== current.getSeconds())
      return current.getSeconds() - time.getSeconds() + " seconds";
  }

  let [currentPage, setCurrentPage] = useState(0);
  let [totalPages, setTotalPages] = useState(0);
  let [answers, setAnswers] = useState([]);
  const limit = 3;

  async function getque() {
    setQuestion((await axiosInstance.get(`${API_URL}/api/community/questions/${questionId}`)).data)
  }

  useEffect(() => {
    getque()
  }, [])

  async function getAnswers() {
    // call api for questions/blogs
    try {
      const responce = await axiosInstance.get(`${API_URL}/api/community/answers/${questionId}`, {
        params: {
          currentPage, limit
        }
      });
      setAnswers(responce.data)
    } catch (error) {
      console.log("error on client: ", error);
    }
  }

  async function postAnswer() {
    console.log("posting")
    try {
      const response = await axiosInstance.post(`${API_URL}/api/community/questions/${questionId}/answer`, {
        answer: comment
      });
      setComment("")
    } catch (error) {
      console.log("error posting answer: ", error);
    }
  }

  async function handleSubmit() {
    // Show error state when submit is clicked
    setShowError(true);

    // Validate comment before posting
    if (!comment || comment.trim().length === 0) {
      alert('Answer cannot be empty');
      return;
    }

    console.log("submit clicked")
    await postAnswer()
    console.log("posted")
    await getAnswers()
    console.log(answers)
    // Reset error state after successful submission
    setShowError(false);
  }

  useEffect(() => {
    getAnswers()
    console.log(answers)
  }, [currentPage]);

  return (
    <div className="p-2">
      {/* back button */}
      <button 
        className="btn btn-outline-primary mb-3"
        onClick={() => navigate('/community')}
      >
        <i className="fas fa-arrow-left me-2"></i>
        Back to Community
      </button>

      {/* question */}
      {question !== null && <div className="bg-body-secondary p-3 rounded">
        <p className="fw-bold fs-3">{question?.question}</p>
        <div className="d-flex align-items-center my-2">
          <img
            src={question?.user?.image || `${DEFAULT_AVATAR}${encodeURIComponent(question?.user?.name || 'User')}`}
            alt={`${question?.user?.name || 'User'}'s avatar`}
            className="rounded-circle"
            width="40"
            height="40"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `${DEFAULT_AVATAR}${encodeURIComponent('User')}`;
            }}
          />
          <div className="d-flex flex-column justify-content-around">
            <div>
              <span className="mx-2 fw-semibold">
                {question?.user?.name}
              </span>
              {question?.user?.role === "mentor" ? (
                <span className="bg-success rounded px-2 text-white">
                  Mentor
                </span>
              ) : null}
            </div>
            <span className="fw-light mx-2">
              {question?.user?.profession}
            </span>
          </div>
        </div>
      </div>}

      {/* user answer */}
      <div className="m-2 d-flex gap-3">
        <img
          src={`${DEFAULT_AVATAR}User`}
          alt="User's avatar"
          className="rounded-circle"
          style={{ width: "40px", height: "40px" }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `${DEFAULT_AVATAR}${encodeURIComponent('User')}`;
          }}
        />
        <textarea
          placeholder="Write your answer here..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={1}
          className={`form-control ${showError && !comment.trim() ? 'is-invalid' : ''}`}
          style={{
            width: '100%',
            padding: '5px 0',
            fontSize: '16px',
            border: 'none',
            borderBottom: '2px solid #ccc',
            resize: 'none',
            overflow: 'hidden',
            outline: 'none',
          }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
        />
        <button
          className="btn btn-info border"
          onClick={handleSubmit}
          disabled={!comment.trim()}
        >
          Submit
        </button>
      </div>

      {/* answers */}
      <div className="p-2">
        {/* <p className="fw-medium">{} Answers</p> */}
        <div>
          {answers?.map((answer) => {
            return (
              <div>
                <div className="d-flex align-items-center m-2">
                  <img
                    src={answer.user.image || `${DEFAULT_AVATAR}${encodeURIComponent(answer.user.name || 'User')}`}
                    alt={`${answer.user.name || 'User'}'s avatar`}
                    className="rounded-circle"
                    width="40"
                    height="40"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `${DEFAULT_AVATAR}${encodeURIComponent('User')}`;
                    }}
                  />
                  <div className="d-flex flex-column justify-content-around">
                    <div>
                      <span className="mx-2 fw-semibold">
                        {answer.user.name}
                      </span>
                      {answer.user.role === "mentor" ? (
                        <span className="bg-success rounded px-2 me-2 text-white">
                          Mentor
                        </span>
                      ) : null}
                      <span className="fw-lighter">
                        {getTime(answer.created_at)} ago
                      </span>
                    </div>
                    <span className="fw-light mx-2">{answer.profession}</span>
                  </div>
                </div>
                <div className="ps-5">{answer.answer}</div>
                <hr />
              </div>
            );
          })}
        </div>
      </div>

      {/* paginate */}
      <div className="mt-4 d-flex justify-content-center">
        <ReactPaginate
          previousLabel={"Previous"}
          nextLabel={"Next"}
          breakLabel="..."
          pageCount={totalPages}
          forcePage={currentPage}
          onPageChange={(selected) => setCurrentPage(selected.selected)}
          containerClassName={"pagination"}
          pageClassName={"page-item"}
          pageLinkClassName={"page-link"}
          previousClassName={"page-item"}
          previousLinkClassName={"page-link"}
          nextClassName={"page-item"}
          nextLinkClassName={"page-link"}
          activeClassName={"active"}
        />
      </div>
    </div>
  );
}

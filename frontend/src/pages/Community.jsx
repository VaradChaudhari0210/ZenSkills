import { useEffect } from "react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import ReactPaginate from "react-paginate";
import { fetchTags } from "../apis/explore";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../apis/commons";

const API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random&name=";

export default function Community() {
  const navigate = useNavigate();

  const technicalTags = [
    "Quantum Computing",
    "Cryptography",
    "Shor's Algorithm",
    "Post-Quantum Cryptography",
    "Quantum Key Distribution (QKD)",
    "RSA Encryption",
    "Data Security",
    "Quantum Supremacy",
    "Error Correction",
    "Cybersecurity",
    "Qubits",
    "Mathematics in Cryptography",
    "Quantum Mechanics",
    "Scalability Challenges",
    "Secure Communication",
  ];

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

  function postClickHandler(questionId) {
    Navigate(`${questionId}`);
  }

  let [searchTerm, setSearchTerm] = useState("");

  let [currentPage, setCurrentPage] = useState(0);
  let [totalPages, setTotalPages] = useState(0);
  let [questions, setQuestions] = useState([]);
  const limit = 8;
  let [allTags, setAllTags] = useState([]);
  let [selectedTags, setSelectedTags] = useState([]);
  let [filterVisibility, setFilterVisibility] = useState(false);
  let [inputQuestion, setInputQuestion] = useState("");
  const [selectedQuestionTag, setSelectedQuestionTag] = useState();

  function handlePageChange(selectedItem) {
    setCurrentPage(selectedItem.selected);
  }

  useEffect(() => {
    // const responce = fetchTags();
    // setAllTags(responce.data.tags)
    setAllTags(technicalTags);
  }, []);



  async function getQuestions() {
    try {
      const response = await axiosInstance.get(`${API_URL}/api/community/questions`, {
        params: {
          page: currentPage + 1,
          limit,
          searchTerm: searchTerm.trim() 
        }
      });

      setQuestions(response.data.questions);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.log("Error fetching questions:", error);
    }
  }

  useEffect(() => {
    getQuestions();
  }, [currentPage, searchTerm]); 

  function searchBtnClickHandler() {
    setCurrentPage(0);
    getQuestions();
  }

  function handleTagClick(tag) {
    for (let i = 0; i < selectedTags.length; i++) {
      if (selectedTags[i] === tag) {
        const copyArr = [...selectedTags];
        copyArr.splice(i, 1);
        setSelectedTags(copyArr);
        return;
      }
    }
    setSelectedTags([...selectedTags, tag]);
  }

  async function handleQuestionSubmit() {
    // post question`
    try {
      console.log(inputQuestion)
      const response = await axiosInstance.post(`${API_URL}/api/community/questions`, { inputQuestion, tag: selectedQuestionTag });

      if (response.status === 201 || response.status === 200) {
        console.log('Request completed successfully:', response.data);
        alert('Question "' + inputQuestion + '" submitted successfully!');
      } else {
        console.error('Unexpected status:', response.status);
      }
    } catch (error) {
      console.error('Error during POST request:', error);
      alert('Failed to submit the question. Please try again.');
    }

    getQuestions();
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary mb-0">Community Discussion</h1>
        <button
          className="btn btn-primary px-4"
          data-bs-toggle="modal"
          data-bs-target="#askQuestionModal"
        >
          <i className="fas fa-plus me-2"></i>Ask Question
        </button>
      </div>

      {/* search/filter panel */}
      <div className="row mb-3 g-2">
        <div className="col-12 col-md-10">
          <div className="input-group">
            <input
              type="text"
              name="search"
              id="search"
              placeholder="Search..."
              className="form-control"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="btn btn-primary text-white"
              onClick={searchBtnClickHandler}
            >
              Search
            </button>
          </div>
        </div>

        <div className="col-12 col-md-2">
          <button
            className="btn btn-primary text-white w-100"
            onClick={() => setFilterVisibility(!filterVisibility)}
          >
            Filter
          </button>
        </div>
      </div>

      {/* filter dropdown */}
      {filterVisibility && (
        <div className="border rounded mb-3 p-3">
          <div className="d-flex justify-content-between">
            <p className="fw-semibold">Tags:</p>
            <button
              className="btn btn-close"
              onClick={() => setFilterVisibility(!filterVisibility)}
            ></button>
          </div>
          <div className="d-flex flex-wrap btn-group btn-group-sm">
            {allTags.map((tag) => {
              return (
                <button
                  className={`btn ${selectedTags.includes(tag)
                    ? "btn-success active"
                    : "btn-outline-secondary border border-secondary"
                    } rounded-pill px-2 mx-2 my-1`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* selected tags */}
      {selectedTags.length > 0 && (
        <div className="mb-3 btn-group btn-group-sm">
          {selectedTags.map((tag) => {
            return (
              <button
                className="btn btn-success active rounded-pill px-2 me-2"
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Update the questions section */}
      <div className="row g-4">
        {questions.filter(question => {
          if (selectedTags.length == 0) {
            return true;
          }

          if (!question.question_tag || question.question_tag.length == 0) {
            return false;
          }

          return selectedTags.some(value => value === question.question_tag[0].tag_name);
        }).map((question) => {
          return (
            <div className="col-12" key={question.id}>
              <div
                className="card h-100 border-0 shadow-sm hover-shadow transition-shadow"
                onClick={() => navigate("/community/" + question.id)}
                style={{ cursor: "pointer" }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                      <img
                        src={question.user.image || `${DEFAULT_AVATAR}${encodeURIComponent(question.user.name || 'User')}`}
                        alt={`${question.user.name || 'User'}'s avatar`}
                        className="rounded-circle"
                        width="40"
                        height="40"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `${DEFAULT_AVATAR}${encodeURIComponent('User')}`;
                        }}
                      />
                      <div className="ms-2">
                        <div className="d-flex align-items-center">
                          <span className="fw-semibold text-primary">{question.user.name}</span>
                          {question.user.role === "mentor" && (
                            <span className="badge bg-success-subtle text-success ms-2">
                              <i className="fas fa-check-circle me-1"></i>Mentor
                            </span>
                          )}
                        </div>
                        <small className="text-muted">
                          {question.user.mentor?.mentor_job_title || question.user.mentee?.mentee_title || 'Community Member'}
                        </small>
                      </div>
                    </div>
                    <div className="text-end">
                      <small className="text-muted d-block">
                        {getTime(question.created_at)} ago
                      </small>
                      <small className="text-primary">
                        <i className="fas fa-comment-alt me-1"></i>
                        {question.CommunityAnswer?.length || 0} answers
                      </small>
                    </div>
                  </div>
                  <h5 className="card-title mb-3">{question.question}</h5>
                  
                  {/* Add tags display */}
                  {question.question_tag && question.question_tag.length > 0 && (
                    <div className="mt-3">
                      <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                        <i className="fas fa-tag me-2"></i>
                        {question.question_tag[0].tag_name}
                      </span>
                    </div>
                  )}
                  {/* End of card content */}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* paginate */}
      <div className="mt-4 d-flex justify-content-center">
        <ReactPaginate
          previousLabel={"Previous"}
          nextLabel={"Next"}
          breakLabel="..."
          pageCount={totalPages}
          forcePage={currentPage}
          onPageChange={handlePageChange}
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

      {/* ask question modal */}
      <div className="modal fade" id="askQuestionModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-0 bg-light">
              <h5 className="modal-title">
                <i className="fas fa-question-circle text-primary me-2"></i>
                Ask a Question
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label">Your Question</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  placeholder="What would you like to ask?"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Select Topic</label>
                <select
                  className="form-select"
                  onChange={ev => setSelectedQuestionTag(ev.currentTarget.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Choose a topic...</option>
                  {technicalTags.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary w-100"
                onClick={handleQuestionSubmit}
              >
                Post Question
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

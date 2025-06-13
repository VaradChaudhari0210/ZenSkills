import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { axiosInstance } from "../apis/commons";
import { useSearchParams } from "react-router-dom";
import { useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const JobApplicationModal = () => {

  // const [params] = useSearchParams();
  // const id = params.get("jobId");
  const {jobId}= useParams();

  console.log("modal is being opened")
  const initialValues = {
    name: "",
    email: "",
    phone: "",
    // resume: null,
    coverLetter: "",
  };

  const validationSchema = Yup.object({
    name: Yup.string().required("Full name is required"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    phone: Yup.string()
      .matches(/^\d{10}$/, "Phone number must be 10 digits")
      .required("Phone number is required"),
    resume: Yup.mixed().required("Resume is required"),
    coverLetter: Yup.string().max(1000, "Cover letter cannot exceed 1000 characters"),
  });

  const handleSubmit = async (values) => {
    const response = await axiosInstance.post(`${API_URL}/api/jobs/${jobId}/apply`, {
      name: values.name,
      email: values.email,
      phone: values.phone,

      coverLetter: values.coverLetter,
    });
    if(response.status === 200){
      alert("Application submitted successfully")
    }else{
      alert("Failed to submit application")
    }
  }


  return (
    <div
      className="modal fade"
      id="applyJobModal"
      tabIndex="-1"
      aria-labelledby="applyJobModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="applyJobModalLabel">
              Job Application Form
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ setFieldValue }) => (
                <Form>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">
                      Full Name
                    </label>
                    <Field
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                    />
                    <ErrorMessage
                      name="name"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Email Address
                    </label>
                    <Field
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                    />
                    <ErrorMessage
                      name="email"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="phone" className="form-label">
                      Phone Number
                    </label>
                    <Field
                      type="text"
                      className="form-control"
                      id="phone"
                      name="phone"
                    />
                    <ErrorMessage
                      name="phone"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="resume" className="form-label">
                      Upload Resume
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      id="resume"
                      name="resume"
                      onChange={(event) =>
                        setFieldValue("resume", event.currentTarget.files[0])
                      }
                    />
                    <ErrorMessage
                      name="resume"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="coverLetter" className="form-label">
                      Cover Letter
                    </label>
                    <Field
                      as="textarea"
                      className="form-control"
                      id="coverLetter"
                      name="coverLetter"
                      rows="4"
                    />
                    <ErrorMessage
                      name="coverLetter"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <button type="submit" className="btn btn-success w-100">
                    Submit Application
                  </button>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobApplicationModal;

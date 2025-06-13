/**
 * @typedef {object} Pagination
 * @property {number} page
 * @property {number} perPage
 */

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: API_URL + "/api",
});

function uploadImage(image) {
  const formData = new FormData();
  formData.append("file", image);
  return axiosInstance.post("/image", formData);
}
function uploadDocuments(data) {
  return axiosInstance.post("/auth/file", data);
}

export { API_URL, axiosInstance, uploadImage, uploadDocuments };

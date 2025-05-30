import { axiosInstance } from "./commons";

function login(user) {
  return axiosInstance.post(`/auth/login`, user);
}

function register(user) {
  return axiosInstance.post(`/auth/register`, user);
}

function logout() {
  return axiosInstance.post("/auth/logout");
}

function sendVerificationEmail(email, role) {
  return axiosInstance.post(`/auth/verify`, { email, role });
}

function verificationEmailCallback(token) {
  return axiosInstance.get(`/auth/verify/callback?token=${token}`);
}

function registerUser(userProfile) {
  return axiosInstance.post(`/auth/register-user`, userProfile);
}

function googleCallback(body) {
  return axiosInstance.post(`/auth/google/callback`, body);
}
function getUserInfo(params) {
  return axios.get(`${API_URL}/user`);
}

function getAllTags() {
  return axiosInstance.get(`/tags`);
}

function getUserProfile() {
  return axiosInstance.get("/profile");
}

function editUserProfile(data) {
  return axiosInstance.put("/profile", data);
}

export {
  login,
  register,
  logout,
  sendVerificationEmail,
  verificationEmailCallback,
  registerUser,
  googleCallback,
  getAllTags,
  getUserProfile,
  editUserProfile,
  getUserInfo,
};

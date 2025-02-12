import axios from "axios";

const axiosInstance = axios.create({
	baseURL: import.meta.mode === "development" ? "http://localhost:5000/api" : "/api",
	withCredentials: true, // send cookies to the server
});

export default axiosInstance;

// go to vite.config.js
// server: {
// 	proxy: {
// 		"/api": {
// 			target: "http://localhost:5000",
// 		},
// 	},
// },
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// THIS MIDDLEWARE IS USED TO PROTECT ROUTES THAT REQUIRE AUTHENTICATION
export const protectRoute = async (req, res, next) => {
	try {

		// Get access token from cookie
		const accessToken = req.cookies.accessToken;

		// check if there is an access token, else return unauthorized error response and message
		if (!accessToken) return res.status(401).json({ message: "Unauthorized - No access token provided" });

		try {

			// verify access token if it is valid by using the secret key of the access token secret stored in the .env file
			const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

			// find the user in the database by id and exclude the password
			const user = await User.findById(decoded.userId).select("-password");

			// if user not found, return unauthorized error response and message
			if (!user) return res.status(401).json({ message: "User not found" });

			// if user is found, attach the user object to the request
			req.user = user;

			// proceed to the next step
			next();

		} catch (error) {

			// if the access token is invalid, return unauthorized error response and message
			if (error.name === "TokenExpiredError") return res.status(401).json({ message: "Unauthorized - Access token expired" });
			throw error;
		}

	} catch (error) {
		console.log("Error in protectRoute middleware", error.message);
		return res.status(401).json({ message: "Unauthorized - Invalid access token" });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// THIS MIDDLEWARE IS USED TO PROTECT ROUTES THAT REQUIRE ADMIN AUTHENTICATION
export const adminRoute = (req, res, next) => {

	// check if the user is an admin
	if (req.user && req.user.role === "admin") {

		// proceed to the next step
		next();

	} else {
		return res.status(403).json({ message: "Access denied - Admin only" });
	}
};

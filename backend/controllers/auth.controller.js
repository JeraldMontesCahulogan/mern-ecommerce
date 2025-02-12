import User from "../models/User.model.js";
import { redis } from "../lib/redis.js";
import jwt from "jsonwebtoken";

// THIS FUNCTION GENERATES AN ACCESS TOKEN AND A REFRESH TOKEN FOR A GIVEN USERID
// you need to add a value for ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET in .env
const generateTokens = (userId) => {
	const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: "15m", // Access token expires in 15 minutes
	});

	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "7d", // Refresh token expires in 7 days
	});

	return { accessToken, refreshToken };
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// STORE THE REFRESH TOKEN IN REDIS WITH A TTL OF 7 DAYS

// This is important because if someone gets hold of a user's refresh token, they can use it to create a new access token, which allows access to the user's account. By storing the refresh token in Redis with a time limit, we ensure it can only be used for up to 7 days, limiting potential misuse.
// By storing it in Redis and setting a TTL, we can ensure that the refresh token can only be used for a maximum of 7 days
const storeRefreshToken = async (userId, refreshToken) => {
	await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60); // 7days
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// SET COOKIES FOR ACCESS TOKEN AND REFRESH TOKEN
const setCookies = (res, accessToken, refreshToken) => {
	// Set access token cookie
	res.cookie("accessToken", accessToken, {
		httpOnly: true, // prevent XSS attacks
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict", // prevents CSRF attack
		maxAge: 15 * 60 * 1000, // 15 minutes
	});
	// Set refresh token cookie
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true, // prevent XSS attacks
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict", // prevents CSRF attack
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// SIGNUP
// You need to add a middleware "app.use(express.json());" and import it in server.js
// you need to create a database in Upstash
// you need to create a folder lib, and a file redis.js in it and do something in .env file for UPSTASH_REDIS_URL
export const signup = async (req, res) => {
  const { email, password, name } = req.body;
  try {

    // find if user already exists in DB by email
    const userExists = await User.findOne({ email });

    // check if user already exists
		if (userExists) return res.status(400).json({ message: "User already exists" });

    // create new user
    const user = await User.create({ name, email, password });

    // log the user in
    console.log("User created successfully:", {
      name: user.name,
      email: user.email,
    });

    // authenticate
		const { accessToken, refreshToken } = generateTokens(user._id);
		await storeRefreshToken(user._id, refreshToken);

    // set cookies for access token and refresh token
    setCookies(res, accessToken, refreshToken);

    // send response with user details
    res.status(201).json({
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
		});

  } catch (error) {
    console.log("Error in signup controller", error.message);
		res.status(500).json({ message: error.message });
  }
};


// -----------------------------------------------------------------------------------------------------------------------------------------------------
// LOGIN
export const login = async (req, res) => {
	try {
		const { email, password } = req.body; // get the email and password from the request body

		const user = await User.findOne({ email }); // find the user in the database by email

		if (user && (await user.comparePassword(password))) { // if user exists and password is correct 

      // generate access token and refresh token
			const { accessToken, refreshToken } = generateTokens(user._id);

      // store refresh token in Redis
			await storeRefreshToken(user._id, refreshToken);

      // set cookies for access token and refresh token
			setCookies(res, accessToken, refreshToken);

      // send response with user details
			res.json({
				_id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			});

      console.log(user.name + " logged in successfully as a" + user.role);
		} else {
			res.status(400).json({ message: "Invalid email or password" });
		}
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ message: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// LOGOUT
// you need to add a middleware "app.use(cookieParser());" and import it in server.js
export const logout = async (req, res) => {
	try {
    // delete refresh token from Redis
		const refreshToken = req.cookies.refreshToken;  // get refresh token from cookie
		
    // check if refresh token exists in Redis
    if (refreshToken) {

			// verify the refresh token
			const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

      // if valid, delete it from Redis, this prevents the refresh token from being used again
			await redis.del(`refresh_token:${decoded.userId}`);
		}

		res.clearCookie("accessToken");   // clear access token cookie
		res.clearCookie("refreshToken");  // clear refresh token cookie

		res.json({ message: "Logged out successfully" });
    console.log("Logged out successfully");
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// THIS WILL REFRESH THE ACCESS TOKEN
export const refreshToken = async (req, res) => {
	try {

    // get refresh token from cookie
		const refreshToken = req.cookies.refreshToken;

    // check if refresh token exists in cookie
		if (!refreshToken) return res.status(401).json({ message: "No refresh token provided" });

		// verify the refresh token is valid
		const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

		// get the stored refresh token from Redis
		const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

    // check if the stored token matches the refresh token
		if (storedToken !== refreshToken) return res.status(401).json({ message: "Invalid refresh token" });

    // if matches, generate a new access token
		const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

    // set the new access token as a cookie
		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 15 * 60 * 1000,
		});

    // send a success response
		res.json({ message: "Token refreshed successfully" });
    console.log("Token refreshed successfully");
	} catch (error) {
		console.log("Error in refreshToken controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// GET PROFILE
export const getProfile = async (req, res) => {
	try {
		res.json(req.user);
    console.log("Profile fetched successfully " + req.user.name + " as a " + req.user.role);
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
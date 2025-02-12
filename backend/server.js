import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

// for deployment
import path from "path";

import { connectDB } from "./lib/db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// for deployment
const _dirname = path.resolve();

// Middleware
app.use(express.json({ limit: "10mb" })); // allows you to parse the body of the request  // for parsing JSON data sent from the client
app.use(cookieParser()); // for parsing cookies

// Routes
app.use("/api/auth", authRoutes); // auth routes
app.use("/api/products", productRoutes); // product routes
app.use("/api/cart", cartRoutes); // cart routes
app.use("/api/coupons", couponRoutes); // coupon routes
app.use("/api/payments", paymentRoutes); // payment routes
app.use("/api/analytics", analyticsRoutes); // analytics routes

// for deployment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(_dirname, "/frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(_dirname, "frontend", "dist", "index.html"));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost: ${PORT}`);
  connectDB();
});

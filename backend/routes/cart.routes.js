import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { addToCart, emptyCart, getCartProducts, removeAllFromCart, updateQuantity } from "../controllers/cart.controller.js";

const router = express.Router();

router.get("/", protectRoute, getCartProducts);
router.post("/", protectRoute, addToCart);
router.delete("/", protectRoute, removeAllFromCart);
router.put("/:id", protectRoute, updateQuantity);
router.delete("/empty", protectRoute, emptyCart);

export default router;

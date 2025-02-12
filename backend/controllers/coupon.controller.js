import Coupon from "../models/coupon.model.js";

export const getCoupon = async (req, res) => {
	try {

		// find the coupon of the authenticated user that is active
		const coupon = await Coupon.findOne({ userId: req.user._id, isActive: true });

		// send the coupon as a response or set null
		res.json(coupon || null);
	} catch (error) {
		console.log("Error in getCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const validateCoupon = async (req, res) => {
	try {

		// get the coupon code from the request body that was passed from the frontend
		const { code } = req.body;

		// find the coupon code of the authenticated user that is active
		const coupon = await Coupon.findOne({ code: code, userId: req.user._id, isActive: true });

		// if no active coupon is found, return a 404 error
		if (!coupon) return res.status(404).json({ message: "Coupon not found" });

		// if the coupon expiration date is less than the current date, do the following
		if (coupon.expirationDate < new Date()) {

			// set the isActive property of the coupon to false
			coupon.isActive = false;

			// save the updated coupon
			await coupon.save();

			// and return a 404 error
			return res.status(404).json({ message: "Coupon expired" });
		}

		// if the active coupon is found and not yet expired, send the coupon as a response
		res.json({
			message: "Coupon is valid",
			code: coupon.code,
			discountPercentage: coupon.discountPercentage,
		});
	} catch (error) {
		console.log("Error in validateCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

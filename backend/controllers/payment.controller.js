import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";

// -----------------------------------------------------------------------------------------------------------------------------------------------
// CREATE CHECKOUT SESSION
// you need the stripe for this, grab the secret key from the stripe(developer below), then paste it in .env STRIPE_SECRET_KEY
// make a file in lib/stripe.js that handle stripe
export const createCheckoutSession = async (req, res) => {
	try {

		// get the products and the coupon code from the request body
		const { products, couponCode } = req.body;

		// check if the products is in format of an array and not empty
		if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ error: "Invalid or empty products array" });

		// declare a variable to store the total amount with 0 initial value
		let totalAmount = 0;

		// loop through the products array and calculate the total amount
		const lineItems = products.map((product) => {
			const amount = Math.round(product.price * 100); // stripe wants u to send in the format of cents
			
			// get the total amount by multiplying the price by the quantity and adding it to the total amount
			totalAmount += amount * product.quantity;

			// return the data that stripe needs
			return {
				price_data: {
					currency: "usd",
					product_data: {
						name: product.name,
						images: [product.image],
					},
					unit_amount: amount,
				},
				quantity: product.quantity || 1,
			};
		});

		// declare a variable to store the coupon with null initial value
		let coupon = null;

		// if the coupon code is provided by the user in the request body, then do the following
		if (couponCode) {

			// find the coupon of the authenticated user that is active
			coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });

			// if the coupon is active and found, do the following
			if (coupon) {

				// subtract the discount percentage from the total amount
				totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
			}
		}

		// create a checkout session
		const session = await stripe.checkout.sessions.create({

			// specify the types of payment methods
			payment_method_types: ["card"],
			
			// pass the line items to the session
			line_items: lineItems,
			
			// set the mode of the session to 'payment'
			mode: "payment",
			
			// set the success URL where the user will be redirected after successful payment
			success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
			
			// set the cancel URL where the user will be redirected if the payment is canceled
			cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
			
			// apply discounts if a valid coupon is provided
			discounts: coupon
				? [
						{
							// create a Stripe coupon with the discount percentage
							coupon: await createStripeCoupon(coupon.discountPercentage),
						},
				]
				: [],
			
			// attach additional metadata to the session
			metadata: {
				// store the user ID
				userId: req.user._id.toString(),
				
				// store the provided coupon code, if any
				couponCode: couponCode || "",
				
				// store the products information
				products: JSON.stringify(
					products.map((p) => ({

						// store product ID
						id: p._id,
						
						// store product quantity
						quantity: p.quantity,
						
						// store product price
						price: p.price,
					}))
				),
			},
		});

		// If the total amount is greater than or equal to $200, create a new coupon for the user
    if (totalAmount >= 20000) await createNewCoupon(req.user._id);

    // Respond with the session ID and the total amount in dollars
    res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });

	} catch (error) {
		console.error("Error processing checkout:", error);
		res.status(500).json({ message: "Error processing checkout", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// CHECKOUT SUCCESS
export const checkoutSuccess = async (req, res) => {
	try {

		// get the session id from the request body that was passed from the frontend
		const { sessionId } = req.body;

		// retrieve the checkout session
		const session = await stripe.checkout.sessions.retrieve(sessionId);

		// check if the checkout session is paid
		if (session.payment_status === "paid") {

			// if the coupon code is used, deactivate it
			if (session.metadata.couponCode) {
				
				// update the coupon to be inactive
				await Coupon.findOneAndUpdate(
					{
						code: session.metadata.couponCode,
						userId: session.metadata.userId,
					},
					{
						isActive: false,
					}
				);
			}

			// create a new Order
			const products = JSON.parse(session.metadata.products);
			const newOrder = new Order({
				user: session.metadata.userId,
				products: products.map((product) => ({
					product: product.id,
					quantity: product.quantity,
					price: product.price,
				})),
				// convert from cents to dollars
				totalAmount: session.amount_total / 100, 
				stripeSessionId: sessionId,
			});

			// save the order to the database
			await newOrder.save();

			// respond with success message and order ID
			res.status(200).json({
				success: true,
				message: "Payment successful, order created, and coupon deactivated if used.",
				orderId: newOrder._id,
			});
		}
	} catch (error) {
		console.error("Error processing successful checkout:", error);
		res.status(500).json({ message: "Error processing successful checkout", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------
// creates a new Stripe coupon with the given discount percentage
async function createStripeCoupon(discountPercentage) {

	// create a new coupon with the given discount percentage
	const coupon = await stripe.coupons.create({

		// specify the discount percentage
		percent_off: discountPercentage,

		// specify the duration of the coupon (once means it can only be used once)
		duration: "once",
	});

	// return the ID of the newly created coupon
	return coupon.id;
}

// -----------------------------------------------------------------------------------------------------------------------------------------------
// creates a new coupon for the authenticated user
async function createNewCoupon(userId) {
	// find and delete the previous coupon of the user
	await Coupon.findOneAndDelete({ userId });

	// create a new coupon
	const newCoupon = new Coupon({

		// generate a random coupon code
		code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),

		// set the discount percentage to 10%
		discountPercentage: 10,

		// set the expiration date to 30 days from now
		expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

		// set the user ID
		userId: userId,
	});

	// save the new coupon to the database
	await newCoupon.save();

	// return the new coupon
	return newCoupon;
}
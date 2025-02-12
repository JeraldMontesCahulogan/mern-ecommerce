import Product from "../models/product.model.js";

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// GET CART PRODUCTS
export const getCartProducts = async (req, res) => {
	try {

		// find all products that has an id that matches the id in the cart array of the user
		const products = await Product.find({ _id: { $in: req.user.cartItems } });

		// add quantity for each product
		const cartItems = products.map((product) => {

			// find all products that has an id that matches the id in the cart array of the user
			const item = req.user.cartItems.find((cartItem) => cartItem.id === product.id);

			// add quantity for each product
			return { ...product.toJSON(), quantity: item.quantity };
		});

		// and send the updated cart items as a response
		res.json(cartItems);

		// for debugging purposes only
		console.log("Cart fetched successfully by: " + req.user.name);
	} catch (error) {
		console.log("Error in getCartProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// ADD TO CART
export const addToCart = async (req, res) => {
	try {

		// get the product id from the request body that was passed from the frontend
		const { productId } = req.body;

		// get the user from the request that was stored in the auth middleware
		const user = req.user;

		// check if the product id is already in the cart
		const existingItem = user.cartItems.find((item) => item.id === productId);

		// if the product id is already in the cart, increase the quantity by 1
		if (existingItem) {
			existingItem.quantity += 1;
		} 

		//  else add the product id to the cart array by pushing it
		else {
			user.cartItems.push(productId);
		}

		// save the user with the updated cart items
		await user.save();

		// and send the updated cart items as a response
		res.json(user.cartItems);

		// for debugging purposes only
		const productName = await Product.findById(productId);
		console.log("Product" + productName.name + " added to cart successfully by: " + user.name);

	} catch (error) {
		console.log("Error in addToCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// REMOVE ALL FROM CART
export const removeAllFromCart = async (req, res) => {
	try {

		// get the product id from the request body that was passed from the frontend
		const { productId } = req.body;

		// get the user from the request that was stored in the auth middleware
		const user = req.user;

		// if the product id is not in the cart, return an empty array
		if (!productId) {
			user.cartItems = [];
		}

		// else remove the product id that matches the product id from the cart array
		else {
			user.cartItems = user.cartItems.filter((item) => item.id !== productId);
		}

		// save the user with the updated cart items
		await user.save();

		// and send the updated cart items as a response
		res.json(user.cartItems);

		// for debugging purposes only
		const productName = await Product.findById(productId);
		console.log("Product" + productName.name + " removed from cart successfully by: " + user.name);

	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// UPDATE QUANTITY
export const updateQuantity = async (req, res) => {
	try {

		// get the product id from the params/url 
		const { id: productId } = req.params;

		// get the quantity from the request body that was passed from the frontend
		const { quantity } = req.body;

		// get the user from the request that was stored in the auth middleware
		const user = req.user;

		// check if the product id is in the cart
		const existingItem = user.cartItems.find((item) => item.id === productId);

		// if the product id is in the cart, do the following
		if (existingItem) {

			// if the quantity is 0, do the following
			if (quantity === 0) {

				// remove the product id from the cart array of the user
				user.cartItems = user.cartItems.filter((item) => item.id !== productId);

				// save update the user cart items in the database
				await user.save();

				// and send the updated cart items as a response
				return res.json(user.cartItems);
			}

			// if the quantity is greater than 0, update the quantity of the product id in the cart array of the user
			existingItem.quantity = quantity;

			// save the user with the updated cart items in the database
			await user.save();

			// and send the updated cart items as a response
			res.json(user.cartItems);

			// for debugging purposes only
			const productName = await Product.findById(productId);
			console.log("Product" + productName.name + " updated quantity to " + quantity + " successfully by: " + user.name);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in updateQuantity controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// EMPTY CART
export const emptyCart = async (req, res) => {
	try {

		// get the user from the request that was stored in the auth middleware
		const user = req.user;

		// empty the cart array of the user
		user.cartItems = [];

		// save the user with the updated cart items in the database
		await user.save();

		// and send the updated cart items as a response
		res.json(user.cartItems);

		// for debugging purposes only
		console.log("Cart emptied successfully by: " + user.name);

	} catch (error) {
		console.log("Error in emptyCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

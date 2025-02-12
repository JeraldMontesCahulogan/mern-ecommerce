import { redis } from "../lib/redis.js";
import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// GET ALL PRODUCTS
export const getAllProducts = async (req, res) => {
	try {
    // find all products in the database
		const products = await Product.find({}); 

    // send the products as a response
		res.json({ products });
    console.log(req.user.role.toUpperCase() + " '" + req.user.name + "' Fetched all the products successfully. Total products: " + products.length);

	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// GET FEATURED PRODUCTS
export const getFeaturedProducts = async (req, res) => {
	try {

    // get the featured products saved from redis
		let featuredProducts = await redis.get("featured_products");

    // it has saved featured products then send them as a response, we need to parse them because they are strings in redis
		if (featuredProducts) {
      console.log(req.user.role.toUpperCase() + " '" + req.user.name + "' Fetched featured products successfully. Total products: " + JSON.parse(featuredProducts).length);
      return res.json(JSON.parse(featuredProducts));
    }

		// if not in redis, fetch from mongodb
		// .lean() is gonna return a plain javascript object instead of a mongodb document
		// which is good for performance
		featuredProducts = await Product.find({ isFeatured: true }).lean();

    // if no featured products found then return error response and message
		if (!featuredProducts) return res.status(404).json({ message: "No featured products found" });

		// if there are featured products in the database then store in redis for future quick access
		await redis.set("featured_products", JSON.stringify(featuredProducts));

    // send the featured products as a response
		res.json(featuredProducts);
    console.log(req.user.role.toUpperCase() + " '" + req.user.name + "' Fetched featured products successfully. Total products: " + featuredProducts.length);

	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// CREATE PRODUCT
// you need to open your cloudinary and grab the cloud name and api key and api secret and store them in the .env file
// then create a file lib/cloudinary.js and do something in .env file for CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
export const createProduct = async (req, res) => {
	try {

    // get the product details from the request body
		const { name, description, price, image, category } = req.body;

    // declare a variable to store the cloudinary response, set it to null for now
		let cloudinaryResponse = null;

    // if there is an image then upload it to cloudinary
		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
			console.log("uploaded image to cloudinary");
		} 

    // create a new product in the database
		const product = await Product.create({
			name,
			description,
			price,
			image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "", // if there is a cloudinary response then use the secure url, else use an empty string
			category,
		});

    // send the product as a response
		res.status(201).json(product);
    console.log("Product created successfully: " + product.name + "product price: " + product.price);

	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// DELETE PRODUCT
export const deleteProduct = async (req, res) => {
	try {
    
    // find the product by id that was passed in the url
		const product = await Product.findById(req.params.id);

    // if no product found then return error response and message
		if (!product) return res.status(404).json({ message: "Product not found" });

    // if there is a product to be deleted then delete the image of that product from cloudinary
		if (product.image) {

      // get the public id from the image url and split it to get the public id of the image to be used in deleting the image from cloudinary
			const publicId = product.image.split("/").pop().split(".")[0];
			try {

        // delete the image from cloudinary by destroying it using the public id of the image
				await cloudinary.uploader.destroy(`products/${publicId}`);
				console.log("deleted image from cloduinary");

			} catch (error) {
				console.log("error deleting image from cloduinary", error);
			}
		}

    // delete the product from the database
		await Product.findByIdAndDelete(req.params.id);

    // send a response that the product was deleted
		res.json({ message: "Product deleted successfully" });
    console.log("Product deleted successfully");

	} catch (error) {
		console.log("Error in deleteProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// RECOMMENDED PRODUCTS
export const getRecommendedProducts = async (req, res) => {
	try {

    // get 4 random products
		const products = await Product.aggregate([
			{
				$sample: { size: 4 },
			},
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					image: 1,
					price: 1,
				},
			},
		]);

    // send the recommended products as a response
		res.json(products);
    console.log("Recommended products fetched successfully: " + products.length);

	} catch (error) {
		console.log("Error in getRecommendedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// GET PRODUCTS BY CATEGORY
export const getProductsByCategory = async (req, res) => {

  // get the category from the url
	const { category } = req.params;
	try {

    // find all products in the database that have the same category in the url
		const products = await Product.find({ category });

    // send the products with the same category in the url as a response
		res.json({ products });
    console.log("Products by category" + category + "fetched successfully: " + products.length);

	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// -----------------------------------------------------------------------------------------------------------------------------------------------------
// TOGGLE FEATURED PRODUCT
export const toggleFeaturedProduct = async (req, res) => {
	try {

    // find the product by id that was passed in the url
		const product = await Product.findById(req.params.id);

    // if there is a product then toggle the isFeatured property
		if (product) {

      // toggle the isFeatured property from true to false and vice versa
			product.isFeatured = !product.isFeatured;

      // save the updated product to the database
			const updatedProduct = await product.save();

      // update the featured products cache
			await updateFeaturedProductsCache();

      // send the updated product as a response
			res.json(updatedProduct);
      console.log("Featured product" + product.name + " toggled successfully");

		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

async function updateFeaturedProductsCache() {
	try {
		// The lean() method  is used to return plain JavaScript objects instead of full Mongoose documents. This can significantly improve performance

    // get all the featured products
		const featuredProducts = await Product.find({ isFeatured: true }).lean();

    // update the featured products cache by storing them in redis for future quick access
		await redis.set("featured_products", JSON.stringify(featuredProducts));

	} catch (error) {
		console.log("error in update cache function");
	}
}
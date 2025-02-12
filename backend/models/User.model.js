import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"], // [condition, custom message or error message]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please fill a valid email address"], // email must have a valid format "@.com"
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    cartItems: [
      {
        quantity: {
          type: Number, // specifies that the quantity should be a number
          default: 1, // default value for quantity is 1
        },
        product: {
          type: mongoose.Schema.Types.ObjectId, // references an ObjectId from another schema which is a Product schema
          ref: "Product", // points to the Product model
        },
      },
    ],
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
  },
  {
    timestamps: true, // it will add createdAt and updatedAt fields
  }
);

// Pre-save hook to hash password before saving to database
userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next(); // if the password is not modified or not changed, then no need to hash it again

	try {

		// Generate a salt for hashing
		const salt = await bcrypt.genSalt(10);

		// Hash the password with the generated salt
		this.password = await bcrypt.hash(this.password, salt);

		// Proceed to the next middleware or save operation to the database
		next();
	} catch (error) {

		// Pass any error to the next middleware
		next(error);
	}
});

// This method is used to compare a password with the hashed password in the database
// It will return true if the password matches and false if it doesn't
// This method is used in the login process to compare the password entered by the user
// with the hashed password in the database.
// It will return true if the password matches and false if it doesn't
userSchema.methods.comparePassword = async function (password) {
	return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
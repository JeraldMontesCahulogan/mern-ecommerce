import { ShoppingCart, UserPlus, LogIn, LogOut, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const Navbar = () => {

	const { user, logout } = useUserStore();
	const isAdmin = user?.role === "admin";
	const { cart } = useCartStore();

  return (
    // fixed at the top, full width, transparent background, backdrop-blur, shadow lg, z-index 40 to be on top of other elements, transition all duration 300, border bottom of 1px emerald
    <header className="fixed top-0 left-0 w-full bg-gray-900 bg-opacity-90 backdrop-blur-md shadow-lg z-40 transition-all duration-300 border-b border-emerald-800">

			{/* Container to center the navbar items, max width of 1240px, horizontal padding of 1rem, vertical padding of 0.75rem */}
      <div className="container mx-auto px-4 py-3">

				{/* flex wrap to wrap the items if they don't fit, justify-between to space between the items, items-center to center the items in vertical direction */}
				<div className="flex flex-wrap justify-between items-center">

          <Link
            to="/"
						// text is 2xl font-bold text-emerald-400, items-center to center the items, space-x-2 to add space between the items
            className="text-2xl font-bold text-emerald-400 items-center space-x-2 flex"
          >
            E-Commerce
          </Link>

          {/* flex wrap to wrap the items if they don't fit, items-center to center the items, gap-4 to add space between the items */}
          <nav className="flex flex-wrap items-center gap-4">
            <Link
              to={"/"}
              // when hovered, text turns emerald-400, transition duration 300 ease-in-out
              className={user ? "text-gray-300 hover:text-emerald-400 transition duration-300 ease-in-out" : "hidden"}
            >
              Home
            </Link>

						{user && (
							<Link
								to={"/cart"}
								// relative to position the badge relative to the link, when hovered, text turns emerald-400, transition duration 300 ease-in-out
								className='relative group text-gray-300 hover:text-emerald-400 transition duration-300 ease-in-out' >

								{/* inline-block to display inline, mr-1 to add space between the icon and text, group-hover:text-emerald-400 to change the color when hovered */}
								<ShoppingCart className='inline-block mr-1 group-hover:text-emerald-400' size={20} />
								<span className='hidden sm:inline'>Cart</span>
									<span
										// absolute position, rounded-full to make it a circle, px-2 py-0.5 to add padding, text-xs to make the text smaller, group-hover:bg-emerald-400 to change the background color when hovered
										className='absolute -top-2 -left-2 bg-emerald-500 text-white rounded-full px-2 py-0.5 
									text-xs group-hover:bg-emerald-400 transition duration-300 ease-in-out'
									>
										{cart.length}
									</span>
							</Link>
						)}

						{isAdmin && (
							<Link
								className='bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded-md font-medium transition duration-300 ease-in-out flex items-center'
								to={"/secret-dashboard"}
							>
								<Lock className='inline-block mr-1' size={18} />
								{/* hidden to hide the text on small screens, sm:inline to show the text on small screens */}
								<span className='hidden sm:inline'>Dashboard</span>
							</Link>
						)}

						{user ? (
							<button
								className='bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md flex items-center transition duration-300 ease-in-out'
								onClick={logout}
							>
								<LogOut size={18} />
								<span className='hidden sm:inline ml-2'>Log Out</span>
							</button>
						) : (
							<>
								<Link
									to={"/signup"}
									className='bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-md flex items-center transition duration-300 ease-in-out'
								>
									<UserPlus className='mr-2' size={18} />
									Sign Up
								</Link>
								<Link
									to={"/login"}
									className='bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md flex items-center transition duration-300 ease-in-out'
								>
									<LogIn className='mr-2' size={18} />
									Login
								</Link>
							</>
						)}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

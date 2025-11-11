import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function ContactPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [guardian, setGuardian] = useState("");
  const [phone, setPhone] = useState("");
  const [guardianNumber, setGuardianNumber] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [transition, setTransition] = useState(false);
  const navigate = useNavigate();

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen || isSignupOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSignupOpen]);

  // ✅ Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("http://localhost:5001/api/login", {
        email,
        password,
      });

      const { token, role } = res.data;
      localStorage.setItem("token", token);

      alert("✅ Login successful!");
      setIsOpen(false);

      if (role === "doctor") navigate("/doctor_dashboard");
      else if (role === "nurse") navigate("/nurse-dashboard");
      else navigate("/patient-dashboard");
    } catch {
      setError("Invalid email or password");
    }
  };

  // ✅ Smooth transition helper
  const handleSwitchToSignup = () => {
    setTransition(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsSignupOpen(true);
      setTransition(false);
    }, 400);
  };

  const handleSwitchToLogin = () => {
    setTransition(true);
    setTimeout(() => {
      setIsSignupOpen(false);
      setIsOpen(true);
      setTransition(false);
    }, 400);
  };

  // ✅ Signup function
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5001/api/signup", {
        full_name: fullName,
        email,
        password,
        birth_date: birthDate,
        gender,
        address,
        father_name: fatherName,
        mother_name: motherName,
        guardian,
        phone_number: phone,
        guardian_number: guardianNumber,
        blood_type: bloodType,
        chronic_conditions: chronicConditions,
        allergies,
      });

      alert("🎉 Signup successful! Welcome to Pediatric System");
      handleSwitchToLogin();
    } catch (err) {
      console.error("❌ Signup failed:", err);
      alert("❌ Signup failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ✅ Navbar */}
      <header className="w-full bg-white shadow-sm fixed top-0 left-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-2.5 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6">
          {/* Logo + Text */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            <img
              src="\clinicsclogo.png"
              alt="Clinic Logo"
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 lg:w-12 lg:h-12 object-contain"
            />
            <Link
              to="/"
              className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-sky-700 tracking-tight py-1"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="hidden sm:inline">Castillo Children Clinic</span>
              <span className="sm:hidden">CCC</span>
            </Link>
          </div>

          {/* Desktop Navbar Links */}
          <nav className="hidden md:flex space-x-4 lg:space-x-6">
            <Link
              to="/services"
              className="text-gray-700 hover:text-sky-600 font-medium transition text-sm lg:text-base"
            >
              Services
            </Link>
            <Link
              to="/contact"
              className="text-sky-700 font-medium underline text-sm lg:text-base"
            >
              Contact
            </Link>
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsSignupOpen(true)}
              className="bg-yellow-400 px-4 py-2 rounded-full font-medium hover:bg-yellow-500 active:bg-yellow-600 transition text-sm md:text-base whitespace-nowrap touch-manipulation"
            >
              Sign up
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className="bg-sky-500 text-white px-4 py-2 rounded-full font-medium hover:bg-sky-600 active:bg-sky-700 transition text-sm md:text-base whitespace-nowrap touch-manipulation"
            >
              Login
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition focus:outline-none focus:ring-2 focus:ring-sky-500 flex items-center justify-center touch-manipulation"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-3 sm:px-4 py-3 sm:py-4 bg-white border-t border-gray-200 space-y-2 sm:space-y-3">
            <Link
              to="/services"
              className="block text-gray-700 hover:text-sky-600 font-medium transition py-2.5 sm:py-2 px-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center touch-manipulation"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Services
            </Link>
            <Link
              to="/contact"
              className="block text-sky-700 font-medium transition py-2.5 sm:py-2 px-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px] flex items-center touch-manipulation underline"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="pt-2 border-t border-gray-200 space-y-2.5 sm:space-y-2">
              <button
                onClick={() => {
                  setIsSignupOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-yellow-400 px-4 py-3 sm:py-2.5 rounded-full font-medium hover:bg-yellow-500 active:bg-yellow-600 transition text-sm sm:text-base text-center min-h-[44px] touch-manipulation"
              >
                Sign up
              </button>
              <button
                onClick={() => {
                  setIsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-sky-500 text-white px-4 py-3 sm:py-2.5 rounded-full font-medium hover:bg-sky-600 active:bg-sky-700 transition text-sm sm:text-base text-center min-h-[44px] touch-manipulation"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Contact Section */}
      <main
        className="flex-1 bg-cover bg-center bg-no-repeat relative flex items-center py-16 sm:py-20 md:py-24 px-3 sm:px-4 md:px-6 pt-16 sm:pt-20 md:pt-24 pb-6 sm:pb-8"
        style={{ backgroundImage: "url('/ClinicRegistration.png')" }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="max-w-6xl mx-auto w-full bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 lg:p-10 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10 border border-white/60 relative z-10 overflow-y-auto max-h-[calc(100vh-4rem)] sm:max-h-[85vh]">

          {/* Contact Text */}
          <div className="flex flex-col justify-center text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-sky-700 mb-4 sm:mb-5 md:mb-6">
              Get in Touch with Us
            </h1>
            <p className="text-gray-700 text-sm sm:text-base md:text-lg leading-relaxed">
              If you have any inquiries, appointment requests, or would like to
              know more about our services, please don't hesitate to reach out.
              <br className="hidden sm:block" />
              <br className="hidden sm:block" />
              You can contact us through any of the details provided — we'll be
              happy to assist you as soon as possible.
            </p>
          </div>

          {/* Contact Information */}
          <div className="flex flex-col justify-center space-y-4 sm:space-y-5 md:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-sky-600 mb-2">
                Address
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Castillo Children Clinic,
                <br />
                138 Rizal Avenue Brgy 9 4200
              </p>
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">Batangas City, Calabarzon</p>
              <a
                href="https://www.google.com/maps/place/Castillo+Children's+Clinic/@13.7565027,121.0566993,1162m/data=!3m2!1e3!4b1!4m6!3m5!1s0x33bd0541aaa50131:0xa6968e99ce251f20!8m2!3d13.7564975!4d121.0592742!16s%2Fg%2F11f4xtcvqq"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 bg-green-500 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-green-600 active:bg-green-700 transition text-sm sm:text-base font-medium min-h-[44px] flex items-center justify-center touch-manipulation shadow-md"
              >
                View on Google Maps
              </a>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-sky-600 mb-2">Phone</h2>
              <a 
                href="tel:09664412470"
                className="text-gray-600 text-sm sm:text-base hover:text-sky-600 transition touch-manipulation"
              >
                0966 441 2470
              </a>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-sky-600 mb-2">Facebook</h2>
              <a
                href="https://www.facebook.com/myracastilloMD"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:underline active:text-sky-700 text-sm sm:text-base break-all touch-manipulation"
              >
                facebook.com/myracastilloMD
              </a>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-sky-600 mb-2">Email</h2>
              <a 
                href="mailto:castillochildrensclinic@gmail.com"
                className="text-gray-600 text-sm sm:text-base hover:text-sky-600 transition break-all touch-manipulation"
              >
                castillochildrensclinic@gmail.com
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ✅ Shared Modal */}
      {(isOpen || isSignupOpen) && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-2 md:p-4 lg:p-6 transition-all duration-500 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
              setIsSignupOpen(false);
            }
          }}
        >
          <div
            className={`w-full h-full sm:h-auto sm:max-h-[95vh] md:max-h-[90vh] max-w-full sm:max-w-5xl bg-white rounded-none sm:rounded-xl md:rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden relative border-0 sm:border border-yellow-400 transition-all duration-500 transform ${
              transition
                ? "opacity-0 scale-95"
                : "opacity-100 scale-100"
            }`}
          >
            {/* Close */}
            <button
              onClick={() => {
                setIsOpen(false);
                setIsSignupOpen(false);
              }}
              className="absolute top-2 right-2 sm:top-3 sm:right-4 text-gray-500 hover:text-gray-700 active:text-gray-900 text-2xl sm:text-3xl font-bold z-10 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation"
              aria-label="Close"
            >
              ×
            </button>

            {/* ✅ Signup Modal */}
            {isSignupOpen && !isOpen && (
              <>
                {/* Left Image */}
                <div className="hidden lg:flex w-full lg:w-1/2 relative items-center justify-center min-h-[unset] transition-all duration-500 transform translate-x-0">
                  <img
                    src="/loginBG.png"
                    alt="Pediatric Clinic"
                    className="absolute inset-0 w-full h-full object-cover object-[80%_center]"
                  />
                  <div className="absolute inset-0 bg-sky-800/40 backdrop-brightness-90"></div>
                  <div className="relative z-10 text-center text-white px-6 lg:px-8">
                    <h2 className="text-2xl lg:text-3xl font-bold mb-3 drop-shadow-md">
                      🩺 Welcome to Castillo Children Clinic
                    </h2>
                    <p className="text-xs lg:text-sm text-sky-100 leading-relaxed drop-shadow">
                      Caring for babies, kids, and teens with compassion.
                      Register now to access your personalized pediatric records anytime.
                    </p>
                  </div>
                </div>

                {/* Right Signup Form */}
                <div className="w-full lg:w-1/2 p-4 sm:p-5 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-2rem)] sm:max-h-[95vh] md:max-h-[90vh] transition-all duration-500">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 sm:mb-5 md:mb-6 lg:hidden">
                    Create Account
                  </h2>
                  <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                      />
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                      />
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation bg-white"
                      >
                        <option value="">Select Gender</option>
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      placeholder="Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <input
                        type="text"
                        placeholder="Father's Name"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                      />
                      <input
                        type="text"
                        placeholder="Mother's Name"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                      />
                    </div>

                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                    />

                    <input
                      type="text"
                      placeholder="Guardian"
                      value={guardian}
                      onChange={(e) => setGuardian(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                    />

                    <input
                      type="tel"
                      placeholder="Guardian Number"
                      value={guardianNumber}
                      onChange={(e) => setGuardianNumber(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                    />

                    <input
                      type="text"
                      placeholder="Blood Type"
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                    />

                    <textarea
                      placeholder="Chronic Conditions"
                      value={chronicConditions}
                      onChange={(e) => setChronicConditions(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base resize-y min-h-[100px] sm:min-h-[80px] outline-none transition touch-manipulation"
                    />

                    <textarea
                      placeholder="Allergies"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-base sm:text-base resize-y min-h-[100px] sm:min-h-[80px] outline-none transition touch-manipulation"
                    />

                    <button
                      type="submit"
                      className="w-full bg-green-500 text-white py-3 sm:py-2.5 md:py-3 rounded-lg hover:bg-green-600 active:bg-green-700 transition font-semibold text-base sm:text-base mt-2 min-h-[48px] touch-manipulation shadow-md"
                    >
                      Create Account
                    </button>

                    <p className="text-center text-xs sm:text-sm text-gray-600 mt-3 sm:mt-4 px-2">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={handleSwitchToLogin}
                        className="text-sky-600 hover:underline active:text-sky-700 font-medium touch-manipulation py-1"
                      >
                        Click here to login
                      </button>
                    </p>
                  </form>
                </div>
              </>
            )}

            {/* ✅ Login Modal */}
            {isOpen && !isSignupOpen && (
              <>
                {/* Left Login Form */}
                <div className="w-full lg:w-1/2 p-4 sm:p-5 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-2rem)] sm:max-h-[95vh] md:max-h-[90vh] transition-all duration-500">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 sm:mb-5 md:mb-6">Login</h2>
                  {error && (
                    <p className="text-red-500 text-xs sm:text-sm text-center mb-3 sm:mb-4 px-2">{error}</p>
                  )}
                  <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 md:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-base sm:text-base outline-none transition min-h-[44px] touch-manipulation"
                    />
                    <button
                      type="submit"
                      className="w-full bg-blue-500 text-white py-3 sm:py-2.5 md:py-3 rounded-lg hover:bg-blue-600 active:bg-blue-700 transition text-base sm:text-base font-medium min-h-[48px] touch-manipulation shadow-md"
                    >
                      Login
                    </button>

                    <p className="text-center text-xs sm:text-sm text-gray-600 mt-3 sm:mt-4 px-2">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={handleSwitchToSignup}
                        className="text-green-600 hover:underline active:text-green-700 font-medium touch-manipulation py-1"
                      >
                        Create one here
                      </button>
                    </p>
                  </form>
                </div>

                {/* Right Image */}
                <div className="hidden lg:flex w-full lg:w-1/2 relative items-center justify-center min-h-[unset] transition-all duration-500">
                  <img
                    src="/loginBG.png"
                    alt="Pediatric Clinic"
                    className="absolute inset-0 w-full h-full object-cover object-[80%_center]"
                  />
                  <div className="absolute inset-0 bg-sky-800/40 backdrop-brightness-90"></div>
                  <div className="relative z-10 text-center text-white px-6 lg:px-8">
                    <h2 className="text-2xl lg:text-3xl font-bold mb-3 drop-shadow-md">
                      🧒 Welcome Back!
                    </h2>
                    <p className="text-xs lg:text-sm text-sky-100 leading-relaxed drop-shadow">
                      Log in to access your pediatric profile and appointments.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactPage;

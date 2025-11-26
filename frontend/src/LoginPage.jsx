import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import Footer from "./Footer"; // ✅ ADD THIS

function LoginPage() {
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
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [transition, setTransition] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Add these states at the top with other useState
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetTimer, setResetTimer] = useState(0);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Timer for forgot password resend
  useEffect(() => {
    if (resetTimer <= 0) return;
    const timer = setInterval(() => setResetTimer((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resetTimer]);

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

  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Add timer effect for resend button
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // 🔹 STEP 1: Click "Create Account" → Send Code
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError("");

    // 🔍 DEBUG: I-print lahat ng values
    console.log("=== FORM VALUES ===");
    console.log("fullName:", fullName);
    console.log("email:", email);
    console.log("password:", password);
    console.log("birthDate:", birthDate);
    console.log("gender:", gender);
    console.log("address:", address);
    console.log("fatherName:", fatherName);
    console.log("motherName:", motherName);
    console.log("phone:", phone);
    console.log("bloodType:", bloodType);
    console.log("isSendingCode:", isSendingCode);
    console.log("===================");
    // Client-side password strength check
    const isStrongPassword = (pwd) =>
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd);

    // Validate all fields first
    if (
      !fullName ||
      !email ||
      !password ||
      !birthDate ||
      !gender ||
      !address ||
      !fatherName ||
      !motherName ||
      !phone ||
      !bloodType
    ) {
      setError("Please fill in all required fields");
      return;
    }
    if (!isStrongPassword(password)) {
      Swal.fire({
        icon: "error",
        title: "Weak Password",
        html: `
      <p>Password must include:</p>
      <ul style="text-align: left; margin-top: 10px;">
        <li>✓ At least 8 characters</li>
        <li>✓ Uppercase letter (A-Z)</li>
        <li>✓ Lowercase letter (a-z)</li>
        <li>✓ Number (0-9)</li>
        <li>✓ Special character (!@#$%^&*)</li>
      </ul>
    `,
        confirmButtonColor: "#0ea5e9",
      });
      return;
    }

    setIsSendingCode(true); // Start loading

    try {
      // Send verification code
      await axios.post(`${import.meta.env.VITE_API_URL}/send-verification`, {
        email,
      });

      // Store form data temporarily
      setPendingSignupData({
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

      // Show verification modal
      setShowVerificationModal(true);
      setResendTimer(60);
      Swal.fire({
        icon: "success",
        title: "Code Sent!",
        text: `Verification code sent to ${email}`,
        confirmButtonColor: "#0ea5e9",
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error sending code:", err);
      const serverMsg =
        err.response?.data?.error || "Failed to send verification code";
      // If email already registered, inform and direct to login
      if (serverMsg.toLowerCase().includes("email already registered")) {
        Swal.fire({
          icon: "info",
          title: "Email Already Registered",
          text: "This email is already registered. Please log in instead.",
          confirmButtonColor: "#0ea5e9",
          confirmButtonText: "Go to Login",
        }).then(() => {
          setIsSignupOpen(false);
          setIsOpen(true);
          setError("");
        });
        setIsSignupOpen(false);
        setIsOpen(true);
        setError("");
      } else {
        Swal.fire({
          icon: "error",
          title: "Registration Failed",
          text: serverMsg,
          confirmButtonColor: "#0ea5e9",
        });
      }
    } finally {
      setIsSendingCode(false); // Stop loading
    }
  };

  // 🔹 STEP 2: Verify Code & Complete Signup
  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setIsVerifying(true);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/verify-and-signup`, {
        ...pendingSignupData,
        code: verificationCode,
      });

      Swal.fire({
        icon: "success",
        title: "Welcome!",
        text: "Signup successful! Your account has been verified.",
        confirmButtonColor: "#0ea5e9",
        confirmButtonText: "Continue to Login",
      });

      // Reset states
      setShowVerificationModal(false);
      setVerificationCode("");
      setPendingSignupData(null);

      // Switch to login
      handleSwitchToLogin();
    } catch (err) {
      console.error("❌ Verification failed:", err);
      setError(
        err.response?.data?.error ||
          "Invalid or expired code. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // 🔹 Resend Code
  const handleResendCode = async () => {
    if (!pendingSignupData?.email) return;

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/send-verification`, {
        email: pendingSignupData.email,
      });
      setResendTimer(60);
      Swal.fire({
        icon: "info",
        title: "Code Resent",
        text: "New verification code sent to your email!",
        confirmButtonColor: "#0ea5e9",
        timer: 2000,
        showConfirmButton: false,
      });
      setError("");
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    }
  };

  // ✅ Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (cooldown > 0) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/login`, {
        email,
        password,
      });

      const { token, role, patient } = res.data;
      if (!token || !role) throw new Error("Invalid response from server");

      localStorage.setItem("token", token);

      if (role === "patient") {
        let patientData = patient;
        if (!patientData) {
          patientData = {
            id: res.data.id || 1,
            full_name: res.data.full_name || email,
            qr_code: `PAT${String(res.data.id || 1).padStart(3, "0")}`,
          };
        }
        localStorage.setItem("patient", JSON.stringify(patientData));
      }

      Swal.fire({
        icon: "success",
        title: "Login Successful!",
        text: "Redirecting to dashboard...",
        confirmButtonColor: "#0ea5e9",
        timer: 1500,
        showConfirmButton: false,
      });
      setIsOpen(false);
      setLoginAttempts(0);

      if (role === "doctor") navigate("/doctor_dashboard");
      else if (role === "nurse") navigate("/nurse-dashboard");
      else if (role === "patient") navigate("/patient-dashboard");
      else navigate("/");
    } catch (err) {
      console.error("❌ Login error:", err);
      const next = loginAttempts + 1;
      setLoginAttempts(next);
      setError("Invalid email or password");

      if (next >= 5) {
        setCooldown(60);
        setLoginAttempts(0);
      }
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

  // 🔹 Send Forgot Password Code
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setIsSendingReset(true);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/forgot-password`, {
        email: forgotEmail,
      });

      setShowForgotPassword(false);
      setShowResetPassword(true);
      setResetTimer(60);

      Swal.fire({
        icon: "success",
        title: "Code Sent!",
        text: `Reset code sent to ${forgotEmail}`,
        confirmButtonColor: "#0ea5e9",
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to send reset code";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        confirmButtonColor: "#0ea5e9",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  // 🔹 Reset Password with Code
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const isStrongPassword = (pwd) =>
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd);

    if (!isStrongPassword(newPassword)) {
      Swal.fire({
        icon: "error",
        title: "Weak Password",
        html: `
        <p>Password must include:</p>
        <ul style="text-align: left; margin-top: 10px;">
          <li>✓ At least 8 characters</li>
          <li>✓ Uppercase letter (A-Z)</li>
          <li>✓ Lowercase letter (a-z)</li>
          <li>✓ Number (0-9)</li>
          <li>✓ Special character (!@#$%^&*)</li>
        </ul>
      `,
        confirmButtonColor: "#0ea5e9",
      });
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/reset-password`, {
        email: forgotEmail,
        code: resetCode,
        newPassword,
      });

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Password reset successful. You can now login.",
        confirmButtonColor: "#0ea5e9",
      });

      // Reset states and switch to login
      setShowResetPassword(false);
      setForgotEmail("");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
      setIsOpen(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    }
  };

  // 🔹 Resend Reset Code
  const handleResendResetCode = async () => {
    setIsSendingReset(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/forgot-password`, {
        email: forgotEmail,
      });
      setResetTimer(60);
      Swal.fire({
        icon: "info",
        title: "Code Resent",
        text: "New reset code sent!",
        confirmButtonColor: "#0ea5e9",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      setError("Failed to resend code");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="w-full bg-white shadow-sm fixed top-0 left-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-2.5 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6">
          {/* Logo + Text */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            {/* Non-clickable logo */}
            <img
              src="\clinicsclogo.png"
              alt="Clinic Logo"
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 lg:w-12 lg:h-12 object-contain"
            />
            {/* Clickable text */}
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
            {/* ✅ CONTACT LINK REMOVED - NOW IN FOOTER */}
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsSignupOpen(true)}
              className="bg-yellow-400 px-4 py-2 rounded-full font-medium hover:bg-yellow-500 transition text-sm md:text-base whitespace-nowrap"
            >
              Sign up
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className="bg-sky-500 text-white px-4 py-2 rounded-full font-medium hover:bg-sky-600 transition text-sm md:text-base whitespace-nowrap"
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

      {/* Hero Section */}
      <div
        className="bg-cover bg-center bg-no-repeat relative flex items-center justify-center md:justify-start min-h-screen pt-16 sm:pt-20 md:pt-24 lg:pt-28"
        style={{ backgroundImage: "url('/ClinicRegistration.png')" }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 max-w-2xl text-center md:text-left w-full py-6 sm:py-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2.5 sm:mb-3 md:mb-4 lg:mb-6 leading-tight drop-shadow-lg">
            Welcome to Castillo Children Clinic
          </h1>
          <p className="text-gray-100 mb-4 sm:mb-5 md:mb-6 text-sm sm:text-base md:text-lg leading-relaxed px-1 sm:px-2 md:px-0 drop-shadow-md">
            Providing quality pediatric care for babies, kids, and teens.
          </p>
          <Link
            to="/services"
            className="inline-block bg-blue-500 text-white px-5 py-2.5 sm:px-6 sm:py-3 md:px-8 md:py-3 rounded-full hover:bg-blue-600 active:bg-blue-700 transition text-sm sm:text-base font-medium min-h-[44px] flex items-center justify-center touch-manipulation shadow-lg"
          >
            Read More
          </Link>
        </div>
      </div>

      {/* Shared Modal */}
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
            className={`w-11/12 max-w-md sm:w-full sm:max-w-5xl bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden relative border-0 sm:border border-yellow-400 transition-all duration-500 transform max-h-[90vh] ${
              transition ? "opacity-0 scale-95" : "opacity-100 scale-100"
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
                      Register now to access your personalized pediatric records
                      anytime.
                    </p>
                  </div>
                </div>

                {/* Right Signup Form */}
                <div className="w-full lg:w-1/2 p-4 sm:p-5 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-2rem)] sm:max-h-[95vh] md:max-h-[90vh] transition-all duration-500">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-center mb-2 sm:mb-3 md:mb-4 lg:hidden">
                    Create Account
                  </h2>
                  <form
                    onSubmit={handleCreateAccount}
                    className="space-y-2 sm:space-y-2"
                    style={{ fontSize: "0.95rem" }}
                  >
                    <input
                      type="text"
                      placeholder="Patient's Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                      />
                      <div className="flex flex-col col-span-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-2">
                          <span className="text-sky-600"></span>
                          Patient's Date of Birth
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          max={new Date().toISOString().split("T")[0]}
                          required
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation bg-white hover:border-sky-300"
                        />
                        <p className="text-xs text-gray-500 mt-1 ml-1">
                          <span style={{ fontSize: "0.8em" }}>
                            Select the patient's birth month, day, and year
                          </span>
                        </p>
                      </div>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation bg-white"
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
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <input
                        type="text"
                        placeholder="Father's Name"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        required
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                      />
                      <input
                        type="text"
                        placeholder="Mother's Name"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        required
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                      />
                    </div>

                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                    />

                    <input
                      type="text"
                      placeholder="Guardian (Optional)"
                      value={guardian}
                      onChange={(e) => setGuardian(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                    />

                    <input
                      type="tel"
                      placeholder="Guardian Number (Optional)"
                      value={guardianNumber}
                      onChange={(e) => setGuardianNumber(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation"
                    />

                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      required
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-sm outline-none transition min-h-[32px] touch-manipulation bg-white"
                    >
                      <option value="">Select Blood Type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="N/A">N/A / Unsure</option>
                    </select>

                    <textarea
                      placeholder="Chronic Conditions (required, if none type 'None')"
                      value={chronicConditions}
                      onChange={(e) => setChronicConditions(e.target.value)}
                      rows={1}
                      required
                      className="w-full px-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-xs resize-none min-h-[24px] outline-none transition touch-manipulation"
                      maxLength={40}
                    />

                    <textarea
                      placeholder="Allergies (required, if none type 'None')"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      rows={1}
                      required
                      className="w-full px-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-sky-200 focus:border-sky-400 text-xs resize-none min-h-[24px] outline-none transition touch-manipulation"
                      maxLength={40}
                    />

                    {error && (
                      <p className="text-red-500 text-xs sm:text-sm text-center mb-3 sm:mb-4 px-2">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      //disabled={isSendingCode}
                      className={`w-full py-2 rounded transition font-semibold text-sm mt-2 min-h-[32px] touch-manipulation shadow flex items-center justify-center ${
                        isSendingCode
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : "bg-green-500 text-white hover:bg-green-600 active:bg-green-700"
                      }`}
                    >
                      {isSendingCode ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sending Code...
                        </>
                      ) : (
                        "Create Account"
                      )}
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

                  {/* 🔹 Verification Code Modal - Add this AFTER the signup form closing tag */}
                  {showVerificationModal && (
                    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative animate-in fade-in zoom-in duration-300">
                        <button
                          onClick={() => {
                            setShowVerificationModal(false);
                            setVerificationCode("");
                            setError("");
                          }}
                          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                        >
                          ×
                        </button>

                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">📧</span>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800 mb-2">
                            Verify Your Email
                          </h3>
                          <p className="text-sm text-gray-600">
                            We sent a 6-digit code to
                            <br />
                            <span className="font-semibold text-sky-600">
                              {pendingSignupData?.email}
                            </span>
                          </p>
                        </div>

                        <form
                          onSubmit={handleVerifyAndSignup}
                          className="space-y-4"
                        >
                          {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                              {error}
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Enter Verification Code
                            </label>
                            <input
                              type="text"
                              value={verificationCode}
                              onChange={(e) =>
                                setVerificationCode(
                                  e.target.value.replace(/\D/g, "").slice(0, 6)
                                )
                              }
                              placeholder="000000"
                              maxLength={6}
                              required
                              autoFocus
                              className="w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 outline-none transition"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={
                              isVerifying || verificationCode.length !== 6
                            }
                            className={`w-full py-3 rounded-lg font-semibold transition ${
                              isVerifying || verificationCode.length !== 6
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700"
                            }`}
                          >
                            {isVerifying
                              ? "Verifying..."
                              : "Verify & Complete Signup"}
                          </button>

                          <div className="text-center text-sm text-gray-600">
                            Didn't receive the code?{" "}
                            {resendTimer > 0 ? (
                              <span className="text-gray-400">
                                Resend in {resendTimer}s
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResendCode}
                                className="text-sky-600 hover:underline font-medium"
                              >
                                Resend Code
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ✅ Login Modal */}
            {isOpen && !isSignupOpen && (
              <>
                {/* Left Login Form */}
                <div className="w-full lg:w-1/2 p-4 sm:p-5 md:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-2rem)] sm:max-h-[95vh] md:max-h-[90vh] transition-all duration-500">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 sm:mb-5 md:mb-6">
                    Login
                  </h2>
                  {error && (
                    <p className="text-red-500 text-xs sm:text-sm text-center mb-3 sm:mb-4 px-2">
                      {error}
                    </p>
                  )}
                  {cooldown > 0 && (
                    <p className="text-orange-600 text-xs sm:text-sm text-center mb-3 sm:mb-4 px-2">
                      Too many attempts. Please wait {cooldown}s.
                    </p>
                  )}
                  <form
                    onSubmit={handleLogin}
                    className="space-y-3 sm:space-y-4"
                  >
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
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sky-600 hover:underline text-sm font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={cooldown > 0}
                      className={`w-full py-3 sm:py-2.5 md:py-3 rounded-lg transition text-base sm:text-base font-medium min-h-[48px] touch-manipulation shadow-md ${
                        cooldown > 0
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white"
                      }`}
                    >
                      {cooldown > 0 ? `Wait ${cooldown}s` : "Login"}
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
          {/* 🔹 FORGOT PASSWORD MODAL */}
          {showForgotPassword && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail("");
                    setError("");
                  }}
                  className="w-full text-sm text-gray-600 hover:text-sky-600"
                >
                  Back to Login
                </button>

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔑</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Forgot Password?
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enter your email to receive a reset code
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 outline-none"
                  />

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className={`w-full py-3 rounded-lg font-semibold transition ${
                      isSendingReset
                        ? "bg-gray-400 cursor-not-allowed text-white"
                        : "bg-yellow-500 text-white hover:bg-yellow-600"
                    }`}
                  >
                    {isSendingReset ? "Sending..." : "Send Reset Code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setIsOpen(true);
                    }}
                    className="w-full text-sm text-gray-600 hover:text-sky-600"
                  >
                    Back to Login
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 🔹 RESET PASSWORD MODAL */}
          {showResetPassword && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
                <button
                  onClick={() => {
                    setShowResetPassword(false);
                    setForgotEmail("");
                    setResetCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Reset Password
                  </h3>
                  <p className="text-sm text-gray-600">
                    Code sent to{" "}
                    <span className="font-semibold text-sky-600">
                      {forgotEmail}
                    </span>
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) =>
                      setResetCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    className="w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
                  />

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
                  />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
                  />

                  <button
                    type="submit"
                    disabled={resetCode.length !== 6}
                    className={`w-full py-3 rounded-lg font-semibold transition ${
                      resetCode.length !== 6
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    Reset Password
                  </button>

                  <div className="text-center text-sm text-gray-600">
                    Didn't receive the code?{" "}
                    {resetTimer > 0 ? (
                      <span className="text-gray-400">
                        Resend in {resetTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendResetCode}
                        className="text-sky-600 hover:underline font-medium"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      <Footer />
    </div>
  );
}

export default LoginPage;

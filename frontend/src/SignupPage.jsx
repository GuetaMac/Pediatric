import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("http://localhost:5001/api/signup", {
        full_name: fullName,
        email,
        password,
        birth_date: birthDate,
        gender,
      });

      localStorage.setItem("token", res.data.token);

      alert("🎉 Signup successful! Welcome to Pediatric System");
      navigate("/");
    } catch {
      setError("Signup failed. Try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-100 to-green-300 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Signup</h2>
        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2.5 sm:py-2 border rounded-lg focus:ring focus:ring-green-200 text-base"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 sm:py-2 border rounded-lg focus:ring focus:ring-green-200 text-base"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 sm:py-2 border rounded-lg focus:ring focus:ring-green-200 text-base"
            required
          />
          <div>
            <label className="block text-gray-700 mb-1 text-sm sm:text-base">Birth Date</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-2 border rounded-lg focus:ring focus:ring-green-200 text-base"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1 text-sm sm:text-base">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-2 border rounded-lg focus:ring focus:ring-green-200 text-base"
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 text-white py-2.5 sm:py-2 rounded-lg hover:bg-green-600 transition font-medium text-base"
          >
            Signup
          </button>
        </form>

        <p className="text-center text-xs sm:text-sm mt-4">
          Already have an account?{" "}
          <Link to="/" className="text-green-500 font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;

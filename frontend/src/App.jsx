import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import Doctor from "./Doctor";
import Patient from "./Patient";
import Nurse from "./Nurse";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/doctor_dashboard" element={<Doctor />} />
        <Route path="/patient-dashboard" element={<Patient />} />
        <Route path="/nurse-dashboard" element={<Nurse />} />
      </Routes>
    </Router>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import Doctor from "./Doctor";
import Patient from "./Patient";
import Nurse from "./Nurse";
import ServicesPage from "./ServicesPage";
import ContactPage from "./ContactPage";
import PatientProfile from "./PatientProfile";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/doctor_dashboard" element={<Doctor />} />
        <Route path="/patient-dashboard" element={<Patient />} />
        <Route path="/nurse-dashboard" element={<Nurse />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/patient-profile" element={<PatientProfile />} />
      </Routes>
    </Router>
  );
}

export default App;

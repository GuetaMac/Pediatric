import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import {
  Baby,
  Stethoscope,
  Download,
  User,
  Mail,
  Calendar,
} from "lucide-react";

function PatientProfile() {
  const [userInfo, setUserInfo] = useState({
    full_name: "",
    email: "",
    qr_code: "",
  });

  const [formData, setFormData] = useState({
    gender: "",
    father_name: "",
    mother_name: "",
    guardian: "",
    phone_number: "",
    guardian_number: "",
    address: "",
    blood_type: "",
    allergies: "",
    chronic_conditions: "",
    last_checkup: "",
    birth_date: "",
    age: "",
    created_at: "",
    role: "",
  });

  const [message, setMessage] = useState("");
  const [qrSize, setQrSize] = useState(180);
  const qrRef = useRef(null);

  // Update QR code size based on window width
  useEffect(() => {
    const updateQrSize = () => {
      setQrSize(window.innerWidth < 640 ? 140 : 180);
    };

    updateQrSize();
    window.addEventListener("resize", updateQrSize);
    return () => window.removeEventListener("resize", updateQrSize);
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchUserInfo();
    fetchLastCheckup(); // ✅ Get latest completed appointment
  }, []);

  // 🔹 Fetch patient profile record for the logged-in user (patient_profiles table)
  const fetchProfile = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/patient/profile-data`,
        {
          headers: {
            Authorization: `Bearer ${
              window.localStorage?.getItem("token") || ""
            }`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Loaded patient_profiles record:", data);
        updatePatientData(data);
      } else if (res.status === 404) {
        setMessage("No patient profile found for this account.");
      } else {
        setMessage("Failed to load your profile data.");
      }
    } catch (err) {
      console.error("❌ Error fetching patient profile:", err);
      setMessage("Unable to load profile. Please check your connection.");
    }
  };

  // 🔹 Fetch gender + birth_date from users table
  const fetchUserInfo = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/patient/user-info`,
        {
          headers: {
            Authorization: `Bearer ${
              window.localStorage?.getItem("token") || ""
            }`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Loaded user info:", data);

        const birthDate = data.birth_date ? data.birth_date.split("T")[0] : "";
        const age = calculateAgeDetailed(birthDate);

        setFormData((prev) => ({
          ...prev,
          birth_date: birthDate,
          gender: data.gender || "",
          age,
        }));
      }
    } catch (err) {
      console.error("❌ Error fetching user info:", err);
    }
  };

  // 🔹 Fetch latest completed appointment as last checkup
  const fetchLastCheckup = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/patient/last-checkup`,
        {
          headers: {
            Authorization: `Bearer ${
              window.localStorage.getItem("token") || ""
            }`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Loaded last checkup:", data);
        setFormData((prev) => ({
          ...prev,
          last_checkup: data.last_checkup
            ? data.last_checkup.split("T")[0]
            : "No completed appointments",
        }));
      } else if (res.status === 404) {
        setFormData((prev) => ({
          ...prev,
          last_checkup: "No completed appointments",
        }));
      }
    } catch (err) {
      console.error("❌ Error fetching last checkup:", err);
    }
  };

  // ✅ More detailed age calculation (handles days/months/years)
  const calculateAgeDetailed = (birthDate) => {
    if (!birthDate) return "";

    const birth = new Date(birthDate);
    const today = new Date();

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
      months--;
    }

    if (months < 0) {
      months += 12;
      years--;
    }

    if (years < 1) {
      if (months < 1) {
        return days <= 1 ? `${days} day old` : `${days} days old`;
      }
      return months === 1 ? `${months} month old` : `${months} months old`;
    }

    return years === 1 ? `${years} year old` : `${years} years old`;
  };

  const updatePatientData = (patient) => {
    setUserInfo({
      full_name: patient.full_name || "Unknown Patient",
      email: patient.email || "No email available",
      qr_code:
        patient.qr_code ||
        (patient.user_id
          ? `PAT${String(patient.user_id).padStart(3, "0")}`
          : ""),
    });

    setFormData((prev) => ({
      ...prev,
      father_name: patient.father_name || "",
      mother_name: patient.mother_name || "",
      guardian: patient.guardian || "",
      phone_number: patient.phone_number || "",
      guardian_number: patient.guardian_number || "",
      address: patient.address || "",
      blood_type: patient.blood_type || "",
      allergies: patient.allergies || "",
      chronic_conditions: patient.chronic_conditions || "",
      created_at: patient.created_at
        ? new Date(patient.created_at).toLocaleDateString()
        : "",
      role: patient.role || "patient",
    }));
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "PatientQR.png";
      link.click();
    };
    img.src = url;
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 bg-transparent">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        {/* LEFT PANEL */}
        <div className="bg-white/80 backdrop-blur-sm border-t-4 sm:border-t-8 border-sky-400 rounded-2xl sm:rounded-3xl shadow-md flex-1 p-4 sm:p-5 md:p-6 lg:max-w-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Baby className="text-sky-500 w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-sky-700">
              Patient Info
            </h1>
          </div>

          <div className="bg-sky-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 border border-sky-100">
            <h2 className="font-semibold text-sm sm:text-base text-sky-700 mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 flex-shrink-0" />
              <span>Account Details</span>
            </h2>
            <p className="text-gray-700 mb-1.5 sm:mb-1 flex items-center gap-2 text-sm sm:text-base">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500 flex-shrink-0" />
              <span className="font-medium break-words">
                {userInfo.full_name}
              </span>
            </p>
            <p className="text-gray-700 mb-1.5 sm:mb-1 flex items-center gap-2 text-sm sm:text-base">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500 flex-shrink-0" />
              <span className="font-medium break-all">{userInfo.email}</span>
            </p>
            <p className="text-gray-700 mb-1.5 sm:mb-1 flex items-center gap-2 text-sm sm:text-base">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500 flex-shrink-0" />
              <span className="font-medium">
                Created: {formData.created_at || "Unknown"}
              </span>
            </p>
            <p className="text-gray-700 mb-1.5 sm:mb-1 flex items-center gap-2 text-sm sm:text-base">
              <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500 flex-shrink-0" />
              <span className="font-medium capitalize">
                Role: {formData.role || "Patient"}
              </span>
            </p>

            <div className="mt-3 sm:mt-4 border-t border-sky-200 pt-3 space-y-1.5 sm:space-y-2">
              <p className="text-gray-700 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm sm:text-base">
                <span className="font-semibold">Birth Date:</span>
                <span className="sm:text-right">
                  {formData.birth_date || "Not provided"}
                </span>
              </p>
              <p className="text-gray-700 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm sm:text-base">
                <span className="font-semibold">Age:</span>
                <span className="sm:text-right">{formData.age || "N/A"}</span>
              </p>
              <p className="text-gray-700 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm sm:text-base">
                <span className="font-semibold">Gender:</span>
                <span className="sm:text-right">
                  {formData.gender || "Not provided"}
                </span>
              </p>
            </div>
          </div>

          {userInfo.qr_code ? (
            <div className="text-center mt-4 sm:mt-6">
              <h2 className="text-base sm:text-lg font-semibold text-sky-700 mb-2 sm:mb-3">
                Your KIOSK QR Code
              </h2>
              <div
                ref={qrRef}
                className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl inline-block shadow-inner border-2 sm:border-4 border-yellow-300/70"
              >
                <QRCode value={userInfo.qr_code} size={qrSize} />
              </div>
              <p className="mt-2 text-gray-600 text-xs sm:text-sm">
                QR ID: <span className="font-semibold">{userInfo.qr_code}</span>
              </p>

              <div className="mt-3 sm:mt-4 flex items-center justify-center">
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-sky-400 to-yellow-400 text-white text-sm sm:text-base font-semibold rounded-full shadow-md hover:scale-105 active:scale-95 transition touch-manipulation"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Download QR</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-red-500 text-center mt-4 sm:mt-6 text-sm sm:text-base">
              QR Code not assigned yet.
            </p>
          )}
        </div>

        {/* RIGHT PANEL — READ ONLY DISPLAY */}
        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-md p-4 sm:p-5 md:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-sky-700 mb-4 sm:mb-6">
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[
              ["Father's Name", formData.father_name],
              ["Mother's Name", formData.mother_name],
              ["Guardian", formData.guardian],
              ["Guardian Number", formData.guardian_number],
              ["Phone Number", formData.phone_number],
              ["Address", formData.address],
              ["Blood Type", formData.blood_type],
              ["Allergies", formData.allergies],
              ["Chronic Conditions", formData.chronic_conditions],
              ["Last Checkup", formData.last_checkup],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-sky-50 border border-sky-100 p-3 sm:p-3.5 rounded-lg"
              >
                <span className="block text-xs sm:text-sm text-sky-700 font-semibold mb-1 sm:mb-1.5">
                  {label}
                </span>
                <span className="block text-gray-800 text-sm sm:text-base break-words">
                  {value || "Not provided"}
                </span>
              </div>
            ))}
          </div>

          {message && (
            <p className="mt-4 text-center text-red-600 text-sm sm:text-base px-2">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientProfile;

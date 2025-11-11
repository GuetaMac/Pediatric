import { useEffect, useState } from "react";
import {
  CalendarDays,
  Stethoscope,
  Syringe,
  UserPlus,
  HeartPulse,
} from "lucide-react";

function PatientDashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    fetchUserInfo();
    fetchLatestApprovedAppointment();
  }, []);

  // 🔹 Fetch patient profile
  const fetchUserInfo = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/patient/profile-data`,
        {
          headers: {
            Authorization: `Bearer ${
              window.localStorage.getItem("token") || ""
            }`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch user info");
      const data = await res.json();
      setUserInfo(data);
    } catch (err) {
      console.error("❌ Error fetching user info:", err);
    }
  };

  // 🔹 Fetch the latest approved appointment directly
  const fetchLatestApprovedAppointment = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/appointments/latest-approved`,
        {
          headers: {
            Authorization: `Bearer ${
              window.localStorage.getItem("token") || ""
            }`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        setAppointment(null);
        return;
      }

      const data = await res.json();
      setAppointment(data);
    } catch (err) {
      console.error("❌ Error fetching latest approved appointment:", err);
      setAppointment(null);
    }
  };

  const services = [
    {
      title: "Check-up",
      icon: <Stethoscope className="w-10 h-10 text-sky-500" />,
      desc: "Comprehensive health evaluations for children and teens.",
    },
    {
      title: "Vaccination",
      icon: <Syringe className="w-10 h-10 text-green-500" />,
      desc: "Essential immunizations to keep your child protected.",
    },
    {
      title: "Consultation",
      icon: <UserPlus className="w-10 h-10 text-yellow-500" />,
      desc: "Personalized medical advice from pediatric specialists.",
    },
    {
      title: "Health Monitoring",
      icon: <HeartPulse className="w-10 h-10 text-pink-500" />,
      desc: "Track vital signs and wellness through the kiosk system.",
    },
  ];

  return (
    <div className="p-8 bg-transparent">
      {/* Greeting Section */}
      <div className="relative bg-white/60 border border-sky-100 p-8 rounded-3xl shadow-md mb-10 overflow-hidden transition hover:shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-sky-700 mb-2">
            {userInfo
              ? `Welcome back, ${userInfo.full_name}! 👋`
              : "Welcome back! 👋"}
          </h1>
          <p className="text-gray-600 text-base">
            Stay on top of your health journey — here’s a summary of what’s
            next.
          </p>
        </div>
        <div className="absolute right-6 bottom-0 opacity-10">
          <HeartPulse className="w-32 h-32 text-sky-400" />
        </div>
      </div>

      {/* Latest Approved Appointment Section */}
      <div className="bg-white/70 border-t-8 border-sky-400 shadow-sm rounded-3xl p-6 mb-12 transition hover:shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <CalendarDays className="w-7 h-7 text-sky-500" />
          <h2 className="text-xl font-bold text-sky-700">
            Your Latest Approved Appointment
          </h2>
        </div>

        {appointment ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
            <p>
              <span className="font-semibold text-sky-700">📅 Date:</span>{" "}
              {new Date(appointment.appointment_date).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              )}
            </p>
            <p>
              <span className="font-semibold text-sky-700">⏰ Time:</span>{" "}
              {appointment.appointment_time}
            </p>
            <p>
              <span className="font-semibold text-sky-700">🩺 Service:</span>{" "}
              {appointment.appointment_type}
            </p>
            <p>
              <span className="font-semibold text-sky-700">📍 Status:</span>{" "}
              <span className="capitalize">{appointment.status}</span>
            </p>
          </div>
        ) : (
          <p className="text-gray-600 italic">
            No approved appointments found yet.
          </p>
        )}

        <div className="mt-6 text-center">
          <button className="px-6 py-2 bg-sky-500 text-white rounded-full font-semibold shadow-sm hover:bg-sky-600 transition">
            View Appointment Details
          </button>
        </div>
      </div>

      {/* Clinic Services Section */}
      <div className="bg-white/60 rounded-3xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-sky-700 mb-8 text-center">
          Our Clinic Services
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, idx) => (
            <div
              key={idx}
              className="bg-white/80 border border-sky-100 rounded-2xl shadow-sm p-6 text-center hover:shadow-lg hover:-translate-y-2 transition-all duration-300"
            >
              <div className="flex justify-center mb-3">{service.icon}</div>
              <h3 className="text-lg font-semibold text-sky-700">
                {service.title}
              </h3>
              <p className="text-gray-600 text-sm mt-2">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PatientDashboard;

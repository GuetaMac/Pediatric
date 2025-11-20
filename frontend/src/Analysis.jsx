import { useEffect, useState } from "react";
import {
  CalendarDays,
  Stethoscope,
  Syringe,
  UserPlus,
  HeartPulse,
  User,
  Clock,
  CheckCircle,
} from "lucide-react";

function PatientDashboard({ onNavigateToAppointments }) {
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
      title: "Ear Piercing",
      icon: <HeartPulse className="w-10 h-10 text-pink-500" />,
      desc: "Ensure a safe and comfortable ear piercing experience",
    },
  ];

  return (
    <div className="p-8 bg-transparent">
      {/* Greeting Section - Hidden on mobile */}
      <div className="hidden md:block relative bg-white/60 border border-sky-100 p-8 rounded-3xl shadow-md mb-10 overflow-hidden transition hover:shadow-lg">
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
      <div className="bg-gradient-to-br from-white to-sky-50 border-t-4 border-sky-400 shadow-lg rounded-3xl p-6 sm:p-8 mb-12 transition hover:shadow-xl">
        {/* Header with Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-sky-400 to-sky-600 p-3 rounded-xl shadow-md">
            <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-sky-800">
              Appointment
            </h2>
            <p className="text-sm text-sky-600">
              Most recent confirmed booking
            </p>
          </div>
        </div>

        {appointment ? (
          <div className="space-y-4">
            {/* Patient Name Card */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-400 p-2 rounded-full">
                  <User className="w-5 h-5 text-blue-900" />
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-900">
                    {userInfo?.full_name || "Loading..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Appointment Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div className="bg-white border-2 border-sky-100 rounded-xl p-4 hover:border-sky-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-sky-100 p-2 rounded-lg">
                    <CalendarDays className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">
                      Date
                    </p>
                    <p className="text-sm sm:text-base font-bold text-gray-800">
                      {new Date(
                        appointment.appointment_date
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="bg-white border-2 border-sky-100 rounded-xl p-4 hover:border-sky-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">
                      Time
                    </p>
                    <p className="text-sm sm:text-base font-bold text-gray-800">
                      {appointment.appointment_time}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service */}
              <div className="bg-white border-2 border-sky-100 rounded-xl p-4 hover:border-sky-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Stethoscope className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">
                      Service
                    </p>
                    <p className="text-sm sm:text-base font-bold text-gray-800">
                      {appointment.appointment_type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-white border-2 border-sky-100 rounded-xl p-4 hover:border-sky-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">
                      Status
                    </p>
                    <p className="text-sm sm:text-base font-bold text-emerald-600 capitalize">
                      {appointment.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium text-lg mb-2">
              No Approved Appointments Yet
            </p>
            <p className="text-gray-500 text-sm">
              Your confirmed appointments will appear here
            </p>
          </div>
        )}
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

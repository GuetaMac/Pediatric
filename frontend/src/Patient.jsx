import { useState } from "react";
import { useEffect } from "react";
import {
  Heart,
  Users,
  Calendar,
  Settings,
  Home,
  Stethoscope,
  User,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function Patient() {
  const [activePage, setActivePage] = useState("home");

  const menuItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "patients", label: "Patients", icon: Users },
    { id: "Manage Account", label: "Manage Account", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // HOME PAGE
  const HomePage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
        </div>
      </div>
      {/* Content will go here */}
    </div>
  );
  const AppointmentsPage = () => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [appointmentType, setAppointmentType] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [loading, setLoading] = useState(false);
    const [appointments, setAppointments] = useState([]);

    // Appointment types at duration (minutes)
    const appointmentTypes = {
      Vaccination: 30,
      "Check-up": 60,
      "Physical Testing": 60,
      "Follow-up Check-up": 20,
      Consultation: 30,
    };

    const clinicHours = { start: 7, end: 15 }; // 7AM - 3PM

    // Format slot (12-hour format with AM/PM)
    const formatSlot = (h, m, duration) => {
      const start = new Date();
      start.setHours(h, m, 0, 0);

      const end = new Date(start.getTime() + duration * 60000);

      const to12Hr = (date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
      };

      return `${to12Hr(start)} - ${to12Hr(end)}`;
    };

    // Generate available slots
    const generateTimeSlots = () => {
      if (!appointmentType) return [];
      const duration = appointmentTypes[appointmentType];
      const slots = [];
      let startHour = clinicHours.start;
      let startMinute = 0;

      while (startHour < clinicHours.end) {
        let endHour = startHour;
        let endMinute = startMinute + duration;
        if (endMinute >= 60) {
          endHour += Math.floor(endMinute / 60);
          endMinute = endMinute % 60;
        }

        if (endHour > clinicHours.end) break;

        slots.push(formatSlot(startHour, startMinute, duration));

        startHour = endHour;
        startMinute = endMinute;
      }

      return slots;
    };

    // Get booked slots for the selected date (all types, only pending/approved)
    const getBookedSlots = () => {
      if (!selectedDate) return [];
      const dateStr = selectedDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
      return appointments
        .filter(
          (appt) =>
            appt.appointment_date === dateStr &&
            (appt.status === "approved" || appt.status === "pending")
        )
        .map((appt) => appt.appointment_time.trim());
    };

    // Disable Sundays
    const isClinicOpen = (date) => {
      const day = date.getDay();
      return day !== 0;
    };

    // Format date for display
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    // Fetch all appointments
    const fetchAppointments = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/get/appointments", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        setAppointments(data);
      } catch (err) {
        console.error(err);
      }
    };

    useEffect(() => {
      fetchAppointments();
    }, []);

    // Submit new appointment
    const handleSubmit = async () => {
      if (!selectedDate || !appointmentType || !selectedTime) return;

      setLoading(true);
      try {
        const res = await fetch("http://localhost:5001/api/appointments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            date: selectedDate.toLocaleDateString("en-CA"), // YYYY-MM-DD
            time: selectedTime,
            type: appointmentType,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          alert("✅ Appointment booked!");
          setSelectedDate(null);
          setAppointmentType("");
          setSelectedTime("");
          fetchAppointments(); // refresh list
        } else {
          alert("❌ " + data.error);
        }
      } catch (err) {
        alert("⚠️ Server error, please try again later.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-500" />
            Patient Management
          </h1>
        </div>

        {/* Date Picker */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Select Appointment Date
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            filterDate={isClinicOpen}
            minDate={new Date()}
            className="border p-2 rounded w-full"
            placeholderText="Choose a date"
          />
        </div>

        {/* Appointment Type */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Appointment Type
          </label>
          <select
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">-- Select --</option>
            {Object.keys(appointmentTypes).map((type) => (
              <option key={type} value={type}>
                {type} ({appointmentTypes[type]} mins)
              </option>
            ))}
          </select>
        </div>

        {/* Time Slots */}
        {appointmentType && (
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Available Time Slots
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">-- Select Time --</option>
              {generateTimeSlots().map((slot, idx) => {
                const bookedSlots = getBookedSlots();
                const isBooked = bookedSlots.includes(slot);

                return (
                  <option
                    key={idx}
                    value={slot}
                    disabled={isBooked}
                    style={{
                      backgroundColor: isBooked ? "#f3f4f6" : "white",
                      color: isBooked ? "#9ca3af" : "black",
                    }}
                  >
                    {slot} {isBooked ? "(Already Booked)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={
            !selectedDate || !appointmentType || !selectedTime || loading
          }
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Booking..." : "Book Appointment"}
        </button>

        {/* List of Appointments */}
        <div>
          <h2 className="text-xl font-semibold mt-6 mb-2">
            📅 Your Appointments
          </h2>
          {appointments.length === 0 ? (
            <p className="text-gray-600">No appointments booked yet.</p>
          ) : (
            <ul className="space-y-2">
              {appointments.map((appt) => (
                <li
                  key={appt.id}
                  className="p-3 border rounded bg-gray-50 shadow-sm"
                >
                  <p>
                    <b>Date:</b> {formatDate(appt.appointment_date)}
                  </p>
                  <p>
                    <b>Time:</b> {appt.appointment_time}
                  </p>
                  <p>
                    <b>Type:</b> {appt.appointment_type}
                  </p>
                  <p>
                    <b>Status:</b>{" "}
                    <span
                      className={
                        appt.status === "approved"
                          ? "text-green-600 font-semibold"
                          : "text-yellow-600 font-semibold"
                      }
                    >
                      {appt.status}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };
  // MANAGE ACCOUNT PAGE
  const ManageAccountPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <User className="w-8 h-8 mr-3 text-green-500" />
          Manage Account
        </h1>
      </div>
      {/* Content will go here */}
    </div>
  );

  // SETTINGS PAGE
  const SettingsPage = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center">
        <Settings className="w-8 h-8 mr-3 text-purple-500" />
        Clinic Settings
      </h1>
      {/* Content will go here */}
    </div>
  );

  // RENDER CURRENT PAGE
  const renderContent = () => {
    if (activePage === "home") return <HomePage />;
    if (activePage === "patients") return <AppointmentsPage />;
    if (activePage === "Manage Account") return <ManageAccountPage />;
    if (activePage === "settings") return <SettingsPage />;

    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-600">
          Select a page from sidebar
        </h1>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-pink-50">
      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center mb-8">
            <div className="bg-white bg-opacity-20 p-3 rounded-full mr-3">
              <Heart className="w-8 h-8 text-pink-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">KidsCare</h2>
              <p className="text-blue-200 text-sm">Pediatric Clinic</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                    activePage === item.id
                      ? "bg-white bg-opacity-20 text-white shadow-lg"
                      : "hover:bg-white hover:bg-opacity-10 text-blue-100 hover:text-white"
                  }`}
                >
                  <Icon className="w-6 h-6 mr-3" />
                  <span className="font-semibold">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8">{renderContent()}</div>
    </div>
  );
}

export default Patient;

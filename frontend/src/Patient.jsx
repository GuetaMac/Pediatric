import { useState, useEffect } from "react";
import {
  FaUserCircle,
  FaChartPie,
  FaCalendarAlt,
  FaClipboardList,
  FaHome,
  FaNotesMedical,
  FaQrcode,
  FaSignOutAlt,
} from "react-icons/fa";
import PatientProfile from "./PatientProfile";
import Analysis from "./Analysis";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Calendar,
  FolderOpen,
  ChevronDown,
  Clock,
  ClipboardList,
  Star,
  User,
  FileText,
  Eye,
  AlertCircle,
  Activity,
  Home,
  LogOut,
  X,
  CheckCircle,
} from "lucide-react";
import Swal from "sweetalert2";

// ✅ Appointment types with durations
const appointmentTypes = {
  Vaccination: 30,
  "Check-up": 60,
  "Ear Piercing": 5,
  "Follow-up Check-up": 20,
  Consultation: 30,
};

// Clinic hours
const clinicHours = { start: 9, end: 16 };

function Patient() {
  const [activePage, setActivePage] = useState("home");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [patientName, setPatientName] = useState("Patient");

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

  // Fetch patient user info
  useEffect(() => {
    const fetchPatientInfo = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/patient/user-info`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.full_name) {
            setPatientName(data.full_name);
          }
        }
      } catch (err) {
        console.error("Error fetching patient info:", err);
      }
    };

    fetchPatientInfo();
  }, []);

  // Booking states
  const [selectedDate, setSelectedDate] = useState(null);
  const [appointmentType, setAppointmentType] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [additionalServices, setAdditionalServices] = useState([]); // Array of selected additional services
  const [bookingStatus, setBookingStatus] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // ✅ Convert time string to minutes
  const timeStringToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  // ✅ Convert minutes back to string
  const minutesToTimeString = (minutes) => {
    let hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${mins.toString().padStart(2, "0")} ${ampm}`;
  };

  // ✅ Format slot string
  const formatSlot = (startMinutes, duration) => {
    const endMinutes = startMinutes + duration;
    return `${minutesToTimeString(startMinutes)} - ${minutesToTimeString(
      endMinutes
    )}`;
  };

  // ✅ Compare dates ignoring time (robust to different formats)
  const isSameCalendarDay = (a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    if (Number.isNaN(da) || Number.isNaN(db)) return false;
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };

  // ✅ Parse appointment slot
  const parseAppointmentSlot = (appointmentTime, appointmentType) => {
    const [startStr] = appointmentTime.split(" - ");
    const startMinutes = timeStringToMinutes(startStr);
    const duration = appointmentTypes[appointmentType] || 30;

    return {
      start: startMinutes,
      end: startMinutes + duration,
    };
  };

  // ✅ Check if conflict exists
  const hasConflict = (newSlotStart, newSlotDuration) => {
    if (!selectedDate) return false;

    const newSlotEnd = newSlotStart + newSlotDuration;

    return appointments.some((appt) => {
      // Match same calendar day regardless of string format
      if (!isSameCalendarDay(appt.appointment_date, selectedDate)) return false;

      // Only block when appointment is active (pending/approved)
      const apptStatus = String(appt.status || "")
        .toLowerCase()
        .trim();
      if (apptStatus !== "approved" && apptStatus !== "pending") return false;

      // Must have a time to compare
      if (!appt.appointment_time) return false;

      const existing = parseAppointmentSlot(
        appt.appointment_time,
        appt.appointment_type
      );

      return newSlotStart < existing.end && existing.start < newSlotEnd;
    });
  };

  // ✅ Generate slots
  const generateTimeSlots = () => {
    if (!appointmentType) return [];

    const duration = appointmentTypes[appointmentType];
    const slots = [];
    const startMinutes = clinicHours.start * 60;
    const endMinutes = clinicHours.end * 60;

    for (
      let currentMinutes = startMinutes;
      currentMinutes + duration <= endMinutes;
      currentMinutes += 30
    ) {
      const slotText = formatSlot(currentMinutes, duration);
      const isAvailable = !hasConflict(currentMinutes, duration);

      slots.push({
        text: slotText,
        value: slotText,
        available: isAvailable,
      });
    }
    return slots;
  };

  // ✅ Fetch appointments
  const fetchAppointments = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/get/appointments`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // ✅ Book appointment
  const handleBookAppointment = async (patientConcerns) => {
    if (!selectedDate || !appointmentType || !selectedTime) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Information",
        text: "Please complete all fields to book your appointment",
        confirmButtonColor: "#0ea5e9",
      });
      return;
      return;
    }

    try {
      // Format additional services: "None" if empty, or comma-separated string
      const additionalServicesStr =
        additionalServices.length === 0
          ? "None"
          : additionalServices.join(", ");

      const res = await fetch(`${import.meta.env.VITE_API_URL}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          date: selectedDate.toLocaleDateString("en-CA"),
          time: selectedTime,
          type: appointmentType,
          concerns: patientConcerns,
          additional_services: additionalServicesStr,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Appointment Booked!",
          text: "Your appointment has been booked successfully",
          confirmButtonColor: "#0ea5e9",
          timer: 2000,
          showConfirmButton: false,
        });
        setSelectedDate(null);
        setAppointmentType("");
        setSelectedTime("");
        setAdditionalServices([]);
        fetchAppointments();
      } else {
        Swal.fire({
          icon: "error",
          title: "Booking Failed",
          text: data.error || "Failed to book appointment",
          confirmButtonColor: "#0ea5e9",
        });
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Unable to connect to server. Please try again later.",
        confirmButtonColor: "#0ea5e9",
      });
    }
  };

  // ✅ Toggle additional service
  const toggleAdditionalService = (type) => {
    if (additionalServices.includes(type)) {
      setAdditionalServices(additionalServices.filter((t) => t !== type));
    } else {
      setAdditionalServices([...additionalServices, type]);
    }
  };

  // ✅ Handle "None" selection
  const handleSelectNone = () => {
    setAdditionalServices([]);
  };

  // ✅ Appointment Page
  // ✅ Appointment Page – Vertical Timeline Design
  // ✅ Appointment Page – Vertical Timeline with Status Filter
  const AppointmentsPage = () => {
    const availableSlots = generateTimeSlots();
    const [filterStatus, setFilterStatus] = useState("all");
    const [patientConcerns, setPatientConcerns] = useState(""); //new state para maayos typings

    // Get available additional services (exclude the primary appointment type)
    const availableAdditionalServices = Object.keys(appointmentTypes).filter(
      (type) => type !== appointmentType
    );

    const filteredAppointments = appointments.filter((appt) => {
      const status = appt.status?.toLowerCase().trim();
      return filterStatus === "all" ? true : status === filterStatus;
    });

    return (
      <div className="bg-transparent rounded-3xl p-6 md:p-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <Star className="mx-auto w-12 h-12 text-yellow-400 drop-shadow-md" />
          <h2 className="text-4xl font-extrabold text-sky-800 drop-shadow-sm">
            Book Your Appointment
          </h2>
          <p className="text-sky-600 text-lg">
            Choose a date, visit type, time, and optionally add additional
            services.
          </p>
        </div>

        {/* Step Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Date Picker */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-sky-100 hover:shadow-xl transition-all relative z-20">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-sky-600" />
              <h3 className="text-xl font-bold text-sky-800">1. Pick a Date</h3>
            </div>
            <div className="relative z-30">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  setSelectedTime("");
                  setAdditionalServices([]);
                }}
                filterDate={(date) => date.getDay() !== 0}
                minDate={new Date()}
                dateFormat="MMMM d, yyyy"
                className="w-full border-2 border-sky-300 rounded-xl px-4 py-3 text-lg bg-white
            focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                placeholderText="Select a date"
                popperClassName="z-50"
              />
            </div>
          </div>

          {/* Appointment Type */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-sky-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="text-sky-600" />
              <h3 className="text-xl font-bold text-sky-800">2. Visit Type</h3>
            </div>
            <select
              value={appointmentType}
              onChange={(e) => {
                setAppointmentType(e.target.value);
                setSelectedTime("");
                setAdditionalServices([]); // Clear additional services when primary type changes
              }}
              className="w-full border-2 border-sky-300 rounded-xl px-4 py-3 text-lg bg-white
            focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            >
              <option value="">-- Choose --</option>
              {Object.keys(appointmentTypes).map((type) => (
                <option key={type} value={type}>
                  {type} ({appointmentTypes[type]} mins)
                </option>
              ))}
            </select>
          </div>

          {/* Time Slot */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-sky-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-sky-600" />
              <h3 className="text-xl font-bold text-sky-800">3. Time Slot</h3>
            </div>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full border-2 border-sky-300 rounded-xl px-4 py-3 text-lg bg-white
            focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              disabled={!appointmentType || !selectedDate}
            >
              <option value="">-- Choose Slot --</option>
              {availableSlots.map((slot, idx) => (
                <option
                  key={idx}
                  value={slot.value}
                  disabled={!slot.available}
                  className={slot.available ? "" : "text-gray-400 bg-gray-100"}
                >
                  {slot.text} {!slot.available ? "(Booked)" : ""}
                </option>
              ))}
            </select>
            {appointmentType &&
              selectedDate &&
              availableSlots.filter((s) => s.available).length === 0 && (
                <p className="text-red-500 text-sm mt-2">
                  No slots available for this date/type.
                </p>
              )}
          </div>
        </div>

        {/* Additional Services Section */}
        {selectedDate && appointmentType && selectedTime && (
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-sky-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="text-sky-600" />
              <h3 className="text-xl font-bold text-sky-800">
                4. Additional Services (Optional)
              </h3>
            </div>
            <p className="text-sm text-sky-600 mb-4">
              You can add other services to your appointment. Select "None" if
              you don't want any additional services.
            </p>
            <div className="space-y-3">
              {/* None option */}
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  additionalServices.length === 0
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-sky-200 hover:border-sky-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="additionalServices"
                  checked={additionalServices.length === 0}
                  onChange={handleSelectNone}
                  className="w-5 h-5 text-yellow-400 border-sky-300 focus:ring-yellow-400"
                />
                <span className="flex-1 font-semibold text-sky-800">None</span>
              </label>

              {/* Available additional services */}
              {availableAdditionalServices.map((type) => {
                const isSelected = additionalServices.includes(type);
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-yellow-400 bg-yellow-50"
                        : "border-sky-200 hover:border-sky-300 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAdditionalService(type)}
                      className="w-5 h-5 text-yellow-400 border-sky-300 rounded focus:ring-yellow-400"
                    />
                    <span className="flex-1 font-semibold text-sky-800">
                      {type}{" "}
                      <span className="text-sm text-sky-600">
                        ({appointmentTypes[type]} mins)
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {additionalServices.length > 0 && (
              <div className="mt-4 p-3 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-sm text-sky-700">
                  <strong>Selected Additional Services:</strong>{" "}
                  {additionalServices.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Patient Concerns */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-sky-100 hover:shadow-xl transition-all relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="text-sky-600" />
            <h3 className="text-xl font-bold text-sky-800">
              {selectedDate && appointmentType && selectedTime
                ? "5. Patient Concerns"
                : "4. Patient Concerns"}
            </h3>
          </div>
          <textarea
            value={patientConcerns}
            onChange={(e) => setPatientConcerns(e.target.value)}
            placeholder="Describe symptoms or reason for visit"
            className="w-full border-2 border-sky-300 rounded-xl px-4 py-3 text-lg bg-white resize-none
        focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            rows={3}
          />
          {patientConcerns.length > 0 && (
            <p className="text-xs text-sky-600 mt-2">
              {patientConcerns.length} characters
            </p>
          )}
        </div>

        {/* Book Button */}
        <div className="text-center">
          <button
            onClick={() => handleBookAppointment(patientConcerns)}
            className="inline-block bg-yellow-400 text-sky-900 px-10 py-4 rounded-full text-lg
        font-bold shadow-md hover:bg-yellow-500 hover:scale-105 hover:shadow-lg transition-all"
          >
            Book Appointment
          </button>
        </div>

        {/* Timeline Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-sky-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-3xl font-extrabold text-sky-800 drop-shadow-sm">
              Upcoming & Past Appointments
            </h3>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border-2 border-sky-300 rounded-xl px-4 py-2 text-lg bg-white
            focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          {loading ? (
            <p className="text-center text-sky-600">Loading appointments…</p>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-center text-gray-500 text-lg">
              No appointments found.
            </p>
          ) : (
            <ol className="relative border-l-4 border-sky-300/50 space-y-8 pl-4">
              {filteredAppointments
                .sort(
                  (a, b) =>
                    new Date(a.appointment_date) - new Date(b.appointment_date)
                )
                .map((appt, index) => {
                  const status = appt.status?.toLowerCase().trim();
                  const date = new Date(
                    appt.appointment_date
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });

                  let dot = "bg-yellow-400";
                  let badge = "bg-yellow-100 text-yellow-700";
                  if (status === "completed") {
                    dot = "bg-green-400";
                    badge = "bg-green-100 text-green-700";
                  } else if (status === "approved") {
                    dot = "bg-sky-400";
                    badge = "bg-sky-100 text-sky-700";
                  } else if (status === "canceled") {
                    dot = "bg-red-400";
                    badge = "bg-red-100 text-red-700";
                  }

                  return (
                    <li key={index} className="ml-6">
                      <span
                        className={`absolute -left-3 flex items-center justify-center w-7 h-7 rounded-full ring-8 ring-white/60 ${dot}`}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">
                            {appt.appointment_type}
                          </h4>
                          <p className="text-gray-600 text-lg">
                            {date} • {appt.appointment_time}
                          </p>
                          {appt.additional_services &&
                            appt.additional_services !== "None" && (
                              <p className="text-sm text-sky-600 mt-1">
                                <strong>Additional Services:</strong>{" "}
                                {appt.additional_services}
                              </p>
                            )}
                        </div>
                        <span
                          className={`mt-3 sm:mt-0 px-4 py-1.5 text-md rounded-full font-semibold capitalize ${badge}`}
                        >
                          {status}
                        </span>
                      </div>
                    </li>
                  );
                })}
            </ol>
          )}
        </div>
      </div>
    );
  };

  const MedicalRecords = () => {
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFullName, setImportFullName] = useState("");
    const [importMotherName, setImportMotherName] = useState("");
    const [importFatherName, setImportFatherName] = useState("");
    const [importSearchLoading, setImportSearchLoading] = useState(false);
    const [importResults, setImportResults] = useState([]);
    const [importError, setImportError] = useState(null);
    const [selectedImportIds, setSelectedImportIds] = useState(new Set());
    const [importSubmitting, setImportSubmitting] = useState(false);

    // Auto-load current user's full_name for import and lock the field
    useEffect(() => {
      const loadUser = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/patient/user-info`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.full_name) {
              setImportFullName(data.full_name);
            }
          }
        } catch {
          // ignore
        }
      };
      loadUser();
    }, []);
    useEffect(() => {
      fetchPatientRecords();
    }, []);

    const fetchPatientRecords = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please login to view your medical records");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/patient/medical-records`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Session expired. Please login again.");
          }
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        setMedicalRecords(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching medical records:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    const [openFolder, setOpenFolder] = useState(null);

    const groupedRecords = medicalRecords.reduce((groups, record) => {
      const type = record.appointment_type || "Others";
      if (!groups[type]) groups[type] = [];
      groups[type].push(record);
      return groups;
    }, {});

    const openRecordDetail = (record) => {
      setSelectedRecord(record);
      setShowModal(true);
    };

    const closeModal = () => {
      setShowModal(false);
      setSelectedRecord(null);
    };

    const printRecord = (patient) => {
      if (!patient) {
        Swal.fire({
          icon: "info",
          title: "No Record",
          text: "No medical record available to print",
          confirmButtonColor: "#0ea5e9",
        });
        return;
      }

      // Compute age from birth_date at the time of appointment
      let age = "N/A";
      if (patient.birth_date && patient.appointment_date) {
        const birth = new Date(patient.birth_date);
        const appointmentDateForAge = new Date(patient.appointment_date);

        // Calculate age in years and months
        let years = appointmentDateForAge.getFullYear() - birth.getFullYear();
        let months = appointmentDateForAge.getMonth() - birth.getMonth();

        if (
          months < 0 ||
          (months === 0 && appointmentDateForAge.getDate() < birth.getDate())
        ) {
          years--;
          months += 12;
        }
        if (appointmentDateForAge.getDate() < birth.getDate()) {
          months--;
          if (months < 0) {
            months += 12;
            years--;
          }
        }

        // If less than 2 years old, show in months
        if (years < 2) {
          const totalMonths = years * 12 + months;
          age = `${totalMonths} ${totalMonths === 1 ? "month" : "months"}`;
        } else {
          // Otherwise show in years
          if (months === 0) {
            age = `${years} ${years === 1 ? "yr" : "yrs"}`;
          } else {
            age = `${years} ${years === 1 ? "yr" : "yrs"} ${months} ${
              months === 1 ? "month" : "months"
            }`;
          }
        }
      }

      // Format appointment date and time
      const appointmentDate = patient.appointment_date
        ? new Date(patient.appointment_date).toLocaleDateString()
        : "N/A";
      const appointmentTime = patient.appointment_time || "N/A";
      const appointmentType = patient.appointment_type || "N/A";

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
    <html>
    <head>
        <title>Patient Record - ${patient.full_name}</title>
        <style>
        body {
            font-family: Arial, sans-serif;
            padding: 30px;
            line-height: 1.6;
            color: #333;
        }
        h2 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 5px;
        }
        p {
            margin: 6px 0;
        }
        .field {
            margin-bottom: 10px;
        }
        .label {
            font-weight: bold;
            color: #1e3a8a;
        }
        button {
            margin-top: 20px;
            padding: 8px 16px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        button:hover {
            background: #1d4ed8;
        }
        .section {
            margin-bottom: 20px;
        }
        </style>
    </head>
    <body>
        <h2>Appointment Details</h2>
        <div class="section">
        <p class="field"><span class="label">Appointment Type:</span> ${appointmentType}</p>
        <p class="field"><span class="label">Date:</span> ${appointmentDate}</p>
        <p class="field"><span class="label">Time:</span> ${appointmentTime}</p>
        </div>

        <h2>Medical Record</h2>
        <div class="section">
        <p class="field"><span class="label">Full Name:</span> ${
          patient.full_name
        }</p>
        <p class="field"><span class="label">Age:</span> ${age}</p>
        <p class="field"><span class="label">Temperature:</span> ${
          patient.temperature || "N/A"
        }</p>
        <p class="field"><span class="label">Pulse Rate:</span> ${
          patient.pulse_rate || "N/A"
        }</p>
        <p class="field"><span class="label">Height:</span> ${
          patient.height || "N/A"
        }</p>
        <p class="field"><span class="label">Weight:</span> ${
          patient.weight || "N/A"
        }</p>
        <p class="field"><span class="label">Diagnosis:</span> ${
          patient.diagnosis || "N/A"
        }</p>
        <p class="field"><span class="label">Remarks:</span> ${
          patient.remarks || "N/A"
        }</p>
        </div>

        <button onclick="window.print()">Print this page</button>
    </body>
    </html>
`);
      printWindow.document.close();
    };

    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your medical records...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200 max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Unable to Load Records
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => (window.location.href = "/login")}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-2"
            >
              Go to Login
            </button>
            <button
              onClick={fetchPatientRecords}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* ---------- Cohesive Header Bar (Replaced Original Header Div) ---------- */}
          <div className="flex items-center justify-between p-4 bg-white/95 border-b border-gray-200 rounded-xl shadow-lg">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 flex items-center">
              <User className="w-7 h-7 sm:w-8 sm:h-8 mr-3 text-yellow-500" />
              My Medical Records
            </h1>

            {/* Actions/Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(true);
                  setImportError(null);
                }}
                // Import button optimized for smaller screens (hidden on XS)
                className="hidden sm:block px-3 py-1.5 md:px-4 md:py-2 border-2 border-blue-300 text-blue-900 font-semibold rounded-lg shadow-sm bg-white hover:bg-blue-50 transition-colors text-sm"
              >
                Import Medical Records
              </button>

              <button
                onClick={fetchPatientRecords}
                // Refresh button
                className="px-3 py-1.5 md:px-4 md:py-2 bg-yellow-500 text-blue-900 font-semibold rounded-lg shadow hover:bg-yellow-400 transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* ---------- Records Grid ---------- */}
          {/* ---------- Grouped Records (Folder View) ---------- */}
          {medicalRecords.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-md border-l-4 border-yellow-400">
              <FileText className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-blue-800 mb-2">
                No Medical Records Found
              </h3>
              <p className="text-blue-700 max-w-md mx-auto">
                Your medical records will appear here after your appointments
                are completed and reviewed by the doctor.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedRecords).map((type) => (
                <div
                  key={type}
                  className="bg-white rounded-xl shadow-md border border-yellow-300 overflow-hidden"
                >
                  {/* Folder Header */}
                  <div
                    onClick={() =>
                      setOpenFolder(openFolder === type ? null : type)
                    }
                    className="flex items-center justify-between p-5 bg-yellow-100 cursor-pointer hover:bg-yellow-200 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <FolderOpen className="w-6 h-6 text-yellow-600" />
                      <h3 className="text-xl font-bold text-blue-900">
                        {type}
                      </h3>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-blue-600 transform transition-transform duration-300 ${
                        openFolder === type ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Folder Content */}
                  {openFolder === type && (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-yellow-50 transition-all duration-300">
                      {groupedRecords[type].map((record) => (
                        <div
                          key={record.record_id || record.appointment_id}
                          className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 cursor-pointer border-t-4 border-yellow-400 group"
                          onClick={() => openRecordDetail(record)}
                        >
                          {/* Appointment Type */}
                          <p className="text-sm font-bold text-yellow-600 uppercase mb-2">
                            {record.appointment_type}
                          </p>

                          {/* Date & Icon */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                              <span className="text-sm font-medium text-blue-700">
                                {record.appointment_date}
                              </span>
                            </div>
                            <Eye className="w-4 h-4 text-blue-400 group-hover:text-yellow-500 transition" />
                          </div>

                          {/* Diagnosis / Title */}
                          <h3 className="text-lg font-semibold text-blue-900 mb-2">
                            {record.diagnosis || "General Checkup"}
                          </h3>

                          {/* Vitals */}
                          <div className="space-y-2 text-sm text-blue-700">
                            {record.weight && (
                              <div className="flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-yellow-500" />
                                <span>Weight: {record.weight} kg</span>
                              </div>
                            )}
                            {record.height && (
                              <div className="flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-yellow-500" />
                                <span>Height: {record.height} cm</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-blue-100">
                            <span className="text-xs text-blue-500">
                              Click to view full details
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ---------- Detail Modal ---------- */}
          {showModal && selectedRecord && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              {/* ^^^  changed overlay to a soft translucent white  ^^^ */}
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto border-t-8 border-yellow-400">
                {/* Modal Header */}
                <div className="p-6 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-blue-900 flex items-center">
                      <FileText className="w-6 h-6 mr-2 text-yellow-500" />
                      Medical Record Details
                    </h2>
                    <button
                      onClick={closeModal}
                      className="text-blue-500 hover:text-yellow-500 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Appointment Date: {selectedRecord.appointment_date}
                  </p>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* Basic Info Boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-1">
                        Weight
                      </h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedRecord.weight || "Not recorded"}
                        {selectedRecord.weight && (
                          <span className="text-sm ml-1">kg</span>
                        )}
                      </p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                      <h4 className="font-semibold text-yellow-800 mb-1">
                        Height
                      </h4>
                      <p className="text-2xl font-bold text-yellow-600">
                        {selectedRecord.height || "Not recorded"}
                        {selectedRecord.height && (
                          <span className="text-sm ml-1">cm</span>
                        )}
                      </p>
                    </div>

                    {selectedRecord.birth_date ? (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-800 mb-1">
                          Age (at appointment)
                        </h4>
                        <p className="text-2xl font-bold text-blue-600">
                          {(() => {
                            const birthDate = new Date(
                              selectedRecord.birth_date
                            );
                            const appointmentDate =
                              selectedRecord.appointment_date
                                ? new Date(selectedRecord.appointment_date)
                                : new Date();

                            // Calculate age in years and months
                            let years =
                              appointmentDate.getFullYear() -
                              birthDate.getFullYear();
                            let months =
                              appointmentDate.getMonth() - birthDate.getMonth();

                            if (
                              months < 0 ||
                              (months === 0 &&
                                appointmentDate.getDate() < birthDate.getDate())
                            ) {
                              years--;
                              months += 12;
                            }
                            if (
                              appointmentDate.getDate() < birthDate.getDate()
                            ) {
                              months--;
                              if (months < 0) {
                                months += 12;
                                years--;
                              }
                            }

                            // If less than 2 years old, show in months
                            if (years < 2) {
                              const totalMonths = years * 12 + months;
                              return `${totalMonths} ${
                                totalMonths === 1 ? "month" : "months"
                              }`;
                            }

                            // Otherwise show in years
                            if (months === 0) {
                              return `${years} ${years === 1 ? "yr" : "yrs"}`;
                            }
                            return `${years} ${
                              years === 1 ? "yr" : "yrs"
                            } ${months} ${months === 1 ? "month" : "months"}`;
                          })()}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-800 mb-1">
                          Age
                        </h4>
                        <p className="text-2xl font-bold text-blue-600">
                          Not recorded
                        </p>
                      </div>
                    )}
                  </div>

                  {/* BMI */}
                  {selectedRecord.weight && selectedRecord.height && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                      <h4 className="font-semibold text-yellow-800 mb-2">
                        Body Mass Index (BMI)
                      </h4>
                      <p className="text-2xl font-bold text-yellow-600">
                        {(
                          selectedRecord.weight /
                          ((selectedRecord.height / 100) *
                            (selectedRecord.height / 100))
                        ).toFixed(1)}
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {(() => {
                          const bmi =
                            selectedRecord.weight /
                            ((selectedRecord.height / 100) *
                              (selectedRecord.height / 100));
                          if (bmi < 18.5) return "Underweight";
                          if (bmi < 25) return "Normal weight";
                          if (bmi < 30) return "Overweight";
                          return "Obese";
                        })()}
                      </p>
                    </div>
                  )}

                  {/* Diagnosis */}
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-yellow-500" />
                      Diagnosis
                    </h4>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-blue-800">
                        {selectedRecord.diagnosis || "No diagnosis recorded"}
                      </p>
                    </div>
                  </div>

                  {/* Treatment & Remarks */}
                  {selectedRecord.remarks && (
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-yellow-500" />
                        Treatment & Remarks
                      </h4>
                      <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                        <p className="text-blue-800 whitespace-pre-wrap">
                          {selectedRecord.remarks}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Appointment Info */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Appointment Information
                    </h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>
                        <strong>Date:</strong> {selectedRecord.appointment_date}
                      </p>
                      {selectedRecord.appointment_time && (
                        <p>
                          <strong>Time:</strong>{" "}
                          {selectedRecord.appointment_time}
                        </p>
                      )}
                      {selectedRecord.updated_at && (
                        <p>
                          <strong>Last Updated:</strong>{" "}
                          {new Date(
                            selectedRecord.updated_at
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-blue-100 bg-blue-50 rounded-b-2xl">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-blue-600">
                      This is your official medical record. Keep this
                      information confidential.
                    </p>
                    <button
                      onClick={() => printRecord(selectedRecord)}
                      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Print Record
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-2 bg-yellow-500 text-blue-900 font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showImportModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-t-8 border-blue-500">
                <div className="p-6 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-blue-900 flex items-center">
                      <FileText className="w-6 h-6 mr-2 text-blue-500" />
                      Import Medical Records
                    </h2>
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportFullName("");
                        setImportMotherName("");
                        setImportFatherName("");
                        setImportResults([]);
                        setSelectedImportIds(new Set());
                        setImportError(null);
                      }}
                      className="text-blue-500 hover:text-yellow-500 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Enter your full name and either your mother&apos;s or
                    father&apos;s name to find your records.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-blue-900 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={importFullName}
                          onChange={(e) => setImportFullName(e.target.value)}
                          disabled
                          placeholder="e.g., Juan Dela Cruz"
                          className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-blue-900 mb-1">
                          Mother&apos;s Name (optional)
                        </label>
                        <input
                          type="text"
                          value={importMotherName}
                          onChange={(e) => setImportMotherName(e.target.value)}
                          placeholder="e.g., Maria Dela Cruz"
                          className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-blue-900 mb-1">
                          Father&apos;s Name (optional)
                        </label>
                        <input
                          type="text"
                          value={importFatherName}
                          onChange={(e) => setImportFatherName(e.target.value)}
                          placeholder="e.g., Jose Dela Cruz"
                          className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                    </div>
                    {importError && (
                      <p className="text-sm text-red-600 mt-3">{importError}</p>
                    )}
                    <div className="mt-4">
                      <button
                        disabled={importSearchLoading}
                        onClick={async () => {
                          setImportError(null);
                          // Example: When fields are incomplete
                          if (
                            !importFullName.trim() ||
                            (!importMotherName.trim() &&
                              !importFatherName.trim())
                          ) {
                            Swal.fire({
                              icon: "warning",
                              title: "Missing Information",
                              text: "Please enter your full name and at least one parent name",
                              confirmButtonColor: "#0ea5e9",
                            });
                            return;
                          }
                          try {
                            setImportSearchLoading(true);
                            const token = localStorage.getItem("token");
                            const res = await fetch(
                              `${
                                import.meta.env.VITE_API_URL
                              }/patient/medical-records/import/search`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  full_name: importFullName.trim(),
                                  mother_name:
                                    importMotherName.trim() || undefined,
                                  father_name:
                                    importFatherName.trim() || undefined,
                                }),
                              }
                            );
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}));
                              throw new Error(
                                data.error || `Search failed (${res.status})`
                              );
                            }
                            const data = await res.json();
                            setImportResults(Array.isArray(data) ? data : []);
                            setSelectedImportIds(new Set());
                          } catch (err) {
                            setImportError(
                              err.message || "Search failed. Please try again."
                            );
                          } finally {
                            setImportSearchLoading(false);
                          }
                        }}
                        className={`px-5 py-2 rounded-lg font-semibold ${
                          importSearchLoading
                            ? "bg-blue-300 text-white"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        } transition-colors`}
                      >
                        {importSearchLoading
                          ? "Searching..."
                          : "Search Records"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-md font-semibold text-blue-900">
                      Search Results
                    </h3>
                    {importResults.length === 0 ? (
                      <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                        No records to display. Run a search to see results.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {importResults.map((rec) => {
                          const id =
                            rec.record_id || rec.appointment_id || rec.id;
                          const checked = selectedImportIds.has(id);
                          const isImported = rec.is_imported === true;
                          return (
                            <label
                              key={id}
                              className={`border rounded-lg p-4 transition-all ${
                                isImported
                                  ? "bg-green-50 border-green-300 cursor-not-allowed opacity-75"
                                  : checked
                                  ? "border-yellow-400 bg-yellow-50 cursor-pointer hover:shadow"
                                  : "border-blue-100 bg-white cursor-pointer hover:shadow"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isImported}
                                  onChange={(e) => {
                                    if (!isImported) {
                                      const next = new Set(selectedImportIds);
                                      if (e.target.checked) next.add(id);
                                      else next.delete(id);
                                      setSelectedImportIds(next);
                                    }
                                  }}
                                  className={`mt-1 w-5 h-5 text-yellow-400 border-blue-300 rounded focus:ring-yellow-400 ${
                                    isImported
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-bold text-yellow-700 uppercase">
                                      {rec.appointment_type || "Record"}
                                    </p>
                                    {isImported && (
                                      <span className="px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Imported
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-blue-900 font-semibold">
                                    {rec.full_name || importFullName}
                                  </p>
                                  <p className="text-sm text-blue-700">
                                    Date:{" "}
                                    {rec.appointment_date || rec.date || "N/A"}
                                  </p>
                                  {rec.diagnosis && (
                                    <p className="text-sm text-blue-700">
                                      Diagnosis: {rec.diagnosis}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-blue-100 bg-blue-50 rounded-b-2xl flex items-center justify-between">
                  <p className="text-xs text-blue-600">
                    Select the records you recognize as yours, then import them
                    to your account.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportFullName("");
                        setImportMotherName("");
                        setImportFatherName("");
                        setImportResults([]);
                        setSelectedImportIds(new Set());
                        setImportError(null);
                      }}
                      className="px-5 py-2 bg-white border-2 border-blue-200 text-blue-900 font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={
                        selectedImportIds.size === 0 || importSubmitting
                      }
                      onClick={async () => {
                        setImportError(null);
                        try {
                          setImportSubmitting(true);
                          const token = localStorage.getItem("token");

                          const importableIds = Array.from(
                            selectedImportIds
                          ).filter((id) => {
                            const rec = importResults.find(
                              (r) =>
                                (r.record_id || r.appointment_id || r.id) === id
                            );
                            return rec && !rec.is_imported;
                          });

                          if (importableIds.length === 0) {
                            Swal.fire({
                              icon: "warning",
                              title: "No Records Selected",
                              text: "Please select records that haven't been imported yet",
                              confirmButtonColor: "#0ea5e9",
                            });
                            setImportSubmitting(false);
                            return;
                          }

                          const res = await fetch(
                            `${
                              import.meta.env.VITE_API_URL
                            }/patient/medical-records/import`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                record_ids: importableIds,
                              }),
                            }
                          );

                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(
                              data.error || `Import failed (${res.status})`
                            );
                          }

                          Swal.fire({
                            icon: "success",
                            title: "Import Successful!",
                            text: `Successfully imported ${importableIds.length} record(s)`,
                            confirmButtonColor: "#0ea5e9",
                            timer: 2000,
                            showConfirmButton: false,
                          });

                          setShowImportModal(false);
                          setImportFullName("");
                          setImportMotherName("");
                          setImportFatherName("");
                          setImportResults([]);
                          setSelectedImportIds(new Set());
                          await fetchPatientRecords();
                        } catch (err) {
                          Swal.fire({
                            icon: "error",
                            title: "Import Failed",
                            text:
                              err.message || "Import failed. Please try again.",
                            confirmButtonColor: "#0ea5e9",
                          });
                        } finally {
                          setImportSubmitting(false);
                        }
                      }}
                      className={`px-5 py-2 rounded-lg font-semibold ${
                        selectedImportIds.size === 0 || importSubmitting
                          ? "bg-yellow-300 text-blue-900"
                          : "bg-yellow-500 text-blue-900 hover:bg-yellow-400"
                      } transition-colors`}
                    >
                      {importSubmitting ? "Importing..." : "Import Selected"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "checkup", label: "Checkup History", icon: ClipboardList },
    { id: "profile", label: "Profile", icon: User },
  ];

  const renderContent = () => {
    switch (activePage) {
      case "home":
        return <Analysis />;

      case "appointments":
        return <AppointmentsPage />;

      case "checkup":
        return <MedicalRecords />;

      case "profile":
        return <PatientProfile />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-pink-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Fixed) */}
      <div
        className={`fixed top-0 left-0 h-full w-64 sm:w-72 bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-xl z-50 transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-4 sm:p-6">
          {/* Logo + Branding */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Logo in white circle */}
              <div className="bg-white p-1.5 sm:p-2 rounded-full flex items-center justify-center shadow-md">
                <img
                  src="/clinicsclogo.png"
                  alt="Clinic Logo"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                />
              </div>

              {/* Text Branding */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Castillo</h2>
                <p className="text-blue-200 text-xs sm:text-sm">
                  Children Clinic
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-white hover:text-yellow-400 text-2xl"
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-200 text-sm sm:text-base ${
                    activePage === item.id
                      ? "bg-yellow-400 text-blue-600 shadow-lg"
                      : "hover:bg-yellow-400 hover:text-blue-600 text-blue-100"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                  <span className="font-semibold">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 w-64 sm:w-72 p-4 sm:p-6 bg-blue-800 bg-opacity-50">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
              <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base truncate">
                {patientName}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm sm:text-base"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Header with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gradient-to-b from-blue-600 to-blue-800 text-white p-3 sm:p-4 flex items-center justify-between z-40 shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-white bg-opacity-20 p-1.5 sm:p-2 rounded-full flex items-center justify-center shadow-md">
            <img
              src="/clinicsclogo.png"
              alt="Clinic Logo"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold">Castillo</h2>
            <p className="text-blue-200 text-xs">Children Clinic</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-blue-700 transition"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
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

      {/* Content Area */}
      <div
        className="flex-1 md:ml-64 lg:ml-72 p-4 sm:p-6 md:p-8 bg-cover bg-center bg-fixed overflow-y-auto relative pt-28 sm:pt-24 md:pt-0"
        style={{ backgroundImage: "url('/doctor.png')" }}
      >
        {renderContent()}
      </div>
    </div>
  );
}

export default Patient;

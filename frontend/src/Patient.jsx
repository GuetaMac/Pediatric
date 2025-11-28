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
  Bell,
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
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/notifications/patient`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();

        // ✅ FILTER - Only count UNREAD notifications
        const lastViewedTime = localStorage.getItem("lastNotificationView");
        const unreadCount = lastViewedTime
          ? data.filter(
              (n) => new Date(n.created_at) > new Date(lastViewedTime)
            ).length
          : data.length;

        setNotificationCount(unreadCount);
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);
  // Add badge sa navigation button (sa Notifications link)

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

  const formatDateForBackend = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ✅ Book appointment
  const handleBookAppointment = async (patientConcerns, vaccinationType) => {
    // Validation
    if (!selectedDate || !appointmentType || !selectedTime) {
      Swal.fire({
        icon: "error",
        title: "Missing Information",
        text: "Please fill in date, type, and time slot.",
        confirmButtonColor: "#0EA5E9",
      });
      return;
    }

    // Vaccination type validation
    if (appointmentType === "Vaccination" && !vaccinationType.trim()) {
      Swal.fire({
        icon: "error",
        title: "Missing Information",
        text: "Please specify the vaccination type.",
        confirmButtonColor: "#0EA5E9",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/appointments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date: formatDateForBackend(selectedDate), // ✅ AYOS NA TO
            time: selectedTime,
            type: appointmentType,
            concerns: patientConcerns,
            additional_services:
              additionalServices.length > 0
                ? additionalServices.join(", ")
                : "None",
            vaccination_type:
              appointmentType === "Vaccination" ? vaccinationType : null,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: data.message,
          confirmButtonColor: "#0EA5E9",
        });
        window.location.reload();
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: data.error || "Failed to book appointment",
          confirmButtonColor: "#0EA5E9",
        });
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to book appointment",
        confirmButtonColor: "#0EA5E9",
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

  const AppointmentsPage = () => {
    const availableSlots = generateTimeSlots();
    const [filterStatus, setFilterStatus] = useState("all");
    const [patientConcerns, setPatientConcerns] = useState(""); //new state para maayos typings
    const [vaccinationType, setVaccinationType] = useState(""); // for vaccine type

    const [medicalRecords, setMedicalRecords] = useState([]);
    const [medicalLoading, setMedicalLoading] = useState(true);
    const [medicalError, setMedicalError] = useState(null);
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
    const [openFolder, setOpenFolder] = useState(null);
    const [appointmentsOpen, setAppointmentsOpen] = useState(false);

    // ✅ DAGDAGIN MO ITO - Auto-load medical records and user info
    useEffect(() => {
      const loadUserAndRecords = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          // Load user info for import
          const userRes = await fetch(
            `${import.meta.env.VITE_API_URL}/patient/user-info`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.full_name) {
              setImportFullName(userData.full_name);
            }
          }

          // Load medical records
          await fetchPatientRecords();
        } catch (error) {
          console.error("Error loading data:", error);
        }
      };

      loadUserAndRecords();
    }, []);
    // ✅ DAGDAGIN MO ITO - Medical Records helper functions
    const fetchPatientRecords = async () => {
      try {
        setMedicalLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          setMedicalError("Please login to view your medical records");
          setMedicalLoading(false);
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
        setMedicalLoading(false);
      } catch (err) {
        console.error("Error fetching medical records:", err);
        setMedicalError(err.message);
        setMedicalLoading(false);
      }
    };

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

      // Compute age
      let age = "N/A";
      if (patient.birth_date && patient.appointment_date) {
        const birth = new Date(patient.birth_date);
        const appointmentDateForAge = new Date(patient.appointment_date);
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

        if (years < 2) {
          const totalMonths = years * 12 + months;
          age = `${totalMonths} ${totalMonths === 1 ? "month" : "months"}`;
        } else {
          if (months === 0) {
            age = `${years} ${years === 1 ? "yr" : "yrs"}`;
          } else {
            age = `${years} ${years === 1 ? "yr" : "yrs"} ${months} ${
              months === 1 ? "month" : "months"
            }`;
          }
        }
      }

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
        ${
          patient.status === "canceled" && patient.cancel_remarks
            ? `
        <p class="field"><span class="label">Cancellation Reason:</span> ${patient.cancel_remarks}</p>
        `
            : ""
        }
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

    // Get available additional services (exclude the primary appointment type)
    const availableAdditionalServices = Object.keys(appointmentTypes).filter(
      (type) => type !== appointmentType
    );

    const filteredAppointments = appointments.filter((appt) => {
      const status = appt.status?.toLowerCase().trim();
      return filterStatus === "all" ? true : status === filterStatus;
    });

    // Show all canceled appointments so their cancellation reasons are visible,
    // but limit non-canceled items to the 5 most recent to keep the list compact.
    const sorted = filteredAppointments.sort(
      (a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)
    );
    const canceledAppointments = sorted.filter(
      (a) =>
        String(a.status || "")
          .toLowerCase()
          .trim() === "canceled"
    );
    const nonCanceled = sorted.filter(
      (a) =>
        String(a.status || "")
          .toLowerCase()
          .trim() !== "canceled"
    );
    const displayAppointments = [
      ...canceledAppointments,
      ...nonCanceled.slice(0, 5),
    ];
    const handleCancelAppointment = async (appointmentId) => {
      // Prompt for cancellation reason and require non-empty input
      const reasonResult = await Swal.fire({
        title: "Reason for cancellation",
        input: "text",
        inputPlaceholder: "Please enter a reason (required)",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        cancelButtonColor: "#0EA5E9",
        confirmButtonText: "Submit",
        cancelButtonText: "Keep appointment",
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return "Please provide a reason for cancelling";
          }
          return null;
        },
      });

      if (!reasonResult.isConfirmed) return;

      const cancelReason = reasonResult.value;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/appointments/${appointmentId}/cancel`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ cancel_remarks: cancelReason }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          await Swal.fire({
            icon: "success",
            title: "Canceled!",
            text: data.message,
            confirmButtonColor: "#0EA5E9",
          });

          // Refresh appointments list
          window.location.reload();
        } else {
          Swal.fire({
            icon: "error",
            title: "Failed",
            text: data.error || "Failed to cancel appointment",
            confirmButtonColor: "#0EA5E9",
          });
        }
      } catch (error) {
        console.error("Error canceling appointment:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to cancel appointment",
          confirmButtonColor: "#0EA5E9",
        });
      }
    };

    return (
      <div className="bg-transparent rounded-3xl p-6 md:p-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
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
        <div className="grid gap-4 md:grid-cols-3">
          {/* Date Picker */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-sky-100 hover:shadow-xl transition-all relative z-20">
            <style>{`
  .react-datepicker__day--sunday {
    display: none !important;
  }
  .react-datepicker__day-name:last-child {
    display: none !important;
  }
`}</style>

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
                calendarStartDay={1}
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
                setAdditionalServices([]);
              }}
              className="w-full border-2 border-sky-300 rounded-xl px-4 py-3 text-lg bg-white
            focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            >
              <option value="">-- Choose --</option>
              {Object.keys(appointmentTypes).map((type) => (
                <option key={type} value={type}>
                  {type}
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
        {/* Vaccination Type - Only show if Vaccination is selected */}
        {appointmentType === "Vaccination" && (
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-sky-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="text-sky-600" />
              <h3 className="text-xl font-bold text-sky-800">
                Specify Vaccination Type
              </h3>
            </div>
            <input
              type="text"
              value={vaccinationType}
              onChange={(e) => setVaccinationType(e.target.value)}
              placeholder="e.g., COVID-19, Flu, Hepatitis B"
              className="w-full border-2 border-sky-300 rounded-xl px-4 py-3 text-lg bg-white
        focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
          </div>
        )}

        {/* Additional Services Section */}
        {selectedDate && appointmentType && selectedTime && (
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-sky-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-3">
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
                      {type}
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
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-sky-100 hover:shadow-xl transition-all relative z-10">
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
            onClick={() =>
              handleBookAppointment(patientConcerns, vaccinationType)
            } // ✅ ADD vaccinationType
            className="inline-block bg-yellow-400 text-sky-900 px-10 py-4 rounded-full text-lg
    font-bold shadow-md hover:bg-yellow-500 hover:scale-105 hover:shadow-lg transition-all"
          >
            Book Appointment
          </button>
        </div>

        {/* Timeline Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-sky-100 overflow-hidden">
          <div
            onClick={() => setAppointmentsOpen(!appointmentsOpen)}
            className="flex items-center justify-between p-4 bg-sky-100 cursor-pointer hover:bg-sky-200 transition-all"
          >
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-sky-600" />
              <h3 className="text-xl font-bold text-sky-900">
                My Appointments
                {filteredAppointments.length > 0 && (
                  <span className="ml-2 text-sm bg-yellow-400 text-sky-900 px-2 py-1 rounded-full">
                    {filteredAppointments.length}
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {appointmentsOpen && (
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    e.stopPropagation();
                    setFilterStatus(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="border-2 border-sky-300 rounded-lg px-3 py-1.5 text-sm bg-white
            focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="canceled">Canceled</option>
                </select>
              )}
              <ChevronDown
                className={`w-5 h-5 text-sky-600 transform transition-transform duration-300 ${
                  appointmentsOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {/* Folder Content - Expandable */}
          {appointmentsOpen && (
            <div className="p-4 bg-sky-50 transition-all duration-300 max-h-[40vh] overflow-auto">
              {loading ? (
                <p className="text-center text-sky-600 py-4">
                  Loading appointments…
                </p>
              ) : filteredAppointments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No appointments found.
                </p>
              ) : (
                <ol className="relative border-l-4 border-sky-300/50 space-y-4 pl-4">
                  {filteredAppointments
                    .sort(
                      (a, b) =>
                        new Date(a.appointment_date) -
                        new Date(b.appointment_date)
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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-lg shadow-sm">
                            <div>
                              <h4 className="text-lg font-bold text-gray-800">
                                {appt.appointment_type}
                              </h4>
                              <p className="text-gray-600 text-sm">
                                {date} • {appt.appointment_time}
                              </p>

                              {appt.appointment_type === "Vaccination" &&
                                appt.vaccination_type && (
                                  <p className="text-xs text-sky-600 mt-1">
                                    <strong>Vaccine:</strong>{" "}
                                    {appt.vaccination_type}
                                  </p>
                                )}

                              {appt.additional_services &&
                                appt.additional_services !== "None" && (
                                  <p className="text-xs text-sky-600 mt-1">
                                    <strong>Additional:</strong>{" "}
                                    {appt.additional_services}
                                    {String(appt.status || "")
                                      .toLowerCase()
                                      .trim() === "canceled" &&
                                      appt.cancel_remarks && (
                                        <span className="ml-2 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                          <strong>Reason:</strong>{" "}
                                          {appt.cancel_remarks}
                                        </span>
                                      )}
                                  </p>
                                )}

                              {status === "canceled" &&
                                appt.cancel_remarks &&
                                (!appt.additional_services ||
                                  appt.additional_services === "None") && (
                                  <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg border border-red-200">
                                    <strong>Reason:</strong>{" "}
                                    {appt.cancel_remarks}
                                  </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 text-sm rounded-full font-semibold capitalize ${badge}`}
                              >
                                {status}
                              </span>
                              {(status === "pending" ||
                                status === "approved") && (
                                <button
                                  onClick={() =>
                                    handleCancelAppointment(appt.appointment_id)
                                  }
                                  className="px-3 py-1 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-all text-xs"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ol>
              )}
            </div>
          )}
        </div>
        {/* ==================== MEDICAL RECORDS SECTION ==================== */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-sky-100 hover:shadow-xl transition-all mt-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-sky-200">
            <h3 className="text-3xl font-extrabold text-sky-800 drop-shadow-sm flex items-center">
              <User className="w-8 h-8 mr-3 text-yellow-500" />
              My Medical Records
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(true);
                  setImportError(null);
                }}
                className="w-full sm:w-auto px-4 py-2 border-2 border-sky-300 text-sky-900 font-semibold rounded-lg shadow-sm bg-white hover:bg-sky-50 transition-colors text-sm"
              >
                Import Records
              </button>
              <button
                onClick={fetchPatientRecords}
                className="px-4 py-2 bg-yellow-400 text-sky-900 font-semibold rounded-lg shadow hover:bg-yellow-500 transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          {medicalLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
              <p className="text-sky-600">Loading your medical records...</p>
            </div>
          ) : medicalError ? (
            <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Unable to Load Records
              </h3>
              <p className="text-red-700 mb-4">{medicalError}</p>
              <button
                onClick={fetchPatientRecords}
                className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
              >
                Retry
              </button>
            </div>
          ) : medicalRecords.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-md border-l-4 border-yellow-400">
              <FileText className="w-16 h-16 text-sky-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-sky-800 mb-2">
                No Medical Records Found
              </h3>
              <p className="text-sky-700 max-w-md mx-auto">
                Your medical records will appear here after your appointments
                are completed and reviewed by the doctor.
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[60vh] overflow-auto pr-2">
              {Object.keys(groupedRecords).map((type) => (
                <div
                  key={type}
                  className="bg-white rounded-xl shadow-md border border-yellow-300 overflow-hidden"
                >
                  <div
                    onClick={() =>
                      setOpenFolder(openFolder === type ? null : type)
                    }
                    className="flex items-center justify-between p-5 bg-yellow-100 cursor-pointer hover:bg-yellow-200 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <FolderOpen className="w-6 h-6 text-yellow-600" />
                      <h3 className="text-xl font-bold text-sky-900">{type}</h3>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-sky-600 transform transition-transform duration-300 ${
                        openFolder === type ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {openFolder === type && (
                    <div className="p-2 bg-yellow-50 transition-all duration-300">
                      <ul className="divide-y divide-yellow-100">
                        {groupedRecords[type].map((record) => (
                          <li
                            key={record.record_id || record.appointment_id}
                            className="py-2 px-2 flex items-center justify-between cursor-pointer hover:bg-yellow-100 rounded"
                            onClick={() => openRecordDetail(record)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-yellow-200 rounded flex items-center justify-center text-yellow-700 text-sm font-semibold flex-shrink-0">
                                {record.appointment_type
                                  ? record.appointment_type.charAt(0)
                                  : "R"}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-sky-900 truncate">
                                  {record.diagnosis || "General Checkup"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 ml-4">
                              <div className="text-xs text-sky-600 text-right whitespace-nowrap">
                                {record.appointment_date}
                                {record.appointment_time
                                  ? ` • ${record.appointment_time}`
                                  : ""}
                              </div>
                              <Eye className="w-4 h-4 text-sky-400" />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {showModal && selectedRecord && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30">
            <div className="bg-white rounded-3xl shadow-2xl w-11/12 max-w-2xl md:max-w-3xl max-h-[85vh] overflow-y-auto mx-auto">
              {/* Modern Header with Gradient */}
              <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-6 md:px-8 py-8 text-white rounded-t-3xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-full">
                      <FileText className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold">
                        Medical Record
                      </h2>
                      <p className="text-blue-100 text-sm md:text-base">
                        {selectedRecord.appointment_type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-lg inline-block">
                  <p className="text-sm md:text-base">
                    📅{" "}
                    {new Date(
                      selectedRecord.appointment_date
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 space-y-8">
                {/* Patient Information Card */}
                <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      👤
                    </div>
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-600 font-semibold mb-1">
                        Full Name
                      </p>
                      <p className="text-lg font-bold text-blue-900">
                        {selectedRecord.full_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-semibold mb-1">
                        Age (at appointment)
                      </p>
                      <p className="text-lg font-bold text-blue-900">
                        {selectedRecord.birth_date
                          ? (() => {
                              const birthDate = new Date(
                                selectedRecord.birth_date
                              );
                              const appointmentDate =
                                selectedRecord.appointment_date
                                  ? new Date(selectedRecord.appointment_date)
                                  : new Date();
                              let years =
                                appointmentDate.getFullYear() -
                                birthDate.getFullYear();
                              let months =
                                appointmentDate.getMonth() -
                                birthDate.getMonth();
                              if (
                                months < 0 ||
                                (months === 0 &&
                                  appointmentDate.getDate() <
                                    birthDate.getDate())
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
                              if (years < 2) {
                                const totalMonths = years * 12 + months;
                                return `${totalMonths} ${
                                  totalMonths === 1 ? "month" : "months"
                                }`;
                              }
                              if (months === 0) {
                                return `${years} ${years === 1 ? "yr" : "yrs"}`;
                              }
                              return `${years} ${
                                years === 1 ? "yr" : "yrs"
                              } ${months} ${months === 1 ? "month" : "months"}`;
                            })()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vital Signs Section */}
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      ❤️
                    </div>
                    Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Temperature */}
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">
                        Temperature
                      </p>
                      <p className="text-3xl font-bold text-orange-600">
                        {selectedRecord.temperature ? (
                          <>
                            {selectedRecord.temperature}
                            <span className="text-lg">°C</span>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </p>
                      {selectedRecord.temperature && (
                        <p className="text-xs text-orange-600 mt-2">
                          {selectedRecord.temperature > 37.5
                            ? "🔴 Elevated"
                            : "✅ Normal"}
                        </p>
                      )}
                    </div>

                    {/* Pulse Rate */}
                    <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-xl p-5 border-2 border-pink-200 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide mb-2">
                        Pulse Rate
                      </p>
                      <p className="text-3xl font-bold text-pink-600">
                        {selectedRecord.pulse_rate ? (
                          <>
                            {selectedRecord.pulse_rate}
                            <span className="text-lg">bpm</span>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </p>
                      {selectedRecord.pulse_rate && (
                        <p className="text-xs text-pink-600 mt-2">
                          {selectedRecord.pulse_rate < 60 ||
                          selectedRecord.pulse_rate > 100
                            ? "⚠️ Irregular"
                            : "✅ Regular"}
                        </p>
                      )}
                    </div>

                    {/* Weight */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                        Weight
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {selectedRecord.weight ? (
                          <>
                            {selectedRecord.weight}
                            <span className="text-lg">kg</span>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </p>
                    </div>

                    {/* Height */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                        Height
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {selectedRecord.height ? (
                          <>
                            {selectedRecord.height}
                            <span className="text-lg">cm</span>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* BMI Section */}
                {selectedRecord.weight && selectedRecord.height && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border-2 border-yellow-200 shadow-sm">
                    <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        📊
                      </div>
                      Body Mass Index (BMI)
                    </h3>
                    <div className="flex items-end gap-6">
                      <div>
                        <p className="text-5xl font-bold text-yellow-600">
                          {(
                            selectedRecord.weight /
                            ((selectedRecord.height / 100) *
                              (selectedRecord.height / 100))
                          ).toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-700">
                          {(() => {
                            const bmi =
                              selectedRecord.weight /
                              ((selectedRecord.height / 100) *
                                (selectedRecord.height / 100));
                            if (bmi < 18.5) return "Underweight";
                            if (bmi < 25) return "Normal";
                            if (bmi < 30) return "Overweight";
                            return "Obese";
                          })()}
                        </p>
                        <p className="text-sm text-yellow-600 mt-2">
                          Classification
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clinical Assessment */}
                <div className="space-y-4">
                  {/* Diagnosis */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-l-4 border-purple-500 shadow-sm">
                    <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        🔍
                      </div>
                      Diagnosis
                    </h3>
                    <p className="text-blue-900 leading-relaxed">
                      {selectedRecord.diagnosis || "No diagnosis recorded"}
                    </p>
                  </div>

                  {/* Treatment & Remarks */}
                  {selectedRecord.remarks && (
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border-l-4 border-teal-500 shadow-sm">
                      <h3 className="text-lg font-bold text-teal-900 mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          💊
                        </div>
                        Treatment & Remarks
                      </h3>
                      <p className="text-blue-900 leading-relaxed whitespace-pre-wrap">
                        {selectedRecord.remarks}
                      </p>
                    </div>
                  )}
                </div>

                {/* Appointment Info */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      📅
                    </div>
                    Appointment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 font-semibold mb-2">
                        Date
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedRecord.appointment_date}
                      </p>
                    </div>
                    {selectedRecord.appointment_time && (
                      <div>
                        <p className="text-sm text-gray-600 font-semibold mb-2">
                          Time
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedRecord.appointment_time}
                        </p>
                      </div>
                    )}
                    {selectedRecord.updated_at && (
                      <div>
                        <p className="text-sm text-gray-600 font-semibold mb-2">
                          Last Updated
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {new Date(
                            selectedRecord.updated_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedRecord.status === "canceled" &&
                    selectedRecord.cancel_remarks && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700">
                          <strong>Cancellation Reason:</strong>{" "}
                          {selectedRecord.cancel_remarks}
                        </p>
                      </div>
                    )}
                </div>
              </div>

              {/* Modern Footer */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 md:px-8 py-6 border-t border-gray-200 rounded-b-3xl flex items-center justify-between flex-wrap gap-4">
                <p className="text-xs md:text-sm text-gray-600">
                  ⚠️ This is your official medical record. Keep this information
                  confidential.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => printRecord(selectedRecord)}
                    className="px-5 py-2 md:px-6 md:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-md"
                  >
                    🖨️ Print Record
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-5 py-2 md:px-6 md:py-3 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition-all transform hover:scale-105 shadow-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ DAGDAGIN MO ITO - IMPORT MODAL */}
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
                        if (
                          !importFullName.trim() ||
                          (!importMotherName.trim() && !importFatherName.trim())
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
                      {importSearchLoading ? "Searching..." : "Search Records"}
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
                  Select the records you recognize as yours, then import them to
                  your account.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
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
                    disabled={selectedImportIds.size === 0 || importSubmitting}
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
    );
  };

  const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/notifications/patient`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch notifications");

        const data = await response.json();
        setNotifications(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    // Inside Notifications component
    useEffect(() => {
      fetchNotifications();

      setNotificationCount(0);

      // Auto-refresh every 10 seconds (faster for testing)
      const interval = setInterval(fetchNotifications, 10000);

      // 🔔 Listen for status changes
      const handleRefresh = () => {
        console.log("🔔 Notification refresh triggered!");
        fetchNotifications();
      };
      window.addEventListener("refreshNotifications", handleRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener("refreshNotifications", handleRefresh);
      };
    }, []);

    // Format date nicely
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60)
        return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24)
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Get icon and color based on status
    const getStatusConfig = (status) => {
      const statusLower = status?.toLowerCase();
      if (statusLower === "approved") {
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          bgColor: "bg-green-50",
          borderColor: "border-green-400",
          badgeColor: "bg-green-100 text-green-700",
          title: "Appointment Approved! ✅",
        };
      } else if (statusLower === "completed") {
        return {
          icon: <CheckCircle className="w-6 h-6 text-blue-600" />,
          bgColor: "bg-blue-50",
          borderColor: "border-blue-400",
          badgeColor: "bg-blue-100 text-blue-700",
          title: "Appointment Completed 🎉",
        };
      } else if (statusLower === "canceled") {
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-600" />,
          bgColor: "bg-red-50",
          borderColor: "border-red-400",
          badgeColor: "bg-red-100 text-red-700",
          title: "Appointment Canceled ❌",
        };
      }
      return {
        icon: <Bell className="w-6 h-6 text-gray-600" />,
        bgColor: "bg-gray-50",
        borderColor: "border-gray-400",
        badgeColor: "bg-gray-100 text-gray-700",
        title: "Notification",
      };
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sky-500 mx-auto mb-4"></div>
            <p className="text-sky-700 font-semibold">
              Loading notifications...
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border-t-4 border-red-500">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Error Loading Notifications
            </h2>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <button
              onClick={fetchNotifications}
              className="w-full bg-sky-500 text-white py-2 rounded-lg font-semibold hover:bg-sky-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-t-4 border-yellow-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Bell className="w-8 h-8 text-yellow-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-sky-900">
                    My Notifications
                  </h1>
                  <p className="text-sky-600">
                    {notifications.length} notification
                    {notifications.length !== 1 ? "s" : ""} (last 7 days)
                  </p>
                </div>
              </div>
              <button
                onClick={fetchNotifications}
                className="px-4 py-2 bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center border-l-4 border-green-500">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                All Caught Up! 🎉
              </h2>
              <p className="text-gray-600">
                No new notifications at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => {
                const config = getStatusConfig(notif.status);

                return (
                  <div
                    key={notif.appointment_id}
                    className={`bg-white rounded-xl shadow-lg p-5 border-l-4 ${config.borderColor} hover:shadow-xl transition-all`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Left Side - Icon */}
                      <div
                        className={`${config.bgColor} p-3 rounded-full flex-shrink-0`}
                      >
                        {config.icon}
                      </div>

                      {/* Middle - Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {config.title}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${config.badgeColor} capitalize`}
                          >
                            {notif.status}
                          </span>
                        </div>

                        <p className="text-sky-600 font-semibold mb-2">
                          {notif.appointment_type}
                          {notif.vaccination_type && (
                            <span className="text-sm text-gray-600 ml-2">
                              ({notif.vaccination_type})
                            </span>
                          )}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-sky-500" />
                            <span>
                              {new Date(
                                notif.appointment_date
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-sky-500" />
                            <span>{notif.appointment_time}</span>
                          </div>
                        </div>

                        {/* Show cancellation reason if canceled */}
                        {notif.status?.toLowerCase() === "canceled" &&
                          notif.cancel_remarks && (
                            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-sm text-red-700">
                                <strong>Reason for cancellation:</strong>{" "}
                                {notif.cancel_remarks}
                              </p>
                            </div>
                          )}

                        {/* Show additional services */}
                        {notif.additional_services &&
                          notif.additional_services !== "None" && (
                            <p className="text-xs text-gray-600 mt-2">
                              <strong>Additional services:</strong>{" "}
                              {notif.additional_services}
                            </p>
                          )}
                      </div>

                      {/* Right Side - Time Ago */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {formatDate(notif.updated_at || notif.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "profile", label: "Profile", icon: User },
  ];

  const renderContent = () => {
    switch (activePage) {
      case "home":
        return (
          <Analysis
            onNavigateToAppointments={() => setActivePage("appointments")}
          />
        );

      case "appointments":
        return <AppointmentsPage />;

      case "checkup":
        return <MedicalRecords />;

      case "profile":
        return <PatientProfile />;

      case "notifications":
        return <Notifications />;

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
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
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
                className="md:hidden text-white hover:text-yellow-400 text-2xl transition-colors"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            {/* Patient Info Card - Mobile Only */}
            <div className="md:hidden bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 p-2 sm:p-2.5 rounded-full shadow-md flex-shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-200 font-medium mb-0.5">
                    Logged in as
                  </p>
                  <p className="text-sm sm:text-base font-bold text-white truncate">
                    {patientName}
                  </p>
                </div>
              </div>
            </div>
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

                    // ✅ MARK AS READ - Save timestamp
                    if (item.id === "notifications") {
                      localStorage.setItem(
                        "lastNotificationView",
                        new Date().toISOString()
                      );
                      setNotificationCount(0);
                    }
                  }}
                  className={`w-full flex items-center p-2.5 sm:p-3 rounded-lg transition-all ${
                    activePage === item.id
                      ? "bg-yellow-400 text-sky-600 shadow-lg"
                      : "hover:bg-yellow-400 hover:text-sky-600 text-sky-100"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                  <span className="font-semibold">{item.label}</span>

                  {item.id === "notifications" && notificationCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {notificationCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom section - Logout Only */}
        <div className="absolute bottom-0 left-0 right-0 w-64 sm:w-72 p-4 sm:p-6 bg-blue-900/50 backdrop-blur-sm">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl font-semibold text-sm sm:text-base"
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

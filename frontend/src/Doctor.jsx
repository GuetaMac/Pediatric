import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Sparkles, Lightbulb } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { BarChart3, ClipboardList } from "lucide-react";
import Swal from "sweetalert2";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";

import {
  Heart,
  Users,
  Calendar,
  Settings,
  Home,
  Stethoscope,
  Baby,
  Activity,
  Edit2,
  Save,
  X,
  Clock,
  UserPlus,
  User,
  Edit,
  FileText,
  Folder,
  Trash2,
  Plus,
  LogOut,
  AlertCircle,
  Filter,
  TrendingUp,
} from "lucide-react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
function Doctor() {
  const [activePage, setActivePage] = useState("home");
  const [appointments, setAppointments] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Fetching with token:", token); // Debug log

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/appointments/doctor`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        console.log("Response data:", data); // Debug log

        if (res.ok) {
          setAppointments(data);
        } else {
          console.error("Error fetching appointments:", data.error);
          Swal.fire({
            icon: "error",
            title: "Error Loading Appointments",
            text: data.error || "Error fetching appointments",
            confirmButtonColor: "#3b82f6",
          });
        }
      } catch (err) {
        console.error("Error fetching appointments", err);
        Swal.fire({
          icon: "error",
          title: "Error Loading Appointments",
          text: data.error || "Error fetching appointments",
          confirmButtonColor: "#3b82f6",
        });
      }
    };

    fetchAppointments();
  }, []);

  // Dashboard stats
  const [stats, setStats] = useState({
    todaysPatients: 0,
    totalPatients: 0,
    nurseAccounts: 0,
  });

  // NEW: store today’s appointments
  const [, setTodaysAppointments] = useState([]);

  // Fetch all users and calculate stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users`);
      const data = await res.json();

      if (res.ok) {
        const patients = data.filter((user) => user.role === "patient");
        const nurses = data.filter((user) => user.role === "nurse");

        // Calculate today's approved appointments from the appointments array
        const today = new Date().toLocaleDateString("en-CA"); // gives YYYY-MM-DD in local time

        // Helper function to normalize date strings for comparison
        const normalizeDate = (dateStr) => {
          if (!dateStr) return null;
          // Handle different date formats
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return null;
          return date.toLocaleDateString("en-CA");
        };

        // Filter appointments for today with status "approved"
        const todaysApprovedAppointments = appointments.filter((appt) => {
          const apptDate = normalizeDate(appt.appointment_date);
          const apptStatus = (appt.status || "").toLowerCase().trim();
          return apptDate === today && apptStatus === "approved";
        });

        setStats({
          todaysPatients: todaysApprovedAppointments.length,
          totalPatients: patients.length,
          nurseAccounts: nurses.length,
          checkups: todaysApprovedAppointments.length,
        });

        // Save the list of today's appointments for the schedule section
        setTodaysAppointments(todaysApprovedAppointments);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [appointments]); // Re-run when appointments change

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

  const menuItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "patients", label: "Patients", icon: Users },
    { id: "Manage Account", label: "Manage Account", icon: User },
    { id: "medical-records", label: "Medical Records", icon: Stethoscope },
    { id: "analytics", label: "Analytics", icon: Activity },
  ];

  // HOME PAGE
  const HomePage = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Welcome Back, Doctor!
          </h1>
          <p className="text-gray-600 flex items-center text-sm sm:text-base">
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-pink-500" />
            Pediatric Care Dashboard
          </p>
        </div>
        <div className="text-left sm:text-right flex flex-col sm:items-end">
          <p className="text-xs sm:text-sm text-gray-500">Today's Date</p>
          <p className="text-base sm:text-lg font-semibold text-gray-800">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          {/* Refresh Button */}
          <button
            onClick={fetchStats}
            className="mt-2 flex items-center text-blue-600 hover:text-blue-800 font-semibold text-sm sm:text-base"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Section */}
      {/* --- Stats Section --- */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            label: "Today's Patients",
            value: stats.todaysPatients,
            icon: <Baby className="w-10 h-10 text-pink-500" />,
            gradient: "from-pink-100 to-pink-200 text-pink-800",
          },
          {
            label: "Total Patients",
            value: stats.totalPatients,
            icon: <Users className="w-10 h-10 text-blue-500" />,
            gradient: "from-blue-100 to-blue-200 text-blue-800",
          },
          {
            label: "Nurse Accounts",
            value: stats.nurseAccounts,
            icon: <User className="w-10 h-10 text-green-500" />,
            gradient: "from-green-100 to-green-200 text-green-800",
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`rounded-2xl shadow-md bg-gradient-to-br ${card.gradient} 
                  flex flex-col items-center justify-center p-4 text-center`}
          >
            <div className="mb-2">{card.icon}</div>
            <p className="text-3xl font-extrabold">{card.value}</p>
            <p className="text-sm font-medium mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Schedule Section */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-md border border-gray-200 p-4 sm:p-6">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center mb-4 sm:mb-6">
          <Clock className="w-5 h-5 sm:w-7 sm:h-7 mr-2 text-blue-500" />
          Today's Schedule
        </h3>

        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="w-14 h-14 text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">No appointments today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ✅ SORT appointments by time before mapping */}
            {[...appointments]
              .sort((a, b) => {
                // Helper function to convert time to minutes
                const timeToMinutes = (timeStr) => {
                  if (!timeStr) return 0;

                  let time = timeStr.trim();

                  // Handle "12:30 PM - 1:30 PM" format
                  if (time.includes(" - ")) {
                    time = time.split(" - ")[0].trim(); // Get start time only
                  }

                  // Handle "12:30 PM" format
                  if (time.includes("AM") || time.includes("PM")) {
                    const [timePart, period] = time.split(" ");
                    let [hours, minutes] = timePart.split(":").map(Number);

                    if (period === "PM" && hours !== 12) hours += 12;
                    if (period === "AM" && hours === 12) hours = 0;

                    return hours * 60 + (minutes || 0);
                  }

                  // Handle "12:30:00" or "12:30" format (24-hour)
                  const parts = time.split(":");
                  const hours = parseInt(parts[0]) || 0;
                  const minutes = parseInt(parts[1]) || 0;

                  return hours * 60 + minutes;
                };

                return (
                  timeToMinutes(a.appointment_time) -
                  timeToMinutes(b.appointment_time)
                );
              })
              .map((appt) => {
                let dateStr = appt.appointment_date;
                if (dateStr instanceof Date) {
                  dateStr = dateStr.toISOString().split("T")[0];
                } else if (typeof dateStr === "string") {
                  if (dateStr.includes("T")) dateStr = dateStr.split("T")[0];
                  if (dateStr.includes(" ")) dateStr = dateStr.split(" ")[0];
                }

                let timeStr = appt.appointment_time?.trim() || "00:00";
                if (timeStr.includes("AM") || timeStr.includes("PM")) {
                  const [time, period] = timeStr.split(" ");
                  let [hours, minutes] = time.split(":");
                  hours = parseInt(hours);
                  if (period === "PM" && hours !== 12) hours += 12;
                  if (period === "AM" && hours === 12) hours = 0;
                  minutes = minutes || "00";
                  timeStr = `${hours
                    .toString()
                    .padStart(2, "0")}:${minutes}:00`;
                } else if (timeStr.length === 5) {
                  timeStr += ":00";
                }

                const datetime = new Date(`${dateStr}T${timeStr}`);
                const valid = !isNaN(datetime);

                const formatTimeRange = (startTime, endTime) => {
                  if (!startTime) return "N/A";

                  const start = startTime.substring(0, 5);
                  const end = endTime?.substring(0, 5);

                  if (!end) return start;

                  const formatTime = (time24) => {
                    const [hours, minutes] = time24.split(":");
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? "PM" : "AM";
                    const hour12 =
                      hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    return `${hour12}:${minutes} ${ampm}`;
                  };

                  return `${formatTime(start)} - ${formatTime(end)}`;
                };

                return (
                  <div
                    key={appt.appointment_id}
                    className="p-3 sm:p-5 rounded-lg sm:rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-700 text-sm sm:text-base">
                        {appt.full_name} – {appt.appointment_type}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {(() => {
                          const date = new Date(appt.appointment_date);
                          const timeDisplay = formatTimeRange(
                            appt.appointment_time,
                            appt.end_time
                          );

                          return `${date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })} • ${timeDisplay}`;
                        })()}
                      </p>

                      {/* Vitals / Medical record summary */}
                      {(appt.weight ||
                        appt.height ||
                        appt.temperature ||
                        appt.pulse_rate ||
                        appt.diagnosis ||
                        appt.remarks) && (
                        <div className="mt-2 text-sm text-gray-700">
                          <div className="flex flex-wrap gap-3 items-center">
                            {appt.weight != null && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                Weight: {appt.weight}
                              </span>
                            )}
                            {appt.height != null && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                Height: {appt.height}
                              </span>
                            )}
                            {appt.temperature != null && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                Temp: {appt.temperature}°
                              </span>
                            )}
                            {appt.pulse_rate != null && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                Pulse: {appt.pulse_rate} bpm
                              </span>
                            )}
                          </div>
                          {appt.diagnosis && (
                            <p className="mt-1 text-xs">
                              <strong>Diagnosis:</strong> {appt.diagnosis}
                            </p>
                          )}
                          {appt.remarks && (
                            <p className="mt-1 text-xs">
                              <strong>Remarks:</strong> {appt.remarks}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 sm:px-3 py-1 rounded-full font-medium self-start sm:self-auto ${
                        appt.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );

  const PatientsPage = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);

    // NEW states for modal and profile loading
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(""); // <-- new state
    const [isEditMode, setIsEditMode] = useState(false); // <-- new state for edit mode
    const [editedPatient, setEditedPatient] = useState(null); // <-- new state for edited patient data
    const [newPatient, setNewPatient] = useState({
      full_name: "",
      email: "",
      password: "", // KULANG ITO
      birth_date: "",
      gender: "",
      guardian: "",
      guardian_number: "",
      phone_number: "",
      address: "",
      blood_type: "",
      allergies: "",
      chronic_conditions: "",
      mother_name: "",
      father_name: "",
    });

    const fetchPatients = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/users`);
        const data = await res.json();

        if (res.ok) {
          const onlyPatients = data.filter((user) => user.role === "patient");
          setPatients(onlyPatients);
        } else {
          console.error("Error fetching users:", data.error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.error || "Error fetching data",
            confirmButtonColor: "#3b82f6",
          });
        }
      } catch (err) {
        console.error("Error fetching users", err);
        alert("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchPatients();
    }, []);

    // Updated handleView — fetch full profile before opening modal
    const handleView = async (patient) => {
      try {
        setLoadingProfile(true);
        setIsEditMode(false);
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/patients/${patient.user_id}/profile`
        );
        if (!res.ok) throw new Error("Failed to load patient profile");
        const data = await res.json();
        setSelectedPatient(data);
        setEditedPatient({ ...data, password: "" }); // Initialize edited patient
        setIsModalOpen(true);
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Load Failed",
          text: "Failed to load patient profile",
          confirmButtonColor: "#3b82f6",
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    // ✅ Handle Edit - Enable edit mode
    const handleEdit = () => {
      setIsEditMode(true);
      setEditedPatient({ ...selectedPatient, password: "" });
    };

    // ✅ Handle Update - Update patient details
    const handleUpdate = async (e) => {
      e.preventDefault();
      if (!editedPatient) return;

      try {
        setLoadingProfile(true);
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/patients/${selectedPatient.user_id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              full_name: editedPatient.full_name,
              email: editedPatient.email,
              password: editedPatient.password || undefined, // Only send if provided
              birth_date: editedPatient.birth_date,
              gender: editedPatient.gender,
              guardian: editedPatient.guardian || "",
              guardian_number: editedPatient.guardian_number || "",
              phone_number: editedPatient.phone_number || "",
              address: editedPatient.address || "",
              blood_type: editedPatient.blood_type || "",
              allergies: editedPatient.allergies || "",
              chronic_conditions: editedPatient.chronic_conditions || "",
              mother_name: editedPatient.mother_name || "",
              father_name: editedPatient.father_name || "",
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          Swal.fire({
            icon: "error",
            title: "Update Failed",
            text: data.message || "Failed to update patient",
            confirmButtonColor: "#3b82f6",
          });
          return;
        }

        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Patient information has been updated successfully",
          timer: 2000,
          showConfirmButton: false,
        });
        setIsEditMode(false);
        setSelectedPatient(data.patient);
        setEditedPatient({ ...data.patient, password: "" });
        fetchPatients(); // Refresh the list
      } catch (err) {
        console.error("Error updating patient:", err);
        alert("Error updating patient");
      } finally {
        setLoadingProfile(false);
      }
    };

    // ✅ Handle Cancel Edit
    const handleCancelEdit = () => {
      setIsEditMode(false);
      setEditedPatient({ ...selectedPatient, password: "" });
    };
    const handleDeletePatient = async (user_id) => {
      const result = await Swal.fire({
        icon: "warning",
        title: "Delete Patient Account?",
        text: "This action cannot be undone!",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return;

      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/users/${user_id}`,
          {
            method: "DELETE",
          }
        );

        const data = await res.json();
        if (res.ok) {
          setPatients(
            patients.filter((patient) => patient.user_id !== data.user_id)
          );
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Patient account has been deleted successfully",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          alert(data.error || "Error deleting patient account");
        }
      } catch (err) {
        console.error("Error deleting patient", err);
        alert("Error deleting patient account");
      } finally {
        setLoading(false);
      }
    };
    const handleAddPatient = async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/patients/add`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(newPatient),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          Swal.fire({
            icon: "error",
            title: "Failed to Add Patient",
            text: err.message || "Failed to add patient",
            confirmButtonColor: "#3b82f6",
          });
          return;
        }

        Swal.fire({
          icon: "success",
          title: "Patient Added!",
          text: "New patient has been added to the system",
          timer: 2000,
          showConfirmButton: false,
        });
        setIsAddModalOpen(false);
        setNewPatient({
          full_name: "",
          email: "",
          birth_date: "",
          gender: "",
          guardian: "",
          guardian_number: "",
          phone_number: "",
          address: "",
          blood_type: "",
          allergies: "",
          chronic_conditions: "",
          mother_name: "",
          father_name: "",
        });
        fetchPatients();
      } catch (err) {
        console.error("Error adding patient:", err);
        alert("Error adding patient");
      }
    };
    const filteredPatients = patients.filter((patient) =>
      patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const closeModal = () => {
      setIsModalOpen(false);
      setSelectedPatient(null);
      setIsEditMode(false);
      setEditedPatient(null);
    };

    return (
      <div className="h-screen flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Bar - Fixed */}
        <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 bg-white border-b border-gray-200">
          <div className="flex flex-col gap-3 sm:gap-4 w-full">
            {/* Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-blue-500 flex-shrink-0" />
              <span className="break-words">Patient Management</span>
            </h1>

            {/* Search and Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
              {/* Search Input */}
              <div className="relative flex-1 w-full min-w-0 sm:min-w-[200px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-pink-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 rounded-lg border border-pink-300 bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 text-sm sm:text-base placeholder-pink-300"
                />
              </div>

              {/* Add Patient Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:from-pink-600 hover:to-pink-700 transition flex items-center justify-center text-sm sm:text-base font-medium whitespace-nowrap"
                type="button"
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 flex-shrink-0" />
                <span className="hidden sm:inline">Add Patient</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Patient List - Scrollable */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 text-sm sm:text-base">
              Loading patients...
            </p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Baby className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
              No Patients Found
            </h3>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base">
              Start by adding your first patient to the system
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 sm:px-8 py-2 rounded-lg hover:from-pink-600 hover:to-pink-700 transition text-sm sm:text-base"
            >
              Add Patient
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2">
            {filteredPatients.map((patient) => (
              <div
                key={patient.user_id}
                className="border-b border-gray-200 hover:bg-blue-50 transition"
              >
                {/* Compact List Item */}
                <button
                  onClick={() => handleView(patient)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* User Icon */}
                    <div className="flex-shrink-0 w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                      {patient.full_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Patient Name */}
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {patient.full_name}
                    </p>

                    {/* Email - hidden on mobile */}
                    <span className="hidden md:inline text-xs text-gray-500 ml-2 truncate">
                      {patient.email}
                    </span>
                  </div>

                  {/* Actions - Compact */}
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(patient);
                      }}
                      className="px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 rounded transition"
                      title="View details"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePatient(patient.user_id);
                      }}
                      className="px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 rounded transition"
                      title="Delete patient"
                    >
                      Delete
                    </button>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 🧠 Add Patient Modal */}
        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
            onClick={() => setIsAddModalOpen(false)}
          >
            <div
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-4 sm:p-6 relative my-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-2 sm:top-3 sm:right-3 text-gray-400 hover:text-gray-700 transition z-10 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-pink-600 mb-3 sm:mb-4 pr-8">
                Add New Patient
              </h2>

              <form
                onSubmit={handleAddPatient}
                className="space-y-2 sm:space-y-3"
              >
                {/* USER FIELDS */}
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newPatient.full_name}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, full_name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newPatient.email}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, email: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newPatient.password}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, password: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                  required
                />
                <input
                  type="date"
                  value={newPatient.birth_date}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, birth_date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                  required
                />
                <select
                  value={newPatient.gender}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, gender: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px] bg-white"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>

                {/* PATIENT PROFILE FIELDS */}
                <input
                  type="text"
                  placeholder="Guardian Name"
                  value={newPatient.guardian}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, guardian: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                />
                <input
                  type="text"
                  placeholder="Guardian Number"
                  value={newPatient.guardian_number}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      guardian_number: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={newPatient.phone_number}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      phone_number: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                />
                <textarea
                  placeholder="Address"
                  value={newPatient.address}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, address: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition resize-y min-h-[80px]"
                />

                <select
                  value={newPatient.blood_type}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, blood_type: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px] bg-white"
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
                </select>

                <textarea
                  placeholder="Allergies (if any)"
                  value={newPatient.allergies}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, allergies: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition resize-y min-h-[80px]"
                />
                <textarea
                  placeholder="Chronic Conditions (if any)"
                  value={newPatient.chronic_conditions}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      chronic_conditions: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition resize-y min-h-[80px]"
                />

                <input
                  type="text"
                  placeholder="Mother's Name"
                  value={newPatient.mother_name}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      mother_name: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                />
                <input
                  type="text"
                  placeholder="Father's Name"
                  value={newPatient.father_name}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      father_name: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                />

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white py-2.5 sm:py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition font-semibold text-sm sm:text-base shadow-lg min-h-[44px] mt-2"
                >
                  Save Patient
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Updated Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-all duration-300 p-2 sm:p-4 overflow-y-auto"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl p-4 sm:p-6 relative my-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto transform transition-all duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-2 sm:top-3 sm:right-4 text-gray-400 hover:text-gray-700 transition-colors w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 z-10"
                onClick={closeModal}
                aria-label="Close"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {loadingProfile ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500 text-sm sm:text-base">
                    Loading profile...
                  </p>
                </div>
              ) : selectedPatient && editedPatient ? (
                <>
                  <div className="flex items-center justify-between mb-3 sm:mb-4 pr-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700">
                      {isEditMode ? "Edit Patient Details" : "Patient Details"}
                    </h2>
                    {!isEditMode && (
                      <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-medium"
                      >
                        <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditMode ? (
                    <form
                      onSubmit={handleUpdate}
                      className="space-y-2 sm:space-y-3"
                    >
                      {/* USER FIELDS */}
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={editedPatient.full_name || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            full_name: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={editedPatient.email || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            email: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Password (Leave blank to keep current password)"
                        value={editedPatient.password || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            password: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                      />
                      <input
                        type="date"
                        value={editedPatient.birth_date || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            birth_date: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                        required
                      />
                      <select
                        value={editedPatient.gender || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            gender: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px] bg-white"
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>

                      {/* PATIENT PROFILE FIELDS */}
                      <input
                        type="text"
                        placeholder="Guardian Name"
                        value={editedPatient.guardian || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            guardian: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                      />
                      <input
                        type="text"
                        placeholder="Guardian Number"
                        value={editedPatient.guardian_number || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            guardian_number: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={editedPatient.phone_number || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            phone_number: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                      />
                      <textarea
                        placeholder="Address"
                        value={editedPatient.address || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            address: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition resize-y min-h-[80px]"
                      />

                      <select
                        value={editedPatient.blood_type || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            blood_type: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px] bg-white"
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
                      </select>

                      <textarea
                        placeholder="Allergies (if any)"
                        value={editedPatient.allergies || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            allergies: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition resize-y min-h-[80px]"
                      />
                      <textarea
                        placeholder="Chronic Conditions (if any)"
                        value={editedPatient.chronic_conditions || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            chronic_conditions: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition resize-y min-h-[80px]"
                      />

                      <input
                        type="text"
                        placeholder="Mother's Name"
                        value={editedPatient.mother_name || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            mother_name: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                      />
                      <input
                        type="text"
                        placeholder="Father's Name"
                        value={editedPatient.father_name || ""}
                        onChange={(e) =>
                          setEditedPatient({
                            ...editedPatient,
                            father_name: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition min-h-[44px]"
                      />

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white py-2.5 sm:py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition font-semibold text-sm sm:text-base shadow-lg min-h-[44px]"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="flex-1 bg-gray-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-gray-600 transition font-semibold text-sm sm:text-base shadow-lg min-h-[44px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2 sm:space-y-3 text-gray-700 text-xs sm:text-sm md:text-base">
                      <p className="break-words">
                        <span className="font-semibold">Full Name:</span>{" "}
                        {selectedPatient.full_name}
                      </p>
                      <p className="break-words">
                        <span className="font-semibold">Email:</span>{" "}
                        {selectedPatient.email}
                      </p>
                      <p>
                        <span className="font-semibold">Birth Date:</span>{" "}
                        {selectedPatient.birth_date || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Gender:</span>{" "}
                        {selectedPatient.gender || "N/A"}
                      </p>

                      <hr className="my-2 sm:my-3 border-gray-300" />

                      <p className="break-words">
                        <span className="font-semibold">Guardian:</span>{" "}
                        {selectedPatient.guardian || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Guardian Number:</span>{" "}
                        {selectedPatient.guardian_number || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Phone Number:</span>{" "}
                        {selectedPatient.phone_number || "N/A"}
                      </p>
                      <p className="break-words">
                        <span className="font-semibold">Address:</span>{" "}
                        {selectedPatient.address || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Blood Type:</span>{" "}
                        {selectedPatient.blood_type || "N/A"}
                      </p>
                      <p className="break-words">
                        <span className="font-semibold">Allergies:</span>{" "}
                        {selectedPatient.allergies || "None"}
                      </p>
                      <p className="break-words">
                        <span className="font-semibold">
                          Chronic Conditions:
                        </span>{" "}
                        {selectedPatient.chronic_conditions || "None"}
                      </p>
                      <p className="break-words">
                        <span className="font-semibold">Mother's Name:</span>{" "}
                        {selectedPatient.mother_name || "N/A"}
                      </p>
                      <p className="break-words">
                        <span className="font-semibold">Father's Name:</span>{" "}
                        {selectedPatient.father_name || "N/A"}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-500 py-6 text-sm sm:text-base">
                  No patient selected.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ManageAccountPage = () => {
    const [activeTab, setActiveTab] = useState("create");
    const [nurses, setNurses] = useState([]);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [editForm, setEditForm] = useState({
      full_name: "",
      email: "",
      password: "",
    });

    // Fetch Nurse Accounts
    const fetchNurses = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/users?role=nurse`
        );
        const data = await res.json();

        if (res.ok) {
          setNurses(data);
        } else {
          console.error("Error fetching nurses:", data.error);
          alert(data.error || "Error fetching nurses");
        }
      } catch (err) {
        console.error("Error fetching nurses", err);
        alert("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchNurses();
    }, []);

    // Create Nurse Account
    const handleCreateNurse = async () => {
      if (!fullName || !email || !password) {
        Swal.fire({
          icon: "warning",
          title: "Missing Information",
          text: "Please fill in all required fields",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }
      if (password.length < 8) {
        Swal.fire({
          icon: "warning",
          title: "Weak Password",
          text: "Password must be at least 8 characters long",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            role: "nurse",
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setNurses([...nurses, data]);
          setFullName("");
          setEmail("");
          setPassword("");
          Swal.fire({
            icon: "success",
            title: "Account Created!",
            text: "Nurse account has been created successfully",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          alert(data.error || "Error creating nurse account");
        }
      } catch (err) {
        console.error("Error creating nurse", err);
        alert("Error creating nurse account");
      } finally {
        setLoading(false);
      }
    };

    // Delete Nurse Account
    const handleDelete = async (user_id) => {
      const result = await Swal.fire({
        icon: "warning",
        title: "Delete Nurse Account?",
        text: "This action cannot be undone!",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return;

      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/users/${user_id}`,
          {
            method: "DELETE",
          }
        );

        const data = await res.json();
        if (res.ok) {
          setNurses(nurses.filter((nurse) => nurse.user_id !== data.user_id));
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Nurse account has been deleted successfully",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          alert(data.error || "Error deleting nurse account");
        }
      } catch (err) {
        console.error("Error deleting nurse", err);
        alert("Error deleting nurse account");
      } finally {
        setLoading(false);
      }
    };

    // Enable Edit Mode
    const handleEdit = (nurse) => {
      setEditId(nurse.user_id);
      setEditForm({
        full_name: nurse.full_name,
        email: nurse.email,
        password: "",
      });
    };

    // Save Edited Nurse
    const handleSave = async () => {
      if (!editForm.full_name || !editForm.email) {
        alert("Please fill required fields");
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/users/${editId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editForm),
          }
        );

        const data = await res.json();
        if (res.ok) {
          setNurses(
            nurses.map((nurse) => (nurse.user_id === editId ? data : nurse))
          );
          setEditId(null);
          setEditForm({ full_name: "", email: "", password: "" });
          Swal.fire({
            icon: "success",
            title: "Updated!",
            text: "Nurse account has been updated successfully",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          alert(data.error || "Error updating nurse account");
        }
      } catch (err) {
        console.error("Error updating nurse", err);
        alert("Error updating nurse account");
      } finally {
        setLoading(false);
      }
    };

    // Cancel Edit
    const handleCancelEdit = () => {
      setEditId(null);
      setEditForm({ full_name: "", email: "", password: "" });
    };

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Tabs */}
        <div className="flex space-x-2 sm:space-x-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center px-3 sm:px-4 py-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === "create"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-600"
            }`}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Nurse
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex items-center px-3 sm:px-4 py-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === "manage"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-600"
            }`}
          >
            <Users className="w-4 h-4 mr-2" /> Manage Nurses
          </button>
        </div>

        {/* Create Nurse Form – premium glass look */}
        {activeTab === "create" && (
          <div className="relative bg-white/40 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-2xl border border-white/20">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3 text-indigo-700 mb-4 sm:mb-6">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
              Create Nurse Account
            </h2>

            <div className="space-y-4 sm:space-y-5">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/60 border border-white/30 shadow-inner
                          focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 text-sm sm:text-base"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/60 border border-white/30 shadow-inner
                          focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 text-sm sm:text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/60 border border-white/30 shadow-inner
                          focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400 text-sm sm:text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                onClick={handleCreateNurse}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-yellow-500
                          text-white font-semibold py-3 rounded-xl
                          hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600
                          transition-all duration-200 disabled:opacity-60"
              >
                {loading ? "Creating…" : "Create Nurse"}
              </button>
            </div>
          </div>
        )}

        {/* Manage Nurses – premium glass look */}
        {activeTab === "manage" && (
          <div className="relative bg-white/40 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-2xl border border-white/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-indigo-700">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
              Nurse Accounts
            </h2>

            {loading && <p className="text-gray-600">Loading...</p>}

            <div className="space-y-4">
              {nurses.length === 0 ? (
                <p className="text-gray-400 italic">No nurse accounts found.</p>
              ) : (
                nurses.map((nurse) => (
                  <div
                    key={nurse.user_id}
                    className="flex items-center justify-between p-4
                       bg-white/50 border border-white/30 backdrop-blur-md
                       rounded-xl shadow-md hover:shadow-lg transition-shadow"
                  >
                    {editId === nurse.user_id ? (
                      <div className="flex-1 flex flex-col md:flex-row gap-3">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 rounded-lg bg-white/70 border border-white/30 shadow-inner
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm sm:text-base"
                          value={editForm.full_name}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              full_name: e.target.value,
                            })
                          }
                        />
                        <input
                          type="email"
                          className="flex-1 px-3 py-2 rounded-lg bg-white/70 border border-white/30 shadow-inner
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm sm:text-base"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                        />
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={handleSave}
                            className="text-green-600 hover:text-green-800 transition-colors"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {nurse.full_name}
                          </p>
                          <p className="text-sm text-gray-500">{nurse.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(nurse)}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(nurse.user_id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---- Medical Records Page ----
  // MEDICAL RECORDS PAGE - FIXED VERSION
  const MedicalRecords = () => {
    const [patients, setPatients] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
      weight: "",
      height: "",
      temperature: "",
      pulse_rate: "",
      age: "",
      diagnosis: "",
      remarks: "",
    });
    const [openFolders, setOpenFolders] = useState({});
    const [patientSearch, setPatientSearch] = useState("");
    const [recordSearch, setRecordSearch] = useState({});
    const [openRecords, setOpenRecords] = useState({});

    useEffect(() => {
      console.log("Component mounted, fetching patients...");
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found. Please login first.");
        setLoading(false);
        return;
      }

      fetch(`${import.meta.env.VITE_API_URL}/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          console.log("Response status:", res.status);
          if (!res.ok) {
            if (res.status === 401) {
              throw new Error("Authentication failed. Please login again.");
            }
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Patients data received:", data);
          setPatients(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching patients:", err);
          setError(err.message);
          setLoading(false);
        });
    }, []);

    const handleChange = (e, appointmentId) => {
      const { name, value } = e.target;

      setPatients((prevPatients) =>
        prevPatients.map((p) =>
          p.appointment_id === appointmentId ? { ...p, [name]: value } : p
        )
      );

      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const saveRecord = async (appointmentId) => {
      try {
        console.log("Saving record for appointment:", appointmentId);

        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found. Please login again.");
          return;
        }

        const currentPatient = patients.find(
          (p) => p.appointment_id === appointmentId
        );

        const requestBody = {
          ...currentPatient,
          ...formData,
          appointment_id: appointmentId,
        };

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/medical-records`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }

        const savedRecord = await response.json();
        console.log("Record saved successfully:", savedRecord);

        setShowModal(true);

        const updated = await fetch(
          `${import.meta.env.VITE_API_URL}/patients`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (updated.ok) {
          const updatedData = await updated.json();
          setPatients(updatedData);
        }

        setTimeout(() => setShowModal(false), 2500);
      } catch (err) {
        console.error("Error saving record:", err);
        setError(err.message);
      }
    };

    const printRecord = (patient) => {
      if (!patient) {
        Swal.fire({
          icon: "info",
          title: "No Record",
          text: "No medical record available to print",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      let age = "N/A";
      if (patient.birth_date && patient.appointment_date) {
        const birth = new Date(patient.birth_date);
        const appointmentDateForAge = new Date(patient.appointment_date);
        age = appointmentDateForAge.getFullYear() - birth.getFullYear();
        const m = appointmentDateForAge.getMonth() - birth.getMonth();
        if (
          m < 0 ||
          (m === 0 && appointmentDateForAge.getDate() < birth.getDate())
        ) {
          age--;
        }
        age = `${age} yrs`;
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patients...</p>
          </div>
        </div>
      );
    }

    const groupedPatients = patients.reduce((acc, curr) => {
      const name = curr.full_name;
      if (!acc[name]) acc[name] = [];
      acc[name].push(curr);
      return acc;
    }, {});

    const filteredGroupedPatients = Object.entries(groupedPatients).filter(
      ([patientName]) => {
        if (!patientSearch.trim()) return true;
        return patientName.toLowerCase().includes(patientSearch.toLowerCase());
      }
    );

    const filterRecords = (records, searchTerm) => {
      if (!searchTerm || !searchTerm.trim()) return records;
      const term = searchTerm.toLowerCase().trim();
      return records.filter((record) => {
        const dateMatch = record.appointment_date?.toLowerCase().includes(term);
        const typeMatch = record.appointment_type?.toLowerCase().includes(term);
        return dateMatch || typeMatch;
      });
    };

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
            <div className="text-red-600 text-xl mb-2">⚠️ Error</div>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-2"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col overflow-hidden bg-white">
        {/* Fixed Header */}
        <div className="flex-shrink-0 border-b border-gray-200 p-3 sm:p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">
              Patient Medical Records
            </h1>
          </div>
          {patients.length > 0 && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search patient by name..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm"
              />
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">Loading records...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200 max-w-sm">
              <div className="text-red-600 text-lg mb-2">⚠️ Error</div>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-gray-600 mb-1">
                No completed appointments
              </h3>
              <p className="text-xs text-gray-500">
                Medical records will appear here once appointments are
                completed.
              </p>
            </div>
          </div>
        ) : filteredGroupedPatients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-gray-600 mb-1">
                No patients found
              </h3>
              <p className="text-xs text-gray-500">
                No patient folders match your search.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2">
            {/* Patient Folders */}
            {filteredGroupedPatients.map(([patientName, records]) => {
              const filteredRecords = filterRecords(
                records,
                recordSearch[patientName] || ""
              );
              return (
                <div key={patientName} className="border-b border-gray-200">
                  {/* Patient Folder Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFolders((prev) => ({
                        ...prev,
                        [patientName]: !prev[patientName],
                      }))
                    }
                    className="w-full flex items-center justify-between p-3 hover:bg-blue-50/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {patientName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {records.length}{" "}
                          {records.length > 1 ? "records" : "record"}
                          {filteredRecords.length !== records.length && (
                            <span className="ml-1">
                              ({filteredRecords.length} shown)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {openFolders[patientName] ? (
                      <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                  </button>

                  {/* Patient Records */}
                  {openFolders[patientName] && (
                    <div className="bg-gray-50/30">
                      {/* Record Search */}
                      {records.length > 0 && (
                        <div className="p-2 px-3 border-b border-gray-100">
                          <div className="relative">
                            <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                            <input
                              type="text"
                              placeholder="Search records..."
                              value={recordSearch[patientName] || ""}
                              onChange={(e) =>
                                setRecordSearch((prev) => ({
                                  ...prev,
                                  [patientName]: e.target.value,
                                }))
                              }
                              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                            />
                          </div>
                        </div>
                      )}

                      {filteredRecords.length === 0 ? (
                        <div className="text-center py-3 px-3 text-xs text-gray-500">
                          No records match your search.
                        </div>
                      ) : (
                        <div>
                          {filteredRecords.map((p) => {
                            const recordKey = `${patientName}-${p.appointment_id}`;
                            const isOpen = openRecords[recordKey];

                            return (
                              <div
                                key={p.appointment_id}
                                className={`border-b border-gray-200 border-l-4 ${
                                  isOpen
                                    ? "border-blue-300 bg-blue-50/30"
                                    : "border-blue-100"
                                }`}
                              >
                                {/* Record Header */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenRecords((prev) => ({
                                      ...prev,
                                      [recordKey]: !prev[recordKey],
                                    }))
                                  }
                                  className="w-full flex items-center justify-between p-2.5 px-4 hover:bg-blue-100/40 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-gray-800 truncate">
                                        {p.appointment_date} •{" "}
                                        {p.appointment_type}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {p.diagnosis
                                          ? "✓ Has record"
                                          : "○ No record"}
                                      </p>
                                    </div>
                                  </div>
                                  {isOpen ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                  )}
                                </button>

                                {/* Record Details */}
                                {isOpen && (
                                  <div className="p-3 px-4 bg-blue-50/20 border-t border-gray-100 space-y-2">
                                    {/* Compact Input Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {[
                                        "weight",
                                        "height",
                                        "temperature",
                                        "pulse_rate",
                                      ].map((field) => (
                                        <div key={field}>
                                          <label className="block text-xs font-medium text-gray-700 mb-0.5 capitalize">
                                            {field.replace("_", " ")}
                                          </label>
                                          <input
                                            type={
                                              ["diagnosis"].includes(field)
                                                ? "text"
                                                : "number"
                                            }
                                            value={p[field] ?? ""}
                                            onChange={(e) =>
                                              handleChange(e, p.appointment_id)
                                            }
                                            name={field}
                                            className="w-full border border-gray-300 px-2 py-1 rounded text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                          />
                                        </div>
                                      ))}

                                      {/* Age - Read-only */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                          Age
                                        </label>
                                        <div className="border border-gray-300 px-2 py-1 rounded bg-gray-50 text-xs text-gray-600 flex items-center">
                                          {p.birth_date && p.appointment_date
                                            ? (() => {
                                                const birth = new Date(
                                                  p.birth_date
                                                );
                                                const appointmentDate =
                                                  new Date(p.appointment_date);
                                                let age =
                                                  appointmentDate.getFullYear() -
                                                  birth.getFullYear();
                                                const m =
                                                  appointmentDate.getMonth() -
                                                  birth.getMonth();
                                                if (
                                                  m < 0 ||
                                                  (m === 0 &&
                                                    appointmentDate.getDate() <
                                                      birth.getDate())
                                                ) {
                                                  age--;
                                                }
                                                return `${age} yrs`;
                                              })()
                                            : "N/A"}
                                        </div>
                                      </div>

                                      {/* Diagnosis */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                          Diagnosis
                                        </label>
                                        <input
                                          type="text"
                                          value={p.diagnosis ?? ""}
                                          onChange={(e) =>
                                            handleChange(e, p.appointment_id)
                                          }
                                          name="diagnosis"
                                          className="w-full border border-gray-300 px-2 py-1 rounded text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        />
                                      </div>
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                        Remarks
                                      </label>
                                      <textarea
                                        name="remarks"
                                        value={p.remarks ?? ""}
                                        onChange={(e) =>
                                          handleChange(e, p.appointment_id)
                                        }
                                        rows="2"
                                        className="w-full border border-gray-300 px-2 py-1 rounded text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                                      />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          saveRecord(p.appointment_id)
                                        }
                                        className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                                      >
                                        {p.diagnosis ? "Update" : "Add"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => printRecord(p)}
                                        className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors"
                                      >
                                        Print
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenRecords((prev) => ({
                                            ...prev,
                                            [recordKey]: false,
                                          }))
                                        }
                                        className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-400 transition-colors"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Success Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg border-t-4 border-green-500 text-center">
              <h2 className="text-sm font-semibold text-green-600 mb-1">
                ✅ Record Saved!
              </h2>
              <p className="text-xs text-gray-600 mb-3">
                The medical record has been updated.
              </p>
              <button
                className="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600"
                onClick={() => setShowModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  const AnalyticsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [selectedYear, setSelectedYear] = useState("all");
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [selectedDiagnosis, setSelectedDiagnosis] = useState("all");
    // Patient scope filter: 'all' or 'overall'
    const [patientScope, setPatientScope] = useState("all");
    const [availableDiagnoses, setAvailableDiagnoses] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);

    // Tab state for graph navigation
    const [activeTab, setActiveTab] = useState("appointments");

    // AI Insights states
    const [insights, setInsights] = useState({});
    const [loadingInsights, setLoadingInsights] = useState({});
    // Modal for AI insights popup
    const [insightsModalOpen, setInsightsModalOpen] = useState(false);
    const [insightsModalTitle, setInsightsModalTitle] = useState("");
    const [insightsModalContent, setInsightsModalContent] = useState("");

    const months = [
      { value: "all", label: "All Months" },
      { value: "1", label: "January" },
      { value: "2", label: "February" },
      { value: "3", label: "March" },
      { value: "4", label: "April" },
      { value: "5", label: "May" },
      { value: "6", label: "June" },
      { value: "7", label: "July" },
      { value: "8", label: "August" },
      { value: "9", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ];

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Generate insights function
    const generateInsights = async (chartId, chartType, chartData, context) => {
      setLoadingInsights((prev) => ({ ...prev, [chartId]: true }));

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/generate-insights`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              chartType,
              data: chartData,
              context,
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to generate insights");

        const result = await response.json();
        setInsights((prev) => ({ ...prev, [chartId]: result.insights }));
        // Open modal with insights (popup experience)
        setInsightsModalTitle(chartType || "AI Insights");
        setInsightsModalContent(result.insights || "No insights available.");
        setInsightsModalOpen(true);
      } catch (error) {
        console.error("Error generating insights:", error);
        setInsights((prev) => ({
          ...prev,
          [chartId]: "Failed to generate insights. Please try again.",
        }));
      } finally {
        setLoadingInsights((prev) => ({ ...prev, [chartId]: false }));
      }
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found. Please login first.");
        }

        const url = `${
          import.meta.env.VITE_API_URL
        }/analytics?year=${selectedYear}&month=${selectedMonth}&diagnosis=${selectedDiagnosis}&patientScope=${patientScope}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Authentication failed. Please login again.");
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        setData(json);

        if (json.allDiagnoses && json.allDiagnoses.length > 0) {
          setAvailableDiagnoses(json.allDiagnoses);
        }

        if (json.availableYears && json.availableYears.length > 0) {
          setAvailableYears(json.availableYears);
        }

        if (json.availableMonths && json.availableMonths.length > 0) {
          setAvailableMonths(json.availableMonths);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchData();
    }, [selectedYear, selectedMonth, selectedDiagnosis]);

    const getFilterContext = () => {
      let context = "Clinic analytics data";
      if (selectedYear)
        context +=
          selectedYear === "all"
            ? " for all years"
            : ` for year ${selectedYear}`;
      if (selectedMonth !== "all") {
        const monthName = months.find((m) => m.value === selectedMonth)?.label;
        context += `, ${monthName}`;
      }
      if (selectedDiagnosis !== "all")
        context += `, focusing on ${selectedDiagnosis}`;
      if (patientScope === "overall") context += `, for overall patients`;
      return context;
    };

    // Chart container with AI insights
    const ChartContainer = ({
      title,
      children,
      chartId,
      chartType,
      chartData,
      context,
      icon: Icon,
      gradient,
    }) => (
      <div className="p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-6">
          <h2 className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-0.5 sm:gap-1 md:gap-2 min-w-0">
            {Icon && (
              <Icon className="w-3.5 sm:w-4 md:w-5 lg:w-7 h-3.5 sm:h-4 md:h-5 lg:h-7 text-blue-600 flex-shrink-0" />
            )}
            <span className="truncate">{title}</span>
          </h2>

          <button
            onClick={() =>
              generateInsights(chartId, chartType, chartData, context)
            }
            disabled={
              loadingInsights[chartId] || !chartData || chartData.length === 0
            }
            className="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5 px-2 sm:px-2.5 md:px-3 lg:px-4 py-1 sm:py-1.5 md:py-1.5 lg:py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded text-xs sm:text-xs md:text-sm lg:text-sm font-semibold shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
          >
            {loadingInsights[chartId] ? (
              <>
                <div className="animate-spin rounded-full h-2 sm:h-2.5 md:h-3 w-2 sm:w-2.5 md:w-3 border-b-2 border-white"></div>
                <span className="hidden lg:inline">Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-2.5 sm:w-3 md:w-3 lg:w-4 h-2.5 sm:h-3 md:h-3 lg:h-4" />
                <span className="hidden lg:inline">Generate AI Insights</span>
                <span className="lg:hidden">AI</span>
              </>
            )}
          </button>
        </div>

        {children}
      </div>
    );

    const CustomTooltip = ({ active, payload, label, type = "default" }) => {
      // Show only the total of all displayed values when hovering.
      // If a specific year is selected (selectedYear !== 'all') and the
      // month filter is set to 'all', hide the label (month/number) above the total.
      if (active && payload && payload.length) {
        const total = payload.reduce((sum, p) => {
          const v = Number(p.value);
          return sum + (isNaN(v) ? 0 : v);
        }, 0);

        const formatNumber = (n) => {
          try {
            return n.toLocaleString();
          } catch (e) {
            return String(n);
          }
        };

        const hideLabel = selectedYear !== "all" && selectedMonth === "all";

        return (
          <div className="bg-white p-3 rounded-xl shadow-2xl border-2 border-blue-200">
            {!hideLabel && (
              <p className="font-bold text-gray-800 text-sm mb-1">{label}</p>
            )}
            <div className="text-gray-700 font-semibold text-lg">
              Total: {formatNumber(total)}
            </div>
          </div>
        );
      }

      return null;
    };

    // Always show All Months followed by every month (Jan-Dec) in the dropdown.
    // Previously we filtered by `availableMonths` which hid months without data.
    // The user requested the dropdown always display all months.
    const filteredMonths = months;

    // Derived chart data: when All Years is selected, prefer per-year aggregates
    const appointmentChartData =
      selectedYear === "all"
        ? data?.appointmentTrendByYear || data?.appointmentTrend || []
        : data?.appointmentTrend || [];

    const diagnosisChartData =
      selectedYear === "all"
        ? data?.diagnosisTrendByYear || data?.diagnosisTrend || []
        : data?.diagnosisTrend || [];

    const appointmentTypeChartData =
      selectedYear === "all"
        ? data?.appointmentTypeTrendByYear || data?.appointmentTypeTrend || []
        : data?.appointmentTypeTrend || [];

    // Copy insights to clipboard
    const handleCopyInsights = async () => {
      try {
        await navigator.clipboard.writeText(insightsModalContent || "");
        Swal.fire({
          icon: "success",
          title: "Copied",
          text: "Insights copied to clipboard",
          timer: 1400,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("Copy failed:", err);
        Swal.fire({
          icon: "error",
          title: "Copy Failed",
          text: "Could not copy insights",
          confirmButtonColor: "#3b82f6",
        });
      }
    };

    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">
              Loading analytics...
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
          <div className="text-center p-8 bg-white rounded-2xl border-2 border-red-200 shadow-xl max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-red-800 mb-2">
              Unable to Load Analytics
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Go to Login
              </button>
              <button
                onClick={fetchData}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center p-8">
            <Activity className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No Analytics Data
            </h3>
            <p className="text-gray-500 mb-4">Unable to load analytics data.</p>
            <button
              onClick={fetchData}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Define tabs for analytics
    const tabs = [
      { id: "appointments", label: "📊 Appointments Trend", icon: TrendingUp },
      {
        id: "diagnosis",
        label: "🩺 Diagnosis Distribution",
        icon: Stethoscope,
      },
      { id: "types", label: "📋 Appointment Types", icon: Calendar },
      { id: "inventory", label: "📦 Inventory Usage", icon: ClipboardList },
    ];

    return (
      <div className="min-h-screen bg-transparent pt-0 sm:pt-0 px-2 sm:px-3 md:px-4 lg:px-6 pb-6">
        <div className="max-w-7xl mx-auto space-y-1.5 sm:space-y-2 md:space-y-2.5 lg:space-y-3">
          {/* Header with Filters */}
          <div className="bg-white rounded-lg sm:rounded-lg shadow-sm p-2.5 sm:p-3 md:p-4 border border-gray-100">
            <div className="flex flex-col gap-2.5 sm:gap-3 md:gap-4">
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 min-w-0">
                <div className="p-1.5 sm:p-1.5 md:p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex-shrink-0">
                  <Activity className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-2xl font-bold text-gray-800 truncate">
                    Analytics
                  </h1>
                  <p className="text-xs text-gray-500 truncate line-clamp-1">
                    {selectedYear === "all"
                      ? selectedMonth === "all"
                        ? "All Years"
                        : `${
                            months.find((m) => m.value === selectedMonth)?.label
                          }`
                      : selectedMonth === "all"
                      ? `${selectedYear}`
                      : `${
                          months.find((m) => m.value === selectedMonth)?.label
                        } ${selectedYear}`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 md:flex md:gap-2 md:justify-end">
                <select
                  value={selectedYear}
                  onChange={(e) =>
                    setSelectedYear(
                      e.target.value === "all"
                        ? "all"
                        : parseInt(e.target.value)
                    )
                  }
                  className="px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 border border-gray-200 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="all">All Yrs</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 border border-gray-200 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  {filteredMonths.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchData}
                  className="px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded text-xs sm:text-sm font-medium shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2"
                >
                  <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2 sm:rounded-lg sm:p-2.5 md:rounded-lg md:p-3 lg:p-4 border border-blue-200 shadow-sm">
              <div className="flex flex-col h-full">
                <div className="text-xs sm:text-xs md:text-sm font-medium text-blue-600 truncate">
                  Total Appts
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-900 mt-1">
                  {data.totalAppointments || 0}
                </div>
                <Calendar className="w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 text-blue-300 opacity-50 mt-auto" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-2 sm:rounded-lg sm:p-2.5 md:rounded-lg md:p-3 lg:p-4 border border-green-200 shadow-sm">
              <div className="flex flex-col h-full">
                <div className="text-xs sm:text-xs md:text-sm font-medium text-green-600 truncate">
                  Patients
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-900 mt-1">
                  {data.overallPatients || 0}
                </div>
                <Users className="w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 text-green-300 opacity-50 mt-auto" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-2 sm:rounded-lg sm:p-2.5 md:rounded-lg md:p-3 lg:p-4 border border-purple-200 shadow-sm">
              <div className="flex flex-col h-full">
                <div className="text-xs sm:text-xs md:text-sm font-medium text-purple-600 truncate">
                  Diagnosis
                </div>
                <div className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-purple-900 mt-1 truncate line-clamp-2">
                  {data.commonDiagnosis || "N/A"}
                </div>
                <Stethoscope className="w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 text-purple-300 opacity-50 mt-auto" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded p-2 sm:rounded-lg sm:p-2.5 md:rounded-lg md:p-3 lg:p-4 border border-amber-200 shadow-sm">
              <div className="flex flex-col h-full">
                <div className="text-xs sm:text-xs md:text-sm font-medium text-amber-600 truncate">
                  Appointment Type
                </div>
                <div className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-amber-900 mt-1 truncate line-clamp-2">
                  {data.commonAppointmentType || "N/A"}
                </div>
                <Heart className="w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 text-amber-300 opacity-50 mt-auto" />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-1 sm:p-1.5 overflow-x-auto">
            <div className="flex gap-0.5 sm:gap-1 flex-nowrap min-w-min">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-1.5 sm:px-2.5 md:px-4 py-1 sm:py-1.5 md:py-2.5 rounded text-xs sm:text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Display Area */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mt-2 sm:mt-3 md:mt-4">
            {activeTab === "appointments" && (
              <ChartContainer
                title="📊 Monthly Appointments Trend"
                chartId="monthly-trend"
                chartType="Monthly Appointment Trend"
                chartData={appointmentChartData}
                context={`${getFilterContext()}. Overall monthly appointment volume.`}
                icon={TrendingUp}
                gradient="border-purple-100"
              >
                <div className="h-48 sm:h-64 md:h-80 lg:h-96">
                  {appointmentChartData?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={appointmentChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#edf2f7"
                          opacity={0.6}
                        />
                        <XAxis
                          dataKey={
                            selectedYear === "all"
                              ? "year"
                              : selectedMonth !== "all"
                              ? "monthLabel"
                              : "month"
                          }
                          tickFormatter={
                            selectedYear === "all"
                              ? undefined
                              : selectedMonth === "all"
                              ? (v) => monthNames[v - 1]
                              : undefined
                          }
                          tick={{ fill: "#4b5563" }}
                        />
                        <YAxis tick={{ fill: "#4b5563" }} />
                        <Tooltip content={CustomTooltip} />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#6366f1"
                          strokeWidth={3}
                          dot={false}
                          animationDuration={800}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500">
                      No appointment trend data
                    </div>
                  )}
                </div>
              </ChartContainer>
            )}

            {activeTab === "diagnosis" && (
              <ChartContainer
                title="🩺 Diagnosis Distribution"
                chartId="diagnosis-trend"
                chartType="Monthly Diagnosis Distribution"
                chartData={diagnosisChartData}
                context={`${getFilterContext()}. Shows the most common diagnosis for each month.`}
                icon={Stethoscope}
                gradient="border-blue-100"
              >
                <div className="h-48 sm:h-64 md:h-80 lg:h-96">
                  {diagnosisChartData?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diagnosisChartData}>
                        <defs>
                          <linearGradient
                            id="colorDiagnosis"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0.6}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#eef2ff"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey={selectedYear === "all" ? "year" : "month"}
                          tickFormatter={
                            selectedYear === "all"
                              ? undefined
                              : (v) => monthNames[v - 1]
                          }
                          tick={{ fill: "#4b5563" }}
                        />
                        <YAxis tick={{ fill: "#4b5563" }} />
                        <Tooltip content={CustomTooltip} />
                        <Bar
                          dataKey="count"
                          fill="url(#colorDiagnosis)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500">
                      No diagnosis data
                    </div>
                  )}
                </div>
              </ChartContainer>
            )}

            {activeTab === "types" && (
              <ChartContainer
                title="📋 Appointment Type Distribution"
                chartId="appointment-type-trend"
                chartType="Appointment Type Distribution"
                chartData={appointmentTypeChartData}
                context={`${getFilterContext()}. Shows appointment types per month.`}
                icon={Calendar}
                gradient="border-green-100"
              >
                <div className="h-48 sm:h-64 md:h-80 lg:h-96">
                  {appointmentTypeChartData?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={appointmentTypeChartData}>
                        <defs>
                          <linearGradient
                            id="colorAppointment"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0.6}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#eefaf0"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey={selectedYear === "all" ? "year" : "month"}
                          tickFormatter={
                            selectedYear === "all"
                              ? undefined
                              : (v) => monthNames[v - 1]
                          }
                          tick={{ fill: "#4b5563" }}
                        />
                        <YAxis tick={{ fill: "#4b5563" }} />
                        <Tooltip content={CustomTooltip} />
                        <Bar
                          dataKey="count"
                          fill="url(#colorAppointment)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500">
                      No appointment type data
                    </div>
                  )}
                </div>
              </ChartContainer>
            )}

            {activeTab === "inventory" && (
              <ChartContainer
                title="📦 Top Inventory Items Used"
                chartId="inventory-usage"
                chartType="Inventory Usage Analysis"
                chartData={data.inventoryUsage}
                context={`${getFilterContext()}. Most used inventory items.`}
                icon={ClipboardList}
                gradient="border-amber-100"
              >
                <div className="h-48 sm:h-64 md:h-80 lg:h-96">
                  {data.inventoryUsage?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.inventoryUsage}>
                        <defs>
                          <linearGradient
                            id="colorInventory"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#fbbf24"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="95%"
                              stopColor="#fbbf24"
                              stopOpacity={0.6}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#fff7ed"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 12, fill: "#4b5563" }}
                        />
                        <YAxis tick={{ fill: "#4b5563" }} />
                        <Tooltip content={CustomTooltip} />
                        <Bar
                          dataKey="total_sold"
                          fill="url(#colorInventory)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500">
                      No inventory usage data
                    </div>
                  )}
                </div>
              </ChartContainer>
            )}
          </div>

          {/* Insights Modal (popup) */}
          {insightsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setInsightsModalOpen(false)}
              />
              <div className="relative bg-white rounded-lg sm:rounded-xl shadow-2xl p-3 sm:p-4 md:p-6 max-w-2xl w-full mx-2 sm:mx-4 z-10">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 md:gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 truncate">
                      {insightsModalTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      AI-generated insights
                    </p>

                    <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 sm:py-1 rounded-full text-gray-700">
                        Year: {selectedYear}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 sm:py-1 rounded-full text-gray-700">
                        Month:{" "}
                        {selectedMonth === "all"
                          ? "All"
                          : months.find((m) => m.value === selectedMonth)
                              ?.label}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 sm:py-1 rounded-full text-gray-700">
                        Diagnosis:{" "}
                        {selectedDiagnosis === "all"
                          ? "All"
                          : selectedDiagnosis}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 sm:py-1 rounded-full text-gray-700">
                        Scope:{" "}
                        {patientScope === "overall"
                          ? "Overall"
                          : "All patients"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleCopyInsights}
                      className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm hover:bg-gray-200"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setInsightsModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700 p-1"
                      aria-label="Close insights"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mt-2 sm:mt-3 md:mt-4 text-xs sm:text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">
                  {insightsModalContent}
                </div>

                <div className="mt-4 sm:mt-5 md:mt-6 text-right">
                  <button
                    onClick={() => setInsightsModalOpen(false)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded text-xs sm:text-sm font-medium hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // RENDER CURRENT PAGE
  const renderContent = () => {
    if (activePage === "home") return <HomePage />;
    if (activePage === "patients") return <PatientsPage />;
    if (activePage === "Manage Account") return <ManageAccountPage />;
    if (activePage === "medical-records") return <MedicalRecords />;
    if (activePage === "analytics") return <AnalyticsPage />; // ✅ NEW

    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-600">
          Select a page from sidebar
        </h1>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-pink-50">
      {/* Top Header - Logo Section */}
      <header className="fixed top-0 left-0 right-0 bg-blue-800/80 text-white backdrop-blur-sm border-b border-blue-900 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-full">
              <img
                src="/clinicsclogo.png"
                alt="Clinic Logo"
                className="w-9 h-9 rounded-full object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <h2 className="text-sm font-bold text-white">Castillo</h2>
              <p className="text-xs text-white/80">Children Clinic</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <button
              className="p-2 rounded-md"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
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
        </div>

        {/* Navigation Tabs Section */}
        <nav className="hidden md:flex border-t border-blue-900/50 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 font-semibold transition border-b-2 ${
                  activePage === item.id
                    ? "border-yellow-400 text-yellow-400"
                    : "border-transparent text-white hover:text-yellow-400"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    activePage === item.id ? "text-yellow-400" : "text-white"
                  }`}
                />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
          <div className="flex-1"></div>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
            className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-none hover:bg-red-700 transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </nav>

        {/* Mobile slide-down menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-sky-100">
            <div className="px-4 py-3 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePage(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition ${
                      activePage === item.id
                        ? "bg-blue-100 text-blue-600 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/";
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Content Area */}
      <div
        className="flex-1 p-4 sm:p-6 md:p-8 bg-cover bg-center bg-fixed overflow-y-auto relative pt-24 md:pt-40"
        style={{ backgroundImage: "url('/Sunny1.png')" }}
      >
        {renderContent()}
      </div>
    </div>
  );
}

export default Doctor;

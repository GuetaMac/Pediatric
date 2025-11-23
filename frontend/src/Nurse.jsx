import { useState, useEffect } from "react";
import {
  Heart,
  Users,
  Settings,
  Home,
  Stethoscope,
  User,
  CheckCircle,
  Package,
  RefreshCw,
  ShoppingCart,
  PlusCircle,
  Edit,
  Trash2,
  ClipboardCheck,
  Clock,
  CalendarDays,
  LogOut,
  X,
  Baby,
  UserPlus,
  Eye,
  FileText,
  Folder,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
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
import { Sparkles, Activity, TrendingUp } from "lucide-react";
import { ClipboardList } from "lucide-react";

function Nurse() {
  const [activePage, setActivePage] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { id: "analytics", label: "Analytics", icon: Activity },
    { id: "patients", label: "Manage Appointments", icon: CalendarDays },
    { id: "patient-accounts", label: "Patient Accounts", icon: Baby },
    { id: "medical-records", label: "Medical Records", icon: FileText },
    { id: "Inventory", label: "Inventory", icon: Package },
  ];

  // HOME PAGE
  const HomePage = () => {
    const [apptSummary, setApptSummary] = useState({
      pending: 0,
      approved: 0,
      completed: 0,
    });

    const [invSummary, setInvSummary] = useState({
      total: 0,
      low: 0,
      out: 0,
    });

    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [queue, setQueue] = useState([]);

    const fetchSummaries = async () => {
      try {
        setLoading(true);

        // 🧠 Fetch Appointments (includes full_name from backend)
        const apptRes = await fetch(
          `${import.meta.env.VITE_API_URL}/appointments/nurse`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (!apptRes.ok) throw new Error("Failed to fetch appointments");
        const apptData = await apptRes.json();

        // 🧩 Appointment Summary
        setApptSummary({
          pending: apptData.filter((a) => a.status?.toLowerCase() === "pending")
            .length,
          approved: apptData.filter(
            (a) => a.status?.toLowerCase() === "approved"
          ).length,
          completed: apptData.filter(
            (a) => a.status?.toLowerCase() === "completed"
          ).length,
        });

        // 🕒 Today's Queue (Approved Only)
        // 🕒 Today's Queue (Approved Only)
        // ✅ FIX: Get today's date in Philippine timezone
        const today = new Date();
        const philippineDate = new Date(
          today.toLocaleString("en-US", { timeZone: "Asia/Manila" })
        );
        const todayString = philippineDate.toLocaleDateString("en-CA"); // YYYY-MM-DD

        console.log("🗓️ Today's date (Philippine Time):", todayString);
        console.log("📦 Total appointments fetched:", apptData.length);

        const todayQueue = apptData
          .filter((a) => {
            // Get the date - handle timezone conversion
            let appointmentDate = a.appointment_date || a.date;

            // ✅ Convert UTC timestamp to Philippine date
            if (
              typeof appointmentDate === "string" &&
              appointmentDate.includes("T")
            ) {
              const utcDate = new Date(appointmentDate);
              const phDate = new Date(
                utcDate.toLocaleString("en-US", { timeZone: "Asia/Manila" })
              );
              appointmentDate = phDate.toLocaleDateString("en-CA");
            }
            // If it's already a date string, use as is
            else if (typeof appointmentDate === "string") {
              appointmentDate = appointmentDate.split("T")[0].trim();
            }

            const statusMatch = a.status?.toLowerCase() === "approved";
            const dateMatch = appointmentDate === todayString;

            console.log("🔍 Filtering:", {
              appointment_id: a.appointment_id,
              patient: a.full_name,
              rawDate: a.appointment_date,
              processedDate: appointmentDate,
              todayString: todayString,
              dateMatch: dateMatch,
              status: a.status,
              statusMatch: statusMatch,
              willInclude: dateMatch && statusMatch,
            });

            return dateMatch && statusMatch;
          })
          .sort((a, b) => {
            // Ensure scheduled appointments come before walk-ins.
            const isWalk = (x) => {
              const t = (x.appointment_type || "").toString().toLowerCase();
              return /walk[- ]?in/.test(t) || t.includes("walkin");
            };

            const walkA = isWalk(a) ? 1 : 0;
            const walkB = isWalk(b) ? 1 : 0;

            console.log(
              `[Sort Debug] ${a.full_name} (type=${a.appointment_type}, walk=${walkA}) vs ${b.full_name} (type=${b.appointment_type}, walk=${walkB})`
            );

            if (walkA !== walkB) {
              const result = walkA - walkB;
              console.log(`  -> Return ${result} (scheduled first)`);
              return result;
            }

            // Fallback: order by creation time (earlier created first)
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeA - timeB;
          });

        setQueue(todayQueue);

        // 🧮 Inventory Summary
        const invRes = await fetch(
          `${import.meta.env.VITE_API_URL}/inventory`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (!invRes.ok) throw new Error("Failed to fetch inventory");
        const invData = await invRes.json();

        setInvSummary({
          total: invData.length,
          low: invData.filter((i) => i.stock < 10 && i.stock > 0).length,
          out: invData.filter((i) => i.stock === 0).length,
        });

        setLastUpdated(new Date().toLocaleString());
      } catch (err) {
        console.error("Error loading dashboard summary:", err);
        Swal.fire({
          icon: "error",
          title: "Failed to Load Data",
          text: "Unable to load dashboard data. Please try again later.",
          confirmButtonColor: "#3b82f6",
        });
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchSummaries();
    }, []);

    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-10 bg-white/30 backdrop-blur-md min-h-screen p-4 sm:p-6 md:p-8 rounded-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 flex items-center gap-2">
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />{" "}
              Nurse Dashboard
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Welcome back! Here's an overview of today's status.
            </p>
          </div>
          <button
            onClick={fetchSummaries}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition disabled:opacity-50 text-sm sm:text-base"
          >
            <RefreshCw
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                loading ? "animate-spin" : ""
              }`}
            />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {lastUpdated && (
          <div className="flex items-center text-gray-500 text-sm">
            <Clock className="w-4 h-4 mr-1" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        )}

        {/* Patient Queue Section - Two Columns */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
            Today's Patient Queue
          </h2>
          {(() => {
            const approvedToday = queue;

            // Split into scheduled and walk-in appointments
            const scheduledAppts = approvedToday.filter((p) => {
              const isWalkIn =
                /walk[- ]?in/i.test(p.appointment_type) ||
                p.appointment_type.toLowerCase().includes("walkin");
              return !isWalkIn;
            });

            const walkInAppts = approvedToday.filter((p) => {
              const isWalkIn =
                /walk[- ]?in/i.test(p.appointment_type) ||
                p.appointment_type.toLowerCase().includes("walkin");
              return isWalkIn;
            });

            if (approvedToday.length === 0) {
              return (
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow text-gray-500 text-center text-sm sm:text-base">
                  No approved patients in queue for today.
                </div>
              );
            }

            return (
              <>
                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* LEFT COLUMN: Scheduled Appointments */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-2xl shadow border-l-4 border-blue-600">
                    <h3 className="text-lg sm:text-xl font-semibold text-blue-700 mb-4 flex items-center">
                      <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                      Scheduled Appointments ({scheduledAppts.length})
                    </h3>

                    {scheduledAppts.length === 0 ? (
                      <div className="text-gray-500 text-center text-sm sm:text-base py-4">
                        No scheduled appointments for today.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scheduledAppts.map((patient, index) => (
                          <div
                            key={patient.appointment_id}
                            className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-md transition border border-blue-200"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-bold text-blue-600 text-sm sm:text-base">
                                  #{index + 1}
                                </span>
                                <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                                  {patient.full_name ||
                                    `User #${patient.user_id}`}
                                </span>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                                Approved
                              </span>
                            </div>
                            <div className="space-y-1 text-xs sm:text-sm">
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Time:
                                </span>{" "}
                                {patient.appointment_time}
                              </p>
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Type:
                                </span>{" "}
                                {patient.appointment_type}
                              </p>
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Reason:
                                </span>{" "}
                                {patient.concerns || "N/A"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Walk-in Patients */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-2xl shadow border-l-4 border-orange-600">
                    <h3 className="text-lg sm:text-xl font-semibold text-orange-700 mb-4 flex items-center">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                      Walk-in Patients ({walkInAppts.length})
                    </h3>

                    {walkInAppts.length === 0 ? (
                      <div className="text-gray-500 text-center text-sm sm:text-base py-4">
                        No walk-in patients for today.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {walkInAppts.map((patient, index) => (
                          <div
                            key={patient.appointment_id}
                            className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-md transition border border-orange-200"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-bold text-orange-600 text-sm sm:text-base">
                                  #{index + 1}
                                </span>
                                <Users className="w-4 h-4 text-orange-600 flex-shrink-0" />
                                <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                                  {patient.full_name ||
                                    `User #${patient.user_id}`}
                                </span>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 whitespace-nowrap">
                                Just Arrived
                              </span>
                            </div>
                            <div className="space-y-1 text-xs sm:text-sm">
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Time:
                                </span>{" "}
                                {patient.appointment_time}
                              </p>
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Status:
                                </span>{" "}
                                Walk-in
                              </p>
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Reason:
                                </span>{" "}
                                {patient.concerns || "N/A"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Now Serving Card - Always shows first scheduled or walk-in */}
                {approvedToday.length > 0 && (
                  <div className="mt-4 sm:mt-6 bg-green-50 border border-green-200 p-4 sm:p-6 rounded-2xl shadow">
                    <h3 className="text-lg sm:text-xl font-semibold text-green-700 mb-2">
                      Now Serving
                    </h3>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-base sm:text-lg font-medium text-gray-800 flex items-center gap-2">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        {approvedToday[0].full_name ||
                          `User #${approvedToday[0].user_id}`}
                      </div>
                      <div className="text-sm sm:text-base text-gray-600 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span>
                          <span className="font-semibold">Time:</span>{" "}
                          {approvedToday[0].appointment_time}
                        </span>
                        <span className="hidden sm:inline">|</span>
                        <span>
                          <span className="font-semibold">Type:</span>{" "}
                          {approvedToday[0].appointment_type}
                        </span>
                        <span className="hidden sm:inline">|</span>
                        <span>
                          <span className="font-semibold">Reason:</span>{" "}
                          {approvedToday[0].concerns || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </section>

        {/* Appointment Overview */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-500" />
            Appointments Overview
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 sm:p-6 rounded-2xl shadow hover:shadow-lg transition transform hover:-translate-y-1">
              <p className="text-gray-700 font-medium text-sm sm:text-base">
                Pending
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-yellow-700 mt-2">
                {apptSummary.pending}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 sm:p-6 rounded-2xl shadow hover:shadow-lg transition transform hover:-translate-y-1">
              <p className="text-gray-700 font-medium text-sm sm:text-base">
                Approved
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-green-700 mt-2">
                {apptSummary.approved}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 sm:p-6 rounded-2xl shadow hover:shadow-lg transition transform hover:-translate-y-1">
              <p className="text-gray-700 font-medium text-sm sm:text-base">
                Completed
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-blue-700 mt-2">
                {apptSummary.completed}
              </p>
            </div>
          </div>
        </section>

        {/* Inventory Overview */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
            Inventory Status
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-4 sm:p-6 rounded-2xl shadow hover:shadow-lg transition transform hover:-translate-y-1">
              <p className="text-gray-700 font-medium text-sm sm:text-base">
                Total Items
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-gray-800 mt-2">
                {invSummary.total}
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 sm:p-6 rounded-2xl shadow hover:shadow-lg transition transform hover:-translate-y-1">
              <p className="text-gray-700 font-medium text-sm sm:text-base">
                Low Stock (&lt;10)
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-yellow-700 mt-2">
                {invSummary.low}
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 sm:p-6 rounded-2xl shadow hover:shadow-lg transition transform hover:-translate-y-1">
              <p className="text-gray-700 font-medium text-sm sm:text-base">
                Out of Stock
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-red-700 mt-2">
                {invSummary.out}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 mt-10">
          <CalendarDays className="inline w-4 h-4 mr-1" />
          Updated daily — Health Center System © {new Date().getFullYear()}
        </div>
      </div>
    );
  };

  const ManageAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    // 🔹 NEW: Track which appointments are expanded
    const [expandedIds, setExpandedIds] = useState([]);
    const [cancelModal, setCancelModal] = useState({
      show: false,
      appointmentId: null,
    });
    const [cancelReason, setCancelReason] = useState("");
    const [selectedAppointments, setSelectedAppointments] = useState([]);
    const [bulkCancelModal, setBulkCancelModal] = useState(false);

    // Format date as "Month Day, Year"
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    // Fetch appointments
    // Fetch appointments
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/appointments/nurse`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await res.json();
        // ✅ ADD THIS - check raw data
        console.log("🔍 RAW DATA from API:", data[0]);
        console.log("💉 Vaccination Type Field:", data[0]?.vaccination_type);
        console.log("🔑 All Keys:", Object.keys(data[0] || {}));

        setAppointments(data);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch appointments");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchAppointments();
    }, []);

    // Update status
    const updateStatus = async (id, status, remarks = null) => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/appointments/${id}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ status, cancel_remarks: remarks }),
          }
        );

        const data = await res.json();

        if (res.ok) {
          setAppointments((prev) =>
            prev.map((appt) =>
              appt.appointment_id === id
                ? { ...appt, status: data.status }
                : appt
            )
          );
        } else {
          alert(data.error || "Failed to update appointment status");
        }
      } catch (err) {
        console.error(err);
        alert("Error updating appointment");
      }
    };

    // Delete appointment
    const deleteAppointment = async (id) => {
      if (!confirm("Delete this appointment? This cannot be undone!")) return;

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/appointments/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setAppointments(
            appointments.filter((appt) => appt.appointment_id !== id)
          );
          alert("Appointment deleted");
        } else {
          alert(data.error || "Failed to delete appointment");
        }
      } catch (err) {
        console.error(err);
        alert("Error deleting appointment");
      }
    };

    // 🔹 Toggle expand/collapse
    const toggleExpand = (id) => {
      setExpandedIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    };

    // Toggle single appointment selection
    const toggleSelectAppointment = (id) => {
      setSelectedAppointments((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    };

    // Select all by date
    const selectAllByDate = (date) => {
      const apptsByDate = sortedAppointments
        .filter(
          (appt) =>
            appt.appointment_date === date &&
            appt.status?.toLowerCase() !== "canceled" &&
            appt.status?.toLowerCase() !== "completed"
        )
        .map((appt) => appt.appointment_id);
      setSelectedAppointments(apptsByDate);
    };

    // Clear selection
    const clearSelection = () => {
      setSelectedAppointments([]);
    };

    // Bulk cancel
    const handleBulkCancel = async () => {
      if (selectedAppointments.length === 0) {
        alert("No appointments selected!");
        return;
      }

      if (!cancelReason.trim()) {
        alert("Please provide a cancellation reason!");
        return;
      }

      try {
        // Cancel all selected appointments
        const promises = selectedAppointments.map((id) =>
          fetch(`${import.meta.env.VITE_API_URL}/appointments/${id}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              status: "Canceled",
              cancel_remarks: cancelReason,
            }),
          })
        );

        await Promise.all(promises);

        alert(
          `${selectedAppointments.length} appointment(s) canceled successfully!`
        );

        // Refresh appointments
        fetchAppointments();
        clearSelection();
        setBulkCancelModal(false);
        setCancelReason("");
      } catch (err) {
        console.error(err);
        alert("Error canceling appointments");
      }
    };

    // Filter logic
    const filteredAppointments = appointments.filter((appt) => {
      const matchesStatus =
        filter === "All" ||
        appt.status?.toLowerCase().trim() === filter.toLowerCase().trim();

      const matchesSearch =
        searchQuery === "" ||
        appt.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });

    // Sorting logic
    const sortedAppointments = [...filteredAppointments].sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);

      const today = new Date().toISOString().split("T")[0];
      const isTodayA = a.appointment_date === today;
      const isTodayB = b.appointment_date === today;

      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      return dateA - dateB;
    });

    const statusOptions = [
      "All",
      "pending",
      "Approved",
      "Completed",
      "Canceled",
    ];

    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 p-4 bg-white border-b border-gray-200 rounded-xl shadow-lg">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
              Daily Appointment Queue
            </h1>

            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by patient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Filter and Refresh */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="inline-flex rounded-xl bg-gray-100 p-0.5 text-xs sm:text-sm shadow-inner">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-3 py-1.5 font-semibold transition-all duration-200 ${
                        filter === status
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-300/50 hover:bg-blue-700"
                          : "text-gray-600 hover:bg-gray-200 hover:text-blue-600"
                      } rounded-xl`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchAppointments}
                  disabled={loading}
                  className="p-1.5 sm:p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition disabled:opacity-50 shadow-md"
                  title="Refresh Appointments"
                >
                  <RefreshCw
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      loading ? "animate-spin" : ""
                    }`}
                  />
                </button>
                {selectedAppointments.length > 0 && (
                  <button
                    onClick={() => setBulkCancelModal(true)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition shadow-md"
                  >
                    Cancel Selected ({selectedAppointments.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Appointment List */}
        {/* Bulk Actions Bar */}
        {sortedAppointments.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow border border-gray-200 flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-600 font-semibold">Quick Select:</p>
            {Array.from(
              new Set(sortedAppointments.map((a) => a.appointment_date))
            )
              .slice(0, 5)
              .map((date) => (
                <button
                  key={date}
                  onClick={() => selectAllByDate(date)}
                  className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-sm font-semibold hover:bg-sky-200 transition"
                >
                  {formatDate(date)}
                </button>
              ))}
            {selectedAppointments.length > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition"
              >
                Clear Selection
              </button>
            )}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : sortedAppointments.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            {searchQuery
              ? `No results found for "${searchQuery}"`
              : `No ${
                  filter !== "All" ? filter.toLowerCase() : ""
                } appointments found.`}
          </p>
        ) : (
          <div className="space-y-2">
            {sortedAppointments.map((appt, index) => {
              const isExpanded = expandedIds.includes(appt.appointment_id);

              return (
                <div
                  key={appt.appointment_id}
                  className="bg-white border rounded-xl shadow hover:shadow-lg transition overflow-hidden"
                >
                  {/* 🔹 COLLAPSED VIEW - Clickable header */}
                  <button
                    onClick={() => toggleExpand(appt.appointment_id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Checkbox & Queue Number */}
                      <div className="flex items-center gap-2">
                        {appt.status?.toLowerCase() !== "canceled" &&
                          appt.status?.toLowerCase() !== "completed" && (
                            <input
                              type="checkbox"
                              checked={selectedAppointments.includes(
                                appt.appointment_id
                              )}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectAppointment(appt.appointment_id);
                              }}
                              className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                            />
                          )}
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                          #{index + 1}
                        </div>
                      </div>

                      {/* Patient Name */}
                      <div className="flex-1">
                        <p className="font-bold text-base sm:text-lg text-gray-800">
                          {appt.full_name}
                        </p>
                      </div>

                      {/* Date */}
                      <div className="hidden sm:block text-sm text-gray-600 font-medium">
                        {formatDate(appt.appointment_date)}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          appt.status?.toLowerCase() === "approved"
                            ? "bg-green-100 text-green-700"
                            : appt.status?.toLowerCase() === "completed"
                            ? "bg-blue-100 text-blue-700"
                            : appt.status?.toLowerCase() === "canceled"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {appt.status}
                      </span>

                      {/* Expand/Collapse Icon */}
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* 🔹 EXPANDED VIEW - Full details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
                      {/* Patient Info */}
                      <div className="mb-3">
                        <p className="text-xs sm:text-sm text-gray-500">
                          {appt.email}
                        </p>
                      </div>

                      {/* Appointment Details */}
                      <div className="text-sm space-y-1 mb-3">
                        <p className="font-semibold">
                          <span className="text-gray-700">Date:</span>{" "}
                          {formatDate(appt.appointment_date)} -{" "}
                          {appt.appointment_time}
                        </p>
                        <p>
                          <b>Type:</b> {appt.appointment_type}
                        </p>
                        {appt.appointment_type === "Vaccination" && (
                          <p>
                            <b>Vaccine:</b>{" "}
                            {appt.vaccination_type?.trim() || "Not specified"}
                          </p>
                        )}
                        <p>
                          <b>Concerns:</b> {appt.concerns || "N/A"}
                        </p>
                        <p>
                          <b>Additional Services:</b>{" "}
                          {appt.additional_services || "None"}
                        </p>
                        {/* ✅ Cancel Remarks & Phone Number for Canceled Appointments */}
                        {appt.status?.toLowerCase() === "canceled" && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                            {appt.cancel_remarks && (
                              <p className="text-sm text-red-700">
                                <b>Cancellation Reason:</b>{" "}
                                {appt.cancel_remarks}
                              </p>
                            )}
                            {appt.phone_number && (
                              <p className="text-sm text-red-700">
                                <b>Contact Number:</b> {appt.phone_number}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {appt.status?.toLowerCase() === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                updateStatus(appt.appointment_id, "Approved")
                              }
                              className="flex items-center px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setCancelModal({
                                  show: true,
                                  appointmentId: appt.appointment_id,
                                });
                                setCancelReason("");
                              }}
                              className="flex items-center px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                            >
                              <X className="w-4 h-4 mr-1.5" />
                              Cancel
                            </button>
                          </>
                        )}
                        {appt.status?.toLowerCase() === "approved" && (
                          <>
                            <button
                              onClick={() =>
                                updateStatus(appt.appointment_id, "Completed")
                              }
                              className="flex items-center px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                              <ClipboardCheck className="w-4 h-4 mr-1.5" />
                              Complete
                            </button>
                            <button
                              onClick={() => {
                                setCancelModal({
                                  show: true,
                                  appointmentId: appt.appointment_id,
                                });
                                setCancelReason("");
                              }}
                              className="flex items-center px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                            >
                              <X className="w-4 h-4 mr-1.5" />
                              Cancel
                            </button>
                          </>
                        )}
                        {appt.status?.toLowerCase() !== "canceled" && (
                          <button
                            onClick={() =>
                              deleteAppointment(appt.appointment_id)
                            }
                            className="flex items-center px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {/* 👇 LAGAY MO DITO YUNG MODAL */}
                  {cancelModal.show && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                          Cancel Appointment
                        </h3>

                        <textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Reason for cancellation..."
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
                          rows="4"
                        />

                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              if (!cancelReason.trim()) {
                                alert("Please provide a reason!");
                                return;
                              }
                              updateStatus(
                                cancelModal.appointmentId,
                                "Canceled",
                                cancelReason
                              );
                              setCancelModal({
                                show: false,
                                appointmentId: null,
                              });
                            }}
                            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() =>
                              setCancelModal({
                                show: false,
                                appointmentId: null,
                              })
                            }
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Bulk Cancel Modal */}
                  {bulkCancelModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                          Cancel {selectedAppointments.length} Appointment(s)
                        </h3>

                        <p className="text-sm text-gray-600 mb-3">
                          You are about to cancel{" "}
                          <b>{selectedAppointments.length}</b> appointment(s).
                          Please provide a reason:
                        </p>

                        <textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Reason for bulk cancellation..."
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
                          rows="4"
                        />

                        <div className="flex gap-3">
                          <button
                            onClick={handleBulkCancel}
                            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold"
                          >
                            Confirm Cancel All
                          </button>
                          <button
                            onClick={() => {
                              setBulkCancelModal(false);
                              setCancelReason("");
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // PATIENTS PAGE - Patient Account Management
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
            text: data.error || "Failed to fetch patient data",
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
          text: "Patient information has been updated",
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
            text: "Patient account has been deleted",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          alert(data.error || "Error deleting patient account");
        }
      } catch (err) {
        console.error("Error deleting patient", err);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: data.error || "Error deleting patient account",
          confirmButtonColor: "#3b82f6",
        });
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
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 mt-2 sm:mt-0">
        {/* ---------- Cohesive Header Bar for Patient Management ---------- */}
        <div className="p-3 sm:p-4 md:p-6 bg-white/95 border-b border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex flex-col gap-3 sm:gap-4 w-full">
            {/* Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center flex-wrap gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-blue-500 flex-shrink-0" />
              <span className="break-words">Patient Management</span>
            </h1>

            {/* Search and Action Buttons - Stack on mobile, side by side on larger screens */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
              {/* Search Input with Icon */}
              <div className="relative flex-1 w-full min-w-0 sm:min-w-[200px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-pink-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-2.5 md:py-3 rounded-full border-2 border-pink-300 bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 shadow-md text-sm sm:text-base placeholder-pink-300 transition-all duration-150 min-h-[44px]"
                />
              </div>

              {/* Add Patient Button - Full width on mobile, auto on larger screens */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-2.5 md:py-3 rounded-full hover:from-pink-600 hover:to-pink-700 active:from-pink-700 active:to-pink-800 transition-all duration-200 shadow-lg flex items-center justify-center text-sm sm:text-base font-medium whitespace-nowrap w-full sm:w-auto sm:flex-shrink-0 min-h-[44px] touch-manipulation"
                type="button"
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Add New Patient</span>
                <span className="sm:hidden">Add Patient</span>
              </button>
            </div>
          </div>
        </div>
        {/* ---------- End Cohesive Header Bar ---------- */}
        {/* This is where your patient list or table would typically follow, inheriting the space-y-4/6 */}
        {/* Table + List */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-auto">
          {loading ? (
            <p className="text-gray-500 text-sm sm:text-base py-4">
              Loading patients...
            </p>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8 sm:py-12 md:py-16">
              <Baby className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-gray-300 mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2 px-4">
                No Patients Found
              </h3>
              <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base px-4">
                Start by adding your first patient to the system
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-md text-sm sm:text-base"
              >
                Add Patient
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 shadow-md">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100 text-gray-700 uppercase text-sm font-semibold">
                    <tr>
                      <th className="px-4 lg:px-6 py-3">Full Name</th>
                      <th className="px-4 lg:px-6 py-3">Email</th>
                      <th className="px-4 lg:px-6 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPatients.map((patient) => (
                      <tr
                        key={patient.user_id}
                        className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition"
                      >
                        <td className="px-4 lg:px-6 py-3 sm:py-4 font-medium text-gray-900 text-sm sm:text-base">
                          {patient.full_name}
                        </td>
                        <td className="px-4 lg:px-6 py-3 sm:py-4 text-gray-700 text-sm sm:text-base break-words">
                          {patient.email}
                        </td>
                        <td className="px-4 lg:px-6 py-3 sm:py-4 text-center">
                          <div className="flex items-center justify-center gap-2 sm:gap-3">
                            <button
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm px-2 py-1 hover:bg-blue-50 rounded transition"
                              onClick={() => handleView(patient)}
                            >
                              View
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 font-medium text-xs sm:text-sm px-2 py-1 hover:bg-red-50 rounded transition"
                              onClick={() =>
                                handleDeletePatient(patient.user_id)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 sm:space-y-4">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.user_id}
                    className="bg-white rounded-lg border border-gray-200 shadow-md p-3 sm:p-4"
                  >
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 text-base sm:text-lg break-words">
                        {patient.full_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                        {patient.email}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 border-t border-gray-200">
                      <button
                        className="flex-1 text-blue-600 hover:text-blue-800 font-medium py-2 px-3 sm:px-4 border border-blue-600 rounded-lg hover:bg-blue-50 transition text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
                        onClick={() => handleView(patient)}
                      >
                        View
                      </button>
                      <button
                        className="flex-1 text-red-600 hover:text-red-800 font-medium py-2 px-3 sm:px-4 border border-red-600 rounded-lg hover:bg-red-50 transition text-xs sm:text-sm min-h-[44px] flex items-center justify-center"
                        onClick={() => handleDeletePatient(patient.user_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

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
      <div className="min-h-screen bg-transparent p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-t-4 sm:border-t-8 border-blue-500">
          {/* Header */}
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 sm:mb-6 md:mb-8 flex items-center gap-2 sm:gap-3 text-blue-700">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-400" />
            Patient Medical Records
          </h1>

          {/* Outer Search Bar */}
          {patients.length > 0 && (
            <div className="mb-6">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search patient by name..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm sm:text-base"
                />
              </div>
            </div>
          )}

          {/* No Records */}
          {patients.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-700 mb-2">
                No completed appointments
              </h3>
              <p className="text-blue-500">
                Medical records will appear here once appointments are
                completed.
              </p>
            </div>
          ) : filteredGroupedPatients.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-700 mb-2">
                No patients found
              </h3>
              <p className="text-blue-500">
                No patient folders match your search.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroupedPatients.map(([patientName, records]) => {
                const filteredRecords = filterRecords(
                  records,
                  recordSearch[patientName] || ""
                );
                return (
                  <div
                    key={patientName}
                    className="bg-white border border-blue-200 rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    {/* Folder Header */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFolders((prev) => ({
                          ...prev,
                          [patientName]: !prev[patientName],
                        }))
                      }
                      className="w-full flex items-center justify-between p-6 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <Folder
                          className={`w-10 h-10 ${
                            openFolders[patientName]
                              ? "text-yellow-500"
                              : "text-yellow-400"
                          }`}
                        />
                        <div>
                          <h3 className="text-lg font-bold text-blue-800">
                            {patientName}
                          </h3>
                          <p className="text-sm text-blue-600">
                            {records.length}{" "}
                            {records.length > 1 ? "records" : "record"}
                            {filteredRecords.length !== records.length && (
                              <span className="text-blue-500">
                                {" "}
                                ({filteredRecords.length} shown)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {openFolders[patientName] ? (
                        <ChevronUp className="text-blue-500 w-6 h-6" />
                      ) : (
                        <ChevronDown className="text-blue-500 w-6 h-6" />
                      )}
                    </button>

                    {/* Folder Body */}
                    {openFolders[patientName] && (
                      <div className="p-6 border-t border-blue-200 bg-blue-50/40 rounded-b-xl space-y-6">
                        {/* Inner Search Bar */}
                        <div className="mb-4">
                          <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search records by date or appointment type..."
                              value={recordSearch[patientName] || ""}
                              onChange={(e) =>
                                setRecordSearch((prev) => ({
                                  ...prev,
                                  [patientName]: e.target.value,
                                }))
                              }
                              className="w-full pl-9 pr-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm"
                            />
                          </div>
                        </div>

                        {filteredRecords.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No records match your search.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredRecords.map((p) => {
                              const recordKey = `${patientName}-${p.appointment_id}`;
                              const isOpen = openRecords[recordKey];

                              return (
                                <div
                                  key={p.appointment_id}
                                  className="border border-blue-200 rounded-lg bg-white shadow-sm overflow-hidden"
                                >
                                  {/* 📋 CLICKABLE HEADER */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenRecords((prev) => ({
                                        ...prev,
                                        [recordKey]: !prev[recordKey],
                                      }))
                                    }
                                    className="w-full flex items-center justify-between p-4 hover:bg-blue-50 transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Calendar className="w-5 h-5 text-blue-500" />
                                      <div>
                                        <p className="font-semibold text-blue-800">
                                          {p.appointment_date} -{" "}
                                          {p.appointment_type}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {p.diagnosis
                                            ? "✓ Has medical record"
                                            : "○ No record yet"}
                                        </p>
                                      </div>
                                    </div>
                                    {isOpen ? (
                                      <ChevronUp className="w-5 h-5 text-blue-500" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5 text-blue-500" />
                                    )}
                                  </button>

                                  {/* 📝 EXPANDABLE CONTENT */}
                                  {isOpen && (
                                    <div className="p-5 border-t border-blue-100 bg-blue-50/30">
                                      {/* Editable Inputs */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                                        {[
                                          "weight",
                                          "height",
                                          "temperature",
                                          "pulse_rate",
                                          "diagnosis",
                                        ].map((field) => (
                                          <div key={field}>
                                            <label className="block text-xs sm:text-sm font-medium text-blue-700 mb-1 capitalize">
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
                                                handleChange(
                                                  e,
                                                  p.appointment_id
                                                )
                                              }
                                              name={field}
                                              placeholder={`Enter ${field}`}
                                              className="w-full border border-blue-300 p-2 sm:p-3 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm sm:text-base"
                                            />
                                          </div>
                                        ))}

                                        {/* Age */}
                                        <div>
                                          <label className="block text-sm font-medium text-blue-700 mb-1">
                                            Age (at appointment)
                                          </label>
                                          <p className="border border-blue-200 p-3 rounded-lg bg-gray-50">
                                            {p.birth_date && p.appointment_date
                                              ? (() => {
                                                  const birth = new Date(
                                                    p.birth_date
                                                  );
                                                  const appointmentDate =
                                                    new Date(
                                                      p.appointment_date
                                                    );
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
                                              : "Not recorded"}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Remarks */}
                                      <div className="mb-6">
                                        <label className="block text-sm font-medium text-blue-700 mb-1">
                                          Remarks / Treatments
                                        </label>
                                        <textarea
                                          name="remarks"
                                          value={p.remarks ?? ""}
                                          onChange={(e) =>
                                            handleChange(e, p.appointment_id)
                                          }
                                          placeholder="Enter remarks and treatments"
                                          rows="4"
                                          className="w-full border border-blue-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                        />
                                      </div>

                                      {/* Buttons */}
                                      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setOpenRecords((prev) => ({
                                              ...prev,
                                              [recordKey]: false,
                                            }))
                                          }
                                          className="px-4 sm:px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm sm:text-base"
                                        >
                                          Close
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            saveRecord(p.appointment_id)
                                          }
                                          className="px-4 sm:px-6 py-2 bg-yellow-400 text-blue-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors text-sm sm:text-base"
                                        >
                                          {p.diagnosis ? "Update" : "Add"}{" "}
                                          Record
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => printRecord(p)}
                                          className="px-4 sm:px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base"
                                        >
                                          Print Record
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
        </div>

        {/* Success Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 text-center">
              <h2 className="text-lg font-semibold text-green-600 mb-2">
                ✅ Record Saved Successfully!
              </h2>
              <p className="text-gray-600">
                The medical record has been updated.
              </p>
              <button
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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

  const InventoryPage = () => {
    const [items, setItems] = useState([]);
    const [name, setName] = useState("");
    const [stock, setStock] = useState("");
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sales, setSales] = useState([]);
    const [sellItem, setSellItem] = useState(null);
    const [sellQty, setSellQty] = useState("");

    // Fetch inventory
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/inventory`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        setItems(data);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to fetch inventory: ${err.message}`,
          confirmButtonColor: "#3b82f6",
        });
      } finally {
        setLoading(false);
      }
    };

    // Fetch sales summary
    const fetchSalesSummary = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/sales/summary`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await res.json();
        setSales(data);
      } catch (err) {
        alert("Error fetching sales summary: " + err.message);
      }
    };

    useEffect(() => {
      fetchInventory();
      fetchSalesSummary();
    }, []);

    // Submit add/update
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!name.trim() || stock === "") return alert("Fill all fields");

      const url = editingItem
        ? `${import.meta.env.VITE_API_URL}/inventory/update/${
            editingItem.inventory_id
          }`
        : `${import.meta.env.VITE_API_URL}/inventory/add`;
      const method = editingItem ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ name, stock: parseInt(stock) }),
        });
        const data = await res.json();
        if (res.ok) {
          fetchInventory();
          setName("");
          setStock("");
          setEditingItem(null);
        } else {
          Swal.fire({
            icon: "error",
            title: "Save Failed",
            text: data.error || "Failed to save product",
            confirmButtonColor: "#3b82f6",
          });
        }
      } catch (err) {
        alert("Error saving item: " + err.message);
      }
    };

    // Delete
    const handleDelete = async (id) => {
      const result = await Swal.fire({
        icon: "warning",
        title: "Delete Product?",
        text: "This action cannot be undone!",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/inventory/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (res.ok) {
          setItems(items.filter((i) => i.inventory_id !== id));
        } else {
          Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text: "Failed to delete product",
            confirmButtonColor: "#3b82f6",
          });
        }
      } catch (err) {
        alert("Error deleting item: " + err.message);
      }
    };

    // Edit
    const handleEdit = (item) => {
      setEditingItem(item);
      setName(item.name);
      setStock(item.stock.toString());
    };

    // Cancel
    const handleCancel = () => {
      setEditingItem(null);
      setName("");
      setStock("");
    };

    // Sell product
    const handleSell = (item) => {
      setSellItem(item);
      setSellQty("");
    };

    const submitSell = async () => {
      if (!sellQty || parseInt(sellQty) <= 0) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Quantity",
          text: "Please enter a valid quantity",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/sales`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            inventory_id: sellItem.inventory_id,
            quantity: parseInt(sellQty),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Sale Recorded!",
            text: "Product sale has been recorded successfully",
            timer: 2000,
            showConfirmButton: false,
          });
          fetchInventory();
          fetchSalesSummary();
          setSellItem(null);
          setSellQty("");
        } else {
          Swal.fire({
            icon: "error",
            title: "Sale Failed",
            text: data.error || "Failed to record sale",
            confirmButtonColor: "#3b82f6",
          });
        }
      } catch (err) {
        alert("Error selling item: " + err.message);
      }
    };

    // Stock badge
    const getStockBadge = (stock) => {
      if (stock === 0)
        return (
          <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
            Out of Stock
          </span>
        );
      if (stock < 10)
        return (
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
            Low Stock
          </span>
        );
      return (
        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
          In Stock
        </span>
      );
    };

    const [searchTerm, setSearchTerm] = useState("");

    // Filter items by search term
    const filteredItems = items.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Header with search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-green-500" />
            Manage Inventory
          </h1>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 🔍 Search box */}
            <input
              type="text"
              placeholder="Search product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 w-full sm:w-auto"
            />

            {/* Refresh button */}
            <button
              onClick={() => {
                fetchInventory();
                fetchSalesSummary();
              }}
              disabled={loading}
              className="p-2 rounded-full bg-gray-100 hover:bg-green-100 text-green-600 hover:text-green-800 transition disabled:opacity-50"
              title="Refresh Inventory"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Add / Edit Form */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow border">
          <h2 className="text-base sm:text-lg font-semibold mb-4">
            {editingItem ? "✏️ Update Product" : "➕ Add New Product"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2"
          >
            <input
              type="text"
              placeholder="Product Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border p-2.5 sm:p-3 rounded focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              required
            />
            <input
              type="number"
              placeholder="Stock Quantity"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              min="0"
              className="border p-2.5 sm:p-3 rounded focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              required
            />
            <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 sm:px-6 py-2 rounded hover:bg-green-600 text-sm sm:text-base"
              >
                {editingItem ? "Update Product" : "Add Product"}
              </button>
              {editingItem && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-4 sm:px-6 py-2 rounded hover:bg-gray-600 text-sm sm:text-base"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Inventory Table - Desktop */}
        <div className="hidden md:block bg-white rounded-lg shadow border overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">
                  Product
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">
                  Stock
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.inventory_id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-3 font-medium text-gray-800">
                      {item.name}
                    </td>
                    <td className="p-3">{item.stock}</td>
                    <td className="p-3">{getStockBadge(item.stock)}</td>
                    <td className="p-3 flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.inventory_id)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleSell(item)}
                        className="text-green-600 hover:text-green-800 p-2 hover:bg-green-100 rounded"
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Inventory Cards - Mobile */}
        <div className="md:hidden space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow border text-center text-gray-500">
              No products found.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.inventory_id}
                className="bg-white p-4 rounded-lg shadow border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-800 text-base">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Stock: {item.stock}
                    </p>
                  </div>
                  {getStockBadge(item.stock)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded text-sm"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.inventory_id)}
                    className="flex-1 flex items-center justify-center gap-1 text-red-600 hover:text-red-800 p-2 hover:bg-red-100 rounded text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                  <button
                    onClick={() => handleSell(item)}
                    className="flex-1 flex items-center justify-center gap-1 text-green-600 hover:text-green-800 p-2 hover:bg-green-100 rounded text-sm"
                  >
                    <ShoppingCart className="w-4 h-4" /> Sell
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sell Modal */}
        {sellItem && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-sm">
              <h3 className="text-base sm:text-lg font-semibold mb-4">
                Sell {sellItem.name}
              </h3>
              <input
                type="number"
                min="1"
                placeholder="Quantity"
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                className="border p-2.5 sm:p-3 w-full rounded focus:ring-2 focus:ring-green-500 mb-4 text-sm sm:text-base"
              />
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setSellItem(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={submitSell}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm sm:text-base"
                >
                  Confirm Sale
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sales Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-blue-700">
            💹 Sales Summary
          </h2>

          {sales.length === 0 ? (
            <p className="text-center text-blue-600 bg-yellow-50 border border-yellow-200 rounded-xl py-6 sm:py-8 font-medium text-sm sm:text-base">
              No sales recorded.
            </p>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {sales.map((s, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl border border-yellow-200 bg-gradient-to-br from-blue-50 to-yellow-50 shadow-md hover:shadow-lg transition-transform hover:-translate-y-1 p-4 sm:p-6"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-yellow-400 rounded-t-xl"></div>
                  <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-2">
                    {s.name}
                  </h3>
                  <p className="text-3xl sm:text-4xl font-bold text-yellow-600">
                    {s.total_sold}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600 mt-1">
                    Total Sold
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  // SETTINGS PAGE
  // ANALYTICS PAGE (same mechanics as Doctor)
  const AnalyticsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [selectedDiagnosis, setSelectedDiagnosis] = useState("all");
    // Patient scope filter: 'all' or 'overall'
    const [patientScope, setPatientScope] = useState("all");
    const [availableDiagnoses, setAvailableDiagnoses] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);

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
      if (selectedYear) context += ` for year ${selectedYear}`;
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
      <div
        className={`bg-white rounded-2xl shadow-xl p-6 border-2 ${gradient} hover:shadow-2xl transition-shadow`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            {Icon && <Icon className="w-7 h-7 text-blue-600" />}
            {title}
          </h2>

          <button
            onClick={() =>
              generateInsights(chartId, chartType, chartData, context)
            }
            disabled={
              loadingInsights[chartId] || !chartData || chartData.length === 0
            }
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-lg"
          >
            {loadingInsights[chartId] ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate AI Insights</span>
              </>
            )}
          </button>
        </div>

        {children}
      </div>
    );

    const CustomTooltip = ({ active, payload, label, type = "default" }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-blue-200">
            <p className="font-bold text-gray-800 text-lg mb-2">{label}</p>
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-semibold" style={{ color: entry.color }}>
                  {entry.name}:
                </span>
                <span className="text-gray-700 font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    const filteredMonths = months.filter(
      (m) => m.value === "all" || availableMonths.includes(parseInt(m.value))
    );

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
            <p className="text-red-600 mb-6">{error}</p>
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

    return (
      <div className="min-h-screen bg-transparent p-3 sm:p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Compact Header with Filters */}
          <div className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between gap-3 border">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
              <div className="text-xs text-gray-500 ml-2">
                {selectedMonth === "all"
                  ? `Year ${selectedYear}`
                  : `${
                      months.find((m) => m.value === selectedMonth)?.label
                    } ${selectedYear}`}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent border px-2 py-1 rounded text-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border px-2 py-1 rounded text-sm"
              >
                {filteredMonths.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>

              <select
                value={patientScope}
                onChange={(e) => setPatientScope(e.target.value)}
                className="bg-transparent border px-2 py-1 rounded text-sm"
                title="Patient scope"
              >
                <option value="all">All patients</option>
                <option value="overall">Overall patients</option>
              </select>

              <button
                onClick={fetchData}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Small KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border shadow-sm flex flex-col">
              <div className="text-xs text-gray-500">Total Appointments</div>
              <div className="text-2xl font-bold text-gray-800">
                {data.totalAppointments || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border shadow-sm flex flex-col">
              <div className="text-xs text-gray-500">Top Diagnosis</div>
              <div className="text-lg font-semibold text-gray-800 truncate">
                {data.commonDiagnosis || "N/A"}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border shadow-sm flex flex-col">
              <div className="text-xs text-gray-500">Top Visit Reason</div>
              <div className="text-lg font-semibold text-gray-800 truncate">
                {data.commonAppointmentType || "N/A"}
              </div>
            </div>
          </div>

          {/* Charts in compact cards (preserve logic) */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartContainer
                title="Monthly Appointments Trend"
                chartId="monthly-trend"
                chartType="Monthly Appointment Trend"
                chartData={data.appointmentTrend}
                context={`${getFilterContext()}. Overall monthly appointment volume.`}
                icon={TrendingUp}
                gradient="border-purple-100"
              >
                <div className="h-56">
                  {data.appointmentTrend?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.appointmentTrend}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#edf2f7"
                          opacity={0.6}
                        />
                        <XAxis
                          dataKey={
                            selectedMonth !== "all" ? "monthLabel" : "month"
                          }
                          tickFormatter={
                            selectedMonth === "all"
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

              <ChartContainer
                title="Diagnosis Distribution"
                chartId="diagnosis-trend"
                chartType="Monthly Diagnosis Distribution"
                chartData={data.diagnosisTrend}
                context={`${getFilterContext()}. Shows the most common diagnosis for each month.`}
                icon={Stethoscope}
                gradient="border-blue-100"
              >
                <div className="h-56">
                  {data.diagnosisTrend?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.diagnosisTrend}>
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
                          dataKey="month"
                          tickFormatter={(v) => monthNames[v - 1]}
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartContainer
                title="Appointment Type Distribution"
                chartId="appointment-type-trend"
                chartType="Appointment Type Distribution"
                chartData={data.appointmentTypeTrend}
                context={`${getFilterContext()}. Shows appointment types per month.`}
                icon={Calendar}
                gradient="border-green-100"
              >
                <div className="h-56">
                  {data.appointmentTypeTrend?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.appointmentTypeTrend}>
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
                          dataKey="month"
                          tickFormatter={(v) => monthNames[v - 1]}
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

              <ChartContainer
                title="Top Inventory Items Used"
                chartId="inventory-usage"
                chartType="Inventory Usage Analysis"
                chartData={data.inventoryUsage}
                context={`${getFilterContext()}. Most used inventory items.`}
                icon={ClipboardList}
                gradient="border-amber-100"
              >
                <div className="h-56">
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
            </div>
          </div>

          {/* Insights Modal (popup) */}
          {insightsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setInsightsModalOpen(false)}
              />
              <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 truncate">
                      {insightsModalTitle}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      AI-generated insights
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                        Year: {selectedYear}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                        Month:{" "}
                        {selectedMonth === "all"
                          ? "All"
                          : months.find((m) => m.value === selectedMonth)
                              ?.label}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                        Diagnosis:{" "}
                        {selectedDiagnosis === "all"
                          ? "All"
                          : selectedDiagnosis}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                        Scope:{" "}
                        {patientScope === "overall"
                          ? "Overall"
                          : "All patients"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <button
                      onClick={handleCopyInsights}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setInsightsModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700 ml-2"
                      aria-label="Close insights"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-[44vh] overflow-y-auto">
                  {insightsModalContent}
                </div>

                <div className="mt-6 text-right">
                  <button
                    onClick={() => setInsightsModalOpen(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    if (activePage === "analytics") return <AnalyticsPage />;
    if (activePage === "patients") return <ManageAppointments />;
    if (activePage === "patient-accounts") return <PatientsPage />;
    if (activePage === "medical-records") return <MedicalRecords />;
    if (activePage === "Inventory") return <InventoryPage />;

    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-600">
          Select a page from sidebar
        </h1>
      </div>
    );
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
              <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base">Nurse</p>
              <p className="text-blue-200 text-xs sm:text-sm">Staff Member</p>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
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
        style={{ backgroundImage: "url('/Sunny1.png')" }}
      >
        {renderContent()}
      </div>
    </div>
  );
}

export default Nurse;

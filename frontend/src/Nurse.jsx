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
} from "lucide-react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

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
    { id: "patients", label: "Manage Appointments", icon: CalendarDays },
    { id: "patient-accounts", label: "Patient Accounts", icon: Baby },
    { id: "medical-records", label: "Medical Records", icon: FileText },
    { id: "Inventory", label: "Inventory", icon: Package },
    { id: "settings", label: "Settings", icon: Settings },
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
            // Sort by created_at (first approved, first served)
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
        alert("Failed to load dashboard data. Please try again later.");
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

        {/* Patient Queue Section */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center">
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
            Today's Patient Queue
          </h2>
          {(() => {
            // Use the queue directly - already filtered for today + approved
            const approvedToday = queue;
            const nowServing = approvedToday[0];

            if (approvedToday.length === 0) {
              return (
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow text-gray-500 text-center text-sm sm:text-base">
                  No approved patients in queue for today.
                </div>
              );
            }

            return (
              <>
                {/* Now Serving Card */}
                <div className="bg-green-50 border border-green-200 p-4 sm:p-6 rounded-2xl shadow mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-green-700 mb-2">
                    Now Serving
                  </h3>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="text-base sm:text-lg font-medium text-gray-800 flex items-center gap-2">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      {nowServing.full_name || `User #${nowServing.user_id}`}
                    </div>
                    <div className="text-sm sm:text-base text-gray-600 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span>
                        <span className="font-semibold">Time:</span>{" "}
                        {nowServing.appointment_time}
                      </span>
                      <span className="hidden sm:inline">|</span>
                      <span>
                        <span className="font-semibold">Purpose:</span>{" "}
                        {nowServing.appointment_type}
                      </span>
                      <span className="hidden sm:inline">|</span>
                      <span>
                        <span className="font-semibold">Reason:</span>{" "}
                        {nowServing.concerns || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto bg-white rounded-2xl shadow">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-100 text-left text-gray-700 uppercase text-sm">
                        <th className="px-4 lg:px-6 py-3 rounded-tl-2xl">#</th>
                        <th className="px-4 lg:px-6 py-3">Patient Name</th>
                        <th className="px-4 lg:px-6 py-3">Time</th>
                        <th className="px-4 lg:px-6 py-3">Status</th>
                        <th className="px-4 lg:px-6 py-3">Type</th>
                        <th className="px-4 lg:px-6 py-3 rounded-tr-2xl">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedToday.map((patient, index) => (
                        <tr
                          key={patient.appointment_id}
                          className={`border-t hover:bg-blue-50 transition ${
                            index % 2 === 0 ? "bg-white" : "bg-blue-50/40"
                          } ${index === 0 ? "ring-2 ring-green-200" : ""}`}
                        >
                          <td className="px-4 lg:px-6 py-3 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 lg:px-6 py-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            {patient.full_name || `User #${patient.user_id}`}
                          </td>
                          <td className="px-4 lg:px-6 py-3 text-gray-700 font-medium">
                            {patient.appointment_time}
                          </td>
                          <td className="px-4 lg:px-6 py-3">
                            <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              {patient.status}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-3 text-gray-700">
                            {patient.appointment_type}
                          </td>
                          <td className="px-4 lg:px-6 py-3 text-gray-700">
                            {patient.concerns || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {approvedToday.map((patient, index) => (
                    <div
                      key={patient.appointment_id}
                      className={`bg-white p-4 rounded-xl shadow border ${
                        index === 0
                          ? "ring-2 ring-green-200 border-green-300"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">
                            #{index + 1}
                          </span>
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-gray-800">
                            {patient.full_name || `User #${patient.user_id}`}
                          </span>
                        </div>
                        {index === 0 && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Now Serving
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-semibold">Time:</span>{" "}
                          {patient.appointment_time}
                        </p>
                        <p>
                          <span className="font-semibold">Type:</span>{" "}
                          {patient.appointment_type}
                        </p>
                        <p>
                          <span className="font-semibold">Status:</span>
                          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            {patient.status}
                          </span>
                        </p>
                        <p>
                          <span className="font-semibold">Reason:</span>{" "}
                          {patient.concerns || "N/A"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
        setAppointments(data);
      } catch (err) {
        console.error(err);
        alert("Error fetching appointments");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchAppointments();
    }, []);

    // Update status
    const updateStatus = async (id, status) => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/appointments/${id}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ status }),
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
          alert(data.error || "Failed to update");
        }
      } catch (err) {
        console.error(err);
        alert("Error updating appointment");
      }
    };

    // Delete appointment
    const deleteAppointment = async (id) => {
      if (!confirm("Delete this appointment?")) return;
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
        } else {
          alert(data.error || "Failed to delete");
        }
      } catch (err) {
        console.error(err);
        alert("Error deleting appointment");
      }
    };

    // 🔹 Filter logic
    const filteredAppointments =
      filter === "All"
        ? appointments
        : appointments.filter((appt) => appt.status === filter);

    // 🔹 Sorting logic — today’s appointments first, then upcoming ones (by date/time)
    const sortedAppointments = [...filteredAppointments].sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);

      const today = new Date().toISOString().split("T")[0];
      const isTodayA = a.appointment_date === today;
      const isTodayB = b.appointment_date === today;

      // Today’s appointments go first
      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      // Otherwise, sort by date/time
      return dateA - dateB;
    });
    const statusOptions = ["All", "pending", "Approved", "Completed"];
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Header with Queue Title + Filter/Refresh */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
            {/* Use Users icon, assuming it represents patient flow */}
            {/* <Users className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-blue-500" /> */}
            Daily Appointment Queue
          </h1>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* UPDATED: Segmented Filter Buttons */}
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs sm:text-sm">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-2 py-1.5 font-medium transition ${
                    filter === status
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-gray-600 hover:text-blue-500"
                  } rounded-md`}
                >
                  {status}
                </button>
              ))}
            </div>

            <button
              onClick={fetchAppointments}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition disabled:opacity-50"
              title="Refresh Appointments"
            >
              <RefreshCw
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  loading ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Appointment List / Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : sortedAppointments.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No {filter !== "All" && filter.toLowerCase()} appointments found.
          </p>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
            {sortedAppointments.map((appt, index) => (
              <div
                key={appt.appointment_id}
                // Increased top padding to make room for the queue number
                className="relative p-4 sm:p-5 pt-10 bg-white border rounded-xl shadow hover:shadow-lg transition"
              >
                {/* NEW: Prominent Queue Number for Flow/Order */}
                <div className="absolute top-0 left-0 bg-blue-600 text-white rounded-tr-xl rounded-bl-lg px-3 py-1 text-base font-extrabold shadow-lg">
                  #{index + 1}
                </div>

                {/* Patient Info */}
                <div className="mb-3 mt-1">
                  <p className="font-extrabold text-base sm:text-lg text-gray-800">
                    {appt.full_name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {appt.email}
                  </p>
                </div>

                {/* Appointment Info (Refined Hierarchy) */}
                <div className="text-sm space-y-1 mb-3">
                  <p className="font-semibold">
                    {/* Elevated Date/Time visibility */}
                    <span className="text-gray-700">Date:</span>{" "}
                    {formatDate(appt.appointment_date)} -{" "}
                    {appt.appointment_time}
                  </p>
                  <p>
                    <b>Type:</b> {appt.appointment_type}
                  </p>
                  <p>
                    <b>Status:</b>{" "}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        appt.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : appt.status === "Completed"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {appt.status}
                    </span>
                  </p>
                  {/* Patient Concerns */}
                  <p className="pt-1">
                    <b>Concerns:</b> {appt.concerns || "N/A"}
                  </p>
                  {/* Additional Services */}
                  <p>
                    <b>Services:</b> {appt.additional_services || "None"}
                  </p>
                </div>

                {/* Actions (Primary actions are now larger and more prominent) */}
                <div className="flex flex-wrap gap-2 pt-2 border-t mt-4">
                  {appt.status === "pending" && (
                    <button
                      onClick={() =>
                        updateStatus(appt.appointment_id, "Approved")
                      }
                      // Primary action blue/green for approval
                      className="flex items-center px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Approve
                    </button>
                  )}
                  {appt.status === "Approved" && (
                    <button
                      onClick={() =>
                        updateStatus(appt.appointment_id, "Completed")
                      }
                      // Primary action blue for completion
                      className="flex items-center px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <ClipboardCheck className="w-4 h-4 mr-1.5" />
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => deleteAppointment(appt.appointment_id)}
                    // Delete remains red, but its size is consistent with others
                    className="flex items-center px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
          alert(data.error || "Error fetching users");
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
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/patients/${patient.user_id}/profile`
        );
        if (!res.ok) throw new Error("Failed to load patient profile");
        const data = await res.json();
        setSelectedPatient(data);
        setIsModalOpen(true);
      } catch (err) {
        console.error(err);
        alert("Failed to load patient profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    const handleDeletePatient = async (user_id) => {
      if (!confirm("Are you sure you want to delete this patient account?"))
        return;

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
          alert("Patient account deleted successfully!");
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
          alert(err.message || "Failed to add patient");
          return;
        }

        alert("Patient added successfully!");
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
    };

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-blue-500" />
            Patient Management
          </h1>

          <div className="flex gap-2 items-center">
            {/* Search Input with Icon */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-400" />
              <input
                type="text"
                placeholder="Search patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-3 rounded-full border-2 border-pink-300 bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 shadow-md text-sm sm:text-base placeholder-pink-300"
              />
            </div>

            {/* Add Patient Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-md flex items-center justify-center text-sm sm:text-base"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Add New Patient
            </button>
          </div>
        </div>

        {/* Table + List */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 overflow-x-auto">
          {loading ? (
            <p className="text-gray-500">Loading patients...</p>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-16">
              <Baby className="w-20 h-20 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No Patients Found
              </h3>
              <p className="text-gray-500 mb-6">
                Start by adding your first patient to the system
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-md"
              >
                Add Patient
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 shadow-md">
                <table className="w-full text-left border-collapse">
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
                        <td className="px-4 lg:px-6 py-4 font-medium text-gray-900">
                          {patient.full_name}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-gray-700">
                          {patient.email}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-center space-x-3">
                          <button
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            onClick={() => handleView(patient)}
                          >
                            View
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                            onClick={() => handleDeletePatient(patient.user_id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.user_id}
                    className="bg-white rounded-lg border border-gray-200 shadow-md p-4"
                  >
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {patient.full_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {patient.email}
                      </p>
                    </div>
                    <div className="flex gap-3 pt-3 border-t border-gray-200">
                      <button
                        className="flex-1 text-blue-600 hover:text-blue-800 font-medium py-2 px-4 border border-blue-600 rounded-lg hover:bg-blue-50 transition text-sm"
                        onClick={() => handleView(patient)}
                      >
                        View
                      </button>
                      <button
                        className="flex-1 text-red-600 hover:text-red-800 font-medium py-2 px-4 border border-red-600 rounded-lg hover:bg-red-50 transition text-sm"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
            onClick={() => setIsAddModalOpen(false)}
          >
            <div
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 relative overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-pink-600 mb-4">
                Add New Patient
              </h2>

              <form onSubmit={handleAddPatient} className="space-y-3">
                {/* USER FIELDS */}
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newPatient.full_name}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, full_name: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newPatient.email}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, email: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newPatient.password}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, password: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  required
                />
                <input
                  type="date"
                  value={newPatient.birth_date}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, birth_date: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  required
                />
                <select
                  value={newPatient.gender}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, gender: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
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
                  className="w-full border rounded-lg p-2"
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
                  className="w-full border rounded-lg p-2"
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
                  className="w-full border rounded-lg p-2"
                />
                <textarea
                  placeholder="Address"
                  value={newPatient.address}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, address: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                />

                <select
                  value={newPatient.blood_type}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, blood_type: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
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
                  className="w-full border rounded-lg p-2"
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
                  className="w-full border rounded-lg p-2"
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
                  className="w-full border rounded-lg p-2"
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
                  className="w-full border rounded-lg p-2"
                />

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white py-2 rounded-lg hover:from-pink-600 hover:to-pink-700 transition"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-all duration-300 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-4 sm:p-6 relative overflow-y-auto max-h-[90vh] transform transition-all duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-700 transition-colors w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                onClick={closeModal}
                aria-label="Close"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {loadingProfile ? (
                <p className="text-center text-gray-500 py-6 text-sm sm:text-base">
                  Loading profile...
                </p>
              ) : selectedPatient ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-4 border-b pb-2">
                    Patient Details
                  </h2>

                  <div className="space-y-2 text-gray-700 text-sm sm:text-base">
                    <p>
                      <span className="font-semibold">Full Name:</span>{" "}
                      {selectedPatient.full_name}
                    </p>
                    <p>
                      <span className="font-semibold">Email:</span>{" "}
                      {selectedPatient.email}
                    </p>
                    <p>
                      <span className="font-semibold">Birth Date:</span>{" "}
                      {selectedPatient.birth_date}
                    </p>
                    <p>
                      <span className="font-semibold">Gender:</span>{" "}
                      {selectedPatient.gender}
                    </p>

                    <hr className="my-3 border-gray-300" />

                    <p>
                      <span className="font-semibold">Guardian:</span>{" "}
                      {selectedPatient.guardian}
                    </p>
                    <p>
                      <span className="font-semibold">Guardian Number:</span>{" "}
                      {selectedPatient.guardian_number}
                    </p>
                    <p>
                      <span className="font-semibold">Phone Number:</span>{" "}
                      {selectedPatient.phone_number}
                    </p>
                    <p>
                      <span className="font-semibold">Address:</span>{" "}
                      {selectedPatient.address}
                    </p>
                    <p>
                      <span className="font-semibold">Blood Type:</span>{" "}
                      {selectedPatient.blood_type}
                    </p>
                    <p>
                      <span className="font-semibold">Allergies:</span>{" "}
                      {selectedPatient.allergies}
                    </p>
                    <p>
                      <span className="font-semibold">Chronic Conditions:</span>{" "}
                      {selectedPatient.chronic_conditions}
                    </p>
                    <p>
                      <span className="font-semibold">Mother's Name:</span>{" "}
                      {selectedPatient.mother_name}
                    </p>
                    <p>
                      <span className="font-semibold">Father's Name:</span>{" "}
                      {selectedPatient.father_name}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500 py-6">
                  No patient selected.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // MEDICAL RECORDS PAGE
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
    const [patientSearch, setPatientSearch] = useState(""); // Search for patient folders
    const [recordSearch, setRecordSearch] = useState({}); // Search for records within each folder (keyed by patient name)

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

    // ✅ Update both the displayed input and formData
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

    // 🖨️ Print function (single record)
    const printRecord = (patient) => {
      if (!patient) return alert("No record to print.");

      // Compute age from birth_date if available
      let age = "N/A";
      if (patient.birth_date) {
        const birth = new Date(patient.birth_date);
        const today = new Date();
        age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        age = `${age} yrs`;
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

    // Loading state
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

    // ✅ Group appointments (records) by patient
    const groupedPatients = patients.reduce((acc, curr) => {
      const name = curr.full_name;
      if (!acc[name]) acc[name] = [];
      acc[name].push(curr);
      return acc;
    }, {});

    // Filter patient folders by patient name search
    const filteredGroupedPatients = Object.entries(groupedPatients).filter(
      ([patientName]) => {
        if (!patientSearch.trim()) return true;
        return patientName.toLowerCase().includes(patientSearch.toLowerCase());
      }
    );

    // Filter records within a folder by date or type
    const filterRecords = (records, searchTerm) => {
      if (!searchTerm || !searchTerm.trim()) return records;
      const term = searchTerm.toLowerCase().trim();
      return records.filter((record) => {
        const dateMatch = record.appointment_date?.toLowerCase().includes(term);
        const typeMatch = record.appointment_type?.toLowerCase().includes(term);
        return dateMatch || typeMatch;
      });
    };

    // Error state
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

          {/* Outer Search Bar - Search for Patient Folders */}
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
                        {/* Inner Search Bar - Search for Records by Date or Type */}
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
                          filteredRecords.map((p) => (
                            <div
                              key={p.appointment_id}
                              className="border border-blue-200 rounded-lg bg-white shadow-sm p-5"
                            >
                              <div className="mb-3">
                                <h4 className="font-semibold text-blue-800">
                                  Appointment Date: {p.appointment_date}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  <h4 className="font-semibold text-blue-800">
                                    Appointment Type: {p.appointment_type}
                                  </h4>
                                </p>
                                <p className="text-sm text-gray-500">
                                  {p.diagnosis
                                    ? "Has medical record"
                                    : "No record yet"}
                                </p>
                              </div>

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
                                        handleChange(e, p.appointment_id)
                                      }
                                      name={field}
                                      placeholder={`Enter ${field}`}
                                      className="w-full border border-blue-300 p-2 sm:p-3 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm sm:text-base"
                                    />
                                  </div>
                                ))}

                                {/* Age (computed) */}
                                <div>
                                  <label className="block text-sm font-medium text-blue-700 mb-1">
                                    Age
                                  </label>
                                  <p className="border border-blue-200 p-3 rounded-lg bg-gray-50">
                                    {p.birth_date
                                      ? (() => {
                                          const birth = new Date(p.birth_date);
                                          const today = new Date();
                                          let age =
                                            today.getFullYear() -
                                            birth.getFullYear();
                                          const m =
                                            today.getMonth() - birth.getMonth();
                                          if (
                                            m < 0 ||
                                            (m === 0 &&
                                              today.getDate() < birth.getDate())
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
                                    setOpenFolders((prev) => ({
                                      ...prev,
                                      [patientName]: false,
                                    }))
                                  }
                                  className="px-4 sm:px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm sm:text-base"
                                >
                                  Close
                                </button>

                                <button
                                  type="button"
                                  onClick={() => saveRecord(p.appointment_id)}
                                  className="px-4 sm:px-6 py-2 bg-yellow-400 text-blue-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors text-sm sm:text-base"
                                >
                                  {p.diagnosis ? "Update" : "Add"} Record
                                </button>

                                <button
                                  type="button"
                                  onClick={() => printRecord(p, patientName)}
                                  className="px-4 sm:px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base"
                                >
                                  Print Record
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ✅ SUCCESS MODAL (Place here, after main container) */}
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
        alert("Error fetching inventory: " + err.message);
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
          alert(data.error || "Failed to save");
        }
      } catch (err) {
        alert("Error saving item: " + err.message);
      }
    };

    // Delete
    const handleDelete = async (id) => {
      if (!confirm("Delete this product?")) return;
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
          alert("Failed to delete");
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
      if (!sellQty || parseInt(sellQty) <= 0)
        return alert("Enter valid quantity");
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
          alert("Sale recorded!");
          fetchInventory();
          fetchSalesSummary();
          setSellItem(null);
          setSellQty("");
        } else {
          alert(data.error || "Failed to record sale");
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
  const SettingsPage = () => (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
        <Settings className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-purple-500" />
        Clinic Settings
      </h1>
      {/* Content will go here */}
    </div>
  );

  // RENDER CURRENT PAGE
  const renderContent = () => {
    if (activePage === "home") return <HomePage />;
    if (activePage === "patients") return <ManageAppointments />;
    if (activePage === "patient-accounts") return <PatientsPage />;
    if (activePage === "medical-records") return <MedicalRecords />;
    if (activePage === "Inventory") return <InventoryPage />;
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

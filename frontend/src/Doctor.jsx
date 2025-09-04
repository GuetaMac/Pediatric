import { useState, useEffect } from "react";
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
  Trash2,
  Plus,
} from "lucide-react";

function Doctor() {
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome Back, Doctor!
          </h1>
          <p className="text-gray-600 flex items-center">
            <Stethoscope className="w-5 h-5 mr-2 text-pink-500" />
            Pediatric Care Dashboard
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Today's Date</p>
          <p className="text-lg font-semibold text-gray-800">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100">Today's Patients</p>
              <p className="text-3xl font-bold">8</p>
            </div>
            <Baby className="w-12 h-12 text-pink-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Patients</p>
              <p className="text-3xl font-bold">156</p>
            </div>
            <Users className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Nurse Accounts</p>
              <p className="text-3xl font-bold">0</p>
            </div>
            <User className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Check-ups</p>
              <p className="text-3xl font-bold">42</p>
            </div>
            <Activity className="w-12 h-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Today's Schedule & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Clock className="w-6 h-6 mr-2 text-blue-500" />
            Today's Schedule
          </h3>
          <div className="text-center py-8">
            <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No appointments scheduled for today</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Heart className="w-6 h-6 mr-2 text-pink-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-4 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-md">
              <UserPlus className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-semibold">Add Patient</span>
            </button>
            <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md">
              <Calendar className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-semibold">Schedule</span>
            </button>
            <button className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md">
              <Activity className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-semibold">Records</span>
            </button>
            <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md">
              <Stethoscope className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-semibold">Checkup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // PATIENTS PAGE
  const PatientsPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <Users className="w-8 h-8 mr-3 text-blue-500" />
          Patient Management
        </h1>
        <button className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-md flex items-center">
          <UserPlus className="w-5 h-5 mr-2" />
          Add New Patient
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center py-16">
          <Baby className="w-20 h-20 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No Patients Yet
          </h3>
          <p className="text-gray-500 mb-6">
            Start by adding your first patient to the system
          </p>
          <button className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-md">
            Add Patient
          </button>
        </div>
      </div>
    </div>
  );

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
        const res = await fetch("http://localhost:5001/api/users?role=nurse");
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
        alert("Please fill all fields");
        return;
      }
      if (password.length < 8) {
        alert("Password must be at least 8 characters long");
        return;
      }

      try {
        setLoading(true);
        const res = await fetch("http://localhost:5001/api/users", {
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
          alert("Nurse account created successfully!");
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
      if (!confirm("Are you sure you want to delete this nurse account?"))
        return;

      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5001/api/users/${user_id}`, {
          method: "DELETE",
        });

        const data = await res.json();
        if (res.ok) {
          setNurses(nurses.filter((nurse) => nurse.user_id !== data.user_id));
          alert("Nurse account deleted successfully!");
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
        const res = await fetch(`http://localhost:5001/api/users/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        });

        const data = await res.json();
        if (res.ok) {
          setNurses(
            nurses.map((nurse) => (nurse.user_id === editId ? data : nurse))
          );
          setEditId(null);
          setEditForm({ full_name: "", email: "", password: "" });
          alert("Nurse account updated successfully!");
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
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center px-4 py-2 ${
              activeTab === "create"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-600"
            }`}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Nurse
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex items-center px-4 py-2 ${
              activeTab === "manage"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-gray-600"
            }`}
          >
            <Users className="w-4 h-4 mr-2" /> Manage Nurses
          </button>
        </div>

        {/* Create Nurse Form */}
        {activeTab === "create" && (
          <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              Create Nurse Account
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-3 py-2 border rounded-lg"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full px-3 py-2 border rounded-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-3 py-2 border rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                onClick={handleCreateNurse}
                disabled={loading}
                className="w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600"
              >
                {loading ? "Creating..." : "Create Nurse"}
              </button>
            </div>
          </div>
        )}

        {/* Manage Nurses */}
        {activeTab === "manage" && (
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Nurse Accounts
            </h2>
            {loading && <p>Loading...</p>}
            <div className="space-y-3">
              {nurses.length === 0 ? (
                <p className="text-gray-500">No nurse accounts found.</p>
              ) : (
                nurses.map((nurse) => (
                  <div
                    key={nurse.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    {editId === nurse.user_id ? (
                      <div className="flex-1 flex space-x-2">
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border rounded"
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
                          className="flex-1 px-2 py-1 border rounded"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSave}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium">{nurse.full_name}</p>
                          <p className="text-sm text-gray-500">{nurse.email}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(nurse)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(nurse.user_id)}
                            className="text-red-600 hover:text-red-800"
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

  // SETTINGS PAGE
  const SettingsPage = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center">
        <Settings className="w-8 h-8 mr-3 text-purple-500" />
        Clinic Settings
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Profile Settings
          </h3>
          <p className="text-gray-500">
            Configure your doctor profile and clinic information
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            System Preferences
          </h3>
          <p className="text-gray-500">
            Customize system behavior and notifications
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Security</h3>
          <p className="text-gray-500">Manage password and security settings</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Backup & Export
          </h3>
          <p className="text-gray-500">
            Backup patient data and export reports
          </p>
        </div>
      </div>
    </div>
  );

  // RENDER CURRENT PAGE
  const renderContent = () => {
    if (activePage === "home") return <HomePage />;
    if (activePage === "patients") return <PatientsPage />;
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

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 w-72 p-6 bg-blue-800 bg-opacity-50">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center mr-3">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold">Dr. Pediatrician</p>
              <p className="text-blue-200 text-sm">Pediatric Specialist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8">{renderContent()}</div>
    </div>
  );
}

export default Doctor;

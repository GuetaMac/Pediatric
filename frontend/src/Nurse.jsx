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
  PlusCircle,
  Edit,
  Trash2,
  ClipboardCheck,
} from "lucide-react";

function Doctor() {
  const [activePage, setActivePage] = useState("home");

  const menuItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "patients", label: "Manage Appointments", icon: Users },
    { id: "Inventory", label: "Inventory", icon: User },
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

  // PATIENTS PAGE
  const ManageAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);

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
          "http://localhost:5001/api/appointments/nurse",
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
    // Update status
    const updateStatus = async (id, status) => {
      try {
        const res = await fetch(
          `http://localhost:5001/api/appointments/${id}/status`,
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
                ? { ...appt, status: data.status } // update only the status
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
          `http://localhost:5001/api/appointments/${id}`,
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

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-500" />
            Appointment Management
          </h1>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : appointments.length === 0 ? (
          <p className="text-gray-600">No appointments yet.</p>
        ) : (
          <ul className="space-y-3">
            {appointments.map((appt) => (
              <li
                key={appt.appointment_id}
                className="p-4 border rounded-lg shadow-sm bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <p>
                    <b>Patient:</b> {appt.full_name} ({appt.email})
                  </p>
                  <p>
                    <b>Date:</b> {formatDate(appt.appointment_date)} -{" "}
                    {appt.appointment_time}
                  </p>
                  <p>
                    <b>Type:</b> {appt.appointment_type}
                  </p>
                  <p>
                    <b>Status:</b>{" "}
                    <span
                      className={
                        appt.status === "Approved"
                          ? "text-green-600 font-semibold"
                          : appt.status === "Completed"
                          ? "text-blue-600 font-semibold"
                          : "text-yellow-600 font-semibold"
                      }
                    >
                      {appt.status}
                    </span>
                  </p>
                </div>

                <div className="flex space-x-2">
                  {appt.status === "pending" && (
                    <button
                      onClick={() =>
                        updateStatus(appt.appointment_id, "Approved")
                      }
                      className="text-green-600 hover:text-green-800"
                    >
                      <CheckCircle className="w-6 h-6" />
                    </button>
                  )}
                  {appt.status === "Approved" && (
                    <button
                      onClick={() =>
                        updateStatus(appt.appointment_id, "Completed")
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ClipboardCheck className="w-6 h-6" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAppointment(appt.appointment_id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  // MANAGE ACCOUNT PAGE
  const InventoryPage = () => {
    const [items, setItems] = useState([]);
    const [name, setName] = useState("");
    const [stock, setStock] = useState("");
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch inventory
    // Enhanced fetch inventory with better error handling
    const fetchInventory = async () => {
      setLoading(true);
      try {
        console.log(
          "Fetching inventory from:",
          "http://localhost:5001/api/inventory"
        );

        const res = await fetch("http://localhost:5001/api/inventory", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        });

        console.log("Response status:", res.status);
        console.log("Response ok:", res.ok);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Error response:", errorText);
          throw new Error(
            `HTTP error! status: ${res.status}, message: ${errorText}`
          );
        }

        const data = await res.json();
        console.log("Fetched data:", data);
        setItems(data);
      } catch (err) {
        console.error("Fetch error details:", err);
        alert(`Error fetching inventory: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Enhanced submit with better error handling
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!name.trim() || stock === "") {
        alert("Please fill all fields");
        return;
      }

      if (parseInt(stock) < 0) {
        alert("Stock cannot be negative");
        return;
      }

      setLoading(true);
      try {
        const url = editingItem
          ? `http://localhost:5001/api/inventory/update/${editingItem.inventory_id}`
          : "http://localhost:5001/api/inventory/add";

        const method = editingItem ? "PUT" : "POST";

        console.log("Submitting to:", url, "with method:", method);
        console.log("Payload:", { name: name.trim(), stock: parseInt(stock) });

        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ name: name.trim(), stock: parseInt(stock) }),
        });

        console.log("Submit response status:", res.status);

        const data = await res.json();
        console.log("Submit response data:", data);

        if (res.ok) {
          await fetchInventory(); // Refresh the list
          setName("");
          setStock("");
          setEditingItem(null);
          alert(editingItem ? "✅ Product updated!" : "✅ Product added!");
        } else {
          console.error("Submit failed:", data);
          alert("❌ " + (data.error || "Failed to save"));
        }
      } catch (err) {
        console.error("Save error details:", err);
        alert(`Error saving item: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Delete
    const handleDelete = async (id) => {
      const itemToDelete = items.find((i) => i.inventory_id === id);
      if (!confirm(`Are you sure you want to delete "${itemToDelete?.name}"?`))
        return;

      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5001/api/inventory/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (res.ok) {
          setItems(items.filter((i) => i.inventory_id !== id));
          alert("✅ Product deleted!");
        } else {
          const data = await res.json();
          alert("❌ " + (data.error || "Failed to delete"));
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("Error deleting item");
      } finally {
        setLoading(false);
      }
    };

    // Edit mode
    const handleEdit = (item) => {
      setEditingItem(item);
      setName(item.name);
      setStock(item.stock.toString());
    };

    // Cancel edit
    const handleCancel = () => {
      setEditingItem(null);
      setName("");
      setStock("");
    };

    // Get stock status
    const getStockStatus = (stock) => {
      if (stock === 0) return { color: "text-red-600", label: "Out of Stock" };
      if (stock < 10) return { color: "text-yellow-600", label: "Low Stock" };
      return { color: "text-green-600", label: "In Stock" };
    };

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <Package className="w-8 h-8 mr-3 text-green-500" />
            Manage Inventory
          </h1>
          <div className="text-sm text-gray-600">
            Total Items: {items.length}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="ml-2">Loading...</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">
            {editingItem ? "Update Product" : "Add New Product"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                placeholder="Enter product name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border p-3 rounded w-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                placeholder="Enter quantity"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                min="0"
                className="border p-3 rounded w-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded flex items-center hover:bg-green-600 disabled:opacity-50"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                {editingItem ? "Update Product" : "Add Product"}
              </button>
              {editingItem && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Inventory Items</h2>
          </div>
          <div className="p-6">
            {items.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No products in inventory.
              </p>
            ) : (
              <div className="grid gap-4">
                {items.map((item) => {
                  const stockStatus = getStockStatus(item.stock);
                  return (
                    <div
                      key={item.inventory_id}
                      className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            Stock: {item.stock}
                          </span>
                          <span
                            className={`text-sm font-medium ${stockStatus.color}`}
                          >
                            {stockStatus.label}
                          </span>
                        </div>
                        {item.created_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Added:{" "}
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded disabled:opacity-50"
                          title="Edit product"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.inventory_id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-100 rounded disabled:opacity-50"
                          title="Delete product"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
      {/* Content will go here */}
    </div>
  );

  // RENDER CURRENT PAGE
  const renderContent = () => {
    if (activePage === "home") return <HomePage />;
    if (activePage === "patients") return <ManageAppointments />;
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

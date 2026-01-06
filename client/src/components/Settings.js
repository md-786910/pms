import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon, User, Save } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";

const Settings = () => {
  const { user, updateUser } = useUser();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    avatar: user?.avatar || "",
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      updateUser({ ...user, ...profileData });
      showToast("Profile updated successfully!", "success");
    } catch (error) {
      showToast("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className=" bg-white  border border-gray-200  rounded-lg px-5 py-4   mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="p-2 rounded-lg bg-primary-500 text-white hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <h1 className="text-base font-semibold  mb-1">Settings</h1>
              <p className="  text-md">
                Manage your account and preferences
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-xl font-semibold w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-1 text-blue-700">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-base font-semibold">{user?.role || "User"}</div>
              <div className="  text-sm">Account Type</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-base font-semibold  mb-2">
            Profile Settings
          </h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      name: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  disabled
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      email: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, User, Mail } from "lucide-react";
import { authAPI } from "../utils/api";

const InvitationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  console.log("InvitationPage rendered with token:", token);

  // Simple toast function
  const showToast = (message, type = "info") => {
    // Create a simple toast notification
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium ${
      type === "error"
        ? "bg-red-500"
        : type === "success"
        ? "bg-green-500"
        : type === "info"
        ? "bg-blue-500"
        : "bg-gray-500"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  };

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchInvitation();
    checkUser();
  }, [token]);

  const checkUser = async () => {
    const storedUser = localStorage.getItem("user");
    const authToken = localStorage.getItem("authToken");

    if (storedUser && authToken) {
      try {
        // Verify the token is still valid by fetching user profile
        const response = await fetch(
          "http://localhost:5000/api/users/profile",
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem("user");
          localStorage.removeItem("authToken");
          setUser(null);
        }
      } catch (error) {
        console.error("Error verifying user:", error);
        setUser(JSON.parse(storedUser)); // Fallback to stored user
      }
    } else {
      setUser(null);
    }
  };

  const fetchInvitation = async () => {
    try {
      console.log("Fetching invitation with token:", token);
      const response = await fetch(
        `http://localhost:5000/api/invitations/${token}`
      );
      const data = await response.json();
      console.log("Invitation response:", data);

      if (data.success) {
        setInvitation(data.invitation);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error fetching invitation:", error);
      setError("Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!password) {
      showToast("Please enter a password", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setAccepting(true);
    try {
      const requestBody = {
        userData: {
          name: invitation.email.split("@")[0], // Use email prefix as name
          email: invitation.email,
          password: password,
        },
      };

      console.log("Accepting invitation with request body:", requestBody);
      const response = await fetch(
        `http://localhost:5000/api/invitations/${token}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();
      console.log("Accept invitation response:", data);

      if (data.success) {
        if (data.alreadyMember) {
          showToast("You are already a member of this project!", "info");
        } else {
          showToast("Successfully joined the project!", "success");
        }

        // Log the new user in
        if (data.user && data.token) {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        // Clear any pending invitation since we're accepting it
        localStorage.removeItem("pendingInvitation");
        navigate(`/project/${data.project._id}`);
      } else {
        console.error("Invitation acceptance error:", data);
        showToast(data.message || "Failed to accept invitation", "error");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      showToast("Failed to accept invitation", "error");
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    // Store the invitation token so we can redirect back after login
    localStorage.setItem("pendingInvitation", token);
    navigate("/");
  };

  const handleRegister = () => {
    // Store the invitation token so we can redirect back after registration
    localStorage.setItem("pendingInvitation", token);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invitation Error
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invitation Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              This invitation is invalid or has expired.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Project Invitation</h1>
            <p className="text-blue-100">
              You've been invited to join a project
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Project Info */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {invitation.project.name}
              </h2>
              <p className="text-gray-600 mb-4">
                {invitation.project.description || "No description provided"}
              </p>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span>Invited by: {invitation.invitedBy.name}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>Email: {invitation.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Role: {invitation.role}</span>
                </div>
              </div>
            </div>

            {/* Create Account Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 text-center">
                Create Account to Join Project
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={invitation.email.split("@")[0]}
                    disabled
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={invitation.email}
                    disabled
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {accepting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  )}
                  {accepting ? "Creating Account..." : "Accept Invitation"}
                </button>
              </div>
            </div>

            {/* Expiration Info */}
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 text-center">
                <Clock className="w-4 h-4 inline mr-1" />
                This invitation expires on{" "}
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationPage;

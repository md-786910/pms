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
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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
    if (!user && !showSignupForm) {
      // Show signup form for new users
      setShowSignupForm(true);
      return;
    }

    setAccepting(true);
    try {
      let requestBody;

      if (user) {
        // Existing user
        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
          showToast("Please log in to accept the invitation", "error");
          navigate("/login");
          return;
        }

        // Check if user's email matches invitation email
        if (invitation && user.email !== invitation.email) {
          const confirmJoin = window.confirm(
            `You are logged in as ${user.email}, but this invitation was sent to ${invitation.email}. Do you want to continue joining the project?`
          );
          if (!confirmJoin) {
            setAccepting(false);
            return;
          }
        }

        requestBody = { userId: user._id };
      } else {
        // New user - create account
        if (signupData.password !== signupData.confirmPassword) {
          showToast("Passwords do not match", "error");
          setAccepting(false);
          return;
        }

        if (signupData.password.length < 6) {
          showToast("Password must be at least 6 characters", "error");
          setAccepting(false);
          return;
        }

        requestBody = {
          userData: {
            name: signupData.name,
            email: signupData.email,
            password: signupData.password,
          },
        };
      }

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

        // If new user was created, log them in
        if (!user && data.user) {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }

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
    navigate("/login");
  };

  const handleRegister = () => {
    navigate("/register");
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

            {/* Action Buttons */}
            {user ? (
              <div className="space-y-3">
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
                  {accepting ? "Joining Project..." : "Join Project"}
                </button>
                <p className="text-sm text-gray-500 text-center">
                  Logged in as: {user.name}
                </p>
              </div>
            ) : showSignupForm ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center">
                  Create Account to Join Project
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={signupData.name}
                    onChange={(e) =>
                      setSignupData({ ...signupData, name: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={signupData.email}
                    onChange={(e) =>
                      setSignupData({ ...signupData, email: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={signupData.confirmPassword}
                    onChange={(e) =>
                      setSignupData({
                        ...signupData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
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
                    {accepting
                      ? "Creating Account..."
                      : "Create Account & Join"}
                  </button>
                  <button
                    onClick={() => setShowSignupForm(false)}
                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center mb-4">
                  You need to create an account or log in to accept this
                  invitation.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setShowSignupForm(true)}
                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            )}

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

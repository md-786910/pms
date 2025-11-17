import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  Mail,
  Shield,
  Users,
  Key,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useNotification } from "../contexts/NotificationContext";
import { authAPI } from "../utils/api";

const AuthPage = () => {
  const [currentView, setCurrentView] = useState("login"); // login, forgot-password, reset-password
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    resetToken: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useUser();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      showToast("Please fill in all fields", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        // Store token and user data
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        login(response.data.user);
        showToast("Login successful! Welcome back.", "success");

        // Check for pending invitation
        const pendingInvitation = localStorage.getItem("pendingInvitation");
        if (pendingInvitation) {
          localStorage.removeItem("pendingInvitation");
          navigate(`/invite/${pendingInvitation}`);
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      showToast("Please enter your email address", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(formData.email);

      if (response.data.success) {
        showToast(response.data.message, "success");
        // Store reset token for demo purposes
        if (response.data.resetToken) {
          localStorage.setItem("resetToken", response.data.resetToken);
        }
        setCurrentView("reset-password");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      const message =
        error.response?.data?.message ||
        "Failed to send reset instructions. Please try again.";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!formData.password || !formData.confirmPassword) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (formData.password.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    setLoading(true);

    try {
      const resetToken = localStorage.getItem("resetToken");

      const response = await authAPI.resetPassword(
        resetToken,
        formData.password
      );

      if (response.data.success) {
        showToast(response.data.message, "success");
        localStorage.removeItem("resetToken");
        setCurrentView("login");
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          resetToken: "",
        });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      const message =
        error.response?.data?.message ||
        "Failed to reset password. Please try again.";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    if (role === "admin") {
      setFormData({
        email: "administrator@bright-digital.de",
        password: "admin123",
      });
    } else {
      setFormData({
        email: "member@pms.com",
        password: "member123",
      });
    }
  };

  const renderLoginForm = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <form onSubmit={handleLogin} className="space-y-6">
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <button
            type="button"
            onClick={() => setCurrentView("forgot-password")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Forgot your password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>{loading ? "Signing in..." : "Sign In"}</span>
            </>
          )}
        </button>
      </form>

      {/* Demo Accounts */}
      {/* <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center mb-4">
          Try these demo accounts:
        </p>
        <div className="space-y-2">
          <button
            onClick={() => handleDemoLogin("admin")}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Admin Account</span>
          </button>
          <button
            onClick={() => handleDemoLogin("member")}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Member Account</span>
          </button>
        </div>
      </div> */}
    </div>
  );

  const renderForgotPasswordForm = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Forgot Password?
        </h2>
        <p className="text-gray-600">
          Enter your email address and we'll send you instructions to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-6">
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              <span>{loading ? "Sending..." : "Send Reset Instructions"}</span>
            </>
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setCurrentView("login")}
          className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </button>
      </div>
    </div>
  );

  const renderResetPasswordForm = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-6">
        <h4 className="text-xl font-bold text-gray-900 mb-2">
          Email is sent to your registered email address
        </h4>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {currentView === "login" && "Welcome Back"}
            {currentView === "forgot-password" && "Reset Password"}
            {currentView === "reset-password" && ""}
          </h1>
          <p className="text-gray-600">
            {currentView === "login" &&
              "Sign in to your project management account"}
            {currentView === "forgot-password" &&
              "We'll help you get back into your account"}
            {currentView === "reset-password" && ""}
          </p>
        </div>

        {/* Forms */}
        {currentView === "login" && renderLoginForm()}
        {currentView === "forgot-password" && renderForgotPasswordForm()}
        {currentView === "reset-password" && renderResetPasswordForm()}

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">Project Management System</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

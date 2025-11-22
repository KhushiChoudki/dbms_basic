import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    if (!token) {
      navigate("/");
    } else {
      setAccessToken(token);
    }
  }, [navigate]);

  const handleReset = async () => {
    setError("");
    setMessage("");
    if (!accessToken) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    // update password. The user is authenticated by token in the hash
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }
  };

  if (!accessToken) return null; // or a loader

  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-indigo-600 text-center">Reset Password</h2>
      <input
        type="password"
        placeholder="New password"
        className="w-full p-3 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <input
        type="password"
        placeholder="Confirm new password"
        className="w-full p-3 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
      />
      <button
        onClick={handleReset}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-3 rounded-md transition"
      >
        Reset Password
      </button>
      {error && <p className="mt-4 text-red-600 text-center">{error}</p>}
      {message && <p className="mt-4 text-green-600 text-center">{message}</p>}
    </div>
  );
}

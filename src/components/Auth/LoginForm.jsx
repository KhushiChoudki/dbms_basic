import { useState } from "react";
import { supabase } from "../../utils/supabaseClient";

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    setError("");
    setMessage("");
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    else onLogin(data.user);
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");
    if (!email) {
      setError("Please enter your email address to reset password.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    if (error) setError(error.message);
    else setMessage("Password reset email sent! Please check your inbox.");
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-indigo-600 text-center">Log In</h2>
      <input
        type="email"
        placeholder="Email"
        className="w-full p-3 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-3 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button
        onClick={handleLogin}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-3 rounded-md transition"
      >
        Sign In
      </button>
      <p
        onClick={handleForgotPassword}
        className="mt-4 text-indigo-600 cursor-pointer text-center underline"
      >
        Forgot Password?
      </p>
      {error && <p className="mt-4 text-red-600 text-center">{error}</p>}
      {message && <p className="mt-4 text-green-600 text-center">{message}</p>}
    </div>
  );
}

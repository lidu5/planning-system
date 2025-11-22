import type { FormEvent } from 'react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/moa planinig logo.png'; // Update if needed

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center px-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

        {/* =============== LEFT SIDE =============== */}
        <div className="flex flex-col items-start text-left space-y-5">

          {/* Circular Logo */}
          <img
            src={logo}
            alt="MoA Logo"
            className="w-28 h-28 object-cover rounded-full border-4 border-white shadow-lg"
          />
             <h2 className="text-xl font-bold text-gray-700">
            Beyond Production!{' '}
            <span className="text-green-700">ከማምረት በላይ!</span>
          </h2>
          <h1 className="text-3xl font-extrabold text-gray-800 leading-snug">
            Welcome to the Ministry of Agriculture  
            <span className="block text-green-700">
              Planning and Performance Management System
            </span>
          </h1>

         

          <p className="text-gray-600 text-lg leading-relaxed max-w-xl">
            The Ministry of Agriculture (MoA) Planning and Performance System
            is a digital platform designed to enhance coordination, transparency,
            and effectiveness of agricultural planning across all sectors,
            departments, and regional structures.
          </p>
        </div>

        {/* =============== RIGHT SIDE — LOGIN FORM =============== */}
        <div className="w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
            Sign in to your account
          </h2>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 text-center mb-3">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 shadow-sm 
                           focus:outline-none focus:ring-2 focus:ring-green-500 
                           focus:border-green-500"
                placeholder="Enter your username"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 shadow-sm 
                           focus:outline-none focus:ring-2 focus:ring-green-500 
                           focus:border-green-500"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white font-medium rounded-lg py-2 
                         hover:bg-green-800 transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

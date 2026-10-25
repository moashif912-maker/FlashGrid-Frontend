import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const redirectTo = location.state?.from || "/";

  if (isLoggedIn) return <Navigate to={redirectTo} replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();

    if (!/^\d+$/.test(trimmed) || Number(trimmed) < 1) {
      setError("Enter a valid numeric User ID (1 or greater).");
      return;
    }
    const id = Number(trimmed);
    if (!Number.isSafeInteger(id)) {
      setError("That number is too large.");
      return;
    }

    login(id);
    toast.success(`Signed in as User ${id}`);
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-sm flex-col justify-center">
      <div className="mb-8 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-zinc-900 text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-900">
          Sign in to FlashGrid
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Enter your User ID to continue. No password required.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card p-6">
        <label htmlFor="userId" className="block text-sm font-medium text-zinc-700">
          User ID
        </label>
        <input
          id="userId"
          type="text"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
          placeholder="e.g. 101"
          aria-invalid={Boolean(error)}
          className={`input mt-1.5 ${error ? "input-error" : ""}`}
        />
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

        <button type="submit" className="btn-primary mt-5 w-full">
          Continue
        </button>
      </form>
    </div>
  );
}
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Sales", end: true },
  { to: "/orders", label: "My Orders" },
  { to: "/admin", label: "Admin" },
  { to: "/stress-test", label: "Stress Test" },
];

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? "bg-zinc-100 text-zinc-900"
      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
  }`;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-900 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">FlashGrid</span>
    </Link>
  );
}

export default function Navbar() {
  const { userId, isLoggedIn, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setOpen(false);
    toast.success("Signed out");
    navigate("/login");
  };

  const userChip = (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-3 text-sm text-zinc-700">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
        U
      </span>
      <span className="font-medium">User {userId}</span>
    </span>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <>
              {userChip}
              <button onClick={handleLogout} className="btn-secondary !py-1.5">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary !py-1.5">
              Sign in
            </Link>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="space-y-1 border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `block ${linkClass({ isActive })}`}
            >
              {l.label}
            </NavLink>
          ))}
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            {isLoggedIn ? (
              <>
                {userChip}
                <button onClick={handleLogout} className="btn-secondary !py-1.5">
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="btn-primary !py-1.5">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
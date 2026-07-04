import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="border-b border-gray-800 bg-gray-950">
      <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between h-14">
        <Link to="/" className="text-white font-bold text-lg tracking-tight">
          Quiz<span className="text-indigo-400">Forge</span>
        </Link>
        <div className="flex gap-1">
          <NavLink to="/" active={pathname === '/'}>
            Novo Simulado
          </NavLink>
          <NavLink to="/history" active={pathname === '/history'}>
            Histórico
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
        active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-900'
      }`}
    >
      {children}
    </Link>
  );
}

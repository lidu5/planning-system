import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user, logout } = useAuth();
  const role = (user?.role || '').toUpperCase();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="w-full bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Planning & Performance Platform</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">{user?.username}</span>
            <button onClick={logout} className="px-3 py-2 bg-gray-800 text-white rounded">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-gray-700 mb-6">Welcome{user ? `, ${user.username}` : ''}. Choose an action below.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {user?.is_superuser && (
            <Link to="/users" className="block rounded-lg border bg-white p-5 hover:shadow">
              <div className="text-lg font-semibold mb-1">Users</div>
              <div className="text-sm text-gray-600">Manage users, roles, sector/department.</div>
            </Link>
          )}
          {user?.is_superuser && (
            <>
              <Link to="/sectors" className="block rounded-lg border bg-white p-5 hover:shadow">
                <div className="text-lg font-semibold mb-1">Sectors</div>
                <div className="text-sm text-gray-600">Manage State Minister Sectors.</div>
              </Link>
              <Link to="/departments" className="block rounded-lg border bg-white p-5 hover:shadow">
                <div className="text-lg font-semibold mb-1">Departments</div>
                <div className="text-sm text-gray-600">Manage Departments within sectors.</div>
              </Link>
              <Link to="/indicators" className="block rounded-lg border bg-white p-5 hover:shadow">
                <div className="text-lg font-semibold mb-1">Indicators</div>
                <div className="text-sm text-gray-600">Manage Indicators per department.</div>
              </Link>
              <Link to="/annual-plans" className="block rounded-lg border bg-white p-5 hover:shadow">
                <div className="text-lg font-semibold mb-1">Annual Plans</div>
                <div className="text-sm text-gray-600">Create annual targets per indicator.</div>
              </Link>
              <Link to="/entry-periods" className="block rounded-lg border bg-white p-5 hover:shadow">
                <div className="text-lg font-semibold mb-1">Entry Periods</div>
                <div className="text-sm text-gray-600">Manage breakdown and quarterly performance windows.</div>
              </Link>
            </>
          )}
          <Link to="/quarterly-breakdowns" className="block rounded-lg border bg-white p-5 hover:shadow">
            <div className="text-lg font-semibold mb-1">Quarterly Breakdown</div>
            <div className="text-sm text-gray-600">Distribute annual targets across quarters.</div>
          </Link>
          <Link to="/performances" className="block rounded-lg border bg-white p-5 hover:shadow">
            <div className="text-lg font-semibold mb-1">Quarterly Performance</div>
            <div className="text-sm text-gray-600">Report quarterly performance with files.</div>
          </Link>
          {role === 'STATE_MINISTER' && (
            <Link to="/reviews" className="block rounded-lg border bg-white p-5 hover:shadow">
              <div className="text-lg font-semibold mb-1">Reviews & Approvals</div>
              <div className="text-sm text-gray-600">Review and approve submitted items.</div>
            </Link>
          )}
          {role === 'STRATEGIC_STAFF' && (
            <Link to="/validations" className="block rounded-lg border bg-white p-5 hover:shadow">
              <div className="text-lg font-semibold mb-1">Validations</div>
              <div className="text-sm text-gray-600">Validate or reject approved items.</div>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

import { Link, Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '220px',
          background: '#f4f4f4',
          padding: '1rem',
          borderRight: '1px solid #ddd',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          Admin Dashboard
        </h2>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/admin/projects">Projects</Link>
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

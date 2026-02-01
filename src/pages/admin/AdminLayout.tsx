import { Outlet } from "react-router-dom";
import AppHeader from "../../components/AppHeader";

export function AdminLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Global App Header */}
      <AppHeader homePath="/admin/projects" />

      {/* Body */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 220,
            background: "#f8f9fa",
            padding: "1rem",
            borderRight: "1px solid #dee2e6",
          }}
        >
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <a href="/admin/projects">Projects</a>
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "1.5rem" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

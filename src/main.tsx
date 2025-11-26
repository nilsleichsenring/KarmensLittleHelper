import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes.tsx";


import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="light">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);

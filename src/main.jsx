import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SentinelRS from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SentinelRS />
  </StrictMode>
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/sentinela-ui.css";
import SentinelaRS from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SentinelaRS />
  </StrictMode>
);

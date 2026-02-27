"use client"
import { useEffect } from "react";

export default function MonetagSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Monetag SW registrado"))
        .catch(err => console.log("Error SW:", err));
    }
  }, []);

  return null;
}

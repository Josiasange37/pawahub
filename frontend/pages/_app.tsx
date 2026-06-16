import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import "../styles/globals.css";
import { ToastContainer } from "../components/Toast";

const Layout = dynamic(() => import("../components/Layout"), { ssr: false });

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <Layout>
      <Component {...pageProps} />
      <ToastContainer />
    </Layout>
  );
}

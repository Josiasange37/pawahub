import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import "../styles/globals.css";
import { ToastContainer } from "../components/Toast";

const Layout = dynamic(() => import("../components/Layout"), { ssr: false });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
      <ToastContainer />
    </Layout>
  );
}

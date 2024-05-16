import React from "react";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto p-5">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;

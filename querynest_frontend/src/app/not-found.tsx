"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-6xl font-extrabold text-indigo-600 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Page Not Found
      </h2>
      <p className="text-gray-600 mb-8">
        Oops! The page you are looking for doesn’t exist or has been moved.
      </p>
      <Link href="/">
        <Button className="text-lg" size="lg">
            Go Back Home
        </Button>
      </Link>
    </main>
  );
};

export default NotFound;

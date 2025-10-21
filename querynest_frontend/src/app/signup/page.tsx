"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaGoogle } from "react-icons/fa";
import Navbar from "@/components/other/Navbar";
import Footer from "@/components/other/Footer";

const Signup = () => {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Signups are currently disabled.");
  }

  return (
    <div>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Start your AI knowledge hub journey instantly
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {/* Email Sign Up */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  required
                  disabled
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                  disabled
                />
              </div>
              <Button type="submit" variant="default" size="lg" className="w-full" disabled>
                Sign Up
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm text-gray-500">
                <span className="bg-gray-50 px-2">Or continue with</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <Button
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              disabled
            >
              <FaGoogle /> Sign up with Google
            </Button>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Login
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Signup;

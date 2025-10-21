"use client";

import React from "react";
import Link from "next/link";
import { FaBars, FaTimes } from "react-icons/fa";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md flex items-center justify-center bg-indigo-600 text-white font-bold">
            QN
          </div>
          <span className="text-lg font-semibold">QueryNest</span>
        </Link>

        {/* Desktop: only action */}
        <div className="hidden md:flex items-center">
          <Link href="/signup">
            <Button>Sign up</Button>
          </Link>
        </div>

        {/* Mobile: sheet with just the action */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="inline-flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <FaBars className="h-5 w-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-72 p-6 flex flex-col h-full justify-between"
            >
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md flex items-center justify-center bg-indigo-600 text-white font-bold">
                        QN
                      </div>
                      <span className="text-lg font-semibold">QueryNest</span>
                    </div>
                  </SheetTitle>

                  <SheetClose asChild>
                    <button
                      aria-label="Close menu"
                      className="inline-flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <FaTimes className="h-5 w-5" />
                    </button>
                  </SheetClose>
                </div>
              </SheetHeader>

              <div className="mt-8">
                <Link href="/signup">
                  <Button className="w-full">Sign up</Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

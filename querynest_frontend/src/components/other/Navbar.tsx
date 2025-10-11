"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#integrations", label: "Integrations" },
  ];

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

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-medium hover:text-indigo-600 ${
                pathname === link.href ? "underline" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/signup">
            <Button className="ml-2">Sign up</Button>
          </Link>
        </nav>

        {/* Mobile nav */}
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
              {/* Header */}
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
                  <SheetClose asChild />
                </div>
              </SheetHeader>

              {/* Links */}
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-lg font-medium px-2 py-2 rounded hover:bg-gray-100"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/signup" className="mt-4">
                  <Button className="w-full">Sign up</Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

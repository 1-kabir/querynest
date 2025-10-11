"use client";

import React from "react";
import Link from "next/link";
import { FaTwitter, FaGithub, FaLinkedin, FaEnvelope } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Brand */}
        <div className="md:col-span-4">
          <Link href="/" className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-md flex items-center justify-center bg-indigo-600 text-white font-bold">
              QN
            </div>
            <div>
              <h3 className="text-lg font-semibold">QueryNest</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Instantly search, understand, and connect all your knowledge—personal or professional—powered by AI.
              </p>
            </div>
          </Link>

          <div className="mt-6 flex items-center gap-3 text-gray-500">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-gray-900">
              <FaGithub />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-gray-900">
              <FaTwitter />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-gray-900">
              <FaLinkedin />
            </a>
          </div>
        </div>

        {/* Product Links */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-semibold mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/features" className="hover:underline">Features</Link></li>
            <li><Link href="/insights" className="hover:underline">Insight Mode</Link></li>
            <li><Link href="/integrations" className="hover:underline">Integrations</Link></li>
            <li><Link href="/pricing" className="hover:underline">Pricing</Link></li>
          </ul>
        </div>

        {/* Resources Links */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-semibold mb-3">Resources</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/docs" className="hover:underline">Docs</Link></li>
            <li><Link href="/blog" className="hover:underline">Blog</Link></li>
            <li><Link href="/support" className="hover:underline">Support</Link></li>
            <li><Link href="/api" className="hover:underline">API</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="md:col-span-4">
          <h4 className="text-sm font-semibold mb-2">Contact</h4>
          <a
            href="mailto:hello@querynest.ai"
            className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-2"
          >
            <FaEnvelope /> hello@querynest.ai
          </a>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} QueryNest — Built for fast knowledge retrieval.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/status" className="hover:underline">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

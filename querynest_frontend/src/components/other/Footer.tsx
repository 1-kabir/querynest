import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between text-sm text-gray-600">
        <p>© {new Date().getFullYear()} QueryNest</p>
        <nav className="flex gap-4">
          <Link href="/">Terms</Link>
          <Link href="/">Privacy</Link>
          <Link href="/">Status</Link>
        </nav>
      </div>
    </footer>
  );
}

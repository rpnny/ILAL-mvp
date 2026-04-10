import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Nav />
      <main className="flex-grow flex items-center justify-center px-6">
        <div className="text-center">
          <div className="font-heading text-8xl font-bold text-gradient-cyan mb-4">404</div>
          <h1 className="text-2xl font-bold mb-3">Page Not Found</h1>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link href="/" className="glass-button glass-button-primary px-8 py-3 inline-flex items-center text-sm">
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

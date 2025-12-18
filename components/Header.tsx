import Link from 'next/link';
import { LogoutButton } from './LogoutButton';

export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tighter text-white">
          LHR<span className="text-red-600">e</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            About
          </Link>
          <Link href="/teams" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            Teams
          </Link>
          <Link href="/contact" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

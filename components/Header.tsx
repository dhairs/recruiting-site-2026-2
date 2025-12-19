import Link from 'next/link';
import { LogoutButton } from './LogoutButton';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { getUser } from '@/lib/firebase/users';
import { UserRole } from '@/lib/models/User';

export default async function Header() {
  let logoHref = "/";

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (sessionCookie) {
      const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
      const user = await getUser(decodedToken.uid);
      
      if (user && user.role === UserRole.ADMIN) {
        logoHref = "/admin/dashboard";
      }
    }
  } catch (error) {
    // If verification fails, just default to home
  }

  return (
    <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={logoHref} className="text-xl font-bold tracking-tighter text-white">
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

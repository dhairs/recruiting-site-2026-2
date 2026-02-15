import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black py-12">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Logo" width={50} height={50} />
                    <span className="text-sm text-neutral-500">
                        © {new Date().getFullYear()} Longhorn Racing, Dhairya Gupta
                    </span>
                </div>

                <div className="flex gap-6">
                    <Link href="https://www.instagram.com/longhornracing/" className="text-neutral-500 hover:text-white transition-colors">
                        Instagram
                    </Link>
                    <Link href="https://www.linkedin.com/company/longhorn-racing/" className="text-neutral-500 hover:text-white transition-colors">
                        LinkedIn
                    </Link>
                </div>
            </div>
        </footer>
    );
}

import {ClipboardList, Database, PlusSquare} from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline sm:inline-block">Qualistitch Inc.</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/">
              <PlusSquare className="mr-2" />
              New Order
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/records">
              <Database className="mr-2" />
              View Records
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

'use client';
import { Header } from '@/components/header';

export default function ChatPage() {
  return (
    <Header>
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-lg text-muted-foreground">
            The chat feature is now available in the collapsible panel on the left side of your screen.
        </p>
      </div>
    </Header>
  );
}

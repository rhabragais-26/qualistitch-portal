import {Header} from '@/components/header';
import {LeadForm} from '@/components/lead-form';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 w-full flex items-start md:items-center justify-center p-4 sm:p-6 lg:p-8">
        <LeadForm />
      </main>
    </div>
  );
}

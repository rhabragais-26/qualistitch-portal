
'use client';
import { Header } from '@/components/header';
import { AccountSettingsForm } from '@/components/account-settings-form';

export default function AccountSettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header>
        <div className="flex justify-center p-4 sm:p-6 lg:p-8">
          <AccountSettingsForm />
        </div>
      </Header>
    </div>
  );
}

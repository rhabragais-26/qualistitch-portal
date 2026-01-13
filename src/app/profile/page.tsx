'use client';
import { Header } from '@/components/header';
import { ProfileForm } from '@/components/profile-form';

export default function ProfilePage() {
  return (
    <Header>
      <div className="flex justify-center items-center p-4 sm:p-6 lg:p-8">
        <ProfileForm />
      </div>
    </Header>
  );
}

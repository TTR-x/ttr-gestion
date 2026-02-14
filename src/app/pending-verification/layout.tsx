import React from 'react';

export default function PendingVerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <main className="w-full max-w-5xl py-8">{children}</main>
    </div>
  );
}

import { UserButton, SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function AuthHeader() {
  return (
    <header className="w-full flex justify-end items-center gap-4 p-4 border-b bg-white dark:bg-zinc-900">
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal" />
        <SignUpButton mode="modal" />
      </SignedOut>
    </header>
  );
}

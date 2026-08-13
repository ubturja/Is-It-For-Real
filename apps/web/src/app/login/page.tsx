import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: {
    next?: string;
    error?: string;
  };
};

function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/train";
  }
  return next;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = safeNextPath(searchParams.next);
  const initialError =
    searchParams.error === "auth"
      ? "Authentication failed. Try again."
      : null;

  return (
    <main className="mx-auto flex max-w-5xl justify-center px-4 py-12">
      <LoginForm nextPath={nextPath} initialError={initialError} />
    </main>
  );
}

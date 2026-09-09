"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-1">
        <label htmlFor="email" className="text-body font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-control border border-input px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-body font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          minLength={8}
          className="w-full rounded-control border border-input px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {state.error ? <p className="text-body text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-control bg-primary-600 px-4 py-2 text-body font-medium text-white transition-opacity disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

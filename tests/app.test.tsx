import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";
import type { AuthClient } from "../src/data/auth";

const client: AuthClient = {
  async getSession() { return { userId: "u1", accessToken: "token", expiresAt: Date.now() + 60_000 }; },
  async signIn() { return { userId: "u1", accessToken: "token", expiresAt: Date.now() + 60_000 }; },
  async signUp() { return { session: null, confirmationRequired: true }; },
  async signOut() {},
};

describe("HabitForge shell", () => {
  it("renders branded dashboard and navigates to the shared tracker route", async () => {
    render(<App client={client} />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Build your edge." })).toBeInTheDocument());
    expect(screen.getByText("HabitForge")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Daily tracker" }));

    expect(screen.getByRole("heading", { name: "Keep the chain alive." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all complete" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark all complete" }));
    expect(screen.getByLabelText("3 of 3 complete")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("HabitForge shell", () => {
  it("renders branded dashboard and navigates to the shared tracker route", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Build your edge." })).toBeInTheDocument();
    expect(screen.getByText("HabitForge")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Daily tracker" }));

    expect(screen.getByRole("heading", { name: "Keep the chain alive." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all complete" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark all complete" }));
    expect(screen.getByLabelText("3 of 3 complete")).toBeInTheDocument();
  });
});

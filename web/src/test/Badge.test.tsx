import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "../components/ui/Badge";

describe("StatusBadge", () => {
  it("renders 'Disponível' for available", () => {
    render(<StatusBadge status="available" />);
    expect(screen.getByText("Disponível")).toBeTruthy();
  });

  it("renders 'Alocado' for allocated", () => {
    render(<StatusBadge status="allocated" />);
    expect(screen.getByText("Alocado")).toBeTruthy();
  });

  it("renders 'Manutenção' for maintenance", () => {
    render(<StatusBadge status="maintenance" />);
    expect(screen.getByText("Manutenção")).toBeTruthy();
  });

  it("renders 'Descartado' for disposed", () => {
    render(<StatusBadge status="disposed" />);
    expect(screen.getByText("Descartado")).toBeTruthy();
  });
});

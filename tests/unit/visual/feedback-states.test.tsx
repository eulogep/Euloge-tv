import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineScreen } from "@/components/feedback/OfflineScreen";

describe("system feedback states", () => {
  it("identifies an empty state consistently", () => {
    render(<EmptyState title="Aucun résultat" description="Modifiez les filtres." />);
    expect(screen.getByText("Aucun résultat").closest("[data-system-state]")).toHaveAttribute(
      "data-system-state",
      "empty",
    );
  });

  it("exposes the offline state accessibly", () => {
    render(<OfflineScreen />);
    expect(screen.getByRole("status")).toHaveAttribute("data-system-state", "offline");
    expect(screen.getByRole("heading", { name: "Hors ligne" })).toBeVisible();
  });
});

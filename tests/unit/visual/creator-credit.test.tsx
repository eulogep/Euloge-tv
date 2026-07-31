import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreatorCredit } from "@/components/creator/CreatorCredit";

describe("CreatorCredit", () => {
  it("presents the creator, role, copyright and accessible portrait", () => {
    render(<CreatorCredit />);

    expect(screen.getByRole("heading", { name: "Euloge Mabiala" })).toBeVisible();
    expect(screen.getByText("Conception, développement et direction du projet MJTV")).toBeVisible();
    expect(screen.getByText("© 2026 Euloge Mabiala — Tous droits réservés")).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Portrait d’Euloge Mabiala, créateur de MJTV",
      }),
    ).toHaveAttribute("src", expect.stringContaining("euloge-mabiala.webp"));
  });

  it("shows an accessible initials fallback when the portrait cannot load", () => {
    render(<CreatorCredit />);

    fireEvent.error(
      screen.getByRole("img", {
        name: "Portrait d’Euloge Mabiala, créateur de MJTV",
      }),
    );

    expect(screen.getByTestId("creator-image-fallback")).toHaveTextContent("EM");
    expect(screen.getByTestId("creator-image-fallback")).toHaveAccessibleName(
      "Portrait d’Euloge Mabiala, créateur de MJTV",
    );
  });
});

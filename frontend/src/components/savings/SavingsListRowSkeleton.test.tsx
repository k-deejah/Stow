import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SavingsListRowSkeleton, {
  SavingsListSkeleton,
} from "./SavingsListRowSkeleton";

describe("SavingsListRowSkeleton", () => {
  it("renders a status placeholder", () => {
    render(<SavingsListRowSkeleton />);

    expect(screen.getByRole("status", { name: /loading item/i })).toBeInTheDocument();
  });

  it("applies the animate-pulse class", () => {
    render(<SavingsListRowSkeleton />);

    expect(screen.getByRole("status")).toHaveClass("animate-pulse");
  });
});

describe("SavingsListSkeleton", () => {
  it("renders the default number of rows", () => {
    render(<SavingsListSkeleton />);

    expect(screen.getAllByRole("status", { name: /loading item/i })).toHaveLength(4);
  });

  it("renders a custom number of rows", () => {
    render(<SavingsListSkeleton rows={2} />);

    expect(screen.getAllByRole("status", { name: /loading item/i })).toHaveLength(2);
  });
});

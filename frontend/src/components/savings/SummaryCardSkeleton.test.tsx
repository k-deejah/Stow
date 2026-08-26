import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SummaryCardSkeleton from "./SummaryCardSkeleton";

describe("SummaryCardSkeleton", () => {
  it("renders a status placeholder", () => {
    render(<SummaryCardSkeleton />);

    expect(screen.getByRole("status", { name: /loading summary/i })).toBeInTheDocument();
  });

  it("applies the animate-pulse class", () => {
    render(<SummaryCardSkeleton />);

    expect(screen.getByRole("status")).toHaveClass("animate-pulse");
  });

  it("merges a custom className", () => {
    render(<SummaryCardSkeleton className="col-span-2" />);

    expect(screen.getByRole("status")).toHaveClass("col-span-2");
  });
});

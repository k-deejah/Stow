import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import NewGroupPage from "./page";
import { apiFetch } from "@/lib/api";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, apiFetch: jest.fn() };
});

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("NewGroupPage", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it("renders a form to create a group", () => {
    render(<NewGroupPage />);

    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create group/i }),
    ).toBeInTheDocument();
  });

  it("routes to the group detail page on a successful submit", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ on_chain_id: "group-123", name: "Rent Split" }),
    } as Response);

    render(<NewGroupPage />);

    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: "Rent Split" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/savings/groups/group-123");
    });
  });

  it("shows an error and does not navigate when creation fails", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "Name already in use" }),
    } as Response);

    render(<NewGroupPage />);

    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: "Rent Split" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Name already in use",
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});

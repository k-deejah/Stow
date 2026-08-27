import { render, screen, waitFor } from "@testing-library/react";
import GroupDetailPage from "./page";
import { apiFetch } from "@/lib/api";

jest.mock("@/lib/api");

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function renderPage(id = "group-1") {
  return render(<GroupDetailPage params={Promise.resolve({ id })} />);
}

describe("GroupDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders members, balance, and status from a mocked response", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        on_chain_id: "group-1",
        name: "Rent Split",
        balance: "50000000",
        settled: false,
        members: [
          { address: "GALICE", contributed: "25000000" },
          { address: "GBOB", contributed: "25000000" },
        ],
      }),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Rent Split")).toBeInTheDocument();
    });
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("5 XLM")).toBeInTheDocument();
    expect(screen.getByText("GALICE")).toBeInTheDocument();
    expect(screen.getByText("GBOB")).toBeInTheDocument();
  });

  it("shows a closed badge for a settled group", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        on_chain_id: "group-1",
        name: "Rent Split",
        balance: "0",
        settled: true,
        members: [],
      }),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });
    expect(screen.getByText("No members yet.")).toBeInTheDocument();
  });

  it("handles not-found gracefully", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    renderPage("missing-group");

    await waitFor(() => {
      expect(screen.getByText("Group not found")).toBeInTheDocument();
    });
  });

  it("shows an error state with a retry option on failure", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });
});

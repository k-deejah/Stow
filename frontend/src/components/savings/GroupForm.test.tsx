import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GroupForm from "./GroupForm";
import { apiFetch } from "@/lib/api";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, apiFetch: jest.fn() };
});

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("GroupForm", () => {
  const onCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables the submit button until a name is entered", () => {
    render(<GroupForm onCreated={onCreated} />);

    expect(screen.getByRole("button", { name: /create group/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: "Rent Split" },
    });

    expect(screen.getByRole("button", { name: /create group/i })).not.toBeDisabled();
  });

  it("calls onCreated with the new group's on-chain id on success", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ on_chain_id: "group-123", name: "Rent Split" }),
    } as Response);

    render(<GroupForm onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: "Rent Split" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith("group-123");
    });
  });

  it("does not call onCreated and shows an error message on failure", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "Name already in use" }),
    } as Response);

    render(<GroupForm onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: "Rent Split" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Name already in use");
    });
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("does not submit for a whitespace-only name", () => {
    render(<GroupForm onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: /create group/i }));

    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

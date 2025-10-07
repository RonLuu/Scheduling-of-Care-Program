import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import LogIn from "../../components/login/LogIn";
import { AuthContext } from "../../components/dashboard/auth/authContext";

// Mock fetch to prevent actual API calls during tests
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock navigation hook
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper with auth context
const TestWrapper = ({ children, authValue = null }) => {
  const defaultAuth = {
    me: null,
    setMe: vi.fn(),
    isReady: true,
  };

  return (
    <MemoryRouter initialEntries={["/login"]}>
      <AuthContext.Provider value={authValue || defaultAuth}>
        {children}
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe("LogIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    global.fetch.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Unit test: component renders with correct elements
  it("renders login form with all required elements", () => {
    const { container } = render(
      <TestWrapper>
        <LogIn />
      </TestWrapper>
    );

    // Check for main heading
    expect(screen.getByText("Member Login")).toBeInTheDocument();

    // Check for registration prompt
    expect(screen.getByText("Not a member yet?")).toBeInTheDocument();

    // Check for form inputs using container to avoid duplicates
    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();

    const inputs = within(form).getAllByRole("textbox");
    expect(inputs).toHaveLength(1); // Email input only

    const passwordInput = within(form).getByPlaceholderText("Password");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");

    // Check for buttons
    const loginButton = within(form).getByRole("button", { name: /Login/i });
    expect(loginButton).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Register/i })).toBeInTheDocument();
  });

  // Unit test: register button links to correct route
  it("Register button links to /registeruser", () => {
    const { container } = render(
      <TestWrapper>
        <LogIn />
      </TestWrapper>
    );

    const registerLink = container.querySelector('a[href="/registeruser"]');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/registeruser");
  });

  // Integration test: form submission with valid credentials
  it("handles successful login", async () => {
    const user = userEvent.setup();
    const mockSetMe = vi.fn();

    // Mock successful API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          session: { jwt: "fake-jwt-token", expiresIn: 3600 },
          user: { id: 1, name: "Test User", email: "test@example.com" },
        }),
    });

    const { container } = render(
      <TestWrapper authValue={{ me: null, setMe: mockSetMe, isReady: true }}>
        <LogIn />
      </TestWrapper>
    );

    const form = container.querySelector("form");
    const emailInput = within(form).getByPlaceholderText("Email");
    const passwordInput = within(form).getByPlaceholderText("Password");
    const loginButton = within(form).getByRole("button", { name: /^Login$/i });

    // Fill in the form
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    // Submit the form
    await user.click(loginButton);

    // Verify API was called with correct data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });
    });

    // Verify localStorage was updated
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "jwt",
        "fake-jwt-token"
      );
    });

    // Verify navigation to profile
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/profile");
    });

    // Verify setMe was called with user data
    await waitFor(() => {
      expect(mockSetMe).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: "Test User",
          email: "test@example.com",
        })
      );
    });
  });

  // Integration test: form submission with invalid credentials
  it("displays error message on failed login", async () => {
    const user = userEvent.setup();

    // Mock failed API response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Invalid email or password" }),
    });

    const { container } = render(
      <TestWrapper>
        <LogIn />
      </TestWrapper>
    );

    const form = container.querySelector("form");
    const emailInput = within(form).getByPlaceholderText("Email");
    const passwordInput = within(form).getByPlaceholderText("Password");
    const loginButton = within(form).getByRole("button", { name: /^Login$/i });

    // Fill in the form with invalid credentials
    await user.type(emailInput, "wrong@example.com");
    await user.type(passwordInput, "wrongpassword");

    // Submit the form
    await user.click(loginButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(
        screen.getByText("Invalid email or password")
      ).toBeInTheDocument();
    });

    // Verify no navigation occurred
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Integration test: network error handling
  it("handles network errors gracefully", async () => {
    const user = userEvent.setup();

    // Mock network error
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    const { container } = render(
      <TestWrapper>
        <LogIn />
      </TestWrapper>
    );

    const form = container.querySelector("form");
    const emailInput = within(form).getByPlaceholderText("Email");
    const passwordInput = within(form).getByPlaceholderText("Password");
    const loginButton = within(form).getByRole("button", { name: /^Login$/i });

    // Fill in the form
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    // Submit the form
    await user.click(loginButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(
        screen.getByText("Incorrect email or password. Please try again")
      ).toBeInTheDocument();
    });

    // Verify no navigation occurred
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Unit test: loading state during submission
  it("shows loading state during form submission", async () => {
    const user = userEvent.setup();

    // Mock a delayed response
    let resolvePromise;
    const delayedPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    global.fetch.mockReturnValueOnce(delayedPromise);

    const { container } = render(
      <TestWrapper>
        <LogIn />
      </TestWrapper>
    );

    const form = container.querySelector("form");
    const emailInput = within(form).getByPlaceholderText("Email");
    const passwordInput = within(form).getByPlaceholderText("Password");
    const loginButton = within(form).getByRole("button", { name: /^Login$/i });

    // Fill in the form
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    // Submit the form
    await user.click(loginButton);

    // Check for loading state
    const loadingButton = within(form).getByRole("button");
    expect(loadingButton).toHaveTextContent("Logging in…");
    expect(loadingButton).toBeDisabled();

    // Resolve the promise to clean up
    resolvePromise({
      ok: true,
      json: () => Promise.resolve({
        session: { jwt: "token", expiresIn: 3600 },
        user: { id: 1 },
      }),
    });
  });

  // Unit test: form inputs update correctly
  it("updates input values when user types", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <LogIn />
      </TestWrapper>
    );

    const form = container.querySelector("form");
    const emailInput = within(form).getByPlaceholderText("Email");
    const passwordInput = within(form).getByPlaceholderText("Password");

    // Type in email input
    await user.type(emailInput, "test@example.com");
    expect(emailInput).toHaveValue("test@example.com");

    // Type in password input
    await user.type(passwordInput, "mypassword");
    expect(passwordInput).toHaveValue("mypassword");
  });

  // Unit test: password input is masked
  it("masks password input", () => {
    const { container } = render(
      <TestWrapper>
        <LogIn />
      </TestWrapper>
    );

    const form = container.querySelector("form");
    const passwordInput = within(form).getByPlaceholderText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
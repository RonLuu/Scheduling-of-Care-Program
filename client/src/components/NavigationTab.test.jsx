import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import NavigationTab from "./NavigationTab";
import { AuthContext } from "./dashboard/auth/authContext";

// Create a test AuthProvider that matches the structure expected by useAuth
const TestAuthProvider = ({ children }) => {
  const authValue = {
    me: { name: "Test User", role: "Admin" },
    setMe: vi.fn(),
    isReady: true,
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock pages for routing tests
const MockProfilePage = () => <div>Profile Page</div>;
const MockAccessPage = () => <div>Access Page</div>;
const MockClientsPage = () => <div>Clients Page</div>;
const MockShiftPage = () => <div>Shift Allocation Page</div>;
const MockSubElementsPage = () => <div>Sub-elements Page</div>;
const MockTasksPage = () => <div>Tasks Page</div>;
const MockBudgetPage = () => <div>Budget Reports Page</div>;
const MockFAQPage = () => <div>FAQ Page</div>;

// Mock fetch to not have actual API calls during tests
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ user: null }),
  })
);

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

const TestWrapper = ({ children, initialEntries = ["/"] }) => (
  <TestAuthProvider>
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/faq" element={<MockFAQPage />} />
        <Route path="/profile" element={<MockProfilePage />} />
        <Route path="/access" element={<MockAccessPage />} />
        <Route path="/clients" element={<MockClientsPage />} />
        <Route path="/shift-allocation" element={<MockShiftPage />} />
        <Route path="/sub-elements" element={<MockSubElementsPage />} />
        <Route path="/tasks" element={<MockTasksPage />} />
        <Route path="/budget-reports" element={<MockBudgetPage />} />
      </Routes>
      {children}
    </MemoryRouter>
  </TestAuthProvider>
);

describe("NavigationTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Unit test: check if hamburger menu button renders
  it("renders hamburger menu button", () => {
    render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = document.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveClass("navigationtab-button-menu", "off");
  });

  // Unit test: navigation panel is initially hidden
  it("initially hides navigation panel", () => {
    render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const panel = document.querySelector(".navigationtab-panel");
    expect(panel).toHaveClass("navigationtab-panel", "off");
  });

  // Interaction test: menu button toggles navigation panel
  it("toggles navigation panel when menu button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = document.querySelector(".navigationtab-button-menu");

    // Click to open
    await user.click(menuButton);

    await waitFor(() => {
      expect(menuButton).toHaveClass("navigationtab-button-menu", "on");
    });

    // Check if navigation links are visible when panel is open
    expect(screen.getByText("FAQ")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Access")).toBeInTheDocument();

    // Click to close
    await user.click(menuButton);

    await waitFor(() => {
      expect(menuButton).toHaveClass("navigationtab-button-menu", "off");
    });
  });

  // Unit test: all navigation links are present when menu is open
  it("displays all navigation links when panel is open", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    await user.click(document.querySelector(".navigationtab-button-menu"));

    // Check for all expected navigation items
    expect(screen.getByText("FAQ")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Access")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Shift Allocation")).toBeInTheDocument();
    expect(screen.getByText("Sub-elements")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Budget Reports")).toBeInTheDocument();
    expect(screen.getByText("Log Out")).toBeInTheDocument();
  });

  // Navigation test: FAQ link navigates correctly
  it("navigates to FAQ page when FAQ link is clicked", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    // Get the first and only menu button in the container
    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    // Open the navigation panel first
    await user.click(menuButton);

    // Look for the navigation wrapper with "on" class
    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on") ||
                          container.querySelector("[class*='navigationtab-panel'][class*='on']");
      expect(panelElement).toBeInTheDocument();
    });

    // Look for FAQ text within our specific container
    await waitFor(() => {
      const faqText = container.querySelector('.navigationtab-link-wrapper a[href="/faq"]');
      expect(faqText).toBeInTheDocument();
    });

    const faqLink = container.querySelector('a[href="/faq"]');
    expect(faqLink).toHaveAttribute("href", "/faq");

    await user.click(faqLink);
    expect(screen.getByText("FAQ Page")).toBeInTheDocument();
  });

  // Navigation test: profile link navigates correctly
  it("navigates to Profile page when Profile link is clicked", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    // Open the navigation panel first
    await user.click(menuButton);

    // Wait for panel to have "on" class
    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on");
      expect(panelElement).toBeInTheDocument();
    });

    // Wait for panel to open and links to be available
    await waitFor(() => {
      const profileText = container.querySelector('.navigationtab-link-wrapper a[href="/profile"]');
      expect(profileText).toBeInTheDocument();
    });

    const profileLink = container.querySelector('a[href="/profile"]');
    expect(profileLink).toHaveAttribute("href", "/profile");

    await user.click(profileLink);
    expect(screen.getByText("Profile Page")).toBeInTheDocument();
  });

  // Navigation test: access link navigates correctly
  it("navigates to Access page when Access link is clicked", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    await user.click(menuButton);

    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on");
      expect(panelElement).toBeInTheDocument();
    });

    // Wait for panel to open and links to be available
    await waitFor(() => {
      const accessText = container.querySelector('.navigationtab-link-wrapper a[href="/access"]');
      expect(accessText).toBeInTheDocument();
    });

    const accessLink = container.querySelector('a[href="/access"]');
    expect(accessLink).toHaveAttribute("href", "/access");

    await user.click(accessLink);
    expect(screen.getByText("Access Page")).toBeInTheDocument();
  });

  // Navigation test: clients link navigates correctly
  it("navigates to Clients page when Clients link is clicked", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    await user.click(menuButton);

    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on");
      expect(panelElement).toBeInTheDocument();
    });

    await waitFor(() => {
      const clientsText = container.querySelector('.navigationtab-link-wrapper a[href="/clients"]');
      expect(clientsText).toBeInTheDocument();
    });

    const clientsLink = container.querySelector('a[href="/clients"]');
    expect(clientsLink).toHaveAttribute("href", "/clients");

    await user.click(clientsLink);
    expect(screen.getByText("Clients Page")).toBeInTheDocument();
  });

  // Navigation test: shift Allocation link navigates correctly
  it("navigates to Shift Allocation page when Shift Allocation link is clicked", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    await user.click(menuButton);

    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on");
      expect(panelElement).toBeInTheDocument();
    });

    await waitFor(() => {
      const shiftText = container.querySelector('.navigationtab-link-wrapper a[href="/shift-allocation"]');
      expect(shiftText).toBeInTheDocument();
    });

    const shiftLink = container.querySelector('a[href="/shift-allocation"]');
    expect(shiftLink).toHaveAttribute("href", "/shift-allocation");

    await user.click(shiftLink);
    expect(screen.getByText("Shift Allocation Page")).toBeInTheDocument();
  });

  // Navigation test: sub-elements link navigates correctly
  it("navigates to Sub-elements page when Sub-elements link is clicked", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    await user.click(menuButton);

    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on");
      expect(panelElement).toBeInTheDocument();
    });

    await waitFor(() => {
      const subElementsText = container.querySelector('.navigationtab-link-wrapper a[href="/sub-elements"]');
      expect(subElementsText).toBeInTheDocument();
    });

    const subElementsLink = container.querySelector('a[href="/sub-elements"]');
    expect(subElementsLink).toHaveAttribute("href", "/sub-elements");

    await user.click(subElementsLink);
    expect(screen.getByText("Sub-elements Page")).toBeInTheDocument();
  });

  // Navigation test: tasks link navigates correctly
  it("navigates to Tasks page when Tasks link is clicked", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    await user.click(menuButton);

    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on");
      expect(panelElement).toBeInTheDocument();
    });

    await waitFor(() => {
      const tasksText = container.querySelector('.navigationtab-link-wrapper a[href="/tasks"]');
      expect(tasksText).toBeInTheDocument();
    });

    const tasksLink = container.querySelector('a[href="/tasks"]');
    expect(tasksLink).toHaveAttribute("href", "/tasks");

    await user.click(tasksLink);
    expect(screen.getByText("Tasks Page")).toBeInTheDocument();
  });

  // Navigation test: budget Reports link navigates correctly
  it("navigates to Budget Reports page when Budget Reports link is clicked", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    await user.click(menuButton);

    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on");
      expect(panelElement).toBeInTheDocument();
    });

    await waitFor(() => {
      const budgetText = container.querySelector('.navigationtab-link-wrapper a[href="/budget-reports"]');
      expect(budgetText).toBeInTheDocument();
    });

    const budgetLink = container.querySelector('a[href="/budget-reports"]');
    expect(budgetLink).toHaveAttribute("href", "/budget-reports");

    await user.click(budgetLink);
    expect(screen.getByText("Budget Reports Page")).toBeInTheDocument();
  });


  // Functionality test: logout button clears localStorage and navigates
  it("handles logout correctly", async () => {
    const user = userEvent.setup();
    localStorageMock.getItem.mockReturnValue("fake-jwt-token");

    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toBeInTheDocument();

    await user.click(menuButton);

    await waitFor(() => {
      const panelElement = container.querySelector(".navigationtab-panel.on");
      expect(panelElement).toBeInTheDocument();
    });

    await waitFor(() => {
      const logoutElement = container.querySelector('.navigationtab-link-wrapper button');
      expect(logoutElement).toBeInTheDocument();
    });

    const logoutButton = container.querySelector('.navigationtab-link-wrapper button');
    await user.click(logoutButton);

    expect(localStorageMock.removeItem).toHaveBeenCalledWith("jwt");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  // Accessibility test: Menu button has proper ARIA attributes
  it("has accessible menu button", () => {
    const { container } = render(
      <TestWrapper>
        <NavigationTab />
      </TestWrapper>
    );

    const menuButton = container.querySelector(".navigationtab-button-menu");
    expect(menuButton).toHaveAttribute("type", "button");
  });


});
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest"

import Welcome from "./Welcome";
import RegisterUser from "../register/RegisterUser";
import LogIn from "../login/LogIn";
import Dashboard from "../dashboard/Dashboard";


describe("Welcome", () => {
    // Render paths before hand
    render(
        <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/registeruser" element={<RegisterUser />} />
                <Route path="/login" element={<LogIn />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </MemoryRouter>
    );

    // Unit test: if the page contains two buttons
    it("Render to have two options", async () => {

        expect(screen.getByText("Login")).toBeInTheDocument()
        expect(screen.getByText("Register")).toBeInTheDocument()
    });

    // Unit test: if the register link is correct
    it("Register button links to /registeruser", () => {
        const registerLink = screen.getByRole("link", { name: /Register/i });
        expect(registerLink).toHaveAttribute("href", "/registeruser");
    });


    // Unit test: if the login link is correct
    it("Register button links to /login", () => {
        const registerLink = screen.getByRole("link", { name: /Login/i });
        expect(registerLink).toHaveAttribute("href", "/login");
    });

    // System test: if the register link leads to the right URL
    it("Render to the register page on click", async () => {
        const button = screen.getByRole("button", { name: /Register/i });
        await userEvent.click(button);
        expect(screen.getByText("Register User")).toBeInTheDocument();
    })
})

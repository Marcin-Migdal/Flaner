import { v4 as uuidv4 } from "uuid";

describe("Auth pages", () => {
    before(() => {
        cy.visit("http://localhost:8080");
        cy.wait(250);
        cy.signOut();
    });

    it("Can sign in", () => {
        cy.signIn("authRequest", { email: "morti132@vp.pl", password: "morti132" });

        cy.signOut("@authRequest");
    });

    it("Can sign up", () => {
        cy.signUp("authRequest", {
            userName: uuidv4().slice(0, 16),
            email: uuidv4().slice(0, 16) + "@example.com",
            password: "password123",
        });

        cy.signOut("@authRequest");
    });

    it("Can change page from sign in to sign up and backwards", () => {
        cy.visit("http://localhost:8080");

        cy.btnClick("go-to-sign-up-btn");
        cy.getBySelector("sign-up-description").should("be.visible").and("contain", "Please sign up to continue");

        cy.btnClick("go-to-sign-in-btn");
        cy.getBySelector("sign-in-description").should("be.visible").and("contain", "Please sign in to continue");
    });
});

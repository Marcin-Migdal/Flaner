/// <reference types="cypress" />

import { v4 as uuidv4 } from "uuid";

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//

Cypress.Commands.add("getBySelector", (selector: string) => {
    return cy.get(`[data-cy=${selector}]`);
});

Cypress.Commands.add("getBySelectorAndType", (selector: string, text: string) => {
    return cy.get(`[data-cy=${selector}]`).type(text);
});

Cypress.Commands.add("btnClick", (selector: string) => {
    return cy.get(`[data-cy=${selector}]`).click();
});

Cypress.Commands.add("signIn", (selector: string, credentials: { email: string; password: string }) => {
    cy.visit("http://localhost:8080");

    cy.getBySelector("sign-in-description").should("be.visible").and("contain", "Please sign in to continue");

    cy.getBySelectorAndType("email-input", credentials.email);
    cy.getBySelectorAndType("password-input", credentials.password);

    cy.intercept("POST", "**/accounts:lookup*").as(selector);

    cy.btnClick("sign-in-submit-btn");

    cy.wait(`@${selector}`).its("response.statusCode").should("eq", 200);
});

Cypress.Commands.add("signUp", (selector: string, credentials: { userName: string; email: string; password: string }) => {
    cy.visit("http://localhost:8080");

    cy.btnClick("go-to-sign-up-btn");

    cy.getBySelector("sign-up-description").should("be.visible").and("contain", "Please sign up to continue");

    cy.getBySelectorAndType("userName-input", credentials.userName);
    cy.getBySelectorAndType("email-input", credentials.email);
    cy.getBySelectorAndType("password-input", credentials.password);
    cy.getBySelectorAndType("validate-password-input", credentials.password);

    cy.intercept("POST", "**/accounts:signUp*").as(selector);

    cy.btnClick("sign-up-submit-btn");

    cy.wait(`@${selector}`).its("response.statusCode").should("eq", 200);
});

Cypress.Commands.add("signOut", (selector?: string) => {
    if (selector)
        cy.get(selector)
            .its("response.statusCode")
            .should("eq", 200)
            .then(() => cy.btnClick("sign-out-btn"));
    else
        cy.url().then((url) => {
            if (url !== "http://localhost:8080/sign-in" && url !== "http://localhost:8080/sign-up") {
                cy.btnClick("sign-out-btn");
            }
        });

    cy.url().should("eq", "http://localhost:8080/sign-in");
});

declare global {
    namespace Cypress {
        interface Chainable {
            getBySelector(selector: string): Chainable<JQuery<HTMLElement>>;
            getBySelectorAndType(selector: string, text: string): Chainable<JQuery<HTMLElement>>;
            btnClick(selector: string): Chainable<JQuery<HTMLElement>>;
            signIn(selector: string, credentials: { email: string; password: string }): Chainable<void>;
            signUp(selector: string, credentials: { userName: string; email: string; password: string }): Chainable<void>;
            signOut(selector?: string): Chainable<void>;
        }
    }
}

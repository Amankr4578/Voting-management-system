# Voting Management System

This is a complete frontend Voting Management System built with HTML, CSS, and JavaScript.

## Features

- Voter registration with validation
- Login and logout
- Role-based dashboard
- Admin election management
- Candidate list setup per election
- Open/close election controls
- One vote per voter per election
- Live result view and winner summary
- Persistent browser storage via localStorage

## Demo Accounts

- Admin:
	- Email: admin@vms.local
	- Password: admin123

You can also register new voter accounts from the registration page.

## Project Pages

- Home page.html: Landing page with app stats
- Registration.html: Voter registration
- Login in.html: Login page
- Voting.html: Role-based voting dashboard (admin/voter)
- About site.html: About and system overview

## Tech Stack

- HTML
- CSS
- JavaScript (vanilla)

## Data Model (Browser localStorage)

- vms_users
- vms_elections
- vms_votes
- vms_session

## Notes

- This project is frontend-only and intended for learning/demo use.
- For production use, add backend authentication, encrypted storage, server-side vote validation, and audit logging.

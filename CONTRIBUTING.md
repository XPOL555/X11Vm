# Contributing to X11Vm

First off, thank you for taking the time to contribute to **X11Vm**! 

We welcome contributions of all kinds: bug reports, feature requests, documentation improvements, and code changes (pull requests).

Please take a moment to review the guidelines below before you get started.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, welcoming, and collaborative environment.

---

## How to Contribute

### 1. Reporting Bugs & Feature Requests
If you encounter any issues or have ideas for new features:
- Search the [existing issues](https://github.com/XPOL555/X11Vm/issues) to see if someone else has already reported or suggested it.
- If not, feel free to open a new issue.
- Please provide as much context as possible, including:
  - Your host Operating System (Windows, macOS, Linux).
  - Version of Docker, Xpra, and Tauri (if running from source).
  - Clear steps to reproduce the issue.
  - Screenshots or log outputs if applicable.

### 2. Contributing Code Changes
If you'd like to fix a bug or add a new feature yourself, please follow these steps:

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/X11Vm.git
   cd X11Vm
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/your-bugfix-name
   ```
4. **Develop and Test**:
   - Make your changes.
   - Run the development environment to verify that everything works as expected:
     ```bash
     bun tauri dev   # or npm run tauri dev
     ```
   - Before committing, run the same checks CI runs on every push/PR:
     ```bash
     cd src-tauri
     cargo fmt --check
     cargo clippy --all-targets
     cargo test
     cd ..
     bun run build   # typechecks and builds the frontend
     ```
   - Ensure your code follows the existing style and is clean.
5. **Commit your changes**: Write clear, descriptive commit messages.
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Submit a Pull Request (PR)**:
   - Open a pull request against the `main` branch of the official [X11Vm repository](https://github.com/XPOL555/X11Vm).
   - Describe the changes you made, what they fix or add, and any context that could help reviewers.

---

## Development Environment Setup

X11Vm is built using:
- **Tauri** (Rust backend)
- **Vite + Vanilla TypeScript + Tailwind CSS** (Frontend interface)
- **Docker** (Application container)

To contribute to the frontend or Rust code:
1. Make sure you have **Rust** installed (via `rustup`).
2. Install **Node.js** or **Bun**.
3. Install the Tauri CLI: `cargo install tauri-cli` (or run via package scripts).
4. For details on running locally, see the [README](README.md).

Thank you for your help in making X11Vm better!

# X11Vm

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**X11Vm** is a Tauri-based application that manages and runs Dockerized X11 environments, providing a seamless graphical application integration on host desktops. 

Inspired by **[XQuartz](https://www.xquartz.org/)**—which brings seamless X11 server integration to macOS—**X11Vm** aims to provide a similarly native, rootless window experience for containerized X11 applications on modern host operating systems (Windows, macOS, and Linux) by combining **Tauri**, **Docker**, and **Xpra**.

The official repository is hosted at [github.com/XPOL555/X11Vm](https://github.com/XPOL555/X11Vm).

---

## Demo

https://github.com/XPOL555/X11Vm/raw/main/docs/example.mp4

---

## How It Works

X11Vm acts as a control center that orchestrates a containerized X11 server:

1. **Docker Backend**: Launches a lightweight Ubuntu container running an X11 virtual frame buffer and an **Xpra** server. By default, the container starts a session with **XEmacs**.
2. **Tauri Control Center**: A lightweight desktop app that lets you build the Docker image, start/stop the container, monitor its status, and launch additional graphical tools (like `xterm`).
3. **Xpra Integration**: Attaches the host-native Xpra client to the containerized X11 session. Instead of running a heavy virtual desktop environment, X11 windows are forwarded and rendered **rootlessly** as native, independent windows on your host OS desktop, just like XQuartz does.

---

## Features

- **One-Click Setup**: Build and run the pre-configured Docker image directly from the desktop UI.
- **Rootless Windows**: X11 applications (like XEmacs or xterm) behave like native host applications, complete with window resizing, dragging, and keyboard shortcuts.
- **Persistent Storage**: Automatically mounts a host folder (`~/.x11vm`) to the container (`/home/x11vm/.x11vm`) so your project files, edits, and configurations are preserved.
- **Cross-Platform**: Built with Tauri, supporting Windows, macOS, and Linux hosts.

---

## Prerequisites

Before running X11Vm, ensure you have the following installed on your host system:

1. **Docker**: Must be installed and running on your host machine.
2. **Xpra**: The host client is required to attach to the container's display.
   - **Windows**: Download and install from the [Xpra website](https://xpra.org/).
   - **macOS**: Install via Homebrew: `brew install xpra`
   - **Linux**: Install via your package manager (e.g., `sudo apt install xpra`).

---

## Getting Started

### Developing / Running from Source

If you want to run or build the application from source:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/XPOL555/X11Vm.git
   cd X11Vm
   ```

2. **Install frontend dependencies**:
   Using `bun`:
   ```bash
   bun install
   ```
   Or using `npm`:
   ```bash
   npm install
   ```

3. **Run the application in Development Mode**:
   Using `bun`:
   ```bash
   bun tauri dev
   ```
   Or using `npm`:
   ```bash
   npm run tauri dev
   ```

4. **Build the production bundle**:
   Using `bun`:
   ```bash
   bun tauri build
   ```
   Or using `npm`:
   ```bash
   npm run tauri build
   ```

---

## Usage Guide

1. **Build Base Image**: Click `1. Build Base Image` to compile the Docker image containing Ubuntu, Xpra, and XEmacs.
2. **Start Environment**: Once built, click `2. Start Environment` to spin up the background container.
3. **Attach Application**: 
   - Click `3. XEmacs` to run Xpra attach and see XEmacs render on your desktop.
   - Click `4. Xterm` to spawn a new shell terminal within the container environment.
4. **Stop Environment**: Press `Stop Environment` to safely terminate the container.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";

let indicatorEl: HTMLElement | null;
let statusTextEl: HTMLElement | null;

let btnBuild: HTMLButtonElement | null;
let btnStart: HTMLButtonElement | null;
let btnAttach: HTMLButtonElement | null;
let btnXemacs: HTMLButtonElement | null;
let btnTerminal: HTMLButtonElement | null;
let btnXterm: HTMLButtonElement | null;
let btnStop: HTMLButtonElement | null;

let term: Terminal;
let fitAddon: FitAddon;

function logMessage(msg: string) {
  term.writeln(msg);
}

async function checkStatus() {
  try {
    const isImageBuilt: boolean = await invoke("docker_image_status");
    const isRunning: boolean = await invoke("docker_status");
    updateUI(isImageBuilt, isRunning);
  } catch (e) {
    logMessage(`Status check failed: ${e}`);
    updateUI(false, false);
  }
}

function updateUI(isImageBuilt: boolean, isRunning: boolean) {
  if (!indicatorEl || !statusTextEl || !btnBuild || !btnStart || !btnAttach || !btnStop || !btnXterm || !btnTerminal || !btnXemacs) return;

  const buildIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
  const startIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  const restartIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>`;

  if (isRunning) {
    indicatorEl.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
    statusTextEl.textContent = "Running";
    
    btnBuild.disabled = false;
    btnBuild.innerHTML = `${buildIcon} Re-build Image`;
    
    btnStart.disabled = false;
    btnStart.innerHTML = `${restartIcon} Restart Env`;

    btnAttach.disabled = false;
    btnXemacs.disabled = false;
    btnTerminal.disabled = false;
    btnXterm.disabled = false;
    btnStop.disabled = false;
  } else if (isImageBuilt) {
    indicatorEl.className = "w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
    statusTextEl.textContent = "Stopped";
    
    btnBuild.disabled = false;
    btnBuild.innerHTML = `${buildIcon} Re-build Image`;

    btnStart.disabled = false;
    btnStart.innerHTML = `${startIcon} Start Env`;

    btnAttach.disabled = true;
    btnXemacs.disabled = true;
    btnTerminal.disabled = true;
    btnXterm.disabled = true;
    btnStop.disabled = true;
  } else {
    indicatorEl.className = "w-2 h-2 rounded-full bg-gray-400";
    statusTextEl.textContent = "Not Built";
    
    btnBuild.disabled = false;
    btnBuild.innerHTML = `${buildIcon} Build Image`;

    btnStart.disabled = true;
    btnAttach.disabled = true;
    btnXemacs.disabled = true;
    btnTerminal.disabled = true;
    btnXterm.disabled = true;
    btnStop.disabled = true;
  }
}

async function onBuild() {
  if (!btnBuild) return;
  btnBuild.disabled = true;
  term.clear();
  logMessage("Building Docker image... (this may take a few minutes)");
  
  const unlisten = await listen<string>("build-log", (event) => {
    logMessage(event.payload);
  });

  try {
    const res = await invoke("docker_build");
    logMessage(`\n${res}`);
    await checkStatus();
  } catch (e) {
    logMessage(`\nBuild Error:\n${e}`);
    btnBuild.disabled = false;
  } finally {
    unlisten();
  }
}

async function onStart() {
  if (!btnStart) return;
  btnStart.disabled = true;
  logMessage("Starting environment...");
  
  try {
    await invoke("docker_stop").catch(() => {});
    const res = await invoke("docker_run");
    logMessage(`Started container: ${res}`);
    await checkStatus();
  } catch (e) {
    logMessage(`Start Error:\n${e}`);
    btnStart.disabled = false;
  }
}

async function onAttach() {
  if (!btnAttach) return;
  logMessage("Attaching Xpra client to display windows natively...");
  
  try {
    await invoke("xpra_attach");
    logMessage("Xpra attached successfully.");
  } catch (e) {
    logMessage(`Attach Error (Do you have Xpra installed on the host?):\n${e}`);
  }
}

async function onXemacs() {
  if (!btnXemacs) return;
  logMessage("Opening new XEmacs window...");
  
  try {
    await invoke("open_xemacs");
    logMessage("XEmacs process spawned in container.");
  } catch (e) {
    logMessage(`XEmacs Error:\n${e}`);
  }
}

async function onTerminal() {
  if (!btnTerminal) return;
  logMessage("Opening new Terminal window (xfce4)...");
  
  try {
    await invoke("open_terminal");
    logMessage("Terminal process spawned in container.");
  } catch (e) {
    logMessage(`Terminal Error:\n${e}`);
  }
}

async function onXterm() {
  if (!btnXterm) return;
  logMessage("Opening new Xterm window (legacy)...");
  
  try {
    await invoke("open_xterm");
    logMessage("Xterm process spawned in container.");
  } catch (e) {
    logMessage(`Xterm Error:\n${e}`);
  }
}

async function onStop() {
  if (!btnStop) return;
  btnStop.disabled = true;
  logMessage("Stopping environment...");
  
  try {
    const res = await invoke("docker_stop");
    logMessage(`Stopped container: ${res}`);
    await checkStatus();
  } catch (e) {
    logMessage(`Stop Error:\n${e}`);
    btnStop.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  indicatorEl = document.getElementById("status-indicator");
  statusTextEl = document.getElementById("status-text");

  btnBuild = document.getElementById("btn-build") as HTMLButtonElement;
  btnStart = document.getElementById("btn-start") as HTMLButtonElement;
  btnAttach = document.getElementById("btn-attach") as HTMLButtonElement;
  btnXemacs = document.getElementById("btn-xemacs") as HTMLButtonElement;
  btnTerminal = document.getElementById("btn-terminal") as HTMLButtonElement;
  btnXterm = document.getElementById("btn-xterm") as HTMLButtonElement;
  btnStop = document.getElementById("btn-stop") as HTMLButtonElement;

  btnBuild?.addEventListener("click", onBuild);
  btnStart?.addEventListener("click", onStart);
  btnAttach?.addEventListener("click", onAttach);
  btnXemacs?.addEventListener("click", onXemacs);
  btnTerminal?.addEventListener("click", onTerminal);
  btnXterm?.addEventListener("click", onXterm);
  btnStop?.addEventListener("click", onStop);

  // Initialize xterm.js
  const terminalContainer = document.getElementById("terminal-container");
  if (terminalContainer) {
    term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      cursorBlink: true,
      disableStdin: true,
      convertEol: true,
    });
    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainer);
    fitAddon.fit();
    
    // Auto-resize on window resize
    window.addEventListener("resize", () => {
      fitAddon.fit();
    });

    term.writeln("Welcome to X11Vm Terminal.");
    term.writeln("System is initializing...");
  }

  // Initial status check
  checkStatus();
});

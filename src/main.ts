import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { initI18n, t, translateDOM } from "./i18n";

let indicatorEl: HTMLElement | null;
let statusTextEl: HTMLElement | null;

let btnBuild: HTMLButtonElement | null;
let btnStart: HTMLButtonElement | null;
let btnAttach: HTMLButtonElement | null;
let btnXemacs: HTMLButtonElement | null;
let btnTerminal: HTMLButtonElement | null;
let btnXterm: HTMLButtonElement | null;
let btnStop: HTMLButtonElement | null;

// Settings UI elements
let btnSettings: HTMLButtonElement | null;
let btnCloseSettings: HTMLButtonElement | null;
let btnCancelSettings: HTMLButtonElement | null;
let btnSaveSettings: HTMLButtonElement | null;
let btnAddMapping: HTMLButtonElement | null;
let btnBrowseHost: HTMLButtonElement | null;
let btnCopyHost: HTMLButtonElement | null;
let settingsModal: HTMLElement | null;
let settingsContent: HTMLElement | null;
let mappingsList: HTMLElement | null;
let inputHostPath: HTMLInputElement | null;
let inputContainerPath: HTMLInputElement | null;
let selectLanguage: HTMLSelectElement | null;
let settingsError: HTMLElement | null;

let tabBtnGeneral: HTMLElement | null;
let tabBtnDisplay: HTMLElement | null;
let tabGeneral: HTMLElement | null;
let tabDisplay: HTMLElement | null;
let btnCheckXpra: HTMLButtonElement | null;
let xpraStatusBox: HTMLElement | null;
let xpraStatusIcon: HTMLElement | null;
let xpraStatusText: HTMLElement | null;
let inputXpraDpi: HTMLInputElement | null;

let isDisplayAttached = false;
let isStopping = false;

let term: Terminal;
let fitAddon: FitAddon;

// Onboarding & Xterm UI
let onboardingModal: HTMLElement | null;
let btnCloseOnboarding: HTMLButtonElement | null;

let xtermPresetsContainer: HTMLElement | null;
let btnAddXtermPreset: HTMLButtonElement | null;
let xtermModal: HTMLElement | null;
let btnCloseXtermModal: HTMLButtonElement | null;
let btnCancelXterm: HTMLButtonElement | null;
let btnSaveXterm: HTMLButtonElement | null;
let inputXtermId: HTMLInputElement | null;
let inputXtermName: HTMLInputElement | null;
let inputXtermFlags: HTMLInputElement | null;
let xtermHelpers: NodeListOf<HTMLElement>;

interface XtermPreset {
  id: string;
  name: string;
  flags: string;
}

// State
let isRunningState = false;
let currentLanguage = "en";
let currentMappings: Array<{host_path: string, container_path: string}> = [];
let currentXtermPresets: Array<XtermPreset> = [];
let currentXpraDpi: number = 0;

const C_RESET = "\x1b[0m";
const C_RED = "\x1b[31m";
const C_GREEN = "\x1b[32m";
const C_YELLOW = "\x1b[33m";
const C_BLUE = "\x1b[34m";
const C_GRAY = "\x1b[90m";

function logMessage(msg: string, color: string = "") {
  if (color) {
    term.writeln(`${color}${msg}${C_RESET}`);
  } else {
    term.writeln(msg);
  }
}

async function checkStatus() {
  try {
    const isImageBuilt: boolean = await invoke("docker_image_status");
    const isRunning: boolean = await invoke("docker_status");
    isRunningState = isRunning;
    updateUI(isImageBuilt, isRunning);
  } catch (e) {
    logMessage(`${t("ui.status.checking")} failed: ${e}`, C_RED);
    updateUI(false, false);
  }
}

function updateUI(isImageBuilt: boolean, isRunning: boolean) {
  if (!indicatorEl || !statusTextEl || !btnBuild || !btnStart || !btnAttach || !btnStop || !btnTerminal || !btnXemacs) return;

  const buildIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
  const startIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  const restartIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>`;

  if (isRunning) {
    indicatorEl.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
    statusTextEl.textContent = t("ui.status.running");
    
    btnBuild.disabled = false;
    btnBuild.innerHTML = `${buildIcon} <span data-i18n="ui.engine.rebuild">${t("ui.engine.rebuild")}</span>`;
    
    btnStart.disabled = false;
    btnStart.innerHTML = `${restartIcon} <span data-i18n="ui.engine.restart">${t("ui.engine.restart")}</span>`;

    btnAttach.disabled = false;
    
    // Enable apps ONLY if attached
    btnXemacs.disabled = !isDisplayAttached;
    btnTerminal.disabled = !isDisplayAttached;
    if (btnXterm) btnXterm.disabled = !isDisplayAttached;
    enableXtermPresets(isDisplayAttached);
    
    btnStop.disabled = false;
  } else {
    // Se non è in running, assicuriamoci che l'attach cada
    isDisplayAttached = false;
    
    if (isImageBuilt) {
      indicatorEl.className = "w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
      statusTextEl.textContent = t("ui.status.stopped");
      
      btnBuild.disabled = false;
      btnBuild.innerHTML = `${buildIcon} <span data-i18n="ui.engine.rebuild">${t("ui.engine.rebuild")}</span>`;

      btnStart.disabled = false;
      btnStart.innerHTML = `${startIcon} <span data-i18n="ui.engine.start">${t("ui.engine.start")}</span>`;

      btnAttach.disabled = true;
      btnXemacs.disabled = true;
      btnTerminal.disabled = true;
      if (btnXterm) btnXterm.disabled = true;
      btnStop.disabled = true;
      enableXtermPresets(false);
    } else {
      indicatorEl.className = "w-2 h-2 rounded-full bg-gray-400";
      statusTextEl.textContent = t("ui.status.not_built");
      
      btnBuild.disabled = false;
      btnBuild.innerHTML = `${buildIcon} <span data-i18n="ui.engine.build">${t("ui.engine.build")}</span>`;

      btnStart.disabled = true;
      btnAttach.disabled = true;
      btnXemacs.disabled = true;
      btnTerminal.disabled = true;
      if (btnXterm) btnXterm.disabled = true;
      btnStop.disabled = true;
      enableXtermPresets(false);
    }
  }

  // Update btnAttach UI visually
  if (isDisplayAttached) {
    btnAttach.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span class="text-white font-semibold">Display Attached</span>`;
    btnAttach.className = "btn w-full py-2 flex items-center justify-center gap-2 mb-2 transition-colors bg-green-600 hover:bg-green-700 text-white shadow-md";
  } else if (!btnAttach.disabled) {
    btnAttach.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> <span data-i18n="ui.apps.attach">Attach Display</span>`;
    btnAttach.className = "btn btn-primary w-full py-2 flex items-center justify-center gap-2 mb-2";
  }
}

function enableXtermPresets(enabled: boolean) {
  if (!xtermPresetsContainer) return;
  const buttons = xtermPresetsContainer.querySelectorAll('button:not(.btn-delete-preset)');
  buttons.forEach(btn => {
    (btn as HTMLButtonElement).disabled = !enabled;
  });
}

// --- Action Handlers ---

async function onBuild() {
  if (!btnBuild) return;
  btnBuild.disabled = true;
  term.clear();
  logMessage(t("log.building"), C_BLUE);
  
  const unlisten = await listen<string>("build-log", (event) => {
    logMessage(event.payload, C_GRAY);
  });

  try {
    const res = await invoke("docker_build");
    logMessage(`\n${t("log.build_success")}\n${res}`, C_GREEN);
    await checkStatus();
  } catch (e) {
    logMessage(`\n${t("log.build_error", {error: e})}`, C_RED);
    btnBuild.disabled = false;
  } finally {
    unlisten();
  }
}

async function onStart() {
  if (!btnStart) return;
  btnStart.disabled = true;
  logMessage(t("log.starting"), C_BLUE);
  
  try {
    await invoke("docker_stop").catch(() => {});
    const res = await invoke("docker_run");
    logMessage(t("log.started", {msg: res}), C_GREEN);
    await checkStatus();
  } catch (e) {
    logMessage(t("log.start_error", {error: e}), C_RED);
    btnStart.disabled = false;
  }
}

async function onAttach() {
  if (!btnAttach) return;
  if (isDisplayAttached) return; // Prevent multiple attaches
  
  logMessage(t("log.attaching"), C_BLUE);
  
  // Show spinner immediately
  btnAttach.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> <span>Attaching...</span>`;
  btnAttach.disabled = true;

  // Setta ottimisticamente a true (dato che xpra attach blocca se ha successo)
  // Per gestire il caso in cui xpra crasha subito, aspettiamo un attimo prima di abilitare l'UI
  setTimeout(() => {
    isDisplayAttached = true;
    checkStatus();
    logMessage(t("log.attached"), C_GREEN);
  }, 1000);
  
  try {
    // Questo blocca l'esecuzione finché xpra attach non viene chiuso
    await invoke("xpra_attach", { dpi: currentXpraDpi });
    logMessage("Xpra detached successfully.", C_GRAY);
  } catch (e) {
    if (isStopping) {
      logMessage("Xpra detached (Environment stopped).", C_GRAY);
    } else {
      logMessage(t("log.attach_error", {error: e}), C_RED);
    }
  } finally {
    isDisplayAttached = false;
    checkStatus();
  }
}

async function onXemacs() {
  if (!btnXemacs) return;
  logMessage(t("log.open_xemacs"), C_BLUE);
  
  try {
    await invoke("open_xemacs");
    logMessage(t("log.opened_xemacs"), C_GREEN);
  } catch (e) {
    logMessage(t("log.err_xemacs", {error: e}), C_RED);
  }
}

async function onTerminal() {
  if (!btnTerminal) return;
  logMessage(t("log.open_term"), C_BLUE);
  
  try {
    await invoke("open_terminal");
    logMessage(t("log.opened_term"), C_GREEN);
  } catch (e) {
    logMessage(t("log.err_term", {error: e}), C_RED);
  }
}

async function onXterm() {
  if (!btnXterm) return;
  logMessage(t("log.open_xterm"), C_BLUE);
  
  try {
    await invoke("open_xterm", { flags: null });
    logMessage(t("log.opened_xterm"), C_GREEN);
  } catch (e) {
    logMessage(t("log.err_xterm", {error: e}), C_RED);
  }
}

async function onXtermPreset(flags: string, name: string) {
  logMessage(`${t("log.open_xterm")} (${name})...`, C_BLUE);
  try {
    await invoke("open_xterm", { flags });
    logMessage(t("log.opened_xterm"), C_GREEN);
  } catch (e) {
    logMessage(t("log.err_xterm", {error: e}), C_RED);
  }
}

async function onStop() {
  if (!btnStop) return;
  btnStop.disabled = true;
  isStopping = true;
  logMessage(t("log.stopping"), C_BLUE);
  
  try {
    const res = await invoke("docker_stop");
    logMessage(t("log.stopped", {msg: res}), C_GREEN);
    await checkStatus();
  } catch (e) {
    logMessage(t("log.stop_error", {error: e}), C_RED);
    btnStop.disabled = false;
  } finally {
    isStopping = false;
  }
}

// --- Settings Logic ---

function openSettings() {
  if (!settingsModal || !settingsContent) return;
  
  // Fetch current settings
  invoke("get_settings").then((settings: any) => {
    currentMappings = settings.mappings || [];
    renderMappings();
    
    settingsModal!.classList.remove("hidden");
    // Trigger reflow
    void settingsModal!.offsetWidth;
    settingsModal!.classList.remove("opacity-0");
    settingsContent!.classList.remove("scale-95");
    settingsContent!.classList.add("scale-100");
  });
}

function closeSettings() {
  if (!settingsModal || !settingsContent) return;
  if (inputHostPath) inputHostPath.value = "";
  if (inputContainerPath) inputContainerPath.value = "";
  if (settingsError) settingsError.classList.add("hidden");
  if (selectLanguage) selectLanguage.value = currentLanguage;
  if (inputXpraDpi) inputXpraDpi.value = currentXpraDpi.toString();
  renderMappings();
  settingsModal.classList.add("opacity-0");
  settingsContent.classList.remove("scale-100");
  settingsContent.classList.add("scale-95");
  
  setTimeout(() => {
    settingsModal!.classList.add("hidden");
    if (settingsError) settingsError.classList.add("hidden");
  }, 200);
}

function renderMappings() {
  if (!mappingsList) return;
  mappingsList.innerHTML = "";
  
  if (currentMappings.length === 0) {
    mappingsList.innerHTML = `<div class="text-xs text-gray-500 italic p-2">${t("ui.settings.mappings.empty")}</div>`;
    return;
  }
  
  currentMappings.forEach((mapping, index) => {
    const div = document.createElement("div");
    div.className = "flex items-center justify-between p-2 rounded bg-white dark:bg-[#2a2a2a] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]";
    div.innerHTML = `
      <div class="flex flex-col overflow-hidden mr-2">
        <span class="text-xs font-semibold truncate" title="${mapping.host_path}">Host: ${mapping.host_path}</span>
        <span class="text-[11px] text-gray-500 truncate" title="${mapping.container_path}">Container: ${mapping.container_path}</span>
      </div>
      <button class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors shrink-0 btn-remove-mapping" data-index="${index}">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    `;
    mappingsList!.appendChild(div);
  });

  // Attach event listeners for remove buttons
  const removeBtns = mappingsList.querySelectorAll(".btn-remove-mapping");
  removeBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt((e.currentTarget as HTMLButtonElement).getAttribute("data-index") || "0", 10);
      currentMappings.splice(idx, 1);
      renderMappings();
    });
  });
}

function onAddMapping() {
  if (!inputHostPath || !inputContainerPath) return;
  const hp = inputHostPath.value.trim();
  const cp = inputContainerPath.value.trim();
  
  if (!hp || !cp) {
    showSettingsError(t("err.host_path_required"));
    return;
  }
  
  currentMappings.push({ host_path: hp, container_path: cp });
  inputHostPath.value = "";
  inputContainerPath.value = "";
  hideSettingsError();
  renderMappings();
}

// --- Xterm Presets Handlers ---

function renderXtermPresets() {
  if (!xtermPresetsContainer) return;
  xtermPresetsContainer.innerHTML = "";

  currentXtermPresets.forEach((preset) => {
    const btnGroup = document.createElement("div");
    btnGroup.className = "flex overflow-hidden rounded shadow-sm border border-[#333] hover:border-[#555] transition-colors group relative";

    const btnLaunch = document.createElement("button");
    btnLaunch.className = "flex-1 px-2 py-1.5 text-xs font-semibold truncate transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
    btnLaunch.textContent = preset.name;
    btnLaunch.disabled = !isRunningState;
    btnLaunch.title = preset.flags || "No flags";

    // Extract colors via regex
    const bgMatch = preset.flags.match(/-bg\s+([^\s]+)/);
    const fgMatch = preset.flags.match(/-fg\s+([^\s]+)/);
    if (bgMatch) btnLaunch.style.backgroundColor = bgMatch[1];
    else btnLaunch.style.backgroundColor = "#222"; // default bg
    
    if (fgMatch) btnLaunch.style.color = fgMatch[1];
    else btnLaunch.style.color = "#eee"; // default text
    
    btnLaunch.addEventListener("click", () => onXtermPreset(preset.flags, preset.name));

    const btnDelete = document.createElement("button");
    btnDelete.className = "px-1.5 bg-[#1a1a1a] hover:bg-red-900/40 text-gray-400 hover:text-red-400 border-l border-[#333] transition-colors shrink-0 btn-delete-preset flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100";
    btnDelete.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    btnDelete.addEventListener("click", () => {
      currentXtermPresets = currentXtermPresets.filter(p => p.id !== preset.id);
      if (inputXpraDpi) {
        currentXpraDpi = parseInt(inputXpraDpi.value, 10) || 0;
      }
      
      saveCurrentSettings();
      renderXtermPresets();
    });

    btnGroup.appendChild(btnLaunch);
    btnGroup.appendChild(btnDelete);
    xtermPresetsContainer!.appendChild(btnGroup);
  });
}

function openXtermModal() {
  if (!xtermModal || !inputXtermName || !inputXtermFlags) return;
  inputXtermId!.value = "";
  inputXtermName.value = "";
  inputXtermFlags.value = "";
  xtermModal!.classList.remove("hidden");
  requestAnimationFrame(() => xtermModal!.classList.remove("opacity-0"));
  inputXtermName.focus();
}

function closeXtermModal() {
  if (!xtermModal) return;
  xtermModal!.classList.add("opacity-0");
  setTimeout(() => xtermModal!.classList.add("hidden"), 200);
}

function onSaveXtermPreset() {
  if (!inputXtermName || !inputXtermFlags) return;
  const name = inputXtermName.value.trim();
  const flags = inputXtermFlags.value.trim();
  if (!name) return;

  currentXtermPresets.push({
    id: Date.now().toString(),
    name,
    flags
  });
  saveCurrentSettings();
  renderXtermPresets();
  closeXtermModal();
}

function onHelperClick(e: MouseEvent) {
  if (!inputXtermFlags) return;
  const target = e.currentTarget as HTMLElement;
  const flag = target.getAttribute("data-flag");
  if (flag) {
    inputXtermFlags.value = (inputXtermFlags.value + " " + flag).trim();
    inputXtermFlags.focus();
  }
}

async function saveCurrentSettings() {
  try {
    await invoke("save_settings", { settings: { language: currentLanguage, first_run: false, mappings: currentMappings, xterm_presets: currentXtermPresets, xpra_dpi: currentXpraDpi } });
  } catch (e) {
    console.error("Failed to save settings auto", e);
  }
}

function showSettingsError(msg: string) {
  if (settingsError) {
    settingsError.textContent = msg;
    settingsError.classList.remove("hidden");
  }
}

function hideSettingsError() {
  if (settingsError) {
    settingsError.classList.add("hidden");
  }
}

async function onSaveSettings() {
  if (!btnSaveSettings || !selectLanguage) return;
  btnSaveSettings.disabled = true;
  
  // Create a localized HTML inside the button temporarily
  const originalHtml = btnSaveSettings.innerHTML;
  btnSaveSettings.innerHTML = `<span>${t("ui.settings.btn.saving")}</span>`;
  
  currentLanguage = selectLanguage.value;
  if (inputXpraDpi) {
    currentXpraDpi = parseInt(inputXpraDpi.value, 10) || 0;
  }
  
  try {
    await invoke("save_settings", { settings: { language: currentLanguage, first_run: false, mappings: currentMappings, xterm_presets: currentXtermPresets, xpra_dpi: currentXpraDpi } });
    closeSettings();
    logMessage(t("log.settings_saved"), C_GREEN);
    if (isRunningState) {
      logMessage(t("log.settings_restart"), C_YELLOW);
    }
    
    // Update language dynamically
    await initI18n(currentLanguage);
    translateDOM();
    checkStatus(); // Update icons/text of statuses
  } catch (e) {
    showSettingsError(String(e));
  } finally {
    btnSaveSettings.disabled = false;
    btnSaveSettings.innerHTML = originalHtml;
  }
}

async function onBrowseHost() {
  if (!inputHostPath) return;
  try {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      inputHostPath.value = Array.isArray(selected) ? selected[0] : selected;
    }
  } catch (e) {
    showSettingsError(t("err.folder_picker", {error: e}));
  }
}

function onCopyHost() {
  if (!inputHostPath || !inputContainerPath) return;
  const hp = inputHostPath.value.trim();
  if (hp) {
    // Generate valid Linux absolute path for container
    inputContainerPath.value = hp
      .replace(/\\/g, '/')
      .replace(/^([a-zA-Z]):/, (_match, p1) => '/' + p1.toLowerCase());
  }
}

function switchTab(tabId: "general" | "display") {
  if (!tabBtnGeneral || !tabBtnDisplay || !tabGeneral || !tabDisplay) return;
  
  if (tabId === "general") {
    tabBtnGeneral.className = "w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-gray-200 dark:bg-[#333] text-gray-900 dark:text-gray-100 transition-colors";
    tabBtnDisplay.className = "w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors";
    tabGeneral.classList.replace("hidden", "flex");
    tabDisplay.classList.replace("flex", "hidden");
  } else {
    tabBtnDisplay.className = "w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-gray-200 dark:bg-[#333] text-gray-900 dark:text-gray-100 transition-colors";
    tabBtnGeneral.className = "w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors";
    tabDisplay.classList.replace("hidden", "flex");
    tabGeneral.classList.replace("flex", "hidden");
    // Optionally trigger a check immediately on open
    doCheckXpra();
  }
}

async function doCheckXpra() {
  if (!btnCheckXpra || !xpraStatusBox || !xpraStatusIcon || !xpraStatusText) return;
  
  btnCheckXpra.disabled = true;
  xpraStatusBox.classList.remove("hidden");
  xpraStatusBox.className = "p-4 rounded border flex items-start gap-3 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50";
  xpraStatusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin text-gray-500"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
  xpraStatusText.textContent = t("ui.settings.xpra.status.checking");
  xpraStatusText.className = "text-sm font-medium text-gray-700 dark:text-gray-300";

  try {
    const installed = await invoke("check_xpra_installed");
    if (installed) {
      xpraStatusBox.className = "p-4 rounded border flex items-start gap-3 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/50";
      xpraStatusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600 dark:text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      xpraStatusText.textContent = t("ui.settings.xpra.status.success");
      xpraStatusText.className = "text-sm font-medium text-green-800 dark:text-green-200";
    } else {
      xpraStatusBox.className = "p-4 rounded border flex items-start gap-3 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50";
      xpraStatusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600 dark:text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
      xpraStatusText.textContent = t("ui.settings.xpra.status.error");
      xpraStatusText.className = "text-sm font-medium text-red-800 dark:text-red-200";
    }
  } catch (e) {
    xpraStatusBox.className = "p-4 rounded border flex items-start gap-3 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50";
    xpraStatusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600 dark:text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    xpraStatusText.textContent = `Error: ${e}`;
    xpraStatusText.className = "text-sm font-medium text-red-800 dark:text-red-200";
  } finally {
    btnCheckXpra.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  // Query DOM elements first
  indicatorEl = document.getElementById("status-indicator");
  statusTextEl = document.getElementById("status-text");
  
  btnBuild = document.getElementById("btn-build") as HTMLButtonElement;
  btnStart = document.getElementById("btn-start") as HTMLButtonElement;
  btnAttach = document.getElementById("btn-attach") as HTMLButtonElement;
  btnXemacs = document.getElementById("btn-xemacs") as HTMLButtonElement;
  btnTerminal = document.getElementById("btn-terminal") as HTMLButtonElement;
  btnXterm = document.getElementById("btn-xterm") as HTMLButtonElement;
  btnStop = document.getElementById("btn-stop") as HTMLButtonElement;
  
  btnSettings = document.getElementById("btn-settings") as HTMLButtonElement;
  btnCloseSettings = document.getElementById("btn-close-settings") as HTMLButtonElement;
  btnCancelSettings = document.getElementById("btn-cancel-settings") as HTMLButtonElement;
  btnSaveSettings = document.getElementById("btn-save-settings") as HTMLButtonElement;
  settingsModal = document.getElementById("settings-modal");
  settingsContent = document.getElementById("settings-content");
  
  btnCheckXpra = document.getElementById("btn-check-xpra") as HTMLButtonElement;
  xpraStatusBox = document.getElementById("xpra-status-box");
  xpraStatusIcon = document.getElementById("xpra-status-icon");
  xpraStatusText = document.getElementById("xpra-status-text");
  inputXpraDpi = document.getElementById("input-xpra-dpi") as HTMLInputElement;

  mappingsList = document.getElementById("mappings-list");
  btnAddMapping = document.getElementById("btn-add-mapping") as HTMLButtonElement;
  inputHostPath = document.getElementById("input-host-path") as HTMLInputElement;
  inputContainerPath = document.getElementById("input-container-path") as HTMLInputElement;
  btnBrowseHost = document.getElementById("btn-browse-host") as HTMLButtonElement;
  btnCopyHost = document.getElementById("btn-copy-host") as HTMLButtonElement;
  settingsError = document.getElementById("settings-error");
  selectLanguage = document.getElementById("select-language") as HTMLSelectElement;

  const btnReplayTutorial = document.getElementById("btn-replay-tutorial");
  btnReplayTutorial?.addEventListener("click", () => {
    closeSettings();
    if (onboardingModal) {
      onboardingModal.classList.remove("hidden");
      requestAnimationFrame(() => onboardingModal!.classList.remove("opacity-0"));
    }
  });

  xtermPresetsContainer = document.getElementById("xterm-presets-container");
  btnAddXtermPreset = document.getElementById("btn-add-xterm-preset") as HTMLButtonElement;
  xtermModal = document.getElementById("xterm-modal");
  btnCloseXtermModal = document.getElementById("btn-close-xterm-modal") as HTMLButtonElement;
  btnCancelXterm = document.getElementById("btn-cancel-xterm") as HTMLButtonElement;
  btnSaveXterm = document.getElementById("btn-save-xterm") as HTMLButtonElement;
  inputXtermId = document.getElementById("input-xterm-id") as HTMLInputElement;
  inputXtermName = document.getElementById("input-xterm-name") as HTMLInputElement;
  inputXtermFlags = document.getElementById("input-xterm-flags") as HTMLInputElement;
  xtermHelpers = document.querySelectorAll(".xterm-flag-helper");

  onboardingModal = document.getElementById("onboarding-modal");
  btnCloseOnboarding = document.getElementById("btn-close-onboarding") as HTMLButtonElement;

  tabBtnGeneral = document.getElementById("tab-btn-general");
  tabBtnDisplay = document.getElementById("tab-btn-display");
  tabGeneral = document.getElementById("tab-general");
  tabDisplay = document.getElementById("tab-display");

  // 1. Fetch settings and init i18n
  try {
    const settings: any = await invoke("get_settings");
    currentLanguage = settings.language || "en";
    currentMappings = settings.mappings || [];
    currentXtermPresets = settings.xterm_presets || [];
    currentXpraDpi = settings.xpra_dpi || 0;
    if (inputXpraDpi) inputXpraDpi.value = currentXpraDpi.toString();
    
    // Check onboarding
    if (settings.first_run) {
      if (onboardingModal) {
        onboardingModal.classList.remove("hidden");
        requestAnimationFrame(() => onboardingModal!.classList.remove("opacity-0"));
      }
    }
  } catch (e) {
    console.error("Failed to fetch initial settings:", e);
  }
  
  await initI18n(currentLanguage);
  translateDOM();
  renderXtermPresets();

  if (selectLanguage) {
    selectLanguage.value = currentLanguage;
  }

  btnBuild?.addEventListener("click", onBuild);
  btnStart?.addEventListener("click", onStart);
  btnAttach?.addEventListener("click", onAttach);
  btnXemacs?.addEventListener("click", onXemacs);
  btnTerminal?.addEventListener("click", onTerminal);
  btnXterm?.addEventListener("click", onXterm);
  btnStop?.addEventListener("click", onStop);
  
  btnSettings?.addEventListener("click", openSettings);
  btnCloseSettings?.addEventListener("click", closeSettings);
  btnCancelSettings?.addEventListener("click", closeSettings);
  btnSaveSettings?.addEventListener("click", onSaveSettings);

  tabBtnGeneral?.addEventListener("click", () => switchTab("general"));
  tabBtnDisplay?.addEventListener("click", () => switchTab("display"));
  btnCheckXpra?.addEventListener("click", doCheckXpra);
  btnAddMapping?.addEventListener("click", onAddMapping);
  btnBrowseHost?.addEventListener("click", onBrowseHost);
  btnCopyHost?.addEventListener("click", onCopyHost);

  btnAddXtermPreset?.addEventListener("click", openXtermModal);
  btnCloseXtermModal?.addEventListener("click", closeXtermModal);
  btnCancelXterm?.addEventListener("click", closeXtermModal);
  btnSaveXterm?.addEventListener("click", onSaveXtermPreset);
  xtermHelpers.forEach(btn => btn.addEventListener("click", onHelperClick));

  btnCloseOnboarding?.addEventListener("click", async () => {
    if (!onboardingModal) return;
    onboardingModal!.classList.add("opacity-0");
    setTimeout(() => onboardingModal!.classList.add("hidden"), 300);
    saveCurrentSettings(); // updates first_run = false
  });

  const btnOnboardingXpraSettings = document.getElementById("btn-onboarding-xpra-settings");
  btnOnboardingXpraSettings?.addEventListener("click", () => {
    // Chiudi l'onboarding
    if (onboardingModal) {
      onboardingModal.classList.add("opacity-0");
      setTimeout(() => onboardingModal!.classList.add("hidden"), 300);
      saveCurrentSettings(); // updates first_run = false
    }
    // Apri settings direttamente al tab Display
    openSettings();
    switchTab("display");
  });

  // Initialize xterm.js
  const terminalContainer = document.getElementById("terminal-container");
  if (terminalContainer) {
    term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      fontFamily: '"Inconsolata", "Consolas", "Menlo", "Monaco", monospace',
      fontSize: 15,
      fontWeight: '500',
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

    logMessage(t("log.welcome"), C_BLUE);
    logMessage(t("log.initializing"), C_GRAY);
  }

  // Initial status check
  checkStatus();
});

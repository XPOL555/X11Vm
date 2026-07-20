import i18next from "i18next";

const resources = {
  en: {
    translation: {
      "ui.app_title": "X11Vm Control",
      "ui.status.checking": "Checking Status...",
      "ui.status.running": "Running",
      "ui.status.stopped": "Stopped",
      "ui.status.not_built": "Not Built",
      "ui.status.docker_not_running": "Docker Not Running",
      
      "ui.engine.title": "Docker Engine",
      "ui.engine.build": "Build Base Image",
      "ui.engine.rebuild": "Re-build Image",
      "ui.engine.start": "Start Environment",
      "ui.engine.restart": "Restart Env",
      "ui.engine.stop": "Stop Environment",
      
      "ui.apps.title": "Applications",
      "ui.apps.attach": "Attach Display",
      "ui.apps.xemacs": "XEmacs",
      "ui.apps.term": "Term",
      "ui.apps.xterm_presets": "Xterm Presets",
      "ui.apps.xterm.add": "Add Preset",
      
      "ui.terminal.title": "System Log",
      
      "ui.settings.title": "Settings",
      "ui.settings.tab.general": "General",
      "ui.settings.tab.display": "Display (Xpra)",
      "ui.settings.language": "Language",
      "ui.settings.language.en": "English",
      "ui.settings.language.it": "Italiano",
      "ui.settings.tutorial.title": "Tutorial",
      "ui.settings.tutorial.btn": "Show Welcome Tutorial",
      "ui.settings.updates.title": "Updates",
      "ui.settings.updates.btn": "Check for updates",
      "ui.settings.updates.checking": "Checking for updates...",
      "ui.settings.updates.uptodate": "You are up to date!",
      "ui.settings.updates.available": "New version available: v{{version}}!",
      "ui.settings.updates.error": "Failed to check for updates.",
      "ui.settings.updates.link": "Open Releases Page",
      
      "ui.settings.mappings.title": "Folder Mappings",
      "ui.settings.mappings.desc": "Map directories from your Mac/PC to the Docker container.",
      "ui.settings.mappings.warning": "Do not map your entire Home folder or overlapping directories. Doing so can cause Docker to crash or enter infinite loops due to system symlinks.",
      "ui.settings.mappings.empty": "No custom mappings configured.",
      
      "ui.settings.host_path": "Host Path",
      "ui.settings.container_path": "Container Path",
      "ui.settings.btn.browse": "Browse Folder",
      "ui.settings.btn.copy": "Copy from Host (converts to Linux path)",
      "ui.settings.btn.add": "Add",
      "ui.settings.btn.cancel": "Cancel",
      "ui.settings.btn.save": "Save Changes",
      "ui.settings.btn.saving": "Saving...",
      
      "ui.settings.xpra.title": "Display Configuration",
      "ui.settings.xpra.desc": "X11Vm uses Xpra to seamlessly forward native Linux windows (like XEmacs or Xterm) from the Docker container directly to your host operating system. To enable this feature, you must have Xpra installed on your Mac or PC.",
      "ui.settings.xpra.install_mac": "On Mac, you can install it via Homebrew: <code>brew install xpra</code> or download it from <a href='https://xpra.org' target='_blank' class='text-[var(--color-primary)] hover:underline'>xpra.org</a>.",
      "ui.settings.xpra.install_win": "On Windows, download the installer from <a href='https://xpra.org' target='_blank' class='text-[var(--color-primary)] hover:underline'>xpra.org</a>.",
      "ui.settings.xpra.btn.check": "Check Installation",
      "ui.settings.xpra.status.checking": "Checking...",
      "ui.settings.xpra.status.success": "Xpra is installed and ready to use.",
      "ui.settings.xpra.status.error": "Xpra not found. Please install it first.",
      "ui.settings.xpra.dpi.title": "Client DPI",
      "ui.settings.xpra.dpi.desc": "Force Xpra to use a specific DPI (e.g. 96, 120, 144) to fix scaling warnings. Leave at 0 for auto-detection.",
      
      "ui.xterm.modal.title": "New Xterm Preset",
      "ui.xterm.modal.name": "Preset Name",
      "ui.xterm.modal.flags": "Xterm Flags",
      "ui.xterm.modal.flags.placeholder": "e.g. -bg black -fg green",
      "ui.xterm.modal.helpers.title": "Quick Flags (Click to add):",
      "ui.xterm.modal.btn.save": "Save Preset",
      "ui.xterm.modal.btn.cancel": "Cancel",
      
      "ui.onboarding.title": "Welcome to X11Vm! 👋",
      "ui.onboarding.desc1": "This application allows you to seamlessly run a Linux GUI environment via Docker, integrating directly with your host OS.",
      "ui.onboarding.step1.title": "1. Build the Image",
      "ui.onboarding.step1.desc": "Click 'Build Image' to compile the Docker container.",
      "ui.onboarding.step2.title": "2. Install Xpra",
      "ui.onboarding.step2.desc": "Make sure Xpra is installed on your host system to display the windows.",
      "ui.onboarding.step2.link": "Open Display Settings to check",
      "ui.onboarding.btn": "Get Started",
      "ui.onboarding.btn.start": "Got it, let's start!",

      "err.host_path_required": "Both Host Path and Container Path are required.",
      "err.folder_picker": "Failed to open folder picker: {{error}}",
      
      "log.welcome": "Welcome to X11Vm Terminal.",
      "log.initializing": "System is initializing...",
      "log.building": "Building Docker image... (this may take a few minutes)",
      "log.build_success": "Build Success:",
      "log.build_error": "Build Error:\n{{error}}",
      "log.starting": "Starting environment...",
      "log.started": "Started container: {{msg}}",
      "log.start_error": "Start Error:\n{{error}}",
      "log.attaching": "Attaching Xpra client to display windows natively...",
      "log.attached": "Xpra attached successfully.",
      "log.attach_error": "Attach Error (Do you have Xpra installed on the host?):\n{{error}}",
      "log.open_xemacs": "Opening new XEmacs window...",
      "log.opened_xemacs": "XEmacs process spawned in container.",
      "log.err_xemacs": "XEmacs Error:\n{{error}}",
      "log.open_term": "Opening new Terminal window (xfce4)...",
      "log.opened_term": "Terminal process spawned in container.",
      "log.err_term": "Terminal Error:\n{{error}}",
      "log.open_xterm": "Opening new Xterm window (legacy)...",
      "log.opened_xterm": "Xterm process spawned in container.",
      "log.err_xterm": "Xterm Error:\n{{error}}",
      "log.stopping": "Stopping environment...",
      "log.stopped": "Stopped container: {{msg}}",
      "log.stop_error": "Stop Error:\n{{error}}",
      "log.settings_saved": "Settings saved successfully.",
      "log.settings_restart": "⚠️ You must restart the environment for the new folder mappings to apply."
    }
  },
  it: {
    translation: {
      "ui.app_title": "Controllo X11Vm",
      "ui.status.checking": "Controllo Stato...",
      "ui.status.running": "In Esecuzione",
      "ui.status.stopped": "Fermato",
      "ui.status.not_built": "Non Compilata",
      "ui.status.docker_not_running": "Docker Non Attivo",
      
      "ui.engine.title": "Motore Docker",
      "ui.engine.build": "Compila Immagine Base",
      "ui.engine.rebuild": "Ri-compila Immagine",
      "ui.engine.start": "Avvia Ambiente",
      "ui.engine.restart": "Riavvia Amb.",
      "ui.engine.stop": "Ferma Ambiente",
      
      "ui.apps.title": "Applicazioni",
      "ui.apps.attach": "Collega Schermo",
      "ui.apps.xemacs": "XEmacs",
      "ui.apps.term": "Term",
      "ui.apps.xterm_presets": "Preset Xterm",
      "ui.apps.xterm.add": "Nuovo Preset",
      
      "ui.terminal.title": "Log di Sistema",
      
      "ui.settings.title": "Impostazioni",
      "ui.settings.tab.general": "Generale",
      "ui.settings.tab.display": "Schermo (Xpra)",
      "ui.settings.language": "Lingua",
      "ui.settings.language.en": "Inglese",
      "ui.settings.language.it": "Italiano",
      "ui.settings.tutorial.title": "Tutorial",
      "ui.settings.tutorial.btn": "Mostra Tutorial di Benvenuto",
      "ui.settings.updates.title": "Aggiornamenti",
      "ui.settings.updates.btn": "Verifica aggiornamenti",
      "ui.settings.updates.checking": "Ricerca aggiornamenti in corso...",
      "ui.settings.updates.uptodate": "L'app è aggiornata!",
      "ui.settings.updates.available": "Nuova versione disponibile: v{{version}}!",
      "ui.settings.updates.error": "Impossibile verificare gli aggiornamenti.",
      "ui.settings.updates.link": "Apri Pagina Releases",
      
      "ui.settings.mappings.title": "Mappatura Cartelle",
      "ui.settings.mappings.desc": "Mappa le cartelle dal tuo Mac/PC al container Docker.",
      "ui.settings.mappings.warning": "Non mappare l'intera tua cartella Home o cartelle annidate. Docker sui sistemi operativi host rischia di bloccarsi o creare loop infiniti a causa dei collegamenti di sistema.",
      "ui.settings.mappings.empty": "Nessuna mappatura personalizzata configurata.",
      
      "ui.settings.host_path": "Percorso Host",
      "ui.settings.container_path": "Percorso Container",
      "ui.settings.btn.browse": "Sfoglia",
      "ui.settings.btn.copy": "Copia da Host (converte in percorso Linux)",
      "ui.settings.btn.add": "Aggiungi",
      "ui.settings.btn.cancel": "Annulla",
      "ui.settings.btn.save": "Salva Modifiche",
      "ui.settings.btn.saving": "Salvataggio...",
      
      "ui.settings.xpra.title": "Configurazione Schermo",
      "ui.settings.xpra.desc": "X11Vm utilizza Xpra per inoltrare nativamente le finestre Linux (come XEmacs o Xterm) dal container Docker direttamente al tuo sistema host. Per utilizzare questa funzionalità, devi aver installato Xpra sul tuo Mac o PC.",
      "ui.settings.xpra.install_mac": "Su Mac, puoi installarlo tramite Homebrew: <code>brew install xpra</code> oppure scaricandolo da <a href='https://xpra.org' target='_blank' class='text-[var(--color-primary)] hover:underline'>xpra.org</a>.",
      "ui.settings.xpra.install_win": "Su Windows, scarica l'installer da <a href='https://xpra.org' target='_blank' class='text-[var(--color-primary)] hover:underline'>xpra.org</a>.",
      "ui.settings.xpra.btn.check": "Verifica Installazione",
      "ui.settings.xpra.status.checking": "Verifica in corso...",
      "ui.settings.xpra.status.success": "Xpra è installato e pronto all'uso.",
      "ui.settings.xpra.status.error": "Xpra non trovato. Per favore installalo prima.",
      "ui.settings.xpra.dpi.title": "DPI Client",
      "ui.settings.xpra.dpi.desc": "Forza Xpra ad usare un DPI specifico (es. 96, 120, 144) per sistemare problemi di scaling. Lascia 0 per rilevamento automatico.",

      "ui.xterm.modal.title": "Nuovo Preset Xterm",
      "ui.xterm.modal.name": "Nome Preset",
      "ui.xterm.modal.flags": "Parametri Xterm",
      "ui.xterm.modal.flags.placeholder": "es. -bg black -fg green",
      "ui.xterm.modal.helpers.title": "Flag Rapidi (Clicca per aggiungere):",
      "ui.xterm.modal.btn.save": "Salva Preset",
      "ui.xterm.modal.btn.cancel": "Annulla",
      

      "err.host_path_required": "Entrambi i percorsi (Host e Container) sono obbligatori.",
      "err.folder_picker": "Impossibile aprire il selettore cartelle: {{error}}",
      
      "log.welcome": "Benvenuto nel Terminale X11Vm.",
      "log.initializing": "Inizializzazione sistema in corso...",
      "log.building": "Compilazione dell'immagine Docker in corso... (potrebbe volerci qualche minuto)",
      "log.build_success": "Compilazione Completata:",
      "log.build_error": "Errore di Compilazione:\n{{error}}",
      "log.starting": "Avvio dell'ambiente in corso...",
      "log.started": "Container avviato: {{msg}}",
      "log.start_error": "Errore di Avvio:\n{{error}}",
      "log.attaching": "Collegamento client Xpra per visualizzazione finestre native...",
      "log.attached": "Xpra collegato con successo.",
      "log.attach_error": "Errore di Collegamento (Hai installato Xpra sull'host?):\n{{error}}",
      "log.open_xemacs": "Apertura nuova finestra XEmacs...",
      "log.opened_xemacs": "Processo XEmacs avviato nel container.",
      "log.err_xemacs": "Errore XEmacs:\n{{error}}",
      "log.open_term": "Apertura nuova finestra Terminal (xfce4)...",
      "log.opened_term": "Processo Terminal avviato nel container.",
      "log.err_term": "Errore Terminal:\n{{error}}",
      "log.open_xterm": "Apertura nuova finestra Xterm (classico)...",
      "log.opened_xterm": "Processo Xterm avviato nel container.",
      "log.err_xterm": "Errore Xterm:\n{{error}}",
      "log.stopping": "Arresto dell'ambiente in corso...",
      "log.stopped": "Container arrestato: {{msg}}",
      "log.stop_error": "Errore di Arresto:\n{{error}}",
      "log.settings_saved": "Impostazioni salvate con successo.",
      "log.settings_restart": "⚠️ Devi riavviare l'ambiente affinché le nuove mappature delle cartelle abbiano effetto.",

      "ui.onboarding.title": "Benvenuto in X11Vm! 👋",
      "ui.onboarding.desc1": "Questa applicazione ti permette di eseguire un ambiente desktop Linux tramite Docker, integrandosi perfettamente col tuo sistema host.",
      "ui.onboarding.step1.title": "1. Costruisci l'Immagine",
      "ui.onboarding.step1.desc": "Clicca su 'Build Image' per compilare il container Docker.",
      "ui.onboarding.step2.title": "2. Installa Xpra",
      "ui.onboarding.step2.desc": "Assicurati che Xpra sia installato sul tuo sistema host per visualizzare le finestre.",
      "ui.onboarding.step2.link": "Apri Impostazioni Schermo per verificare",
      "ui.onboarding.btn": "Inizia",
      "ui.onboarding.btn.start": "Capito, iniziamo!"
    }
  }
};

export async function initI18n(lang: string) {
  await i18next.init({
    lng: lang,
    fallbackLng: "en",
    resources,
    interpolation: {
      escapeValue: false // not needed for vanilla ts
    }
  });
}

export function t(key: string, options?: any): string {
  return i18next.t(key, options) as string;
}

export function translateDOM() {
  const elements = document.querySelectorAll("[data-i18n]");
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      if (el.tagName === "INPUT" && (el as HTMLInputElement).placeholder) {
        // We only translate placeholder if it explicitly needs it, but mostly we translate textContent.
        // Actually, let's keep it simple: textContent or innerHTML based on if it contains SVG.
        // For buttons with SVG, we can't just overwrite innerHTML blindly unless we put a span inside.
      }
    }
  });
}

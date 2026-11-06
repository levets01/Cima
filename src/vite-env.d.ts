/// <reference types="vite/client" />

interface CimaDesktopBridge {
  readonly isDesktop: true;
  readonly apiUrl: string;
  readonly apiKey: string;
  readonly appVersion: string;
  openDataFolder?: () => Promise<void>;
  backupDatabase?: () => Promise<string | null>;
}

interface Window {
  readonly cimaDesktop?: CimaDesktopBridge;
}

export {};
declare global {
  interface Window {
    desktop?: Readonly<{
      isDesktop: true;
      isGameWindow: boolean;
      createGameSession: (tokenId: string) => Promise<{ origin: string; url: string }>;
      releaseGameSession: (origin: string) => Promise<void>;
      openAboutLink: (url: string) => Promise<void>;
    }>;
  }
}

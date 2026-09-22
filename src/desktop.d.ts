export {};
declare global {
  interface Window {
    desktop?: Readonly<{
      isDesktop: true;
      isGameWindow: boolean;
      createGameSession: (tokenId: string, confirmedOrigin?: string) => Promise<{ origin: string; url: string } | { conflict: { tokenId: string; ownerId: number; origin: string; current: boolean } }>;
      listGameAccounts: () => Promise<Array<{ tokenId: string; ownerId: number; origin: string; current: boolean }>>;
      onGameDetach: (callback: (account: { tokenId: string; origin: string }) => Promise<void>) => () => void;
      releaseGameSession: (origin: string) => Promise<void>;
      openAboutLink: (url: string) => Promise<void>;
    }>;
  }
}

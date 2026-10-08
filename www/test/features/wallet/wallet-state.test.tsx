import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WalletScreen } from "../../../src/features/wallet/components/wallet-screen";
import { walletService } from "../../../src/features/wallet/lib/wallet-service";
import {
  type WalletCard,
  walletPreviewSchema,
} from "../../../src/features/wallet/model/wallet-model";
import {
  clearWallet,
  openWalletCard,
  refreshWallet,
  useWallet,
} from "../../../src/features/wallet/store/wallet-store";

const status = {
  initialized: true,
  secureStoreAvailable: true,
  protected: true,
  locked: false,
  systemAuthAvailable: false,
  generation: 1,
  formatVersion: 1 as const,
};
const id = "05bcbf44-1249-469c-9c22-0b239c23e53e";
const card: WalletCard = {
  formatVersion: 1,
  revision: 1,
  createdAt: 1,
  updatedAt: 1,
  draft: {
    id,
    kind: "bank",
    displayName: "Synthetic fixture",
    issuer: null,
    templateId: "bank-landscape",
    templateVersion: 1,
    sideState: { front: "available", back: "missing" },
    fields: [],
    appearance: { formFactor: "landscape", palette: "honey" },
    retainSecurityCode: false,
  },
};

function Snapshot() {
  return <pre>{JSON.stringify(useWallet())}</pre>;
}

afterEach(() => {
  clearWallet();
});

describe("wallet boundary", () => {
  it("renders the browser explanation without starting native storage", () => {
    const native = spyOn(walletService, "status");
    try {
      const html = renderToStaticMarkup(<WalletScreen />);
      expect(html).toContain("The browser does not store wallet cards or keys");
      expect(native).not.toHaveBeenCalled();
    } finally {
      native.mockRestore();
    }
  });

  it("discards an outstanding card read after the wallet is cleared", async () => {
    const statusSpy = spyOn(walletService, "status").mockResolvedValue(status);
    const listSpy = spyOn(walletService, "list").mockResolvedValue({ cards: [], nextCursor: null });
    let resolveRead: (value: WalletCard) => void = () => {};
    let signalStarted: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const response = new Promise<WalletCard>((resolve) => {
      resolveRead = resolve;
    });
    const readSpy = spyOn(walletService, "read").mockImplementation(() => {
      signalStarted();
      return response;
    });
    try {
      await refreshWallet();
      const pending = openWalletCard(id);
      await started;
      clearWallet();
      resolveRead(card);
      await pending;
      const html = renderToStaticMarkup(<Snapshot />);
      expect(html).not.toContain("Synthetic fixture");
      expect(html).toContain("&quot;selected&quot;:null");
    } finally {
      statusSpy.mockRestore();
      listSpy.mockRestore();
      readSpy.mockRestore();
    }
  });

  it("refuses list payloads containing full card fields", () => {
    const preview = {
      id,
      revision: 1,
      kind: "bank",
      displayName: "Synthetic fixture",
      issuer: null,
      appearance: { formFactor: "landscape", palette: "honey" },
      lastFour: "5678",
      updatedAt: 1,
    };
    expect(walletPreviewSchema.safeParse(preview).success).toBe(true);
    expect(
      walletPreviewSchema.safeParse({ ...preview, number: "0012345678905678", cvv: "987" }).success,
    ).toBe(false);
  });
});

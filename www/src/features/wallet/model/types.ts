import type { AccentId } from "@phe-rus/hino/tokens";
import type {
  CardKind,
  ListRequest,
  WalletCard,
  WalletPreview,
  WalletStatus,
} from "./wallet-model";

export type CardSuggestions = {
  kind: CardKind;
  palette?: AccentId;
  cvv?: string;
  numberUncertain?: boolean;
  meter: string;
  account: string;
  displayName: string;
  holder: string;
  number: string;
  expiry: string;
  issuer: string;
  puk: string;
};

export type ManualCardFormProps = {
  card: WalletCard | null;
  suggestions?: CardSuggestions;
};

export type CardFormValues = {
  meter: string;
  account: string;
  displayName: string;
  holder: string;
  number: string;
  expiry: string;
  issuer: string;
  cvv: string;
  puk: string;
  retainSecurityCode: boolean;
  backAvailable: boolean;
  palette: AccentId;
};

export type CardDraftContext = ManualCardFormProps & {
  id: string;
  kind: CardKind;
  fieldIds: Map<string, string>;
  backKeys: ReadonlySet<string>;
  protectedKeys: ReadonlySet<string>;
};

export type CardAppearanceSheetProps = {
  open: boolean;
  palette: AccentId;
  onClose: () => void;
  onChange: (palette: AccentId) => void;
};

export type CardText = {
  text: string;
  confidence: number;
};

export type CardReading = CardText & {
  suggestions: CardSuggestions;
};

export type CardReader = {
  read: (canvas: HTMLCanvasElement) => Promise<CardReading>;
  stop: () => void;
};

export type CardCameraPhase = "opening" | "scanning" | "detected" | "error";

export type CardCameraProps = {
  onClose: () => void;
  onRead?: (reading: CardReading) => void;
};

export type CardCameraSource = {
  ready: () => boolean;
  capture: () => HTMLCanvasElement;
  attach: (stream: MediaStream) => Promise<void>;
  clear: (stream: MediaStream | undefined) => void;
};

export type CardCameraObserver = {
  back: boolean;
  onDetected: (reading: CardReading | null) => void;
  onPhase: (phase: CardCameraPhase) => void;
  onRead: (reading: CardReading) => void;
};

export type CardCameraServices = {
  reader: CardReader;
  openCamera: () => Promise<MediaStream>;
  resumeAccess: () => Promise<void>;
  systemPrompt: (work: () => Promise<void>) => Promise<void>;
  readCodes: (canvas: HTMLCanvasElement) => Promise<string[]>;
  schedule: (work: () => Promise<void>, delay: number) => () => void;
};

export type WalletState = {
  status: WalletStatus | null;
  captureReview: {
    suggestions: CardSuggestions;
    confidence: number;
    text: string;
    source?: "nfc";
  } | null;
  captureProgress: number | null;
  captureError: boolean;
  captureMethod: "image" | "nfc" | null;
  captureNfcUnsupported: boolean;
  cards: WalletPreview[];
  selected: WalletCard | null;
  view: "home" | "add" | "detail" | "edit" | "present";
  busy: boolean;
  error: string | null;
  nextCursor: string | null;
  query: ListRequest;
};

export type WalletCaptureContext = {
  state: () => WalletState;
  update: (patch: Partial<WalletState>) => void;
  epoch: () => number;
  invalidate: () => void;
  applyStatus: (status: WalletStatus, token: number) => Promise<void>;
  fail: (error: unknown) => void;
};

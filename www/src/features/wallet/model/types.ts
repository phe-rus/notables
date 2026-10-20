import type { AccentId } from "@phe-rus/hino/tokens";
import type { CardSuggestions } from "../lib/card-fields";
import type { CardKind, WalletCard } from "./wallet-model";

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

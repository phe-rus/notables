import {
  Button,
  ChevronLeftIcon,
  confirmDialog,
  IconButton,
  LockIcon,
  MoreIcon,
  openMenu,
  PlusIcon,
  SidebarIcon,
} from "@phe-rus/hino";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { setDrawerOpen } from "@/components/layout/drawer-store";
import { CollapsedSidebarControls } from "@/components/window/collapsed-sidebar-controls";
import { usePreferences } from "@/features/settings/store/preferences-store";
import { t } from "@/i18n/i18n";
import { isTauri } from "@/platform/runtime";
import {
  deleteWalletCard,
  lockWallet,
  mountWallet,
  refreshWallet,
  showWallet,
  useWallet,
} from "../store/wallet-store";
import { CardCapture } from "./card-capture";
import { CardDetail } from "./card-detail";
import { CardStack } from "./card-stack";
import { ManualCardForm } from "./manual-card-form";
import { WalletAccess } from "./wallet-access";

/** The wallet: a stack of cards, one card's details, or adding and editing one. */
export function WalletScreen() {
  const state = useWallet();
  const reducedMotion = useReducedMotion();
  const { sidebar } = usePreferences();
  useEffect(mountWallet, []);
  const accessible = state.status?.initialized && !state.status.locked;
  const selected = state.selected;
  const editing = state.view === "edit" && selected;
  const onCard = (state.view === "detail" || state.view === "present") && selected;
  const deleteCard = async () => {
    if (!selected) return;
    const confirmed = await confirmDialog({
      title: t("wallet.deleteTitle"),
      message: t("wallet.deleteHint"),
      destructive: true,
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
    });
    if (confirmed)
      await deleteWalletCard(selected.draft.id, crypto.randomUUID(), selected.revision);
  };
  return (
    <LayoutGroup id="wallet">
      <div className="flex min-h-0 grow flex-col">
        <header
          data-tauri-drag-region
          className="flex flex-col gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 sm:px-8"
        >
          {sidebar.collapsed && (
            <div className="hidden md:block">
              <CollapsedSidebarControls />
            </div>
          )}
          <div className="mx-auto flex w-full max-w-md items-center gap-2">
            {onCard || editing || state.view === "add" ? (
              <IconButton
                size="icon-sm"
                variant="secondary"
                label={t("common.back")}
                onClick={() => showWallet(editing ? "detail" : "home")}
              >
                <ChevronLeftIcon size={20} className="rtl:-scale-x-100" />
              </IconButton>
            ) : (
              <IconButton
                size="icon-sm"
                variant="secondary"
                label={t("nav.showLibrary")}
                className="hidden md:inline-flex lg:hidden"
                onClick={() => setDrawerOpen(true)}
              >
                <SidebarIcon size={20} />
              </IconButton>
            )}
            <h1 className="min-w-0 grow truncate text-title2 font-bold tracking-tight">
              {onCard || editing
                ? selected.draft.displayName
                : state.view === "add"
                  ? t("wallet.addCard")
                  : t("wallet.title")}
            </h1>
            {accessible && state.status?.protected && !onCard && (
              <IconButton
                size="icon-sm"
                variant="ghost"
                label={t("wallet.lock")}
                onClick={() => {
                  lockWallet();
                  void refreshWallet();
                }}
              >
                <LockIcon size={19} />
              </IconButton>
            )}
            {accessible && state.view === "home" && (
              <IconButton
                size="icon-sm"
                variant="ghost"
                label={t("wallet.addCard")}
                className="rounded-full"
                disabled={state.busy}
                onClick={() => showWallet("add")}
              >
                <PlusIcon size={20} strokeWidth={2} />
              </IconButton>
            )}
            {accessible && onCard && (
              <IconButton
                size="icon-sm"
                variant="secondary"
                label={t("notes.more")}
                disabled={state.busy}
                onClick={(event) =>
                  openMenu(
                    event.currentTarget,
                    [
                      { label: t("common.edit"), onSelect: () => showWallet("edit") },
                      "divider",
                      {
                        label: t("common.delete"),
                        destructive: true,
                        onSelect: () => void deleteCard(),
                      },
                    ],
                    { edge: "trailing" },
                  )
                }
              >
                <MoreIcon size={20} />
              </IconButton>
            )}
          </div>
        </header>
        <div className="grow overflow-y-auto px-4 pt-3 pb-32 sm:px-8 md:pb-10">
          <div className="relative mx-auto flex max-w-[1000px] flex-col gap-6">
            {!isTauri() ? (
              <div className="mx-auto max-w-[480px] py-16 text-center">
                <h2 className="font-serif text-3xl font-semibold">{t("wallet.nativeTitle")}</h2>
                <p className="mt-4 text-label-secondary">{t("wallet.nativeHint")}</p>
              </div>
            ) : (
              <>
                {state.error && (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center gap-3 rounded-3xl bg-fill p-4"
                  >
                    <p className="grow text-sm">
                      {state.error === "invalid-credential"
                        ? t("wallet.wrongPassword")
                        : state.error === "throttled"
                          ? t("wallet.throttled")
                          : state.error === "conflict"
                            ? t("wallet.conflict")
                            : state.error === "secure-store-unavailable"
                              ? t("wallet.secureStoreHint")
                              : state.error === "corrupt-vault" ||
                                  state.error === "unsupported-format"
                                ? t("wallet.corrupt")
                                : state.error === "locked"
                                  ? t("wallet.unlockHint")
                                  : t("wallet.error")}
                    </p>
                    <Button size="sm" disabled={state.busy} onClick={() => void refreshWallet()}>
                      {t("wallet.retry")}
                    </Button>
                  </div>
                )}
                {!state.status ? (
                  !state.error && (
                    <p role="status" className="text-label-secondary">
                      {t("wallet.loading")}
                    </p>
                  )
                ) : !accessible ? (
                  <WalletAccess />
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.div
                      key={onCard ? `card:${selected.draft.id}` : state.view}
                      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
                      className="w-full"
                    >
                      {state.view === "add" ? (
                        <CardCapture />
                      ) : state.view === "edit" ? (
                        <ManualCardForm
                          key={`${selected?.draft.id}:${state.status?.sensitiveUntil ?? 0}`}
                          card={selected}
                        />
                      ) : onCard ? (
                        <CardDetail card={selected} />
                      ) : (
                        <CardStack />
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}

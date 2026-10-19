import { expect, test } from "bun:test";
import * as Y from "yjs";
import { financeLedger } from "../../src/features/finances/lib/ledger";
import { parseMobileMoneyMessages } from "../../src/features/finances/lib/mobile-money";
import { FinanceStore } from "../../src/features/finances/store/finance-store";

const messages = [
  "Dial *165# and select My Approvals to allow payment of UGX 1,000 to EXAMPLE SHOP.",
  "Y'ello. EXAMPLE SHOP has deducted UGX 1000 at a fee of UGX 0 Transaction ID: 90000000001 from your mobile money account. Message: Bundle Purchase. New balance is:UGX 0.",
  "You have used UGX 1000 with access fee UGX 28 on 2026-09-23 14:37:15 from MOMOADVANCE. Your available MOMOADVANCE balance is UGX 200. Transaction Id: 90000000001.",
  "Sunday, Sep 27 · 9:17 AM\nSelect country to proceed\nmomo.mtn.com",
  "You have received 500 UGX from TEST PERSON (256700000001) on your mobile money account at 2026-09-27 09:17:38. Your new balance:0 UGX. Financial Transaction Id: 90000000002.",
  "You have transferred 500 UGX to TEST PERSON (256700000001) from your mobile money account 300000000001 CBA-SAVINGS at 2026-09-27 09:17:38. Financial Transaction Id: 90000000002.",
  "Y'ello. UGX 500 has been used to repay your OVERDRAFT on 2026-09-27 09:17:38.Transaction ID 90000000002",
  "You have received UGX 20000 from MoKash . on 2026-09-27 09:20:29. fee:0. Reason: receivermessage. New balance: UGX 0. ID: 90000000003.",
  "You have sent UGX 155000 to EXAMPLE PERSON, 256700000002 on 2026-09-27 16:09:13, fee: 0. Reason: food. New balance: 0. ID :90000000004.",
  "You have used UGX 108947 with access fee UGX 2996 on 2026-09-27 16:09:13 from MOMOADVANCE. Your available MOMOADVANCE balance is UGX 11053",
];
test("MTN conversation import distinguishes payment, financing and non-transactions", () => {
  const parsed = parseMobileMoneyMessages(messages.join("\n"));
  expect(parsed).toHaveLength(8);
  expect(parsed[0]).toMatchObject({
    amount: "1000",
    description: "EXAMPLE SHOP",
    reference: "90000000001",
    category: "payment",
  });
  expect(parsed[1]).toMatchObject({
    amount: "1000",
    fee: 28,
    date: "2026-09-23",
    category: "borrowing",
  });
  expect(parsed[2]).toMatchObject({
    amount: "500",
    direction: "income",
    description: "TEST PERSON",
    date: "2026-09-27",
  });
  expect(parsed[3]?.category).toBe("transfer");
  expect(parsed[4]).toMatchObject({ category: "repayment", amount: "500" });
  expect(parsed[5]?.category).toBe("borrowing");
  expect(parsed[7]).toMatchObject({ category: "borrowing", reference: "90000000004", fee: 2996 });
});
test("related messages survive import, repeats do not, removal propagates to a peer", () => {
  const doc = new Y.Doc();
  const store = new FinanceStore(doc);
  const parsed = parseMobileMoneyMessages(messages.slice(1, 3).join("\n"));
  const saved = parsed.map((item) =>
    store.save({
      ...item,
      amount: Number(item.amount),
      date: item.date || "2026-09-23",
      attachments: [],
      source: "sms",
      sourceText: item.sourceText,
    }),
  );
  expect(store.getSnapshot()).toHaveLength(2);
  const first = saved[0];
  if (!first) throw new Error("missing transaction");
  expect(() => store.save(first)).toThrow("duplicate-transaction");
  const rows = financeLedger(store.getSnapshot(), []);
  expect(rows.filter((item) => item.type === "expense").map((item) => item.amount)).toEqual([1000]);
  expect(rows.find((item) => item.type === "fee")?.amount).toBe(28);
  store.remove(first.id);
  const peerDoc = new Y.Doc();
  const peer = new FinanceStore(peerDoc);
  Y.applyUpdate(peerDoc, Y.encodeStateAsUpdate(doc));
  expect(peer.getSnapshot()).toHaveLength(1);
});

test("approval-only messages, balances and URL previews are not payments", () => {
  expect(parseMobileMoneyMessages(messages[0] || "")).toEqual([]);
  expect(
    parseMobileMoneyMessages(
      "Your new balance is UGX 45000. Select country to proceed\nmomo.mtn.com",
    ),
  ).toEqual([]);
  expect(
    parseMobileMoneyMessages(
      "You have sent USD 12.50 to EXAMPLE PERSON on 2026-09-27 12:00:00, fee: 0.25. ID: ABCD123456.",
    )[0],
  ).toMatchObject({ amount: "12.50", fee: 25 });
  expect(
    parseMobileMoneyMessages(
      "Y'ello. EXAMPLE SHOP has deducted UGX 1000 at a fee of UGX 50 Transaction ID: 90000000005 from your mobile money account.",
    )[0]?.fee,
  ).toBe(50);
});

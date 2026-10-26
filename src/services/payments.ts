export interface CoinPack {
  coins: number;
  price: number;
}
export interface PaymentProvider {
  createCheckout(
    pack: CoinPack,
  ): Promise<{ status: "unavailable" | "pending"; message: string }>;
}
// A future provider must obtain a server-created order and verify a signed webhook.
// Client checkout success must NEVER issue coins or activate membership.
export class MockPaymentProvider implements PaymentProvider {
  async createCheckout(
    _pack: CoinPack,
  ): Promise<{ status: "unavailable"; message: string }> {
    void _pack;
    return {
      status: "unavailable",
      message:
        "Payment preview only. No payment was taken and no BookCoins were issued.",
    };
  }
}
export const paymentProvider: PaymentProvider = new MockPaymentProvider();
export const previewPacks: CoinPack[] = [
  { coins: 25, price: 100 },
  { coins: 75, price: 250 },
  { coins: 200, price: 500 },
];

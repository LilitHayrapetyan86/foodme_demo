import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { foodmeApi } from "@/api/foodme";
import { AuthPanel } from "@/components/sections/auth-panel";
import { CheckoutSummary } from "@/components/sections/checkout-summary";
import { CheckoutPriceSummary } from "@/components/sections/checkout-price-summary";
import { PromoCodeField } from "@/components/sections/promo-code-field";
import { OrderDeliveryForm } from "@/components/sections/order-delivery-form";
import { Button } from "@/components/ui/button";
import { useCart, clearCart } from "@/hooks/useCart";
import { useAuth } from "@/providers/auth-provider";
import type { CheckoutFormValues } from "@/schemas/checkout-schema";
import type { OrderDto } from "@/types";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal } = useCart();
  const { isAuthenticated, customer, logout } = useAuth();
  const chefId = items[0]?.chefId;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "TAKEAWAY">("DELIVERY");
  const [promoCode, setPromoCode] = useState<string | null>(null);

  const chefQuery = useQuery({
    queryKey: ["chef", chefId],
    queryFn: () => foodmeApi.getChefById(chefId as number),
    enabled: chefId !== undefined,
  });

  const deliveryPriceQuery = useQuery({
    queryKey: ["delivery-price", chefId, subtotal, deliveryMethod],
    queryFn: () =>
      foodmeApi.getDeliveryPrice({ chefId: chefId as number, subtotal, deliveryMethod }),
    enabled: chefId !== undefined && subtotal > 0,
  });

  const promoQuery = useQuery({
    queryKey: ["promo", promoCode, chefId, subtotal, deliveryMethod],
    queryFn: () =>
      foodmeApi.applyPromo({ code: promoCode as string, chefId: chefId as number, subtotal, deliveryMethod }),
    enabled: promoCode !== null && chefId !== undefined && subtotal > 0,
    retry: false,
  });
  const appliedPromo =
    promoCode !== null && promoQuery.data?.status === "APPLIED" && !promoQuery.isFetching ? promoQuery.data : undefined;

  const deliveryPrice = deliveryPriceQuery.data?.deliveryPrice ?? 0;
  const freeDeliveryFrom = deliveryPriceQuery.data?.freeDeliveryFrom ?? 0;

  const handleSubmit = async (values: CheckoutFormValues) => {
    if (chefId === undefined) return;
    if (!isAuthenticated) {
      setSubmitError("Sign in or create an account to place your order.");
      return;
    }
    setDeliveryMethod(values.deliveryMethod);
    setSubmitting(true);
    setSubmitError(null);

    const payload: OrderDto = {
      chefId,
      receiverName: values.receiverName,
      receiverPhoneNumber: values.receiverPhoneNumber,
      receiverEmail: values.receiverEmail,
      paymentType: "CASH",
      deliveryMethod: values.deliveryMethod,
      note: values.note,
      addressDto:
        values.deliveryMethod === "DELIVERY"
          ? {
              city: values.city,
              street: values.street,
              building: values.building,
              apartment: values.apartment,
              note: "",
            }
          : null,
      createOrderDishes: items.map((item) => ({
        dishId: item.id,
        quantity: item.quantity,
        additions: item.additions?.map((a) => ({ additionId: a.id })),
      })),
      ...(appliedPromo ? { promoCode: appliedPromo.code, discount: appliedPromo.discount } : {}),
    };

    try {
      const order = await foodmeApi.createOrder(payload);
      await clearCart();
      navigate(`/orders/success?number=${order.number}`);
    } catch {
      setSubmitError("We could not place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-zinc-50 ring-1 ring-zinc-100">
          <ShoppingBag size={26} strokeWidth={1.5} className="text-zinc-400" />
        </div>
        <h1 className="font-display text-2xl font-bold text-zinc-900">Nothing to check out</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Your cart is empty. Browse chefs and add something delicious.
        </p>
        <Button asChild className="mt-6 rounded-full" size="lg">
          <Link to="/explore">Browse chefs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="chk_wrap mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 animate-fade-up md:mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl">
          Checkout
        </h1>
      </div>

      {!isAuthenticated ? (
        <div className="mx-auto max-w-md animate-fade-up [animation-delay:60ms]">
          <div className="bezel-outer shadow-diffuse">
            <div className="bezel-inner p-5">
              <p className="mb-1 text-base font-bold text-zinc-900">Account</p>
              <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                Sign in or create an account so you can track this order and see your history later.
              </p>
              <AuthPanel compact />
            </div>
          </div>
        </div>
      ) : (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="order-1 animate-fade-up [animation-delay:60ms]">
          <div className="bezel-outer shadow-diffuse">
            <div className="bezel-inner">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-zinc-900">
                    Signed in as {customer?.fullName}
                  </p>
                  <p className="truncate text-[12px] leading-4 text-zinc-500">{customer?.email}</p>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={logout}>
                  Sign out
                </Button>
              </div>
              <OrderDeliveryForm
                embedded
                onSubmit={handleSubmit}
                onDeliveryMethodChange={setDeliveryMethod}
                deliveryMethods={chefQuery.data?.deliveryMethods}
                defaultContact={
                  customer
                    ? {
                        receiverName: customer.fullName,
                        receiverPhoneNumber: customer.phoneNumber,
                        receiverEmail: customer.email,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        <aside className="order-2 space-y-3 animate-fade-up [animation-delay:120ms] lg:sticky lg:top-24">
          <div className="bezel-outer shadow-diffuse">
            <div className="bezel-inner overflow-hidden">
              <CheckoutSummary items={items} embedded />
              <PromoCodeField
                result={promoCode !== null ? promoQuery.data : undefined}
                isLoading={promoCode !== null && promoQuery.isFetching}
                isError={promoCode !== null && promoQuery.isError}
                onApply={(code) => setPromoCode(code.toUpperCase())}
                onRemove={() => setPromoCode(null)}
              />
              <CheckoutPriceSummary
                embedded
                subtotal={subtotal}
                discount={appliedPromo?.discount ?? 0}
                promoCode={appliedPromo?.code}
                deliveryPrice={deliveryMethod === "TAKEAWAY" ? 0 : deliveryPrice}
                freeDeliveryFrom={freeDeliveryFrom}
                isLoading={deliveryMethod === "DELIVERY" && deliveryPriceQuery.isLoading}
                isError={deliveryMethod === "DELIVERY" && deliveryPriceQuery.isError}
              />
              {deliveryMethod === "DELIVERY" && deliveryPriceQuery.isError && (
                <div
                  className="mx-5 mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  <span>Delivery pricing is temporarily unavailable.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-red-200 bg-white"
                    onClick={() => void deliveryPriceQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              )}
              {submitError && (
                <p className="mx-5 mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                  {submitError}
                </p>
              )}
              <div className="px-5 pb-5">
          <Button
            type="submit"
            form="checkout-form"
            size="lg"
            className="group w-full justify-center rounded-full font-semibold"
            disabled={submitting}
          >
                  {submitting ? (
                    <span className="opacity-70">Placing order...</span>
                  ) : (
                    <>
                      <span>Place order</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
                        <ArrowUpRight size={15} strokeWidth={2} />
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}

// src/app/components/admin/CreateSubscriptionForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  useSubscriptionPlans,
  useCreateSubscription,
} from "@/hooks/usePayments";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BillingCycle } from "@/hooks/usePayments";

interface CreateSubscriptionFormProps {
  businessId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateSubscriptionForm({
  businessId,
  onSuccess,
  onCancel,
}: CreateSubscriptionFormProps) {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTH");
  const [trialDays, setTrialDays] = useState<number>(0);
  const [stripeCustomerId, setStripeCustomerId] = useState("");

  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { mutate: createSubscription, isPending } = useCreateSubscription();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan) {
      toast.error("Please select a plan");
      return;
    }

    createSubscription(
      {
        businessId,
        subscriptionId: selectedPlan,
        billingCycle,
        trialPeriodDays: trialDays > 0 ? trialDays : undefined,
        stripeCustomerId: stripeCustomerId || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create subscription");
        },
      },
    );
  };

  if (plansLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="plan">Subscription Plan *</Label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger>
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="billing">Billing Cycle *</Label>
          <Select
            value={billingCycle}
            onValueChange={(value) => setBillingCycle(value as BillingCycle)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTH">Monthly</SelectItem>
              <SelectItem value="YEAR">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="trial">Trial Days (Optional)</Label>
          <Input
            id="trial"
            type="number"
            min="0"
            max="30"
            value={trialDays}
            onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="stripeCustomer">Stripe Customer ID (Optional)</Label>
          <Input
            id="stripeCustomer"
            value={stripeCustomerId}
            onChange={(e) => setStripeCustomerId(e.target.value)}
            placeholder="cus_xxx"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to create subscription without Stripe
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !selectedPlan}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Subscription"
          )}
        </Button>
      </div>
    </form>
  );
}

export enum PriceBehavior {
  PayInAdvance = "pay_in_advance",
  PayAsYouGo = "pay_as_you_go",
  Overage = "overage",
  Tiered = "tier",
  Credit = "credit_burndown",
}

export enum TiersMode {
  Volume = "volume",
  Graduated = "graduated",
}

export enum EntitlementValueType {
  Boolean = "boolean",
  Numeric = "numeric",
  Unlimited = "unlimited",
  Trait = "trait",
}

export enum FeatureType {
  Boolean = "boolean",
  Event = "event",
  Trait = "trait",
}

export enum CreditGrantReason {
  Free = "free",
  Plan = "plan",
  Purchased = "purchased",
}

export enum PriceInterval {
  OneTime = "one-time",
  Day = "day",
  Month = "month",
  Year = "year",
}

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

export enum CreditResetCadence {
  Month = "monthly",
  Year = "yearly",
  Day = "daily",
  Week = "weekly",
}

export enum CreditGrantReason {
  Free = "free",
  Plan = "plan",
  Purchased = "purchased",
}

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
  Credit = "credit",
  Numeric = "numeric",
  Trait = "trait",
  Unknown = "unknown",
  Unlimited = "unlimited",
}

export enum FeatureType {
  Boolean = "boolean",
  Event = "event",
  Trait = "trait",
}

export enum EntityType {
  User = "user",
  Company = "company",
}

export enum TraitType {
  Boolean = "boolean",
  Currency = "currency",
  Date = "date",
  Number = "number",
  String = "string",
  Url = "url",
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

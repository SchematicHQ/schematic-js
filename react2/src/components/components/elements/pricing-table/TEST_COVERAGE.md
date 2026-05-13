# PricingTable Component Test Suite

This document provides an overview of the comprehensive test coverage for the PricingTable component and its related components.

## Test Files

The test suite consists of the following files:

1. **PricingTable.test.tsx** - Core tests for the PricingTable component
2. **PricingTable.integration.test.tsx** - Integration tests and edge cases for the PricingTable component
3. **Plan.test.tsx** - Tests for the Plan subcomponent
4. **AddOn.test.tsx** - Tests for the AddOn subcomponent
5. **Entitlement.test.tsx** - Tests for the Entitlement subcomponent
6. **PeriodToggle.test.tsx** - Tests for the PeriodToggle component used by PricingTable

## Test Coverage

### PricingTable Component

- **Rendering States**
  - Loading state
  - Empty state (no plans)
  - Complete pricing table with plans
  - Plans with disabled buttons for invalid plans
  - Hidden elements based on configuration props
  - Plans with and without descriptions
  - Custom plan layouts and font styles

- **Functionality**
  - Period toggle (monthly/yearly)
  - Period selection based on available pricing
  - Proper handling of different currencies
  - Price formatting (including large numbers)
  - Call to action behavior (URLs and callbacks)
  - Error handling for API requests

- **Visibility Controls**
  - Show/hide plans
  - Show/hide headers
  - Show/hide period toggle
  - Show/hide add-ons
  - Show/hide credit information

### Plan Component

- **Rendering**
  - Basic plan details
  - Active plan styling
  - Trial subscription display
  - Invalid plans with disabled buttons
  - Custom plans
  - Free plans
  - Credit grants

- **Functionality**
  - Showing all entitlements (expand/collapse)
  - Plan inclusion text for tiered plans
  - Period display (monthly/yearly)
  - Call to action handling
  - Trial button display

### AddOn Component

- **Rendering**
  - Basic add-on details
  - Active add-on styling
  - Period display
  - Feature display

- **Functionality**
  - Add-on states (active, inactive, invalid)
  - Custom button text for different states (Choose/Change/Remove add-on)
  - Call to action handling

### Entitlement Component

- **Rendering Different Entitlement Types**
  - Numeric entitlements
  - Unlimited entitlements
  - Trait entitlements
  - Boolean entitlements
  - Credit-based entitlements
  - Usage-based entitlements
  - Consumption-based entitlements

- **Functionality**
  - Feature descriptions
  - Feature icons
  - Singular/plural form handling
  - Period display (per month, etc.)
  - Price display for usage-based entitlements
  - Rate display for consumption-based entitlements

### PeriodToggle Component

- **Rendering**
  - Toggle options
  - Selected period indicator

- **Functionality**
  - Period selection
  - Click handling
  - Keyboard navigation (accessibility)
  - Savings percentage tooltip

## Edge Cases Covered

- API errors
- Missing data (descriptions, prices, features)
- Mixed currencies in different plans
- Very large price values
- Plans with only monthly or only yearly pricing
- Missing entitlements
- Custom font styles and layout options
- Keyboard navigation for accessibility
- Standalone mode vs. embedded mode

## Mocking Strategy

The tests use MSW (Mock Service Worker) to intercept API requests and provide controlled responses for predictable test outcomes. Several hooks are also mocked to provide consistent theme and context values:

- `useEmbed` - For accessing app context and theme settings
- `useIsLightBackground` - For theme-dependent styling
- `useTrialEnd` - For trial period information
- `useTranslation` - For i18n text

## Test Best Practices Applied

1. **Component Isolation** - Each component is tested in isolation with proper mocks
2. **Integration Testing** - PricingTable integration tests verify the components work together
3. **Accessibility Testing** - Keyboard navigation tests ensure accessibility compliance
4. **Edge Case Coverage** - Various edge cases and error conditions are tested
5. **Behavioral Testing** - Focus on testing behavior rather than implementation details
6. **Comprehensive API Coverage** - All major props and configurations are tested
import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";

import { act, fireEvent, render, screen } from "../../../test/setup";
import type { SelectedPlan } from "../../../types";

import { PeriodToggle } from "./PeriodToggle";

describe("`PeriodToggle` component", () => {
  const mockOptions = ["month", "year"];
  const mockOnSelect = jest.fn();

  test("renders toggle with options", () => {
    render(
      <PeriodToggle
        options={mockOptions}
        selectedOption="month"
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText("Billed monthly")).toBeInTheDocument();
    expect(screen.getByText("Billed yearly")).toBeInTheDocument();
  });

  test("selects correct option initially", () => {
    render(
      <PeriodToggle
        options={mockOptions}
        selectedOption="year"
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText("Billed yearly")).toBeInTheDocument();
  });

  test("calls `onSelect` when clicking an option", () => {
    render(
      <PeriodToggle
        options={mockOptions}
        selectedOption="month"
        onSelect={mockOnSelect}
      />,
    );

    const yearlyOption = screen.getByText("Billed yearly");
    act(() => {
      fireEvent.click(yearlyOption);
    });

    expect(mockOnSelect).toHaveBeenCalledWith("year");
  });

  test("calls `onSelect` when pressing `Enter` on an option", () => {
    render(
      <PeriodToggle
        options={mockOptions}
        selectedOption="month"
        onSelect={mockOnSelect}
      />,
    );

    const yearlyOption = screen.getByText("Billed yearly");
    act(() => {
      fireEvent.focus(yearlyOption);
      fireEvent.keyDown(yearlyOption, { key: "Enter" });
    });

    expect(mockOnSelect).toHaveBeenCalledWith("year");
  });

  test("calls `onSelect` when pressing `Space` on an option", () => {
    render(
      <PeriodToggle
        options={mockOptions}
        selectedOption="month"
        onSelect={mockOnSelect}
      />,
    );

    const yearlyOption = screen.getByText("Billed yearly");

    act(() => {
      fireEvent.focus(yearlyOption);
      fireEvent.keyDown(yearlyOption, { key: " " });
    });

    expect(mockOnSelect).toHaveBeenCalledWith("year");
  });

  test("displays savings tooltip when a plan is provided", () => {
    const mockPlan = {
      monthlyPrice: { price: 1000, priceDecimal: "1000", currency: "usd" },
      yearlyPrice: { price: 10000, priceDecimal: "10000", currency: "usd" },
    };

    render(
      <PeriodToggle
        options={mockOptions}
        selectedOption="month"
        selectedPlan={mockPlan as SelectedPlan}
        onSelect={mockOnSelect}
      />,
    );

    const yearlyOption = screen.getByText("Billed yearly");
    expect(yearlyOption).toBeInTheDocument();

    act(() => {
      fireEvent.focus(yearlyOption);
      fireEvent.pointerEnter(yearlyOption);
    });

    expect(
      screen.getByText("Save up to 16.67% with yearly billing"),
    ).toBeInTheDocument();
  });

  test("renders with custom options", () => {
    const customOptions = ["quarter", "year"];

    render(
      <PeriodToggle
        options={customOptions}
        selectedOption="quarter"
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText("Billed quarterly")).toBeInTheDocument();
    expect(screen.getByText("Billed yearly")).toBeInTheDocument();
  });
});

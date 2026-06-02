import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { Input } from "../Input";

describe("Input", () => {
  it("renders label and value", () => {
    const { getByText, getByDisplayValue } = render(
      <Input label="Email" value="test@example.com" onChangeText={jest.fn()} />
    );

    expect(getByText("EMAIL")).toBeTruthy();
    expect(getByDisplayValue("test@example.com")).toBeTruthy();
  });

  it("calls onChangeText when edited", () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Email" value="" onChangeText={onChangeText} />
    );

    fireEvent.changeText(getByPlaceholderText("Email"), "user@example.com");

    expect(onChangeText).toHaveBeenCalledWith("user@example.com");
  });

  it("renders validation errors", () => {
    const { getByText } = render(
      <Input label="Password" value="" error="Password is required" />
    );

    expect(getByText("PASSWORD")).toBeTruthy();
    expect(getByText("Password is required")).toBeTruthy();
  });
});

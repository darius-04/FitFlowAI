import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { Button } from "../Button";

describe("Button", () => {
  it("renders an uppercase title and handles presses", () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = render(
      <Button title="Save meal" onPress={onPress} testID="save-btn" />
    );

    expect(getByText("SAVE MEAL")).toBeTruthy();

    fireEvent.press(getByTestId("save-btn"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress while disabled", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button title="Save meal" onPress={onPress} disabled testID="save-btn" />
    );

    fireEvent.press(getByTestId("save-btn"));

    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a loading indicator instead of text while loading", () => {
    const { queryByText, getByTestId } = render(
      <Button title="Save meal" onPress={jest.fn()} loading testID="save-btn" />
    );

    expect(getByTestId("save-btn")).toBeTruthy();
    expect(queryByText("SAVE MEAL")).toBeNull();
  });
});

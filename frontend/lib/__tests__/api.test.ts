jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

import { resolveApiBase } from "../api";

describe("resolveApiBase", () => {
  it("uses the Android emulator URL when no environment URL is configured", () => {
    expect(resolveApiBase()).toBe("http://10.0.2.2:8000/api");
  });

  it("adds the API suffix when the environment URL points to the backend host", () => {
    expect(resolveApiBase("https://fitflow.example.com")).toBe("https://fitflow.example.com/api");
  });

  it("keeps an existing API suffix", () => {
    expect(resolveApiBase("https://fitflow.example.com/api")).toBe("https://fitflow.example.com/api");
  });

  it("trims whitespace and trailing slashes before normalizing the URL", () => {
    expect(resolveApiBase(" https://fitflow.example.com/// ")).toBe("https://fitflow.example.com/api");
  });
});

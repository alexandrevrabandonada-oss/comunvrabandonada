import { describe, expect, it } from "vitest";
import { isAllowedQualityMetricOrigin } from "./quality-metric-origin";

describe("isAllowedQualityMetricOrigin", () => {
  it("accepts an absent or exact same origin", () => {
    expect(
      isAllowedQualityMetricOrigin({
        origin: null,
        requestUrl: "https://comunsocial.online/api/comun/quality-metrics",
      }),
    ).toBe(true);
    expect(
      isAllowedQualityMetricOrigin({
        origin: "https://comunsocial.online",
        requestUrl: "https://comunsocial.online/api/comun/quality-metrics",
      }),
    ).toBe(true);
  });

  it("accepts equivalent loopback aliases in development", () => {
    expect(
      isAllowedQualityMetricOrigin({
        origin: "http://127.0.0.1:3114",
        requestUrl: "http://localhost:3114/api/comun/quality-metrics",
        environment: "development",
      }),
    ).toBe(true);
  });

  it("rejects loopback aliases in production, port changes and external origins", () => {
    expect(
      isAllowedQualityMetricOrigin({
        origin: "http://127.0.0.1:3114",
        requestUrl: "http://localhost:3114/api/comun/quality-metrics",
        environment: "production",
      }),
    ).toBe(false);
    expect(
      isAllowedQualityMetricOrigin({
        origin: "http://127.0.0.1:3999",
        requestUrl: "http://localhost:3114/api/comun/quality-metrics",
        environment: "development",
      }),
    ).toBe(false);
    expect(
      isAllowedQualityMetricOrigin({
        origin: "https://attacker.example",
        requestUrl: "https://comunsocial.online/api/comun/quality-metrics",
        environment: "production",
      }),
    ).toBe(false);
  });
});

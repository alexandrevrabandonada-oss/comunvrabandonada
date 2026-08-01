import { describe, expect, it } from "vitest";
import {
  classifyComunRoute,
  metricBucketValue,
  metricValueBucket,
  routeBudgetClass,
} from "./quality-performance";

describe("quality performance privacy contracts", () => {
  it("reduces detailed routes to non-identifying classes", () => {
    expect(classifyComunRoute("/comun/pautas/a-private-looking-slug")).toBe(
      "process",
    );
    expect(classifyComunRoute("/comun/admin/operacao/item/123")).toBe("admin");
    expect(classifyComunRoute("/comun/caixa-de-entrada/123")).toBe("personal");
    expect(classifyComunRoute("/comun/buscar?q=never-store-this")).toBe(
      "search",
    );
    expect(classifyComunRoute("/comun/recuperar-acesso")).toBe("auth");
    expect(classifyComunRoute("/comun/redefinir-acesso")).toBe("auth");
  });

  it("uses bounded aggregate buckets", () => {
    expect(metricValueBucket("LCP", 2461)).toBe(2500);
    expect(metricValueBucket("INP", 187)).toBe(175);
    expect(metricBucketValue("CLS", metricValueBucket("CLS", 0.084))).toBe(
      0.084,
    );
  });

  it("keeps separate budgets for rich and cultural surfaces", () => {
    expect(routeBudgetClass("search")).toBe("rich");
    expect(routeBudgetClass("culture")).toBe("visual");
    expect(routeBudgetClass("help_security")).toBe("simple");
  });
});

import { describe, expect, it } from "vitest";
import { APP_NAME, DEFAULT_APP_NAME, applyBrandName } from "./brand";

describe("brand configuration", () => {
  it("defaults to Eenza CRM", () => {
    expect(DEFAULT_APP_NAME).toBe("Eenza CRM");
    expect(APP_NAME).toBeTruthy();
  });

  it("returns the input reference unchanged when brandName matches DEFAULT_APP_NAME", () => {
    const catalogue = {
      Sidebar: { title: "Eenza CRM" },
      Settings: { registered: "Registered — Meta will deliver events to Eenza CRM" },
    };
    expect(applyBrandName(catalogue, "Eenza CRM")).toBe(catalogue);
    expect(applyBrandName(catalogue, "   ")).toBe(catalogue);
  });

  it("recursively replaces DEFAULT_APP_NAME when a custom brandName is provided", () => {
    const catalogue = {
      Sidebar: { title: "Eenza CRM" },
      Settings: {
        registered: "Registrado: Meta entregará los eventos a Eenza CRM",
        nested: ["Eenza CRM", 42],
      },
    };
    const updated = applyBrandName(catalogue, "Acme CRM");
    expect(updated).toEqual({
      Sidebar: { title: "Acme CRM" },
      Settings: {
        registered: "Registrado: Meta entregará los eventos a Acme CRM",
        nested: ["Acme CRM", 42],
      },
    });
  });
});

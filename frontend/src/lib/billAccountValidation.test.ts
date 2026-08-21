import { describe, expect, it } from "vitest";

import {
  isValidBillAccountName,
  isValidBillAccountUsername,
  sanitizeBillAccountName,
  sanitizeBillAccountUsername,
} from "./billAccountValidation";

describe("bill account international text", () => {
  it.each(["Çağla", "Gökçe Yılmaz", "Jürgen", "François", "María-José", "João", "O’Connor"])(
    "accepts the name %s",
    (name) => expect(isValidBillAccountName(name)).toBe(true),
  );

  it("keeps supported international letters while removing invalid symbols", () => {
    expect(sanitizeBillAccountName("Çağla Müller 42!" )).toBe("Çağla Müller ");
    expect(sanitizeBillAccountUsername("françois_çelik!" )).toBe("françois_çelik");
  });

  it.each(["çağla.öz", "müller_7", "françois-2", "josé23", "joão.pt"])(
    "accepts the username %s",
    (username) => expect(isValidBillAccountUsername(username)).toBe(true),
  );
});

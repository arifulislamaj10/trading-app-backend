import { user_validations } from "../app/modules/user/user.validation";
import { master_validations } from "../app/modules/master/master.validation";

describe("BUG-022 safe account deletion confirmation", () => {
  describe("user_validations.delete_account_confirmation", () => {
    it("accepts confirmation DELETE", async () => {
      await expect(
        user_validations.delete_account_confirmation.parseAsync({
          confirmation: "DELETE",
        }),
      ).resolves.toEqual({ confirmation: "DELETE" });
    });

    it("rejects missing confirmation", async () => {
      await expect(
        user_validations.delete_account_confirmation.parseAsync({}),
      ).rejects.toThrow();
    });

    it("rejects incorrect confirmation strings", async () => {
      await expect(
        user_validations.delete_account_confirmation.parseAsync({
          confirmation: "delete",
        }),
      ).rejects.toThrow();
      await expect(
        user_validations.delete_account_confirmation.parseAsync({
          confirmation: "YES",
        }),
      ).rejects.toThrow();
    });
  });

  describe("master_validations.delete_account_confirmation", () => {
    it("accepts confirmation DELETE", async () => {
      await expect(
        master_validations.delete_account_confirmation.parseAsync({
          confirmation: "DELETE",
        }),
      ).resolves.toEqual({ confirmation: "DELETE" });
    });

    it("rejects bypass attempts without DELETE", async () => {
      await expect(
        master_validations.delete_account_confirmation.parseAsync({
          confirmation: "confirm",
        }),
      ).rejects.toThrow();
    });
  });
});

import { completeTrainingSchema } from "../app/modules/training/training.validation";

const parse = (body: unknown) => completeTrainingSchema.parseAsync(body ?? {});

describe("completeTrainingSchema", () => {
  it("accepts empty body (Swagger default)", async () => {
    await expect(parse(undefined)).resolves.toEqual({});
    await expect(parse({})).resolves.toEqual({});
  });

  it("accepts quizScore as number or string", async () => {
    await expect(parse({ quizScore: 85 })).resolves.toEqual({ quizScore: 85 });
    await expect(parse({ quizScore: "90" })).resolves.toEqual({
      quizScore: 90,
    });
  });

  it("accepts markAllLessonsComplete", async () => {
    await expect(parse({ markAllLessonsComplete: true })).resolves.toEqual({
      markAllLessonsComplete: true,
    });
  });
});

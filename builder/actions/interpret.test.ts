import { describe, expect, it, vi } from "vitest";
import { interpretActionSteps, ActionExecutionError } from "./interpret";

describe("interpretActionSteps", () => {
  it("runs steps sequentially and halts on error", async () => {
    const notify = vi.fn();
    const navigate = vi.fn();

    await interpretActionSteps(
      [
        { type: "notify", level: "info", message: "first" },
        { type: "navigate", to: "javascript:alert(1)" },
        { type: "notify", level: "info", message: "second" },
      ],
      {
        scope: {},
        navigate,
        setVariable: vi.fn(),
        notify,
        openModal: vi.fn(),
        closeModal: vi.fn(),
      },
    ).catch((error) => {
      expect(error).toBeInstanceOf(ActionExecutionError);
    });

    expect(notify).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("skips steps when when-condition is false", async () => {
    const notify = vi.fn();
    await interpretActionSteps(
      [
        {
          type: "notify",
          level: "success",
          message: "hidden",
          when: { left: 1, op: "eq", right: 2 },
        },
        { type: "notify", level: "success", message: "shown" },
      ],
      {
        scope: {},
        navigate: vi.fn(),
        setVariable: vi.fn(),
        notify,
        openModal: vi.fn(),
        closeModal: vi.fn(),
      },
    );
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith("success", "shown");
  });

  it("blocks javascript: navigation targets", async () => {
    await expect(
      interpretActionSteps(
        [{ type: "navigate", to: "javascript:alert(1)" }],
        {
          scope: {},
          navigate: vi.fn(),
          setVariable: vi.fn(),
          notify: vi.fn(),
          openModal: vi.fn(),
          closeModal: vi.fn(),
        },
      ),
    ).rejects.toThrow(/safe URL/);
  });
});

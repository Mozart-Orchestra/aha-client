import { describe, expect, it } from "vitest";
import { createTaskFromChatMessage, extractAssigneeMention, shouldCreateTaskFromMessage } from "./taskChatSync";

describe("taskChatSync", () => {
    it("extracts the first @mention as assignee hint", () => {
        expect(extractAssigneeMention("创建任务：修复样式 @master @builder")).toBe("master");
    });

    it("creates user task payload from chat message", () => {
        const payload = createTaskFromChatMessage("创建任务：补全看板命令 @master", "user-1");

        expect(payload).not.toBeNull();
        expect(payload?.title).toBe("补全看板命令 @master");
        expect(payload?.source).toBe("user");
        expect(payload?.taskType).toBe("user");
        expect(payload?.assigneeHint).toBe("master");
        expect(payload?.reporterId).toBe("user-1");
    });

    it("detects task creation keywords", () => {
        expect(shouldCreateTaskFromMessage("todo: finish ui")).toBe(true);
        expect(shouldCreateTaskFromMessage("just chat message")).toBe(false);
    });
});

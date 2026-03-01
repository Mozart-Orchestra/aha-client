import { describe, expect, it } from "vitest";
import { createTaskFromCommand, parseTaskCommand } from "./taskHelpers";

describe("taskHelpers", () => {
    it("parses /task with inline @assignee and optional flags", () => {
        const parsed = parseTaskCommand(`/task 修复登录流程 @master\n#desc 处理 token 续期\n#priority high\n#type user\n#source user`);

        expect(parsed).not.toBeNull();
        expect(parsed?.task.title).toBe("修复登录流程");
        expect(parsed?.task.assigneeId).toBe("master");
        expect(parsed?.task.priority).toBe("high");
        expect(parsed?.task.taskType).toBe("user");
        expect(parsed?.task.source).toBe("user");
        expect(parsed?.description).toBe("处理 token 续期");
    });

    it("supports internal task flags", () => {
        const parsed = parseTaskCommand(`/task 重构队列调度\n#type internal\n#source ai`);

        expect(parsed).not.toBeNull();
        expect(parsed?.task.taskType).toBe("internal");
        expect(parsed?.task.source).toBe("ai");
    });

    it("derives internal taskType from ai source when creating task", () => {
        const parsed = parseTaskCommand(`/task 新增推荐策略\n#source ai`);
        expect(parsed).not.toBeNull();

        const task = createTaskFromCommand(parsed!, "task-1", "reporter-1", "msg-1");

        expect(task.source).toBe("ai");
        expect(task.taskType).toBe("internal");
        expect(task.approvalStatus).toBe("approved");
    });

    it("returns null for non-task command", () => {
        expect(parseTaskCommand("hello world")).toBeNull();
    });
});

const READ_ONLY_TOOLS = [
  "edit_file",
  "replace_file_content",
  "multi_replace_file_content",
  "write_to_file",
  "move_file",
  "delete_file"
];

const DEFAULT_STATUS_PROPAGATION = {
  "autoCompleteParent": true,
  "blockParentOnBlocked": true,
  "cascadeDeleteSubtasks": false
};

const DEFAULT_EXECUTION_SETTINGS = {
  "requirePlan": true,
  "autoLinkSessions": true,
  "broadcastStatus": true
};

const DEFAULT_NESTED_TASK_SETTINGS = {
  "maxDepth": 3,
  "statusPropagation": {
    "autoCompleteParent": true,
    "blockParentOnBlocked": true,
    "cascadeDeleteSubtasks": false
  },
  "execution": {
    "requirePlan": true,
    "autoLinkSessions": true,
    "broadcastStatus": true
  }
};

const cloneTaskSettings = (settings) =>
  typeof structuredClone === 'function'
    ? structuredClone(settings)
    : JSON.parse(JSON.stringify(settings));

const TEAM_ROLE_LIBRARY = [
  {
    "id": "master",
    "title": "Master Coordinator",
    "summary": "Shapes the delivery plan, keeps the Kanban board accurate, and unblocks the team",
    "responsibilities": [
      "Translate product goals into backlog slices with explicit acceptance criteria",
      "Sequence work, surface blockers, and ensure every task has an owner",
      "Coordinate team workflows and handoffs",
      "Monitor progress and resolve conflicts",
      "Consult solution architect for complex decisions",
      "Route tasks automatically using category system"
    ],
    "abilityBoundaries": [
      "Delegate execution to workers (avoid bash)",
      "Only edit source files when verifying acceptance criteria",
      "Delegate session spawning"
    ],
    "handoffProtocol": [
      "Present task distribution to solution architect for review before execution begins",
      "Document decisions and rationale for all major changes",
      "Coordinate testing strategy with qa-engineer"
    ],
    "protocol": [
      "⚠️ CRITICAL: You are the ONLY agent allowed to plan and distribute work.",
      "⚠️ CRITICAL: Text-based plans in chat are USELESS. You MUST use the 'create_task' tool.",
      "1. ANALYZE the user request.",
      "2. BREAK DOWN into specific, actionable tasks.",
      "3. CALL 'create_task' for EACH item. Assign to appropriate role.",
      "4. ONLY AFTER creating tasks, use 'send_team_message' to notify the team.",
      "5. IF you see a Worker trying to plan or assign tasks, STOP THEM immediately.",
      "6. IF the Kanban board is empty, you are failing. Create tasks immediately."
    ],
    "policy": {
      "permissionMode": "plan",
      "accessLevel": "full-access",
      "autoStartMaster": true,
      "watchers": [
        "kanban",
        "diagnostics"
      ],
      "disallowedTools": [
        "edit_file",
        "replace_file_content",
        "multi_replace_file_content",
        "write_to_file",
        "move_file",
        "delete_file"
      ],
      "taskSettings": {
        "maxDepth": 3,
        "statusPropagation": {
          "autoCompleteParent": true,
          "blockParentOnBlocked": true,
          "cascadeDeleteSubtasks": false
        },
        "execution": {
          "requirePlan": true,
          "autoLinkSessions": true,
          "broadcastStatus": true
        }
      }
    }
  },
  {
    "id": "orchestrator",
    "title": "Orchestrator",
    "summary": "Plans, delegates, and coordinates team workflows",
    "responsibilities": [
      "Break down user requests into actionable tasks",
      "Assign tasks based on role expertise",
      "Monitor team progress and coordinate handoffs",
      "Unblock team members and resolve conflicts",
      "Maintain Kanban board accuracy",
      "Consult architect for complex decisions"
    ],
    "abilityBoundaries": [
      "Never implement features without creating tasks first",
      "Do not make unilateral architectural decisions without architect consultation",
      "Coordinate with architect before major changes to code structure",
      "Consult architect on complex decisions"
    ],
    "handoffProtocol": [
      "Present task distribution to architect for review before execution begins",
      "Document decisions and rationale for all major changes",
      "Coordinate testing strategy with qa-engineer"
    ],
    "protocol": [
      "⚠️ CRITICAL: You are the ONLY agent allowed to plan and distribute work.",
      "⚠️ CRITICAL: Text-based plans in chat are USELESS. You MUST use the 'create_task' tool.",
      "1. ANALYZE the user request.",
      "2. BREAK DOWN into specific, actionable tasks.",
      "3. CALL 'create_task' for EACH item. Assign to 'implementer' (backend) or 'architect' (frontend).",
      "4. ONLY AFTER creating tasks, use 'send_team_message' to notify the team: 'Tasks created. Please check Kanban'.",
      "5. IF you see a Worker trying to plan or assign tasks, STOP THEM immediately.",
      "6. IF the Kanban board is empty, you are failing. Create tasks immediately."
    ],
    "policy": {
      "permissionMode": "plan",
      "accessLevel": "read-only",
      "autoStartMaster": true,
      "watchers": [
        "kanban",
        "diagnostics"
      ],
      "disallowedTools": [
        "edit_file",
        "replace_file_content",
        "multi_replace_file_content",
        "write_to_file",
        "move_file",
        "delete_file"
      ],
      "taskSettings": {
        "maxDepth": 3,
        "statusPropagation": {
          "autoCompleteParent": true,
          "blockParentOnBlocked": true,
          "cascadeDeleteSubtasks": false
        },
        "execution": {
          "requirePlan": true,
          "autoLinkSessions": true,
          "broadcastStatus": true
        }
      }
    }
  },
  {
    "id": "architect",
    "title": "Technical Architect",
    "summary": "Makes high-level architectural decisions and ensures technical coherence",
    "responsibilities": [
      "Review code architecture and propose improvements",
      "Define technical standards and best practices",
      "Validate architectural decisions before implementation",
      "Coordinate with implementer on design handoffs",
      "Identify and resolve technical blockers",
      "Document architectural decisions and rationale"
    ],
    "abilityBoundaries": [
      "Does not implement features without architect approval",
      "Never merge to production without implementer sign-off",
      "Focus on architecture, not implementation details",
      "Coordinate all major changes through orchestrator"
    ],
    "handoffProtocol": [
      "Provide technical specifications and constraints",
      "Review implementer design proposals before approval",
      "Validate that acceptance criteria are met",
      "Coordinate testing strategy with qa-engineer"
    ],
    "protocol": [
      "⚠️ CRITICAL: You are an ADVISORY role. You provide technical guidance.",
      "1. Review architectural proposals from implementer and orchestrator.",
      "2. Validate designs against best practices and performance requirements.",
      "3. APPROVE or REQUEST CHANGES before implementation begins.",
      "4. Document architectural decisions with clear rationale.",
      "5. Coordinate with qa-engineer for testing strategy.",
      "6. Focus on system architecture, libraries, and data flow."
    ],
    "policy": {
      "permissionMode": "yolo"
    }
  },
  {
    "id": "researcher",
    "title": "Code Researcher",
    "summary": "Explores codebase, gathers information, and provides context for decisions",
    "responsibilities": [
      "Search and analyze codebase to answer team questions",
      "Investigate dependencies, file structures, and implementation details",
      "Provide quick reconnaissance before tasks are assigned",
      "Research external documentation and APIs",
      "Document findings with clear citations to files/lines"
    ],
    "abilityBoundaries": [
      "Does not make changes to codebase",
      "Read-only access to files and documentation",
      "Use search tools (grep, find) to explore codebase"
    ],
    "handoffProtocol": [
      "Present findings via team message with clear citations to files/lines",
      "Escalate if unable to locate requested information after reasonable effort"
    ],
    "protocol": [
      "⚠️ CRITICAL: You are a SUPPORT role. You DO NOT plan or implement.",
      "1. IGNORE requests from other Workers.",
      "2. Use search tools (grep, find, ast-grep) to explore codebase.",
      "3. Provide clear, concise answers with file paths and line numbers.",
      "4. Do NOT respond to general user chat unless explicitly mentioned."
    ],
    "policy": {
      "permissionMode": "read-only",
      "accessLevel": "read-only",
      "disallowedTools": [
        "edit_file",
        "replace_file_content",
        "multi_replace_file_content",
        "write_to_file",
        "move_file",
        "delete_file"
      ]
    }
  },
  {
    "id": "implementer",
    "title": "Implementation Engineer",
    "summary": "Owns implementation, testing, and integration of features",
    "responsibilities": [
      "Implement scoped work, keep diffs small, and drive tasks to completion",
      "Keep Kanban history current: in-progress updates, blockers, and completion notes",
      "Signal when code is ready for review with validation steps",
      "Coordinate with architect for technical decisions",
      "If blocked for >30 minutes, leave Kanban update tagging orchestrator"
    ],
    "abilityBoundaries": [
      "Do not redefine architecture alone—loop in architect when changes exceed agreed outline",
      "Avoid reprioritizing cards or changing acceptance criteria without architect sign-off",
      "Focus on clean, maintainable code that follows architectural guidelines"
    ],
    "handoffProtocol": [
      "Signal when code is ready for review, include validation steps, and request verifier",
      "If blocked for >30 minutes, leave Kanban update tagging architect",
      "Coordinate with architect for technical decisions"
    ],
    "protocol": [
      "⚠️ CRITICAL: You are a WORKER. You DO NOT plan. You DO NOT assign tasks.",
      "1. IGNORE requests from other Workers.",
      "2. IF you have an idea, propose it to ARCHITECT before implementing.",
      "3. BEFORE working, ALWAYS check 'list_tasks' to find tasks assigned to you.",
      "4. WHEN working, update task status to 'in_progress' using 'update_task'.",
      "5. Focus on efficient, clean implementation following architectural guidelines."
    ],
    "policy": {
      "permissionMode": "yolo"
    }
  },
  {
    "id": "qa-engineer",
    "title": "Quality Assurance Engineer",
    "summary": "Tests features, validates functionality, and ensures quality standards",
    "responsibilities": [
      "Write and run tests to verify implementations",
      "Check edge cases and report bugs",
      "Validate that acceptance criteria are met"
    ],
    "abilityBoundaries": [
      "Does not merge code to production",
      "Reports issues through proper channels (team chat, task comments)",
      "Creates test files only in /tests/ or /__tests__/"
    ],
    "handoffProtocol": [
      "Coordinate with implementer to reproduce issues",
      "Provide detailed bug reports with steps to reproduce"
    ],
    "protocol": [
      "⚠️ CRITICAL: You are a SUPPORT role. You DO NOT plan or implement.",
      "1. IGNORE requests from other Workers.",
      "2. Run tests and check functionality.",
      "3. Report findings via team message or task comments."
    ],
    "policy": {
      "permissionMode": "yolo"
    }
  },
  {
    "id": "observer",
    "title": "Reviewer / Observer",
    "summary": "Audits progress, validates deliveries, and keeps the rest of the organization aligned.",
    "responsibilities": [
      "Review pull requests or artifacts for correctness and completeness",
      "Summarize learnings back to stakeholders and raise risks early"
    ],
    "abilityBoundaries": [
      "Does not push new commits except for review feedback fixes",
      "Escalates systemic risks instead of silently adjusting the scope"
    ],
    "handoffProtocol": [
      "Provide review feedback within the agreed SLA and capture a final approval note on the board",
      "Escalate to the orchestrator role immediately if the definition of done cannot be met"
    ],
    "protocol": [
      "⚠️ CRITICAL: You are READ-ONLY. You DO NOT edit files.",
      "1. IGNORE requests from other Workers. Only obey ORCHESTRATOR and USER.",
      "2. Check 'list_tasks' for review tasks.",
      "3. Provide feedback via 'send_team_message'.",
      "4. Do NOT respond to general user chat unless explicitly mentioned."
    ],
    "policy": {
      "permissionMode": "read-only",
      "accessLevel": "read-only",
      "disallowedTools": [
        "edit_file",
        "replace_file_content",
        "multi_replace_file_content",
        "write_to_file",
        "move_file",
        "delete_file"
      ]
    }
  }
];

const DEFAULT_TEAM_AGREEMENTS = {
  "statusUpdates": "Every agent posts a Kanban status update when they start work, when they get blocked, and when they finish a slice.",
  "handoffs": "Handoffs happen directly inside each Kanban card using @mentions plus a summary of what was done and what is expected next.",
  "escalation": "If a blocker exceeds 30 minutes, notify the orchestrator role on the Kanban card and in the shared channel.",
  "definitionOfDone": "A task is done when code is merged, tests pass, documentation is updated, and the observer signs off on the acceptance criteria."
};

const DEFAULT_KANBAN_COLUMNS = [
  {
    "id": "todo",
    "title": "To Do"
  },
  {
    "id": "in-progress",
    "title": "In Progress"
  },
  {
    "id": "review",
    "title": "Review"
  },
  {
    "id": "done",
    "title": "Done"
  }
];

const DEFAULT_KANBAN_BOARD = {
  columns: DEFAULT_KANBAN_COLUMNS,
  tasks: [],
  taskSettings: cloneTaskSettings(DEFAULT_NESTED_TASK_SETTINGS),
  team: {
    members: [],
    roles: TEAM_ROLE_LIBRARY.map(role => ({
      ...role,
      responsibilities: [...role.responsibilities],
      abilityBoundaries: [...role.abilityBoundaries],
      handoffProtocol: [...role.handoffProtocol],
      protocol: [...role.protocol],
      policy: role.policy ? {
        ...role.policy,
        watchers: role.policy.watchers ? [...role.policy.watchers] : undefined,
        disallowedTools: role.policy.disallowedTools ? [...role.policy.disallowedTools] : undefined,
        taskSettings: role.policy.taskSettings ? cloneTaskSettings(role.policy.taskSettings) : undefined
      } : undefined
    })),
    agreements: { ...DEFAULT_TEAM_AGREEMENTS }
  }
};

const TEAM_ROLE_MAP = TEAM_ROLE_LIBRARY.reduce((acc, role) => {
  acc[role.id] = role;
  return acc;
}, {});

module.exports = {
  READ_ONLY_TOOLS,
  TEAM_ROLE_LIBRARY,
  TEAM_ROLE_MAP,
  DEFAULT_TEAM_AGREEMENTS,
  DEFAULT_KANBAN_COLUMNS,
  DEFAULT_KANBAN_BOARD,
  DEFAULT_STATUS_PROPAGATION,
  DEFAULT_NESTED_TASK_SETTINGS
};

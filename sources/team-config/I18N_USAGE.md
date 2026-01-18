# Team Roles i18n 使用指南

## 概述

团队角色现已完全本地化，支持英文和简体中文。所有 7 个角色的 title, summary, responsibilities, abilityBoundaries, handoffProtocol, 和 protocol 都已翻译。

## 使用方法

### 1. 获取所有本地化角色

```typescript
import { getLocalizedTeamRoles } from '@/team-config/i18n'

const roles = getLocalizedTeamRoles()
// 返回当前语言的所有角色（英文或中文）
console.log(roles)
// [
//   {
//     id: 'master',
//     title: 'Master Coordinator', // 或 '主控协调员'
//     summary: 'Shapes the delivery plan...', // 或 '制定交付计划...'
//     responsibilities: [...],
//     abilityBoundaries: [...],
//     handoffProtocol: [...],
//     protocol: [...]
//   },
//   ... 其他 6 个角色
// ]
```

### 2. 获取单个角色

```typescript
import { getLocalizedTeamRole } from '@/team-config/i18n'

const masterRole = getLocalizedTeamRole('master')
console.log(masterRole.title) // "Master Coordinator" 或 "主控协调员"
```

### 3. 获取角色标题（用于 UI 显示）

```typescript
import { getTeamRoleTitle } from '@/team-config/i18n'

const title = getTeamRoleTitle('framer')
console.log(title) // "Framing Engineer" 或 "架构师"
```

### 4. 获取角色摘要（用于描述）

```typescript
import { getTeamRoleSummary } from '@/team-config/i18n'

const summary = getTeamRoleSummary('builder')
console.log(summary) // "Owns implementation..." 或 "负责从架构..."
```

### 5. 获取所有角色标题映射（用于下拉菜单）

```typescript
import { getTeamRoleTitles } from '@/team-config/i18n'

const titles = getTeamRoleTitles()
console.log(titles)
// {
//   master: "Master Coordinator",
//   framer: "Framing Engineer",
//   builder: "Builder / Executor",
//   scout: "Scout / Explorer",
//   scribe: "Scribe / Documenter",
//   qa: "Quality Assurance",
//   reviewer: "Reviewer / Observer"
// }
```

## 在 UI 组件中使用

### 示例 1: 角色选择器

```typescript
import { getLocalizedTeamRoles } from '@/team-config/i18n'
import { Picker } from '@react-native-picker/picker'

function RoleSelector({ selectedRole, onRoleChange }) {
  const roles = getLocalizedTeamRoles()

  return (
    <Picker
      selectedValue={selectedRole}
      onValueChange={onRoleChange}
    >
      {roles.map(role => (
        <Picker.Item
          key={role.id}
          label={role.title}
          value={role.id}
        />
      ))}
    </Picker>
  )
}
```

### 示例 2: 角色详情显示

```typescript
import { getLocalizedTeamRole } from '@/team-config/i18n'
import { Text, View } from 'react-native'

function RoleDetails({ roleId }) {
  const role = getLocalizedTeamRole(roleId)

  if (!role) return null

  return (
    <View>
      <Text style={styles.title}>{role.title}</Text>
      <Text style={styles.summary}>{role.summary}</Text>

      <Text style={styles.sectionTitle}>职责：</Text>
      {role.responsibilities.map((resp, index) => (
        <Text key={index} style={styles.item}>• {resp}</Text>
      ))}

      <Text style={styles.sectionTitle}>能力边界：</Text>
      {role.abilityBoundaries.map((boundary, index) => (
        <Text key={index} style={styles.item}>• {boundary}</Text>
      ))}
    </View>
  )
}
```

### 示例 3: 替换现有的 DEFAULT_TEAM_ROLES

**之前（硬编码）：**
```typescript
import { DEFAULT_TEAM_ROLES } from '@/team-config'

function TeamCreation() {
  return (
    <FlatList
      data={DEFAULT_TEAM_ROLES}
      renderItem={({ item }) => (
        <Text>{item.title}</Text> // 总是英文
      )}
    />
  )
}
```

**之后（本地化）：**
```typescript
import { getLocalizedTeamRoles } from '@/team-config/i18n'

function TeamCreation() {
  const roles = getLocalizedTeamRoles()

  return (
    <FlatList
      data={roles}
      renderItem={({ item }) => (
        <Text>{item.title}</Text> // 根据当前语言显示
      )}
    />
  )
}
```

## 翻译键结构

在 `@/text` 系统中，翻译键的结构如下：

```
teamRoles.master.title
teamRoles.master.summary
teamRoles.master.responsibilities[0]
teamRoles.master.responsibilities[1]
...
teamRoles.framer.title
...
```

## 支持的角色

1. **master** - Master Coordinator / 主控协调员
2. **framer** - Framing Engineer / 架构师
3. **builder** - Builder / Executor / 构建者/执行者
4. **scout** - Scout / Explorer / 侦察兵/探索者
5. **scribe** - Scribe / Documenter / 记录员/文档员
6. **qa** - Quality Assurance / 质量保证
7. **reviewer** - Reviewer / Observer / 审查员/观察员

## 语言切换

当用户在设置中切换语言时，`getLocalizedTeamRoles()` 和其他辅助函数会自动返回新语言的翻译。无需手动刷新或重新加载。

## 类型安全

所有辅助函数都是完全类型安全的。TypeScript 会自动推断返回类型，并提供完整的智能提示。

## 注意事项

1. **policy 对象**：不包含翻译，因为它包含配置数据而非用户界面文本
2. **向后兼容**：原始的 `TEAM_ROLE_LIBRARY` 保持不变，确保现有代码继续工作
3. **性能**：辅助函数是轻量级的，调用时没有显著性能开销

## 迁移指南

### 步骤 1: 替换导入

```typescript
// 旧代码
import { DEFAULT_TEAM_ROLES } from '@/team-config'

// 新代码
import { getLocalizedTeamRoles } from '@/team-config/i18n'
```

### 步骤 2: 更新数据获取

```typescript
// 旧代码
const roles = DEFAULT_TEAM_ROLES

// 新代码
const roles = getLocalizedTeamRoles()
```

### 步骤 3: 测试语言切换

1. 打开应用设置
2. 切换语言（English ↔ 简体中文）
3. 检查所有角色显示是否正确更新

## 故障排除

### 问题：角色显示为英文，但用户选择的是中文

**解决方案：**
- 确认 `@/text` 系统的语言设置正确
- 检查 `t('teamRoles.master.title')` 是否返回中文

### 问题：TypeScript 类型错误

**解决方案：**
- 确保导入类型：`import type { TEAM_ROLE_LIBRARY } from '@/team-config'`
- 运行 `yarn typecheck` 验证类型

## 更多帮助

如有问题，请查看：
- `sources/text/_default.ts` - 英文翻译
- `sources/text/translations/zh-Hans.ts` - 中文翻译
- `sources/team-config/index.cjs` - 原始角色定义

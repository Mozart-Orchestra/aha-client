# V5 功能文档和教程

## 概述

V5 版本基于 V3-USER-002 用户旅程地图（36 个痛点，45 个机会点）进行了全面的用户体验升级，新增 9 个核心组件，覆盖 AI、游戏化、数据分析、协作和集成等多个维度。

## 新增功能清单

### 1. 智能角色推荐 (V5-AI-001)

**组件**: `RolePreview.tsx`

**功能描述**:
- 角色预览模式，支持 24 小时试用
- 三个标签页：统计数据、使用场景、角色对比
- 添加到团队功能

**使用方法**:
```tsx
import { RolePreview } from '@/components/RolePreview';

<RolePreview
  roleId="role-123"
  title="Frontend Architect"
  summary="Expert in React and TypeScript"
  averageRating={4.8}
  completedTasks={42}
  skills={['React', 'TypeScript', 'Node.js']}
  onTryRole={() => handleTry()}
/>
```

### 2. 个性化改进建议 (V5-AI-002)

**组件**: `ImprovementSuggestions.tsx`

**功能描述**:
- 基于诊断结果生成个性化改进建议
- 4 大改进类别：代码质量、效率提升、团队协作、学习成长
- 每个建议包含具体行动步骤和学习资源

**使用方法**:
```tsx
import { ImprovementSuggestions } from '@/components/ImprovementSuggestions';

<ImprovementSuggestions
  roleId="role-123"
  roleTitle="Frontend Architect"
  diagnosticInsights={insights}
  averageRating={4.2}
  completedTasks={23}
/>
```

### 3. 成就勋章系统 (V5-GAMIFICATION-001)

**组件**: `BadgeDisplay.tsx`

**功能描述**:
- 5 级勋章体系：Bronze → Silver → Gold → Platinum → Diamond
- 5 大类别：Performance、Consistency、Mastery、Collaboration、Special
- 稀有度标签（Common → Legendary）
- 紧凑模式和完整模式

**使用方法**:
```tsx
import { BadgeDisplay } from '@/components/BadgeDisplay';

<BadgeDisplay
  roleId="role-123"
  roleTitle="Frontend Architect"
  badges={badges}
  showLocked={true}
  compact={false}
/>
```

### 4. 评分诊断报告 (V5-INSIGHTS-001)

**组件**: `RatingDiagnostics.tsx`

**工具函数**: `utils/ratingDiagnostics.ts`

**功能描述**:
- 5 类诊断洞察：团队对比、评分趋势、来源分析、质量 vs 数量、一致性检查
- 改进建议优先级排序
- 集成到角色详情页

**使用方法**:
```tsx
import { RatingDiagnostics } from '@/components/RatingDiagnostics';

<RatingDiagnostics
  roleId="role-123"
  roleTitle="Frontend Architect"
  ratingHistory={ratingHistory}
  teamAverageRating={4.0}
  periodDays={30}
/>
```

### 5. 高级数据分析仪表盘 (V5-ANALYTICS-001)

**组件**: `AnalyticsDashboard.tsx`

**功能描述**:
- 管理层视角的角色效能分析
- 评分分布可视化（5 星分布图）
- Top/Bottom 角色排行
- 分类统计和趋势分析
- 导出报告功能

**使用方法**:
```tsx
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';

<AnalyticsDashboard
  data={analyticsData}
  onRolePress={(roleId) => navigateToRole(roleId)}
  onExport={() => exportReport()}
/>
```

### 6. 角色预览模式 (V5-UX-001)

**组件**: `RolePreview.tsx`（同 V5-AI-001）

**功能亮点**:
- 24 小时试用功能
- 角色对比能力
- 快速添加到团队

### 7. 智能搜索增强 (V5-UX-002)

**组件**: `SearchSuggestions.tsx`

**功能描述**:
- 5 类搜索建议：技能匹配、标签建议、搜索历史、热门标签、自然语言
- 实时推荐
- 自动填充搜索框

**使用方法**:
```tsx
import { SearchSuggestions } from '@/components/SearchSuggestions';

<SearchSuggestions
  query={searchQuery}
  availableSkills={['React', 'TypeScript', 'Node.js']}
  recentSearches={['frontend', 'architect']}
  popularTags={[{ tag: 'AI', count: 15 }]}
  onSelect={(text) => setSearchQuery(text)}
/>
```

### 8. 跨团队角色共享 (V5-COLLABORATION-001)

**组件**: `RoleSharing.tsx`

**功能描述**:
- 三级权限控制：Public / Team / Private
- 生成分享代码和链接
- 导入外部角色功能
- 分享统计（导入次数追踪）

**使用方法**:
```tsx
import { RoleSharing } from '@/components/RoleSharing';

<RoleSharing
  roleId="role-123"
  roleTitle="Frontend Architect"
  onShare={(roleId, permissions) => handleShare()}
  onImport={(shareCode) => handleImport()}
/>
```

### 9. 外部工具集成 (V5-INTEGRATION-001)

**组件**: `RoleIntegrations.tsx`

**功能描述**:
- 5 大集成类别：Communication、Version Control、CI/CD、Monitoring、Productivity
- 连接/断开/同步操作
- 集成日志查看
- 自动化触发说明

**使用方法**:
```tsx
import { RoleIntegrations } from '@/components/RoleIntegrations';

<RoleIntegrations
  roleId="role-123"
  roleTitle="Frontend Architect"
  integrations={integrations}
  onConnect={(id, config) => handleConnect()}
/>
```

## 集成指南

### 1. 角色详情页集成

```tsx
// app/(app)/roles/[id].tsx
import { RatingDiagnostics } from '@/components/RatingDiagnostics';
import { ImprovementSuggestions } from '@/components/ImprovementSuggestions';

// 在 renderDetailView 函数中添加
{reviews.length > 0 && (
    <View style={styles.section}>
        <RatingDiagnostics
            roleId={role.id}
            roleTitle={role.title}
            ratingHistory={reviews.map(...)}
            teamAverageRating={role.stats?.averageRating || 4.0}
        />
    </View>
)}

{diagnosticInsights.length > 0 && (
    <View style={styles.section}>
        <ImprovementSuggestions
            roleId={role.id}
            roleTitle={role.title}
            diagnosticInsights={diagnosticInsights}
            averageRating={role.stats?.averageRating || 0}
            completedTasks={role.stats?.completionCount || 0}
        />
    </View>
)}
```

### 2. 角色列表页集成

```tsx
// app/(app)/roles/index.tsx
import { SearchSuggestions } from '@/components/SearchSuggestions';
import { RolePreview } from '@/components/RolePreview';

// 添加搜索建议
{showSuggestions && (
    <SearchSuggestions
        query={searchQuery}
        availableSkills={availableSkills}
        recentSearches={searchHistory}
        popularTags={popularTags}
        onSelect={handleSuggestionSelect}
    />
)}

// 使用 RolePreview 替代直接导航
{previewRole && (
    <RolePreview
        roleId={previewRole.id}
        title={previewRole.title}
        onClose={() => setPreviewRole(null)}
    />
)}
```

## 工具函数使用

### generateDiagnosticInsights

位置: `utils/ratingDiagnostics.ts`

功能: 从评分历史生成诊断洞察

```typescript
import { generateDiagnosticInsights } from '@/utils/ratingDiagnostics';

const insights = generateDiagnosticInsights(
    ratingHistory,  // RatingDataPoint[]
    teamAverageRating,  // number
    periodDays  // number (default: 30)
);

// 返回 DiagnosticInsight[]
```

## 设计原则

### 1. 用户旅程驱动

所有 V5 功能基于 V3-USER-002 用户旅程地图的 36 个痛点和 45 个机会点设计，优先解决 P0 和 P1 级别问题。

### 2. 持续迭代

遵循"任务永不结束，永远有改进空间"原则，通过用户访谈、用户旅程和 .aha 日志驱动持续改进。

### 3. 质量保证

- TypeScript 严格模式
- 所有组件类型检查通过
- 最小化依赖
- 遵循 React Native 最佳实践

### 4. 用户体验优先

- 流畅的动画和过渡
- 清晰的视觉反馈
- 响应式设计
- 无障碍支持

## 性能优化建议

### 1. 懒加载组件

```tsx
const RolePreview = React.lazy(() => import('@/components/RolePreview'));
const AnalyticsDashboard = React.lazy(() => import('@/components/AnalyticsDashboard'));
```

### 2. 使用 useMemo 和 useCallback

```tsx
const availableSkills = React.useMemo(() => {
    // 计算逻辑
}, [getCurrentRoles]);

const handleSuggestionSelect = React.useCallback((suggestion: string) => {
    // 处理逻辑
}, []);
```

### 3. 虚拟化长列表

对于大量数据的列表（如 AnalyticsDashboard），使用 `FlatList` 替代 `ScrollView`。

## 测试建议

### 单元测试

```typescript
import { generateDiagnosticInsights } from '@/utils/ratingDiagnostics';

test('should generate team comparison insight', () => {
    const insights = generateDiagnosticInsights(
        [{ timestamp: Date.now(), rating: 4.5, source: 'user' }],
        4.0,
        30
    );
    expect(insights).toContainEqual(
        expect.objectContaining({ type: 'strength' })
    );
});
```

### 集成测试

测试组件在角色详情页的集成效果。

### E2E 测试

使用 Playwright 测试完整的用户旅程。

## 已知限制

1. **V5-AI-001** (智能角色推荐): 目前为 MVP 版本，推荐算法需进一步优化
2. **RoleSharing**: 导入功能需要服务器端支持（share code 验证）
3. **RoleIntegrations**: 实际集成需要配置 OAuth 和 Webhook

## 后续计划

### V6 规划方向

1. AI 推荐算法升级（基于协同过滤）
2. 实时协作功能（WebSocket）
3. 移动端优化（手势操作）
4. 离线模式支持
5. 语音交互

### 用户反馈收集

通过用户访谈和 .aha 日志持续收集反馈，驱动下一轮迭代。

## 技术栈

- **前端框架**: React Native + Expo
- **语言**: TypeScript
- **状态管理**: React Hooks + Context API
- **样式**: react-native-unistyles
- **导航**: Expo Router
- **图标**: Ionicons

## 贡献指南

1. 遵循 TypeScript 严格模式
2. 所有新组件必须包含类型定义
3. 提交前运行 `npx tsc --noEmit`
4. 遵循现有的代码风格和命名规范
5. 更新相关文档

## 版本历史

### V5 (2026-02-28)

- ✅ 9 个新组件
- ✅ 1 个工具函数
- ✅ 基于用户旅程的全面优化
- ✅ TypeScript 类型检查全部通过

### V4 (2026-02-27)

- 完成角色评分系统核心功能

### V3 (2026-02-26)

- 完成角色管理系统

## 支持与反馈

如有问题或建议，请：
1. 查看 `.aha/progress.txt` 获取最新进展
2. 查看 `用户访谈/` 目录了解用户需求
3. 提交 Issue 或联系开发团队

---

**最后更新**: 2026-02-28
**版本**: V5
**维护者**: Aha 开发团队

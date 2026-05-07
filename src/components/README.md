**MemberSelector 使用规范：**
适用于表单选人、详情页展示、表格列渲染，支持单选/多选/只读模式。
```tsx
// 表单 — 单选（如：负责人）
<MemberSelector userId={formData.owner_emp_id} onChange={(emp) => setFormData(prev => ({ ...prev, owner_user_id: emp?.user_id || null }))} />

// 表单 — 多选（如：参与成员）
<MemberSelector multiple userIds={formData.member_emp_ids} onChange={(list) => setFormData(prev => ({ ...prev, member_user_ids: list.map(e => e.user_id) }))} />

// 详情页 / 表格列 — 只读展示
<MemberSelector readOnly userId={record.owner_emp_id} onChange={() => {}} />
<MemberSelector readOnly multiple userIds={record.member_emp_ids} onChange={() => {}} />




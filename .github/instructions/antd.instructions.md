---
applyTo: "src/components/**/*.tsx,src/app/**/_components/**/*.tsx"
---

# Ant Design 6 Rules

## ⚠️ Critical App Router Constraints

1. **Always `"use client"`** for any file that imports from `antd`
2. **No dot notation** — `<Select.Option>` and `<Typography.Text>` break in App Router. Import subcomponents directly:

   ```typescript
   // ❌ Breaks in App Router
   import { Select, Typography } from "antd";
   <Select.Option value="a">A</Select.Option>
   <Typography.Text>Hello</Typography.Text>

   // ✅ Correct
   import { Select } from "antd";
   import Option from "antd/es/select/Option";
   // OR use the `options` prop instead:
   <Select options={[{ value: "a", label: "A" }]} />
   ```

3. **Use `options` prop** for Select, Cascader, TreeSelect instead of children
4. **Always use `orientation` for `<Space>`** — never use `direction`. The `direction` prop is deprecated in Ant Design 6:

   ```typescript
   // ❌ Deprecated and broken
   <Space direction="vertical" size={24}>
     <Button>Cancel</Button>
     <Button type="primary">Submit</Button>
   </Space>

   // ✅ Correct
   <Space orientation="vertical" size={24}>
     <Button>Cancel</Button>
     <Button type="primary">Submit</Button>
   </Space>
   ```

## Component Patterns

### Forms — always use `Form.useForm` and typed FormValues

```typescript
"use client";
import { App, Button, Form, Input } from "antd";
import { MailOutlined } from "@ant-design/icons";

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function LoginForm() {
  const [form] = Form.useForm<LoginFormValues>();
  const { message } = App.useApp(); // requires <App> in the tree (see App.useApp section)

  const onFinish = async (values: LoginFormValues) => {
    try {
      await signIn(values);
      message.success("Logged in successfully");
    } catch {
      message.error("Invalid credentials");
    }
  };

  return (
    <>
      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email", message: "Valid email required" }]}
        >
          <Input prefix={<MailOutlined />} placeholder="you@example.com" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block>Log in</Button>
        </Form.Item>
      </Form>
    </>
  );
}
```

### Tables — use `useAntdTable` pattern with tRPC

```typescript
"use client";
import { useState } from "react";
import { Table, Space, Button, Tag } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { api } from "~/trpc/react";

interface DataItem {
  id: number;
  title: string;
  status: "draft" | "published";
}

export function PostsTable() {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const { data, isLoading } = api.post.getPaginated.useQuery({
    page: pagination.current,
    pageSize: pagination.pageSize,
  });

  const columns: ColumnsType<DataItem> = [
    { title: "Title", dataIndex: "title", sorter: true },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => (
        <Tag color={status === "published" ? "green" : "default"}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data?.items}
      rowKey="id"
      loading={isLoading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: data?.total,
        onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} items`,
      }}
    />
  );
}
```

### Modals with form

```typescript
"use client";
import { Modal, Form, Input, Button } from "antd";

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePostModal({ open, onClose, onSuccess }: CreateModalProps) {
  const [form] = Form.useForm();
  const createPost = api.post.create.useMutation({
    onSuccess: () => { form.resetFields(); onSuccess(); },
  });

  return (
    <Modal
      title="Create Post"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(v) => createPost.mutate(v)}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createPost.isPending}>
              Create
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

## Theme Customization

```typescript
// src/app/layout.tsx
import { ConfigProvider, theme as antdTheme } from "antd";

const theme = {
  token: {
    colorPrimary: "#1677ff",
    colorSuccess: "#52c41a",
    colorWarning: "#faad14",
    colorError: "#ff4d4f",
    borderRadius: 6,
    fontFamily: "var(--font-sans)",
  },
  algorithm: antdTheme.defaultAlgorithm, // or darkAlgorithm for dark mode
};

// In layout: <ConfigProvider theme={theme}>
```

## Icons — Import from @ant-design/icons

```typescript
// ✅ Named imports (tree-shakeable)
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PlusOutlined,
} from "@ant-design/icons";

// ❌ Never use default import
import AntdIcons from "@ant-design/icons";
```

## Notification and Message — use hooks, not static methods

```typescript
"use client";
import { App } from "antd"; // wrap at layout level

// Inside components:
const { message, notification, modal } = App.useApp();
message.success("Done!");
notification.info({ message: "Info", description: "Details here" });
modal.confirm({ title: "Confirm?", onOk: handleDelete });
```

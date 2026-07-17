---
description: "Build a complete Ant Design form component wired to a tRPC mutation, with validation, error handling, and loading states"
---

Build an Ant Design form for: **[FORM_PURPOSE]**

## Requirements

### Component Setup
- Add `"use client"` directive
- Define a typed `FormValues` interface matching the tRPC input schema
- Use `Form.useForm<FormValues>()` for type-safe form control
- Use `App.useApp()` for `message` and `notification` (not static methods)

### Form Fields
For each field include:
- `Form.Item` with `name`, `label`, and `rules` array
- Appropriate antd input component (Input, Select, DatePicker, etc.)
- Meaningful validation messages (not just "required")
- Tooltip or `extra` help text where field purpose isn't obvious

### tRPC Integration
- Wire to the correct `api.[router].[mutation].useMutation()`
- Show `loading={mutation.isPending}` on the submit button
- On `onSuccess`: show success message, reset form, call optional `onSuccess` callback
- On `onError`: show the error message from the tRPC error response
- Invalidate related queries on success via `utils.[router].invalidate()`

### Form Layout Options
- `layout="vertical"` for standalone forms (default)
- `layout="inline"` for filter/search bars
- `layout="horizontal"` with `labelCol` for settings forms

### Example Structure
```typescript
"use client";
import { Button, Form, Input, App } from "antd";
import { api } from "~/trpc/react";

interface [Feature]FormValues {
  // ... fields matching tRPC input schema
}

interface [Feature]FormProps {
  initialValues?: Partial<[Feature]FormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function [Feature]Form({ initialValues, onSuccess, onCancel }: [Feature]FormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<[Feature]FormValues>();
  const utils = api.useUtils();

  const mutation = api.[router].[mutation].useMutation({
    onSuccess: () => {
      message.success("[Action] successful");
      form.resetFields();
      utils.[router].invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      message.error(error.message ?? "Something went wrong");
    },
  });

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(values) => mutation.mutate(values)}
    >
      {/* fields here */}
      <Form.Item>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
}
```

"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input, type InputRef } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Props {
  size?: "small" | "middle" | "large";
}

export function GlobalSearch({ size = "middle" }: Props) {
  const router = useRouter();
  const inputRef = useRef<InputRef>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function submitQuery() {
    const query = value.trim();
    if (query.length === 0) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <Input
      ref={inputRef}
      size={size}
      placeholder="Search... (Ctrl+K)"
      prefix={<SearchOutlined aria-hidden="true" />}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onPressEnter={submitQuery}
      allowClear
      aria-label="Search courses, activities, discussions and wikis"
      title="Press Ctrl+K to search"
      style={{ width: 220 }}
    />
  );
}

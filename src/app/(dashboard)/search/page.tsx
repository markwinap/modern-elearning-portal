"use client";

import { SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  Badge,
  Card,
  Empty,
  Input,
  Pagination,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "~/components/ui/page-header";
import { useDebounce } from "~/hooks/useDebounce";
import type { Category } from "~/server/db/schema";
import type { SearchResult } from "~/server/lib/search";
import { useTRPC } from "~/trpc/react";

const TYPE_OPTIONS = [
  { value: "course", label: "Course" },
  { value: "activity", label: "Activity" },
  { value: "discussion", label: "Discussion" },
  { value: "wiki", label: "Wiki" },
];

const PAGE_SIZE = 10;

function formatExcerpt(text: string | null, query: string): React.ReactNode {
  if (!text) return null;
  const safeText = text.replace(/\s+/g, " ").trim();
  if (safeText.length <= 200) return safeText;
  const lowerQuery = query.toLowerCase();
  const index = lowerQuery ? safeText.toLowerCase().indexOf(lowerQuery) : -1;
  if (index >= 0) {
    const start = Math.max(0, index - 80);
    const end = Math.min(safeText.length, index + 120);
    let snippet = safeText.slice(start, end);
    if (start > 0) snippet = `…${snippet}`;
    if (end < safeText.length) snippet = `${snippet}…`;
    return snippet;
  }
  return `${safeText.slice(0, 197)}…`;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("q") ?? "";
  const initialTypes = searchParams.getAll("type");
  const initialCategory = searchParams.get("category");
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [inputValue, setInputValue] = useState(initialQuery);
  const debouncedQuery = useDebounce(inputValue, 250);

  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    initialTypes.filter((t) => TYPE_OPTIONS.some((o) => o.value === t)),
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(
    initialCategory ?? undefined,
  );
  const [page, setPage] = useState(initialPage);

  const trpc = useTRPC();

  const { data: categories } = useQuery(trpc.category.list.queryOptions());

  const query = debouncedQuery.trim();

  const searchParamsString = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    for (const type of selectedTypes) params.append("type", type);
    if (categoryId) params.set("category", categoryId);
    if (page > 1) params.set("page", String(page));
    return params.toString();
  }, [query, selectedTypes, categoryId, page]);

  useEffect(() => {
    const url = searchParamsString
      ? `/search?${searchParamsString}`
      : "/search";
    router.replace(url, { scroll: false });
  }, [searchParamsString, router]);

  const activeTypeKey = selectedTypes.join(",");
  useEffect(() => {
    setPage(1);
  }, [query, activeTypeKey, categoryId]);

  const { data, isLoading, error } = useQuery(
    trpc.search.search.queryOptions(
      {
        query,
        types:
          selectedTypes.length > 0
            ? (selectedTypes as (
                | "course"
                | "activity"
                | "discussion"
                | "wiki"
              )[])
            : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        page,
        limit: PAGE_SIZE,
      },
      { enabled: query.length > 0 },
    ),
  );

  function onSearchSubmit() {
    if (inputValue.trim()) {
      setPage(1);
    }
  }

  return (
    <div>
      <PageHeader title="Search" marginBottom={24} />

      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <Input
          size="large"
          placeholder="Search courses, activities, discussions and wikis"
          prefix={<SearchOutlined aria-hidden="true" />}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={onSearchSubmit}
          allowClear
          aria-label="Search query"
        />

        <Space wrap>
          <Select
            mode="multiple"
            allowClear
            placeholder={
              <span style={{ color: "#595959" }}>Filter by type</span>
            }
            value={selectedTypes}
            onChange={setSelectedTypes}
            options={TYPE_OPTIONS}
            style={{ minWidth: 220 }}
            aria-label="Filter results by type"
          />
          <Select
            allowClear
            showSearch
            placeholder={
              <span style={{ color: "#595959" }}>Filter by category</span>
            }
            value={categoryId}
            onChange={setCategoryId}
            options={
              categories?.map((c: Category) => ({
                value: String(c.id),
                label: c.name,
              })) ?? []
            }
            style={{ minWidth: 200 }}
            aria-label="Filter results by category"
          />
        </Space>
      </Space>

      {query.length === 0 && (
        <Empty
          description="Start typing to search across courses, activities, discussions and wikis."
          style={{ marginTop: 48 }}
        />
      )}

      {isLoading && (
        <div
          role="status"
          aria-label="Searching"
          style={{ display: "block", margin: "48px auto" }}
        >
          <Spin size="large" />
        </div>
      )}

      {error && (
        <Alert
          message="Search failed"
          description={error.message}
          type="error"
          showIcon
          style={{ marginTop: 24 }}
        />
      )}

      {data && (
        <>
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginTop: 16, marginBottom: 16 }}
          >
            {data.totalCount === 0
              ? `No results for "${query}"`
              : `Showing ${data.results.length} of ${data.totalCount} result${data.totalCount === 1 ? "" : "s"}`}
          </Typography.Text>

          {data.results.length > 0 && (
            <Space direction="vertical" style={{ display: "flex" }}>
              {data.results.map((result: SearchResult) => (
                <Card
                  key={`${result.type}-${result.id}-${result.url}`}
                  size="small"
                  title={
                    <Space>
                      <Badge text={result.type} />
                      <Link href={result.url}>{result.title}</Link>
                    </Space>
                  }
                >
                  {result.excerpt ? (
                    <Typography.Paragraph
                      type="secondary"
                      style={{ marginBottom: 0 }}
                    >
                      {formatExcerpt(result.excerpt, query)}
                    </Typography.Paragraph>
                  ) : null}
                  {result.courseTitle ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {result.courseTitle}
                    </Typography.Text>
                  ) : null}
                </Card>
              ))}
            </Space>
          )}

          {data.totalCount > PAGE_SIZE && (
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              onChange={setPage}
              style={{ marginTop: 24, textAlign: "center" }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading search"
          style={{ display: "block", margin: "48px auto" }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

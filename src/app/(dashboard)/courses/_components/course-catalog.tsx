"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Pagination,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  theme,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";

import { api } from "~/trpc/react";

interface CourseItem {
  id: number;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  slug: string;
  createdAt: Date;
  teacherName: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
}

interface Props {
  initialCourses: CourseItem[];
  categories: Category[];
}

export function CourseCatalog({ initialCourses, categories }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { token } = theme.useToken();
  const limit = 12;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: courses = initialCourses, isFetching } = api.course.list.useQuery(
    { page, limit, categoryId, search: debouncedSearch || undefined },
    { initialData: page === 1 && !categoryId && !debouncedSearch ? initialCourses : undefined },
  );

  const categoryOptions = [
    { value: 0, label: "All Categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div>
      <Typography.Title level={2} style={{ marginBottom: 24 }}>
        Course Catalog
      </Typography.Title>

      <Space size="middle" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search courses…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 280 }}
          allowClear
        />
        <Select
          options={categoryOptions}
          value={categoryId ?? 0}
          onChange={(v) => {
            setCategoryId(v === 0 ? undefined : v);
            setPage(1);
          }}
          style={{ width: 200 }}
        />
      </Space>

      {courses.length === 0 && !isFetching ? (
        <Empty description="No courses found" style={{ marginTop: 64 }} />
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {courses.map((course) => (
              <Col key={course.id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  hoverable
                  style={{ height: "100%", display: "flex", flexDirection: "column" }}
                  loading={isFetching}
                  cover={
                    course.coverImageUrl ? (
                      <img
                        src={course.coverImageUrl}
                        alt={course.title}
                        style={{ height: 160, objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 160,
                          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span style={{ color: "#fff", fontSize: 32, fontWeight: 700 }}>
                          {course.title.charAt(0)}
                        </span>
                      </div>
                    )
                  }
                >
                  <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
                    {course.title}
                  </Typography.Title>
                  {course.teacherName && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      by {course.teacherName}
                    </Typography.Text>
                  )}
                  {course.description && (
                    <Typography.Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ marginTop: 8, marginBottom: 12, fontSize: 13, color: token.colorTextSecondary }}
                    >
                      {course.description}
                    </Typography.Paragraph>
                  )}
                  <div style={{ marginTop: "auto" }}>
                    <Link href={`/courses/${course.slug}`}>
                      <Button type="primary" block>
                        View Course
                      </Button>
                    </Link>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Pagination
              current={page}
              pageSize={limit}
              total={courses.length < limit ? (page - 1) * limit + courses.length : page * limit + 1}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
            />
          </div>
        </>
      )}
    </div>
  );
}

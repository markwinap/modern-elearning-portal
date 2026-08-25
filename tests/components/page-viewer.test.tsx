import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageViewer } from "~/app/(dashboard)/courses/[slug]/learn/[activityId]/_components/page-viewer";

describe("PageViewer", () => {
  it("renders sanitized HTML content", () => {
    render(<PageViewer content="<p>Hello world</p>" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("strips dangerous scripts and event handlers", () => {
    const dirty =
      '<p onclick="alert(1)">Safe text</p><script>alert("xss")</script>';
    render(<PageViewer content={dirty} />);
    const paragraph = screen.getByText("Safe text");
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).not.toHaveAttribute("onclick");
  });

  it("shows an empty state when content is null", () => {
    render(<PageViewer content={null} />);
    expect(screen.getByText("No content yet.")).toBeInTheDocument();
  });
});

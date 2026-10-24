import { describe, expect, it } from "vitest";
import { headingsOf } from "@/components/ui/markdown";
import { readingTime, slugify, truncate } from "@/lib/utils";

describe("markdown headings", () => {
  it("extracts h2/h3 with stable ids", () => {
    const md = "# Title\n\nIntro\n\n## The rule\n\ntext\n\n### Sub point!\n\n#### too deep";
    expect(headingsOf(md)).toEqual([
      { level: 1, text: "Title", id: "title" },
      { level: 2, text: "The rule", id: "the-rule" },
      { level: 3, text: "Sub point!", id: "sub-point" },
    ]);
  });
});

describe("utils", () => {
  it("slugifies", () => {
    expect(slugify("AreniX Branch Manager!")).toBe("arenix-branch-manager");
  });
  it("estimates reading time", () => {
    expect(readingTime("word ".repeat(440))).toBe(2);
    expect(readingTime("short")).toBe(1);
  });
  it("truncates with ellipsis", () => {
    expect(truncate("abcdefghij", 6)).toBe("abcde…");
    expect(truncate("abc", 6)).toBe("abc");
  });
});

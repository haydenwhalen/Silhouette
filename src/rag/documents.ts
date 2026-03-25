import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { logAgentStep } from "../logging/logger";

const SOURCES_DIR = join(process.cwd(), "docs", "sources");

interface SourceMeta {
  title: string;
  source_url: string;
  publisher: string;
  author: string;
  tags: string[];
  filename: string;
}

function parseSourceFile(filename: string): { meta: SourceMeta; content: string } {
  const raw = readFileSync(join(SOURCES_DIR, filename), "utf-8");
  const lines = raw.split("\n");

  const title = (lines.find((l) => l.startsWith("# ")) ?? "# Untitled").replace("# ", "");
  const source_url = (lines.find((l) => l.startsWith("Source:")) ?? "Source: ").replace("Source: ", "").trim();
  const publisher = (lines.find((l) => l.startsWith("Publisher:")) ?? "Publisher: ").replace("Publisher: ", "").trim();
  const author = (lines.find((l) => l.startsWith("Author:")) ?? "Author: ").replace("Author: ", "").trim();
  const tagsLine = (lines.find((l) => l.startsWith("Tags:")) ?? "Tags: ").replace("Tags: ", "").trim();
  const tags = tagsLine.split(",").map((t) => t.trim()).filter(Boolean);

  const contentIdx = lines.findIndex((l) => l.startsWith("## Content"));
  const content = contentIdx >= 0 ? lines.slice(contentIdx + 1).join("\n").trim() : raw;

  return {
    meta: { title, source_url, publisher, author, tags, filename },
    content,
  };
}

export async function loadAndChunkDocuments(): Promise<Document[]> {
  const files = readdirSync(SOURCES_DIR).filter((f) => f.endsWith(".md")).sort();
  logAgentStep("rag_load", { fileCount: files.length, files });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
  });

  const allChunks: Document[] = [];

  for (const file of files) {
    const { meta, content } = parseSourceFile(file);
    const chunks = await splitter.createDocuments(
      [content],
      [
        {
          source_title: meta.title,
          source_url: meta.source_url,
          source_author: meta.author,
          publisher: meta.publisher,
          tags: meta.tags.join(", "),
          filename: meta.filename,
        },
      ]
    );
    allChunks.push(...chunks);
  }

  logAgentStep("rag_chunk", { totalChunks: allChunks.length });
  return allChunks;
}

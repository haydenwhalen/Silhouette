import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { load as parseYaml } from "js-yaml";
import { Document } from "@langchain/core/documents";
import { logAgentStep } from "../logging/logger";

const SIOS_DIR = join(process.cwd(), "corpus", "sios");

const ALLOWED_REVIEW_STATUSES = new Set([
  "approved",
  "prototype_only",
  "needs_review",
]);

const CRITICAL_FIELDS = [
  "insight_id",
  "key_claim",
  "primary_state_tag",
  "content_summary",
] as const;

const METADATA_FIELDS = [
  "insight_id",
  "source_id",
  "speaker",
  "show_or_platform",
  "episode_or_content_title",
  "episode_or_content_date",
  "source_url",
  "source_type",
  "embed_url",
  "video_id",
  "video_url",
  "video_provider",
  "source_media_type",
  "official_channel",
  "official_channel_url",
  "media_verification_status",
  "media_verification_notes",
  "media_rights_notes",
  "rights_or_usage_notes",
  "clip_match_type",
  "transcript_verified",
  "timestamp_range",
  "timestamp_start_seconds",
  "timestamp_end_seconds",
  "primary_state_tag",
  "secondary_state_tags",
  "direction_collapse_variant",
  "insight_type",
  "voice_register",
  "credibility_tier",
  "intensity_level",
  "key_claim",
  "content_summary",
  "attribution_text",
  "human_review_status",
  "tagger_confidence",
  "display_mode",
  "media_available",
  "ingestion_date",
] as const;

export type SIOMetadata = Record<(typeof METADATA_FIELDS)[number], unknown> & {
  source_file: string;
};

interface ParsedSIO {
  frontmatter: Record<string, unknown>;
  body: string;
}

function splitFrontmatter(raw: string, filename: string): ParsedSIO {
  if (!raw.startsWith("---")) {
    throw new Error(`SIO ${filename}: missing opening --- frontmatter delimiter`);
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    throw new Error(`SIO ${filename}: missing closing --- frontmatter delimiter`);
  }
  const yaml = raw.slice(3, end).trim();
  const after = raw.slice(end + 4);
  const parsed = parseYaml(yaml);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`SIO ${filename}: frontmatter did not parse to an object`);
  }
  return {
    frontmatter: parsed as Record<string, unknown>,
    body: stripHtmlComments(after).trim(),
  };
}

function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

function buildEmbeddingText(fm: Record<string, unknown>, body: string): string {
  const key = String(fm.key_claim ?? "").trim();
  const summary = String(fm.content_summary ?? "").trim();
  return [key, summary, body].filter(Boolean).join("\n\n");
}

function pickMetadata(
  fm: Record<string, unknown>,
  filename: string
): SIOMetadata {
  const out: Record<string, unknown> = { source_file: filename };
  for (const field of METADATA_FIELDS) {
    out[field] = fm[field] ?? null;
  }
  return out as SIOMetadata;
}

function validateCritical(
  fm: Record<string, unknown>,
  filename: string
): string[] {
  const missing: string[] = [];
  for (const field of CRITICAL_FIELDS) {
    const v = fm[field];
    if (v === undefined || v === null || v === "") missing.push(field);
  }
  return missing;
}

export async function loadSIODocuments(): Promise<Document[]> {
  const files = readdirSync(SIOS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
  logAgentStep("sio_load_start", { fileCount: files.length, files });

  const docs: Document[] = [];
  const skipped: { file: string; reason: string }[] = [];

  for (const file of files) {
    const raw = readFileSync(join(SIOS_DIR, file), "utf-8");
    let parsed: ParsedSIO;
    try {
      parsed = splitFrontmatter(raw, file);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "parse error";
      skipped.push({ file, reason });
      logAgentStep("sio_skip", { file, reason });
      continue;
    }

    const { frontmatter: fm, body } = parsed;

    const missing = validateCritical(fm, file);
    if (missing.length > 0) {
      const reason = `missing critical fields: ${missing.join(", ")}`;
      skipped.push({ file, reason });
      logAgentStep("sio_skip", { file, reason });
      continue;
    }

    const status = String(fm.human_review_status ?? "").trim();
    if (!ALLOWED_REVIEW_STATUSES.has(status)) {
      const reason = `human_review_status="${status}" not in allowlist`;
      skipped.push({ file, reason });
      logAgentStep("sio_skip", { file, reason });
      continue;
    }

    if (!body) {
      const reason = "transcript_excerpt body is empty";
      skipped.push({ file, reason });
      logAgentStep("sio_skip", { file, reason });
      continue;
    }

    const softWarnings: string[] = [];
    if (!fm.video_id) softWarnings.push("video_id");
    if (!fm.embed_url) softWarnings.push("embed_url");
    if (fm.media_available === null) softWarnings.push("media_available");
    if (softWarnings.length > 0) {
      logAgentStep("sio_soft_warn", { file, missing: softWarnings });
    }

    const metadata = pickMetadata(fm, file);
    const pageContent = buildEmbeddingText(fm, body);

    docs.push(new Document({ pageContent, metadata }));
  }

  logAgentStep("sio_load_complete", {
    loaded: docs.length,
    skipped: skipped.length,
    skippedDetail: skipped,
    insightIds: docs.map((d) => d.metadata.insight_id),
  });

  for (const d of docs) {
    SIO_INDEX.set(String(d.metadata.insight_id), d);
  }

  return docs;
}

const SIO_INDEX = new Map<string, Document>();

export function getSIOById(insightId: string): Document | undefined {
  return SIO_INDEX.get(insightId);
}

export function listLoadedSIOs(): Document[] {
  return Array.from(SIO_INDEX.values());
}

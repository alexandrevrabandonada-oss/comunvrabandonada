import { describe, expect, it } from "vitest";
import {
  isSidewalkSubmissionPending,
  SIDEWALK_SUBMISSION_PROGRESS,
  sidewalkSubmissionButtonLabel,
} from "./sidewalk-submission-progress";

describe("sidewalk submission progress", () => {
  it("defines every observable phase with public feedback", () => {
    expect(Object.keys(SIDEWALK_SUBMISSION_PROGRESS)).toEqual([
      "idle",
      "validating",
      "checking_captcha",
      "creating_private_session",
      "authorizing_upload",
      "uploading_photo",
      "confirming_record",
      "success",
      "recoverable_error",
    ]);
  });

  it("blocks only while the pipeline is processing", () => {
    expect(isSidewalkSubmissionPending("checking_captcha")).toBe(true);
    expect(isSidewalkSubmissionPending("uploading_photo")).toBe(true);
    expect(isSidewalkSubmissionPending("recoverable_error")).toBe(false);
  });

  it("keeps a manual retry available after a recoverable error", () => {
    expect(sidewalkSubmissionButtonLabel("recoverable_error")).toBe(
      "Enviar para revisão",
    );
  });
});

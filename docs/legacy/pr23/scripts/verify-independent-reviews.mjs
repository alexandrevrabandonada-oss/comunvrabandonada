import { CANONICAL_BRANCH, OWNER, PR_NUMBER, REPO, github, loadFixture, fail } from "./lib.mjs";
import { pathToFileURL } from "node:url";

export function evaluateReviews({ pull, reviews, commits }) {
  if (pull.number !== PR_NUMBER || pull.head?.ref !== CANONICAL_BRANCH) return { ok: false, reason: "PR23_WRONG_PULL_REQUEST" };
  const head = pull.head?.sha;
  const lastCommitAuthor = commits.at(-1)?.author?.login ?? commits.at(-1)?.committer?.login;
  const latest = new Map();
  for (const review of [...reviews].sort((a, b) => new Date(a.submitted_at ?? 0) - new Date(b.submitted_at ?? 0))) {
    const login = review.user?.login;
    if (login) latest.set(login, review);
  }
  const approved = [...latest.values()].filter((review) =>
    review.state === "APPROVED" &&
    review.commit_id === head &&
    review.user?.type !== "Bot" &&
    !review.user?.login?.endsWith("[bot]") &&
    review.user?.login !== lastCommitAuthor,
  );
  if ([...latest.values()].some((review) => review.state === "CHANGES_REQUESTED")) return { ok: false, reason: "PR23_CHANGES_REQUESTED" };
  if (approved.length < 2) return { ok: false, reason: "PR23_TWO_INDEPENDENT_REVIEWS_MISSING", count: approved.length, head };
  return { ok: true, gate: "PR23_TWO_INDEPENDENT_REVIEWS_OK", count: approved.length, head, reviewers: approved.map((review) => review.user.login).sort() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture = await loadFixture();
  const data = fixture ?? {
    pull: await github(`/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}`),
    reviews: await github(`/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}/reviews?per_page=100`),
    commits: await github(`/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}/commits?per_page=100`),
  };
  const result = evaluateReviews(data);
  console.log(JSON.stringify(result));
  if (!result.ok) fail(result.reason);
}

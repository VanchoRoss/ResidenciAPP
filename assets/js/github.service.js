export async function createGitHubIssue({ owner, repo, token, title, body, labels = [] }) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, labels }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || `GitHub API error ${response.status}`);
  return payload;
}

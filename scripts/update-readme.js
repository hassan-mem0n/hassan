// scripts/update-readme.js
// Fetches your latest / top repositories from GitHub and injects a
// dynamic "Featured Projects" section into README.md between the
// markers: <!--START_SECTION:projects--> ... <!--END_SECTION:projects-->

const fs = require("fs");
const path = require("path");

const USERNAME = "hassan-mem0n";

const README_PATH = path.join(__dirname, "..", "README.md");
const MAX_PROJECTS = 4; // how many repo cards to show
const TOKEN = process.env.GITHUB_TOKEN;

// Repos to always ignore (profile repo itself, forks, archived, etc.)
const IGNORE_REPOS = [USERNAME.toLowerCase()]; // e.g. "talhahussain69/talhahussain69"

// Small color map for common languages (used for the little dot next to language name)
const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  HTML: "#e34c26",
  CSS: "#563d7c",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  Dart: "#00B4AB",
  Shell: "#89e051",
  Go: "#00ADD8",
};

async function fetchRepos() {
  const res = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed&direction=desc`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  const repos = await res.json();

  return repos
    .filter((r) => !r.fork) // skip forked repos
    .filter((r) => !r.archived) // skip archived repos
    .filter((r) => !IGNORE_REPOS.includes(r.name.toLowerCase())) // skip profile repo
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)) // newest activity first
    .slice(0, MAX_PROJECTS);
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCard(repo) {
  const lang = repo.language || "Other";
  const langColor = LANG_COLORS[lang] || "#8892B0";
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;

  return `
<td width="50%" valign="top" align="center" style="border:none;">

<table width="440" height="240" cellpadding="18" cellspacing="0" border="0" style="
    border:none !important;
    border-collapse:collapse;
    background:transparent;
  ">
<tr style="border:none;">
<td align="center" style="border:none;">

<h2 align="center">🚀 ${repo.name}</h2>

<hr style="border:none; border-top:1px solid #30363d; width:80%;">

<p align="center">

<img src="https://img.shields.io/badge/●-${encodeURIComponent(
    lang
  )}-${langColor.replace("#", "")}?style=flat-square"/>

<img src="https://img.shields.io/badge/⭐-${stars}-FF8E01?style=flat-square"/>

<img src="https://img.shields.io/badge/🍴-${forks}-CCD6F6?style=flat-square"/>

</p>

<br>

<a href="${repo.html_url}">
<img src="https://img.shields.io/badge/VIEW%20REPOSITORY-0A1628?style=for-the-badge&logo=github&logoColor=FF8E01&labelColor=0A1628&color=0A1628"/>
</a>

</td>
</tr>
</table>

</td>
`;
}

function buildSection(repos) {
  let rows = "";

  for (let i = 0; i < repos.length; i += 2) {
    rows += `
<tr style="border:none;">
${buildCard(repos[i])}
${repos[i + 1] ? buildCard(repos[i + 1]) : ""}
</tr>
`;
  }

  return `<!--START_SECTION:projects-->
<div align="center">

## 🚀 Featured Projects

<table align="center" cellspacing="18" cellpadding="0" border="0" style="border:none; border-collapse:separate; margin:0 auto;">
${rows}
</table>

</div>
<!--END_SECTION:projects-->`;
}

async function run() {
  const repos = await fetchRepos();

  if (repos.length === 0) {
    console.log("No eligible repos found, skipping update.");
    return;
  }

  const newSection = buildSection(repos);
  const readme = fs.readFileSync(README_PATH, "utf8");
  const regex = /<!--START_SECTION:projects-->[\s\S]*?<!--END_SECTION:projects-->/;

  if (!regex.test(readme)) {
    console.error(
      "Could not find <!--START_SECTION:projects--> ... <!--END_SECTION:projects--> markers in README.md"
    );
    process.exit(1);
  }

  const updated = readme.replace(regex, newSection);

  if (updated === readme) {
    console.log("No changes needed.");
    return;
  }

  fs.writeFileSync(README_PATH, updated, "utf8");
  console.log(`README.md updated with ${repos.length} project(s):`);
  repos.forEach((r) => console.log(` - ${r.name}`));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

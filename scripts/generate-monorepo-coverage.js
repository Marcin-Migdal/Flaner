const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const libCoverage = require(path.resolve(repoRoot, 'node_modules/istanbul-lib-coverage'));
const libReport = require(path.resolve(repoRoot, 'node_modules/istanbul-lib-report'));
const reports = require(path.resolve(repoRoot, 'node_modules/istanbul-reports'));

const coverageFile = path.resolve(repoRoot, 'coverage/coverage-final.json');
if (!fs.existsSync(coverageFile)) {
  console.error('No coverage-final.json found at', coverageFile);
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

const PACKAGES = [
  'community',
  'core',
  'planning',
  'settings',
  'shopping',
  'tools',
  'shared',
  'ui-components',
];

const packageSummaries = [];
let totalStatements = { total: 0, covered: 0, pct: 100 };
let totalBranches = { total: 0, covered: 0, pct: 100 };
let totalFunctions = { total: 0, covered: 0, pct: 100 };
let totalLines = { total: 0, covered: 0, pct: 100 };

for (const pkg of PACKAGES) {
  const pkgData = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (key.includes(`packages\\${pkg}\\`) || key.includes(`packages/${pkg}/`)) {
      pkgData[key] = value;
    }
  }

  const pkgMap = libCoverage.createCoverageMap(pkgData);
  const outDir = path.resolve(repoRoot, `coverage/packages/${pkg}`);
  fs.mkdirSync(outDir, { recursive: true });

  const context = libReport.createContext({
    dir: outDir,
    coverageMap: pkgMap,
  });

  const htmlReport = reports.create('html', { skipEmpty: false });
  htmlReport.execute(context);

  const summary = libCoverage.createCoverageSummary();
  for (const file of pkgMap.files()) {
    summary.merge(pkgMap.fileCoverageFor(file).toSummary());
  }

  const st = summary.statements;
  const br = summary.branches;
  const fn = summary.functions;
  const ln = summary.lines;

  totalStatements.total += st.total;
  totalStatements.covered += st.covered;

  totalBranches.total += br.total;
  totalBranches.covered += br.covered;

  totalFunctions.total += fn.total;
  totalFunctions.covered += fn.covered;

  totalLines.total += ln.total;
  totalLines.covered += ln.covered;

  packageSummaries.push({
    name: `packages/${pkg}`,
    dir: `packages/${pkg}/index.html`,
    statements: st,
    branches: br,
    functions: fn,
    lines: ln,
  });

  const pkgIndexPath = path.resolve(outDir, 'index.html');
  if (fs.existsSync(pkgIndexPath)) {
    let pkgHtml = fs.readFileSync(pkgIndexPath, 'utf8');
    pkgHtml = pkgHtml.replace(/<h1>All files<\/h1>/g, `<h1><a href="../../index.html">All Packages</a> / packages/${pkg}</h1>`);
    pkgHtml = pkgHtml.replace(/<title>Code coverage report for All files<\/title>/g, `<title>Code coverage report for packages/${pkg}</title>`);
    fs.writeFileSync(pkgIndexPath, pkgHtml, 'utf8');
  }
}

totalStatements.pct = totalStatements.total === 0 ? 100 : parseFloat(((totalStatements.covered / totalStatements.total) * 100).toFixed(2));
totalBranches.pct = totalBranches.total === 0 ? 100 : parseFloat(((totalBranches.covered / totalBranches.total) * 100).toFixed(2));
totalFunctions.pct = totalFunctions.total === 0 ? 100 : parseFloat(((totalFunctions.covered / totalFunctions.total) * 100).toFixed(2));
totalLines.pct = totalLines.total === 0 ? 100 : parseFloat(((totalLines.covered / totalLines.total) * 100).toFixed(2));

function getStatusClass(pct) {
  if (pct >= 80) return 'high';
  if (pct >= 50) return 'medium';
  return 'low';
}

function renderRow(pkg) {
  const stClass = getStatusClass(pkg.statements.pct);
  const brClass = getStatusClass(pkg.branches.pct);
  const fnClass = getStatusClass(pkg.functions.pct);
  const lnClass = getStatusClass(pkg.lines.pct);
  const mainClass = getStatusClass(pkg.lines.pct);

  return `<tr>
	<td class="file ${mainClass}" data-value="${pkg.name}"><a href="${pkg.dir}">${pkg.name}</a></td>
	<td data-value="${pkg.lines.pct}" class="pic ${mainClass}">
	<div class="chart"><div class="cover-fill" style="width: ${Math.round(pkg.lines.pct)}%"></div><div class="cover-empty" style="width: ${100 - Math.round(pkg.lines.pct)}%"></div></div>
	</td>
	<td data-value="${pkg.statements.pct}" class="pct ${stClass}">${pkg.statements.pct}%</td>
	<td data-value="${pkg.statements.total}" class="abs ${stClass}">${pkg.statements.covered}/${pkg.statements.total}</td>
	<td data-value="${pkg.branches.pct}" class="pct ${brClass}">${pkg.branches.pct}%</td>
	<td data-value="${pkg.branches.total}" class="abs ${brClass}">${pkg.branches.covered}/${pkg.branches.total}</td>
	<td data-value="${pkg.functions.pct}" class="pct ${fnClass}">${pkg.functions.pct}%</td>
	<td data-value="${pkg.functions.total}" class="abs ${fnClass}">${pkg.functions.covered}/${pkg.functions.total}</td>
	<td data-value="${pkg.lines.pct}" class="pct ${lnClass}">${pkg.lines.pct}%</td>
	<td data-value="${pkg.lines.total}" class="abs ${lnClass}">${pkg.lines.covered}/${pkg.lines.total}</td>
	</tr>`;
}

const rootHtml = `<!doctype html>
<html lang="en">
<head>
    <title>Flaner v2 - Monorepo Code Coverage</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="prettify.css" />
    <link rel="stylesheet" href="base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(sort-arrow-sprite.png);
        }
        .header-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .badge {
            font-size: 13px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 6px;
            background: #e2e8f0;
            color: #334155;
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <div class="header-title">
            <h1>Flaner v2 Monorepo Coverage</h1>
            <span class="badge">8 Packages</span>
        </div>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">${totalStatements.pct}% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>${totalStatements.covered}/${totalStatements.total}</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">${totalBranches.pct}% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>${totalBranches.covered}/${totalBranches.total}</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">${totalFunctions.pct}% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>${totalFunctions.covered}/${totalFunctions.total}</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">${totalLines.pct}% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>${totalLines.covered}/${totalLines.total}</span>
            </div>
        </div>
        <p class="quiet">
            Click on any package to view its detailed component-level coverage report.
        </p>
    </div>
    <div class='status-line ${getStatusClass(totalLines.pct)}'></div>
    <div class="pad1">
<table class="coverage-summary">
<thead>
<tr>
   <th data-col="file" data-fmt="html" data-html="true" class="file">Package</th>
   <th data-col="pic" data-type="number" data-fmt="html" data-html="true" class="pic"></th>
   <th data-col="statements" data-type="number" data-fmt="pct" class="pct">Statements</th>
   <th data-col="statements_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="branches" data-type="number" data-fmt="pct" class="pct">Branches</th>
   <th data-col="branches_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="functions" data-type="number" data-fmt="pct" class="pct">Functions</th>
   <th data-col="functions_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="lines" data-type="number" data-fmt="pct" class="pct">Lines</th>
   <th data-col="lines_raw" data-type="number" data-fmt="html" class="abs"></th>
</tr>
</thead>
<tbody>
${packageSummaries.map(renderRow).join('\n')}
</tbody>
</table>
</div>
                <div class='push'></div><!-- for sticky footer -->
            </div><!-- /wrapper -->
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by Flaner v2 Vitest Monorepo Aggregator
            </div>
        <script src="prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="sorter.js"></script>
        <script src="block-navigation.js"></script>
    </body>
</html>`;

fs.writeFileSync(path.resolve(repoRoot, 'coverage/index.html'), rootHtml, 'utf8');
console.log('Successfully generated Monorepo Coverage Dashboard!');

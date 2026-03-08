const fs = require('fs');

const data = JSON.parse(fs.readFileSync('analysis.json', 'utf8'));
const controllers = data.controllers;

const kept = [];
const removed = [];

for (const [cName, eps] of Object.entries(controllers)) {
    for (const ep of eps) {
        const route = ep.raw_route ? `${ep.match_route} (Original: ${ep.raw_route})` : ep.match_route;
        const entry = `[${ep.method}] ${route} - from ${cName}`;
        if (ep.status === 'KEPT') {
            kept.push(entry);
        } else {
            removed.push(entry);
        }
    }
}

let report = `### STEP 3: ANALYSIS REPORT\n\n`;
report += `**🟢 KEPT (Endpoints actually used by the frontend):**\n`;
kept.forEach(k => report += `- ${k}\n`);

report += `\n**🔴 REMOVED (Endpoints with no matching frontend calls):**\n`;
removed.forEach(r => report += `- ${r}\n`);

fs.writeFileSync('final_report.txt', report, 'utf8');
console.log("Report generated.");

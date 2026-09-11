import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const digest=paths=>createHash('sha256').update(paths.map(p=>readFileSync(p,'utf8')).join('\n')).digest('hex');
const report=JSON.parse(readFileSync('public/research/evaluation.json','utf8'));
writeFileSync('lib/governance-identities.ts','// Generated from governed implementation and evidence. Regenerate before release.\nexport const identities = '+JSON.stringify({reference:digest(['lib/risk.ts','lib/patient-workflow.ts']),priorities:digest(['lib/care-priorities.ts']),research:digest(['public/research/evaluation.json','public/research/manifest.json'])})+';\nexport const researchIdentity='+JSON.stringify(report.version+' / '+report.selectedModel)+';\n');

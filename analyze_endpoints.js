const fs = require('fs');
const path = require('path');

const frontendDir = 'c:\\Users\\rtsom\\OneDrive\\Desktop\\RFID\\Frontend\\src';
const backendDir = 'c:\\Users\\rtsom\\OneDrive\\Desktop\\RFID\\Backend\\Controllers';

const frontendApis = new Set();

function walkSync(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
            filelist = walkSync(dirFile, filelist);
        } else {
            if (dirFile.match(/\.(ts|tsx|js|jsx)$/)) {
                filelist.push(dirFile);
            }
        }
    });
    return filelist;
}

const frontendFiles = walkSync(frontendDir);
const regex = /(?:axiosClient|axios|fetch)\.(?:get|post|put|delete|patch)\(\s*[`'"](.*?)[?#'"]/g;

frontendFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        frontendApis.add(match[1].replace(/^\//, '').toLowerCase());
    }
});

const cleanFrontendApis = new Set();
frontendApis.forEach(api => {
    let clean = api.replace(/\$\{[^}]+\}/g, '').replace(/\/\//g, '/').replace(/\/$/, '').toLowerCase();
    cleanFrontendApis.add(clean);
});

const backendEndpoints = {};
const backendFiles = fs.readdirSync(backendDir).filter(f => f.endsWith('Controller.cs'));

backendFiles.forEach(file => {
    const filePath = path.join(backendDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const controllerName = file.replace('Controller.cs', '');

    let baseRoute = `api/${controllerName.toLowerCase()}`;
    const baseRouteMatch = content.match(/\[Route\("([^"]+)"\)\]/);
    if (baseRouteMatch) {
        baseRoute = baseRouteMatch[1].replace(/\[controller\]/i, controllerName).toLowerCase();
    }

    const endpoints = [];
    const methodRegex = /\[Http(Get|Post|Put|Delete)(?:\("([^"]*)"\))?\]/gi;
    let methodMatch;

    while ((methodMatch = methodRegex.exec(content)) !== null) {
        const httpMethod = methodMatch[1].toUpperCase();
        const routeAttr = methodMatch[2] || '';

        let fullRoute = routeAttr ? `${baseRoute}/${routeAttr}`.toLowerCase().replace(/^\/|\/$/g, '') : baseRoute.replace(/^\/|\/$/g, '');
        const matchRoute = fullRoute.replace(/\{[^}]+\}/g, '').replace(/\/\//g, '/').replace(/\/$/, '');

        let isUsed = false;
        const mrNoApi = matchRoute.replace('api/', '');
        for (const fa of cleanFrontendApis) {
            const faClean = fa.replace('api/', '');
            if (mrNoApi === faClean || mrNoApi.startsWith(faClean + '/') || faClean.startsWith(mrNoApi + '/')) {
                isUsed = true;
                break;
            }
        }

        endpoints.push({
            method: httpMethod,
            raw_route: routeAttr,
            match_route: matchRoute,
            status: isUsed ? "KEPT" : "REMOVED"
        });
    }

    backendEndpoints[file] = endpoints;
});

const result = {
    frontend_apis: Array.from(cleanFrontendApis).sort(),
    controllers: backendEndpoints
};
fs.writeFileSync('analysis.json', JSON.stringify(result, null, 2));
console.log("Written to analysis.json");

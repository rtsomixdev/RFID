import os
import re

frontend_dir = r"c:\Users\rtsom\OneDrive\Desktop\RFID\Frontend\src"
backend_dir = r"c:\Users\rtsom\OneDrive\Desktop\RFID\Backend\Controllers"

# 1. Extract Frontend API calls
frontend_apis = set()
for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx') or file.endswith('.js') or file.endswith('.jsx'):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                content = f.read()
                matches = re.findall(r'(?:axiosClient|axios|fetch)\.(?:get|post|put|delete|patch)\(\s*[`\'"](.*?)[?#`\'"]', content)
                for m in matches:
                    frontend_apis.add(m.strip('/').lower())

clean_frontend_apis = set()
for api in frontend_apis:
    clean = re.sub(r'\$\{.*?\}', '', api).replace('//', '/').strip('/')
    clean_frontend_apis.add(clean.lower())

print("FRONTEND APIS:")
for api in sorted(list(clean_frontend_apis)):
    print(f"  - {api}")

# 2. Extract Backend Endpoints
backend_endpoints = {} 
for root, dirs, files in os.walk(backend_dir):
    for file in files:
        if file.endswith('Controller.cs'):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                content = f.read()
                controller_name = file.replace('Controller.cs', '')
                
                base_route = f"api/{controller_name.lower()}"
                base_route_match = re.search(r'\[Route\("([^"]+)"\)\]', content)
                if base_route_match:
                    r = base_route_match.group(1).replace('[controller]', controller_name).lower()
                    base_route = r
                
                endpoints = []
                method_matches = re.finditer(r'\[Http(Get|Post|Put|Delete)(?:\("([^"]*)"\))?\]', content)
                for match in method_matches:
                    http_method = match.group(1)
                    route_attr = match.group(2)
                    
                    if route_attr:
                        full_route = f"{base_route}/{route_attr}".lower().strip('/')
                    else:
                        full_route = base_route.strip('/')
                        
                    match_route = re.sub(r'\{.*?\}', '', full_route).replace('//', '/').strip('/')
                    endpoints.append({
                        "method": http_method,
                        "raw_route": route_attr if route_attr is not None else "",
                        "match_route": match_route
                    })
                
                backend_endpoints[file] = endpoints

print("\nBACKEND CONTROLLERS:")
results = []
for c, eps in backend_endpoints.items():
    print(f"--- {c} ---")
    used = 0
    total = len(eps)
    for ep in eps:
        is_used = False
        mr = ep['match_route']
        mr_no_api = mr.replace('api/', '')
        
        for fa in clean_frontend_apis:
            fa_clean = fa.replace('api/', '')
            if mr_no_api == fa_clean or mr_no_api.startswith(fa_clean + '/') or fa_clean.startswith(mr_no_api + '/'):
                is_used = True
                break
                
        status = "🟢 KEPT" if is_used else "🔴 REMOVED"
        if is_used: used+=1
        print(f"  {status}: [{ep['method']}] {mr} (Original: {ep['raw_route']})")
    
    results.append((c, total - used))
    print(f"  Stats: {used}/{total} used, {total - used} unused\n")

results.sort(key=lambda x: x[1], reverse=True)
print("Most unused endpoints:")
for r in results[:5]:
    print(f"  {r[0]}: {r[1]} unused")

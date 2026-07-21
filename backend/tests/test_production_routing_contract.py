from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
NGINX_CONFIG = (PROJECT_ROOT / "frontend" / "nginx.conf").read_text(encoding="utf-8")
APP_ROUTES = (PROJECT_ROOT / "frontend" / "src" / "App.tsx").read_text(encoding="utf-8")


def test_spa_refresh_fallback_and_proxy_boundaries():
    assert "client_max_body_size 25m;" in NGINX_CONFIG
    assert "try_files $uri $uri/ /index.html;" in NGINX_CONFIG
    assert "location /admin/" not in NGINX_CONFIG
    for prefix in ("/api/", "/auth/", "/users/", "/guests/"):
        assert f"location ^~ {prefix}" in NGINX_CONFIG
    assert "location = /health" in NGINX_CONFIG


def test_normal_and_admin_page_routes_are_spa_routes_with_role_guards():
    for route in (
        "profile",
        "speech-usage",
        "scenarios",
        "scenario/:slug",
        "admin/users",
        "admin/scenario-analytics",
        "admin/atm-analytics",
        "admin/speech-providers",
        "admin/user-quotas",
    ):
        assert f'path="{route}"' in APP_ROUTES
    assert '<ProtectedRoute allowedRoles={["user"]}' in APP_ROUTES
    assert '<ProtectedRoute allowedRoles={["admin"]}' in APP_ROUTES


def test_admin_frontend_requests_use_non_conflicting_api_namespace():
    service_files = (
        PROJECT_ROOT / "frontend" / "src" / "services" / "adminService.ts",
        PROJECT_ROOT / "frontend" / "src" / "services" / "adminAnalyticsService.ts",
        PROJECT_ROOT / "frontend" / "src" / "services" / "speechProviderService.ts",
    )
    combined = "\n".join(path.read_text(encoding="utf-8") for path in service_files)
    assert "/api/admin/" in combined
    assert 'apiRequest<User[]>(`/admin/' not in combined
    assert 'apiRequest<GlobalSpeechDashboard>("/admin/' not in combined


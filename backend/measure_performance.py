"""
Milestone 4 -- Lightweight Performance Verification Script.

Measures actual round-trip latency for all major Milestone 4 endpoints.
Does not add external dependencies (uses standard library).
"""

import argparse
import json
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request

from config import ADMIN_USERNAME, ADMIN_PASSWORD


def time_request(url: str, method: str = "GET", headers: dict = None, body: dict = None) -> float:
    """Execute request and return latency in milliseconds."""
    headers = headers or {}
    data = json.dumps(body).encode("utf-8") if body else None
    if data:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    start = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        _ = resp.read()
    elapsed = (time.perf_counter() - start) * 1000.0
    return elapsed


def get_token(base_url: str) -> str:
    """Obtain JWT token for authenticated endpoints."""
    url = f"{base_url}/token"
    body = urllib.parse.urlencode({"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data["access_token"]


def measure_endpoint(name: str, url: str, method: str = "GET", headers: dict = None, body: dict = None, runs: int = 5) -> tuple[float, float]:
    """Measure latency across multiple runs and return (avg_ms, min_ms)."""
    # Warmup
    try:
        time_request(url, method=method, headers=headers, body=body)
    except Exception as e:
        print(f"Error during warmup for {name}: {e}")
        return 0.0, 0.0

    times = []
    for _ in range(runs):
        elapsed = time_request(url, method=method, headers=headers, body=body)
        times.append(elapsed)
    return round(statistics.mean(times), 2), round(min(times), 2)


def main():
    parser = argparse.ArgumentParser(description="Milestone 4 Performance Measurement")
    parser.add_argument("--port", type=int, default=8000, help="Backend port (default: 8000)")
    parser.add_argument("--runs", type=int, default=5, help="Number of measurement runs (default: 5)")
    args = parser.parse_args()

    base_url = f"http://127.0.0.1:{args.port}"
    print("=" * 65)
    print(f"  Milestone 4 API Performance Measurement ({base_url})")
    print(f"  Averaged across {args.runs} runs per endpoint (warm-cache)")
    print("=" * 65)

    # 1. Health check (no auth)
    h_avg, h_min = measure_endpoint("GET /health", f"{base_url}/health", runs=args.runs)

    # Authenticate
    token = get_token(base_url)
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Intelligence Health
    ih_avg, ih_min = measure_endpoint("GET /intelligence/health", f"{base_url}/intelligence/health", headers=auth_headers, runs=args.runs)

    # 3. Executive Dashboard
    id_avg, id_min = measure_endpoint("GET /intelligence/dashboard", f"{base_url}/intelligence/dashboard", headers=auth_headers, runs=args.runs)

    # 4. Orchestrator Agents Status
    as_avg, as_min = measure_endpoint("GET /orchestrator/agents/status", f"{base_url}/orchestrator/agents/status", headers=auth_headers, runs=args.runs)

    # 5. Orchestrator Resolve
    res_body = {"situation": "Power outage in Hall A during key Generative AI session"}
    or_avg, or_min = measure_endpoint("POST /orchestrator/resolve", f"{base_url}/orchestrator/resolve", method="POST", headers=auth_headers, body=res_body, runs=args.runs)

    # 6. Orchestrator Activity
    act_avg, act_min = measure_endpoint("GET /orchestrator/activity", f"{base_url}/orchestrator/activity", headers=auth_headers, runs=args.runs)

    print("\nMeasured Response Times:")
    print("-" * 65)
    print(f"{'Endpoint':<35} {'Avg Latency':>12} {'Min Latency':>12}")
    print("-" * 65)
    print(f"{'GET /health':<35} {h_avg:>9.2f} ms {h_min:>9.2f} ms")
    print(f"{'GET /intelligence/health':<35} {ih_avg:>9.2f} ms {ih_min:>9.2f} ms")
    print(f"{'GET /intelligence/dashboard':<35} {id_avg:>9.2f} ms {id_min:>9.2f} ms")
    print(f"{'GET /orchestrator/agents/status':<35} {as_avg:>9.2f} ms {as_min:>9.2f} ms")
    print(f"{'POST /orchestrator/resolve':<35} {or_avg:>9.2f} ms {or_min:>9.2f} ms")
    print(f"{'GET /orchestrator/activity':<35} {act_avg:>9.2f} ms {act_min:>9.2f} ms")
    print("-" * 65)
    print("\nSummary formatted output:")
    print(f"GET /health                 -> {h_avg:.1f} ms")
    print(f"GET /intelligence/health   -> {ih_avg:.1f} ms")
    print(f"GET /intelligence/dashboard -> {id_avg:.1f} ms")
    print(f"GET /orchestrator/agents/status -> {as_avg:.1f} ms")
    print(f"POST /orchestrator/resolve -> {or_avg:.1f} ms")
    print("=" * 65)


if __name__ == "__main__":
    main()

"""
Milestone 4 - End-to-End Test Suite.

Comprehensive integration tests covering the full workflow:
Registration → Attendee → QR → Check-in → Venues → Speakers →
Sessions → Scheduling → Incidents → Sponsors → Orchestration →
Intelligence → Executive Dashboard → Authentication → Validation.

Usage:
    python test_e2e.py [--port 8000] [--host 127.0.0.1]
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

from config import ADMIN_USERNAME, ADMIN_PASSWORD


# -- Configuration ------------------------------------------─

HOST = "127.0.0.1"
PORT = 8000

for i, arg in enumerate(sys.argv):
    if arg == "--port" and i + 1 < len(sys.argv):
        PORT = int(sys.argv[i + 1])
    if arg == "--host" and i + 1 < len(sys.argv):
        HOST = sys.argv[i + 1]

BASE = f"http://{HOST}:{PORT}"


# -- HTTP Helpers --------------------------------------------

class TestClient:
    def __init__(self):
        self.token = None
        self.passed = 0
        self.failed = 0
        self.errors: list[str] = []

    def login(self, username=None, password=None):
        username = username or ADMIN_USERNAME
        password = password or ADMIN_PASSWORD
        data = urllib.parse.urlencode({
            "username": username,
            "password": password,
        }).encode()
        req = urllib.request.Request(
            f"{BASE}/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read())
            self.token = body["access_token"]
        return self.token

    def _headers(self, auth=True):
        h = {"Content-Type": "application/json"}
        if auth and self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def get(self, path, auth=True):
        req = urllib.request.Request(
            f"{BASE}{path}", headers=self._headers(auth)
        )
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())

    def post(self, path, body=None, auth=True):
        data = json.dumps(body).encode() if body else b"{}"
        req = urllib.request.Request(
            f"{BASE}{path}", data=data, headers=self._headers(auth)
        )
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())

    def put(self, path, body=None, auth=True):
        data = json.dumps(body).encode() if body else b"{}"
        req = urllib.request.Request(
            f"{BASE}{path}", data=data, headers=self._headers(auth),
            method="PUT",
        )
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())

    def delete(self, path, auth=True):
        req = urllib.request.Request(
            f"{BASE}{path}", headers=self._headers(auth),
            method="DELETE",
        )
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())

    def expect_error(self, method, path, body=None, expected_status=None, auth=True):
        """Expect an HTTP error response."""
        try:
            if method == "GET":
                self.get(path, auth=auth)
            elif method == "POST":
                self.post(path, body, auth=auth)
            elif method == "PUT":
                self.put(path, body, auth=auth)
            elif method == "DELETE":
                self.delete(path, auth=auth)
            return None, None  # No error raised
        except urllib.error.HTTPError as e:
            body_text = e.read().decode()
            try:
                detail = json.loads(body_text)
            except json.JSONDecodeError:
                detail = body_text
            return e.code, detail

    def check(self, name, condition, detail=""):
        if condition:
            self.passed += 1
            print(f"  [PASS] {name}")
        else:
            self.failed += 1
            self.errors.append(f"{name}: {detail}")
            print(f"  [FAIL] {name} - {detail}")

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"  RESULTS: {self.passed}/{total} passed, {self.failed} failed")
        if self.errors:
            print("\n  FAILURES:")
            for e in self.errors:
                print(f"    [X] {e}")
        print(f"{'='*60}")
        return self.failed == 0


# -- Test Suites ---------------------------------------------

def test_health_check(c: TestClient):
    print("\n-- Health Check --")
    s, body = c.get("/health", auth=False)
    c.check("GET /health returns 200", s == 200)
    c.check("Status is healthy", body.get("status") == "healthy")
    c.check("Database connected", body.get("database") == "connected")
    c.check("Version present", "version" in body)


def test_authentication(c: TestClient):
    print("\n-- Authentication --")

    # Valid login
    token = c.login()
    c.check("Valid login succeeds", token is not None and len(token) > 10)

    # Invalid login
    code, _ = c.expect_error("POST", "/token",
        body=urllib.parse.urlencode({"username": "wrong", "password": "wrong"}))
    # expect_error for form data won't work directly, test via unauthorized GET
    code, _ = c.expect_error("GET", "/attendees", auth=False)
    c.check("Unauthenticated request rejected", code == 401 or code == 403)

    # Invalid token
    old_token = c.token
    c.token = "invalid.token.here"
    code, _ = c.expect_error("GET", "/attendees")
    c.check("Invalid token rejected", code == 401)
    c.token = old_token


def test_attendees(c: TestClient):
    print("\n-- Attendees --")
    s, attendees = c.get("/attendees")
    c.check("GET /attendees returns 200", s == 200)
    c.check("Returns list", isinstance(attendees, list))
    c.check("Has attendee data", len(attendees) > 0)


def test_checkin(c: TestClient):
    print("\n-- Check-In --")
    s, attendees = c.get("/attendees")
    if attendees:
        att = attendees[0]
        aid = att["attendee_id"]
        # Undo check-in first if needed
        if att.get("checkin_status"):
            c.put(f"/undo-checkin/{aid}")

        s, res = c.put(f"/checkin/{aid}")
        c.check("Check-in succeeds", s == 200)

        # Duplicate check-in should fail
        code, _ = c.expect_error("PUT", f"/checkin/{aid}")
        c.check("Duplicate check-in rejected", code in (400, 409))

        # Undo check-in
        s, res = c.put(f"/undo-checkin/{aid}")
        c.check("Undo check-in succeeds", s == 200)


def test_venues(c: TestClient):
    print("\n-- Venues --")
    s, venues = c.get("/venues")
    c.check("GET /venues returns 200", s == 200)
    c.check("Has venue data", isinstance(venues, list) and len(venues) > 0)


def test_speakers(c: TestClient):
    print("\n-- Speakers --")
    s, speakers = c.get("/speakers")
    c.check("GET /speakers returns 200", s == 200)
    c.check("Has speaker data", isinstance(speakers, list) and len(speakers) > 0)


def test_sessions(c: TestClient):
    print("\n-- Sessions --")
    s, sessions = c.get("/sessions")
    c.check("GET /sessions returns 200", s == 200)
    c.check("Has session data", isinstance(sessions, list) and len(sessions) > 0)


def test_schedules(c: TestClient):
    print("\n-- Schedules --")
    s, schedules = c.get("/schedules")
    c.check("GET /schedules returns 200", s == 200)
    c.check("Has schedule data", isinstance(schedules, list) and len(schedules) > 0)


def test_session_analytics(c: TestClient):
    print("\n-- Session Analytics --")
    s, analytics = c.get("/session-analytics")
    c.check("GET /session-analytics returns 200", s == 200)
    summary = analytics.get("summary", analytics)
    c.check("Has total_sessions", "total_sessions" in summary)
    c.check("Has speaker_workload", "speaker_workload" in analytics)


def test_venue_agent(c: TestClient):
    print("\n-- Venue Agent --")
    s, rec = c.post("/venue-agent/recommend", {
        "expected_attendees": 50,
        "required_facilities": ["Projector", "WiFi"],
        "accessibility_required": False,
    })
    c.check("Venue agent returns 200", s == 200)
    c.check("Returns best_venue", "best_venue" in rec)
    c.check("Best venue has score", "match_score" in rec.get("best_venue", {}))


def test_speaker_agent(c: TestClient):
    print("\n-- Speaker Agent --")
    s, rec = c.post("/speaker-agent/recommend", {
        "required_expertise": ["AI", "Machine Learning"],
        "minimum_experience_years": 3,
    })
    c.check("Speaker agent returns 200", s == 200)
    c.check("Returns best_speaker", "best_speaker" in rec)


def test_sponsors(c: TestClient):
    print("\n-- Sponsors --")
    s, sponsors = c.get("/sponsors")
    c.check("GET /sponsors returns 200", s == 200)
    c.check("Has sponsor data", isinstance(sponsors, list))

    s, analytics = c.get("/sponsorship/analytics")
    c.check("GET /sponsorship/analytics returns 200", s == 200)
    summary = analytics.get("summary", analytics)
    c.check("Has total_sponsors", "total_sponsors" in summary)


def test_incidents(c: TestClient):
    print("\n-- Incidents --")
    s, incidents = c.get("/incidents")
    c.check("GET /incidents returns 200", s == 200)
    c.check("Has incident data", isinstance(incidents, list))

    s, analytics = c.get("/incident/analytics")
    c.check("GET /incident/analytics returns 200", s == 200)
    summary = analytics.get("summary", {})
    total = summary.get("total_incidents", 0)
    c.check("Has total_incidents", total > 0)

    # Verify mutual exclusivity
    open_c = summary.get("open_incidents", 0)
    in_prog = summary.get("in_progress", 0)
    resolved = summary.get("resolved", 0)
    closed = summary.get("closed", 0)
    status_sum = open_c + in_prog + resolved + closed
    c.check(
        f"Incident KPIs sum correctly ({status_sum} == {total})",
        status_sum == total,
        f"open={open_c} + in_progress={in_prog} + resolved={resolved} + closed={closed} = {status_sum}",
    )


def test_incident_workflow(c: TestClient):
    print("\n-- Incident Workflow --")
    # Create incident
    s, inc = c.post("/incidents", {
        "event": "Test Event",
        "title": "E2E Test Incident",
        "description": "Automated test incident",
        "category": "Technical",
        "location": "Test Hall",
        "reported_by": "E2E Suite",
        "severity": 3,
    })
    c.check("Create incident returns 200", s == 200)
    iid = inc.get("incident", {}).get("incident_id")
    c.check("Incident ID returned", iid is not None)

    if iid:
        # Acknowledge
        s, _ = c.put(f"/incident/{iid}/acknowledge")
        c.check("Acknowledge succeeds", s == 200)

        # Start response
        s, _ = c.put(f"/incident/{iid}/start-response")
        c.check("Start response succeeds", s == 200)

        # Resolve
        s, _ = c.put(f"/incident/{iid}/resolve", {"resolution": "Fixed by E2E test"})
        c.check("Resolve succeeds", s == 200)

        # Close
        s, _ = c.put(f"/incident/{iid}/close")
        c.check("Close succeeds", s == 200)

        # Clean up
        c.delete(f"/incident/{iid}")


def test_alerts(c: TestClient):
    print("\n-- Alerts --")
    s, count = c.get("/alerts/unread-count")
    c.check("GET /alerts/unread-count returns 200", s == 200)
    c.check("Has unread_count", "unread_count" in count)


def test_operations_dashboard(c: TestClient):
    print("\n-- Operations Dashboard --")
    s, dash = c.get("/operations/dashboard")
    c.check("GET /operations/dashboard returns 200", s == 200)
    c.check("Has sponsorship data", "sponsorship" in dash)
    c.check("Has incidents data", "incidents" in dash)
    c.check("Has alerts data", "alerts" in dash)


def test_intelligence_health(c: TestClient):
    print("\n-- Intelligence: Event Health --")
    s, health = c.get("/intelligence/health")
    c.check("GET /intelligence/health returns 200", s == 200)
    score = health.get("overall_score", -1)
    c.check("Score in valid range", 0 <= score <= 100, f"score={score}")
    c.check("Has 7 sub-scores", len(health.get("sub_scores", {})) == 7)
    c.check("Has rating", "rating" in health)
    c.check("Has explanation per sub-score", all(
        "explanation" in v for v in health.get("sub_scores", {}).values()
    ))


def test_intelligence_insights(c: TestClient):
    print("\n-- Intelligence: Insights --")
    s, data = c.get("/intelligence/insights")
    c.check("GET /intelligence/insights returns 200", s == 200)
    insights = data.get("insights", [])
    c.check("Returns insights list", isinstance(insights, list) and len(insights) > 0)
    c.check("Insights have required fields", all(
        "type" in i and "category" in i and "message" in i
        for i in insights
    ))


def test_intelligence_critical_actions(c: TestClient):
    print("\n-- Intelligence: Critical Actions --")
    s, data = c.get("/intelligence/critical-actions")
    c.check("GET /intelligence/critical-actions returns 200", s == 200)
    actions = data.get("actions", [])
    c.check("Returns actions list", isinstance(actions, list))


def test_executive_dashboard(c: TestClient):
    print("\n-- Executive Dashboard --")
    s, dash = c.get("/intelligence/dashboard")
    c.check("GET /intelligence/dashboard returns 200", s == 200)
    c.check("Has health", "health" in dash)
    c.check("Has kpis", "kpis" in dash)
    c.check("Has insights", "insights" in dash)
    c.check("Has critical_actions", "critical_actions" in dash)
    c.check("Has agents", "agents" in dash)
    c.check("Has trends", "trends" in dash)
    c.check("KPIs have total_attendees", "total_attendees" in dash.get("kpis", {}))
    c.check("Trends have attendance", "attendance" in dash.get("trends", {}))


def test_incident_synchronization(c: TestClient):
    print("\n-- Incident & Executive Dashboard Synchronization --")

    # 1. Fetch Incident Analytics (Single Source of Truth)
    s1, inc_data = c.get("/incident/analytics")
    c.check("GET /incident/analytics returns 200", s1 == 200)
    inc_summary = inc_data.get("summary", {})

    # 2. Fetch Executive Dashboard
    s2, dash = c.get("/intelligence/dashboard")
    c.check("GET /intelligence/dashboard returns 200", s2 == 200)
    exec_kpis = dash.get("kpis", {})

    # 3. Assert exact synchronization
    c.check(
        f"Open incidents match (Incident: {inc_summary.get('open_incidents')} == Executive: {exec_kpis.get('open_incidents')})",
        inc_summary.get("open_incidents") == exec_kpis.get("open_incidents"),
    )

    c.check(
        f"Critical incidents match (Incident: {inc_summary.get('critical_incidents')} == Executive: {exec_kpis.get('critical_incidents')})",
        inc_summary.get("critical_incidents") == exec_kpis.get("critical_incidents"),
    )

    c.check(
        f"In-progress incidents match (Incident: {inc_summary.get('in_progress')} == Executive: {exec_kpis.get('in_progress_incidents')})",
        inc_summary.get("in_progress") == exec_kpis.get("in_progress_incidents"),
    )

    c.check(
        f"Resolved incidents match (Incident: {inc_summary.get('resolved')} == Executive: {exec_kpis.get('resolved_incidents')})",
        inc_summary.get("resolved") == exec_kpis.get("resolved_incidents"),
    )

    c.check(
        f"Closed incidents match (Incident: {inc_summary.get('closed')} == Executive: {exec_kpis.get('closed_incidents')})",
        inc_summary.get("closed") == exec_kpis.get("closed_incidents"),
    )

    c.check(
        f"Total incidents match (Incident: {inc_summary.get('total_incidents')} == Executive: {exec_kpis.get('total_incidents')})",
        inc_summary.get("total_incidents") == exec_kpis.get("total_incidents"),
    )

    # 4. Test Dynamic Health Score Response to Critical Incident
    s_h1, h1 = c.get("/intelligence/health")
    base_score = h1["overall_score"]

    # Create an active Critical Incident
    s_c, new_inc = c.post("/incidents", {
        "event": "Regression Test Event",
        "title": "Regression Test Critical Safety Incident",
        "description": "Active critical safety issue for test",
        "category": "Medical",
        "location": "Main Hall",
        "reported_by": "Test Suite",
        "severity": 5,
    })
    c.check("Create critical incident succeeds", s_c == 200)
    iid = new_inc.get("incident", {}).get("incident_id")

    if iid:
        # Verify health score dropped
        s_h2, h2 = c.get("/intelligence/health")
        c.check(
            f"Health score drops on active critical incident ({base_score} -> {h2['overall_score']})",
            h2["overall_score"] < base_score,
        )

        # Verify critical action alert is detected
        s_ca, ca = c.get("/intelligence/critical-actions")
        c.check(
            "Critical incident triggers actionable management risk",
            any("Regression Test Critical" in a.get("title", "") for a in ca.get("actions", [])),
        )

        # Resolve and close the critical incident
        c.put(f"/incident/{iid}/resolve", {"resolution": "Resolved by regression test"})
        c.put(f"/incident/{iid}/close")

        # Verify health score recovered
        s_h3, h3 = c.get("/intelligence/health")
        c.check(
            f"Health score recovers when critical incident is closed ({h2['overall_score']} -> {h3['overall_score']})",
            h3["overall_score"] > h2["overall_score"],
        )

        # Delete test record
        c.delete(f"/incident/{iid}")


def test_orchestrator(c: TestClient):
    print("\n-- Agent Orchestrator --")

    # Agent status
    s, agents = c.get("/orchestrator/agents/status")
    c.check("GET /orchestrator/agents/status returns 200", s == 200)
    c.check("Has 5 agents", len(agents.get("agents", [])) == 5)

    # Run orchestration: technical issue
    s, res = c.post("/orchestrator/resolve", {
        "situation": "Power outage in Hall A affecting the Generative AI workshop",
    })
    c.check("Orchestration returns 200", s == 200)
    c.check("Has detected_problem", len(res.get("detected_problem", "")) > 0)
    c.check("Has agents_consulted", len(res.get("agents_consulted", [])) > 0)
    c.check("Has recommendation", len(res.get("recommendation", "")) > 0)
    c.check("Has confidence", 0 < res.get("confidence", 0) <= 100)
    c.check("Has processing_time_ms", res.get("processing_time_ms", -1) >= 0)

    # Run orchestration: medical emergency
    s, res2 = c.post("/orchestrator/resolve", {
        "situation": "Medical emergency in Exhibition Hall during networking",
    })
    c.check("Medical orchestration succeeds", s == 200)
    c.check("Detected medical emergency",
            "medical" in res2.get("detected_problem", "").lower())

    # Run orchestration: speaker conflict
    s, res3 = c.post("/orchestrator/resolve", {
        "situation": "Speaker Dr. Sharma has a scheduling conflict with two sessions",
    })
    c.check("Speaker conflict orchestration succeeds", s == 200)

    # Invalid orchestration
    code, _ = c.expect_error("POST", "/orchestrator/resolve", {"situation": ""})
    c.check("Empty situation rejected", code in (400, 422))

    # Activity log
    s, activity = c.get("/orchestrator/activity")
    c.check("GET /orchestrator/activity returns 200", s == 200)
    c.check("Activity log has entries", len(activity.get("activity", [])) >= 3)


def test_input_validation(c: TestClient):
    print("\n-- Input Validation --")

    # Invalid attendee registration (missing required fields)
    code, _ = c.expect_error("POST", "/register", {"name": "Test"}, auth=False)
    c.check("Invalid registration rejected", code in (400, 422))

    # Invalid QR scan
    code, _ = c.expect_error("POST", "/scan-qr", {"event_id": "NONEXISTENT-9999"}, auth=False)
    c.check("Invalid QR handled (returns 404)", code == 404)


# -- Main ----------------------------------------------------

def main():
    print(f"\n{'='*60}")
    print(f"  Smart Event Manager - End-to-End Test Suite")
    print(f"  Target: {BASE}")
    print(f"  Time: {datetime.now().isoformat()}")
    print(f"{'='*60}")

    c = TestClient()

    # Wait for server
    for attempt in range(5):
        try:
            urllib.request.urlopen(f"{BASE}/health", timeout=3)
            break
        except Exception:
            if attempt < 4:
                print(f"  Waiting for server... (attempt {attempt + 1}/5)")
                time.sleep(2)
            else:
                print(f"  ERROR: Server not reachable at {BASE}")
                sys.exit(1)

    # Run all test suites
    test_health_check(c)
    test_authentication(c)
    c.login()  # Ensure valid token for remaining tests

    # Milestone 1
    test_attendees(c)
    test_checkin(c)
    test_input_validation(c)

    # Milestone 2
    test_venues(c)
    test_speakers(c)
    test_sessions(c)
    test_schedules(c)
    test_session_analytics(c)
    test_venue_agent(c)
    test_speaker_agent(c)

    # Milestone 3
    test_sponsors(c)
    test_incidents(c)
    test_incident_workflow(c)
    test_alerts(c)
    test_operations_dashboard(c)

    # Milestone 4
    test_intelligence_health(c)
    test_intelligence_insights(c)
    test_intelligence_critical_actions(c)
    test_executive_dashboard(c)
    test_incident_synchronization(c)
    test_orchestrator(c)

    success = c.summary()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

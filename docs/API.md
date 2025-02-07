# InsightFlow AI API Reference

Base URL: `http://localhost:8000`

## Health

### GET /health
```json
{"status": "ok", "service": "InsightFlow AI"}
```

## Event Capture

### POST /api/v1/capture
Ingest an analytics event (called by tracker script).

**Request:**
```json
{
  "event": "page_view",
  "distinct_id": "user-uuid-or-anonymous",
  "properties": {
    "page": "/dashboard",
    "referrer": "https://google.com",
    "$browser": "Chrome"
  }
}
```

**Response:** `{"status": "ok"}`

## Analytics

### GET /api/v1/analytics/overview
```
?start=2025-01-01&end=2025-01-31
```

**Response:**
```json
{
  "total_events": 45230,
  "unique_users": 1820,
  "sessions": 3400,
  "pageviews": 38000,
  "avg_session_duration": 240
}
```

### GET /api/v1/analytics/pageviews
Time-series pageview data.

### POST /api/v1/analytics/funnel
```json
{
  "steps": ["sign_up_clicked", "email_entered", "account_created"],
  "date_range": {"start": "2025-01-01", "end": "2025-01-31"}
}
```

**Response:**
```json
{
  "steps": [
    {"event": "sign_up_clicked", "users": 1000, "conversion": 1.0},
    {"event": "email_entered", "users": 650, "conversion": 0.65},
    {"event": "account_created", "users": 420, "conversion": 0.65}
  ]
}
```

### GET /api/v1/analytics/retention
Cohort retention matrix.

### GET /api/v1/analytics/heatmap
```
?page_url=/dashboard
```

## AI

### POST /api/v1/ai/insights
Generate AI insights from analytics data.

**Response:**
```json
{
  "insights": [
    "Your signup funnel dropped 35% this week — correlates with the new form on step 2.",
    "Mobile users have 2x lower retention than desktop — consider optimizing mobile UX."
  ]
}
```

### POST /api/v1/ai/recommendations
Product recommendations based on analytics.

## Dashboard

### GET /api/v1/dashboard
Get saved dashboard layout.

### PUT /api/v1/dashboard
Save dashboard layout (JSON).

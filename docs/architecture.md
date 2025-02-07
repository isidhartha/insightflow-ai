# InsightFlow AI Architecture

## Overview

InsightFlow AI is a self-hosted product analytics platform with an AI insights layer. Events are captured from client websites via a JavaScript tracker, stored in PostgreSQL, and analyzed through both pre-built analytics endpoints and AI-powered insights.

## Event Capture Pipeline

```
Client Website
    → insightflow.js tracker
    → POST /api/v1/capture
    → Event validation + enrichment
    → PostgreSQL (events table)
    → Redis (real-time cache)
```

## Analytics Engine

### Funnel Analysis
```sql
WITH steps AS (
  SELECT distinct_id, event, MIN(timestamp) as first_time
  FROM events
  WHERE event IN ('signup', 'onboard', 'purchase')
  GROUP BY distinct_id, event
)
SELECT step, COUNT(*) as users, COUNT(*) / LAG(COUNT(*)) OVER () as conversion
FROM steps ...
```

### Cohort Retention
- Group users by first-seen week/month
- Calculate what % returned N weeks later
- Returns matrix: cohort × retention period

### Heatmap
- Store click events with `{x_pct, y_pct, page_url}`
- Query returns density grid for visualization

## AI Insights Engine

1. Fetch last 30 days of aggregated metrics
2. Build structured context (trends, anomalies, top pages)
3. Send to GPT-4 with product analyst system prompt
4. Return 3-5 actionable insights

## Database Schema

```
events(id, distinct_id, event, properties, timestamp, session_id, page_url, ip_hash, user_agent)
sessions(id, distinct_id, start_time, end_time, page_count, entry_page)
persons(id, distinct_id, properties, first_seen, last_seen)
funnels(id, name, steps, created_at)
dashboards(id, name, layout, created_at)
```

## Client Tracker

`insightflow.js` is a lightweight (<5KB) JavaScript tracker:
- Auto-captures pageviews
- Tracks clicks, form submissions
- Session management (30-min timeout)
- User identity via `distinct_id` cookie

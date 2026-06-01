import { Router, type IRouter } from "express";
import { db, leadsTable, deals, properties, teamMembers, appointments, activities } from "@workspace/db";
import { sql, gte, and, eq, lte, or, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/analytics/overview", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  try {
    // --- Lead totals ---
    const leadResult = await db.execute<{ total: string; won: string; new_count: string }>(sql`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'won')::text AS won,
        COUNT(*) FILTER (WHERE status = 'new')::text AS new_count
      FROM leads
      WHERE (created_by_id = ${userId} OR created_by_id IS NULL)
    `);
    const leadStats = leadResult.rows[0];
    const totalLeads = parseInt(leadStats?.total ?? "0", 10);
    const wonLeads = parseInt(leadStats?.won ?? "0", 10);
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0;

    // --- Source breakdown ---
    const sourceResult = await db.execute<{ source: string; count: string }>(sql`
      SELECT COALESCE(source, 'Unknown') AS source, COUNT(*)::text AS count
      FROM leads
      WHERE (created_by_id = ${userId} OR created_by_id IS NULL)
      GROUP BY source
      ORDER BY count DESC
    `);

    // --- Agent performance ---
    const agentResult = await db.execute<{
      agent: string; leads: string; won: string; avg_score: string;
    }>(sql`
      SELECT
        COALESCE(assigned_to, 'Unassigned') AS agent,
        COUNT(*)::text AS leads,
        COUNT(*) FILTER (WHERE status = 'won')::text AS won,
        ROUND(AVG(score))::text AS avg_score
      FROM leads
      WHERE (created_by_id = ${userId} OR created_by_id IS NULL)
        AND assigned_to IS NOT NULL AND assigned_to != ''
      GROUP BY assigned_to
      ORDER BY won DESC, leads DESC
      LIMIT 10
    `);

    // --- Deal totals & stage breakdown ---
    const dealResult = await db.execute<{ stage: string; count: string; total_value: string }>(sql`
      SELECT stage, COUNT(*)::text AS count, COALESCE(SUM(value), 0)::text AS total_value
      FROM deals
      WHERE (created_by_id = ${userId} OR created_by_id IS NULL)
      GROUP BY stage
      ORDER BY count DESC
    `);

    const dealTotalsResult = await db.execute<{
      total_deals: string; active_deals: string; closed_deals: string;
      total_pipeline: string; won_value: string;
    }>(sql`
      SELECT
        COUNT(*)::text AS total_deals,
        COUNT(*) FILTER (WHERE stage NOT IN ('won','lost'))::text AS active_deals,
        COUNT(*) FILTER (WHERE stage = 'won')::text AS closed_deals,
        COALESCE(SUM(value), 0)::text AS total_pipeline,
        COALESCE(SUM(value) FILTER (WHERE stage = 'won'), 0)::text AS won_value
      FROM deals
      WHERE (created_by_id = ${userId} OR created_by_id IS NULL)
    `);
    const dealTotals = dealTotalsResult.rows[0];

    // --- Properties count ---
    const propResult = await db.execute<{ total: string; active: string }>(sql`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'active')::text AS active
      FROM properties
      WHERE (listed_by_id = ${userId} OR listed_by_id IS NULL)
    `);
    const propTotals = propResult.rows[0];

    // --- Team members count ---
    const teamResult = await db.execute<{ total: string }>(sql`
      SELECT COUNT(*)::text AS total FROM team_members
    `);
    const teamTotals = teamResult.rows[0];

    // --- Upcoming appointments (next 7 days) ---
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingApptCountResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count
      FROM appointments
      WHERE user_id = ${userId}
        AND date_time >= NOW()
        AND date_time <= ${in7Days.toISOString()}
    `);
    const upcomingAppointmentsCount = parseInt(upcomingApptCountResult.rows[0]?.count ?? "0", 10);

    // --- Recent leads (last 5) ---
    const recentLeadsResult = await db.execute<{
      id: string; name: string; source: string; status: string; created_at: string; score: string;
    }>(sql`
      SELECT id::text, name, COALESCE(source, 'Unknown') AS source, status,
             created_at::text, COALESCE(score, 0)::text AS score
      FROM leads
      WHERE (created_by_id = ${userId} OR created_by_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // --- Recent deals (last 5 updated) ---
    const recentDealsResult = await db.execute<{
      id: string; title: string; stage: string; value: string; updated_at: string; lead_name: string;
    }>(sql`
      SELECT d.id::text, d.title, d.stage,
             COALESCE(d.value::text, '0') AS value,
             d.updated_at::text,
             COALESCE(l2.name, '') AS lead_name
      FROM deals d
      LEFT JOIN leads l2 ON d.lead_id = l2.id
      WHERE (d.created_by_id = ${userId} OR d.created_by_id IS NULL)
      ORDER BY d.updated_at DESC
      LIMIT 5
    `);

    // --- Upcoming appointments (next 5, for current user) ---
    const upcomingApptResult = await db.execute<{
      id: string; title: string; date_time: string; location: string; lead_name: string;
    }>(sql`
      SELECT a.id::text, a.title, a.date_time::text,
             COALESCE(a.location, '') AS location,
             COALESCE(l.name, '') AS lead_name
      FROM appointments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.user_id = ${userId} AND a.date_time >= NOW()
      ORDER BY a.date_time ASC
      LIMIT 5
    `);

    // --- Weekly activity (last 7 days: leads + deals created per day) ---
    const weeklyActivityResult = await db.execute<{
      day: string; day_label: string; leads: string; deals: string;
    }>(sql`
      WITH days AS (
        SELECT generate_series(
          DATE_TRUNC('day', NOW() - INTERVAL '6 days'),
          DATE_TRUNC('day', NOW()),
          '1 day'::interval
        )::date AS day
      ),
      lead_counts AS (
        SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS cnt
        FROM leads
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND (created_by_id = ${userId} OR created_by_id IS NULL)
        GROUP BY 1
      ),
      deal_counts AS (
        SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*)::int AS cnt
        FROM deals
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND (created_by_id = ${userId} OR created_by_id IS NULL)
        GROUP BY 1
      )
      SELECT
        d.day::text AS day,
        TO_CHAR(d.day, 'Dy') AS day_label,
        COALESCE(l.cnt, 0)::text AS leads,
        COALESCE(dl.cnt, 0)::text AS deals
      FROM days d
      LEFT JOIN lead_counts l ON l.day = d.day
      LEFT JOIN deal_counts dl ON dl.day = d.day
      ORDER BY d.day ASC
    `);

    // --- Message activity (last 30 days) ---
    const msgResult = await db.execute<{ day: string; count: string }>(sql`
      SELECT TO_CHAR(DATE_TRUNC('day', m.created_at), 'Mon DD') AS day, COUNT(*)::text AS count
      FROM messages m
      WHERE m.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', m.created_at)
      ORDER BY DATE_TRUNC('day', m.created_at) ASC
    `);

    // --- Monthly conversion trend (last 6 months) ---
    const monthlyResult = await db.execute<{ month: string; total: string; won: string }>(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'won')::text AS won
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '6 months'
        AND (created_by_id = ${userId} OR created_by_id IS NULL)
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

    // --- Status & priority breakdown ---
    const statusResult = await db.execute<{ status: string; count: string }>(sql`
      SELECT status, COUNT(*)::text AS count FROM leads
      WHERE (created_by_id = ${userId} OR created_by_id IS NULL)
      GROUP BY status ORDER BY count DESC
    `);
    const priorityResult = await db.execute<{ priority: string; count: string }>(sql`
      SELECT priority, COUNT(*)::text AS count FROM leads
      WHERE (created_by_id = ${userId} OR created_by_id IS NULL)
      GROUP BY priority ORDER BY count DESC
    `);

    // --- Activity counts ---
    const activityResult = await db.execute<{ total: string; this_week: string }>(sql`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text AS this_week
      FROM activities
    `);
    const msgTotalResult = await db.execute<{ total: string }>(sql`SELECT COUNT(*)::text AS total FROM messages`);

    res.json({
      kpis: {
        totalLeads,
        wonLeads,
        conversionRate,
        totalDeals: parseInt(dealTotals?.total_deals ?? "0", 10),
        activeDeals: parseInt(dealTotals?.active_deals ?? "0", 10),
        closedDeals: parseInt(dealTotals?.closed_deals ?? "0", 10),
        totalPipeline: parseFloat(dealTotals?.total_pipeline ?? "0"),
        wonRevenue: parseFloat(dealTotals?.won_value ?? "0"),
        totalProperties: parseInt(propTotals?.total ?? "0", 10),
        activeProperties: parseInt(propTotals?.active ?? "0", 10),
        teamMembers: parseInt(teamTotals?.total ?? "0", 10),
        upcomingAppointments: upcomingAppointmentsCount,
        totalActivities: parseInt(activityResult.rows[0]?.total ?? "0", 10),
        activitiesThisWeek: parseInt(activityResult.rows[0]?.this_week ?? "0", 10),
        totalMessages: parseInt(msgTotalResult.rows[0]?.total ?? "0", 10),
      },
      sourceBreakdown: sourceResult.rows.map((r) => ({
        source: r.source,
        count: parseInt(r.count, 10),
      })),
      agentPerformance: agentResult.rows.map((r, i) => ({
        agent: r.agent,
        leads: parseInt(r.leads, 10),
        won: parseInt(r.won, 10),
        winRate: parseInt(r.leads, 10) > 0
          ? Math.round((parseInt(r.won, 10) / parseInt(r.leads, 10)) * 100) : 0,
        avgScore: parseInt(r.avg_score ?? "0", 10),
        rank: i + 1,
      })),
      dealsByStage: dealResult.rows.map((r) => ({
        stage: r.stage,
        count: parseInt(r.count, 10),
        value: parseFloat(r.total_value),
      })),
      messageActivity: msgResult.rows.map((r) => ({
        day: r.day,
        count: parseInt(r.count, 10),
      })),
      conversionTrend: monthlyResult.rows.map((r) => ({
        month: r.month,
        total: parseInt(r.total, 10),
        won: parseInt(r.won, 10),
        rate: parseInt(r.total, 10) > 0
          ? Math.round((parseInt(r.won, 10) / parseInt(r.total, 10)) * 100) : 0,
      })),
      statusBreakdown: statusResult.rows.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      priorityBreakdown: priorityResult.rows.map((r) => ({
        priority: r.priority,
        count: parseInt(r.count, 10),
      })),
      weeklyActivity: weeklyActivityResult.rows.map((r) => ({
        day: r.day_label,
        leads: parseInt(r.leads, 10),
        deals: parseInt(r.deals, 10),
      })),
      recentLeads: recentLeadsResult.rows.map((r) => ({
        id: parseInt(r.id, 10),
        name: r.name,
        source: r.source,
        status: r.status,
        createdAt: r.created_at,
        score: parseInt(r.score, 10),
      })),
      recentDeals: recentDealsResult.rows.map((r) => ({
        id: parseInt(r.id, 10),
        title: r.title,
        stage: r.stage,
        value: parseFloat(r.value),
        updatedAt: r.updated_at,
        leadName: r.lead_name,
      })),
      upcomingAppointmentsList: upcomingApptResult.rows.map((r) => ({
        id: parseInt(r.id, 10),
        title: r.title,
        dateTime: r.date_time,
        location: r.location,
        leadName: r.lead_name,
      })),
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;

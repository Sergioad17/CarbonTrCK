export async function insertAuditEvent(client, event) {
  await client.query(
    `
      INSERT INTO audit_events (
        organization_id,
        user_id,
        event_type,
        entity_type,
        entity_id,
        ip_address,
        user_agent,
        details
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
    `,
    [
      event.organizationId,
      event.userId || null,
      event.eventType,
      event.entityType || null,
      event.entityId || null,
      event.ipAddress || null,
      event.userAgent || null,
      JSON.stringify(event.details || {}),
    ],
  );
}

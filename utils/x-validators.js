function validateOrderPayload(payload) {
  return (
    payload &&
    typeof payload.userId === 'string' &&
    Array.isArray(payload.items) &&
    payload.items.length > 0 &&
    typeof payload.total === 'number' &&
    typeof payload.clientName === 'string' &&
    typeof payload.clientContact === 'string'
  );
}
